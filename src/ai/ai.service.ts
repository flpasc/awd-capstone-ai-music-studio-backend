import { fal } from '@fal-ai/client';
import { Injectable } from '@nestjs/common';
import { Buffer } from 'buffer';
import { AssetsService } from 'src/assets/assets.service';
import {
  formatTimestamp,
  stripCodeBlocks,
  cleanLyricsResponse,
} from 'src/common/utils/text-format';
import { AssetFormat, AssetMetadata } from 'src/assets/entities/asset.entity';
import { config } from 'src/config';
import { StorageService } from 'src/storage/storage.service';
import { z } from 'zod';

export const AudioSchema = z.object({
  audio: z.object({
    url: z.string(),
    file_name: z.string(),
    file_size: z.number(),
    content_type: z.string(),
  }),
});

export const LyricsSchema = z.array(
  z.object({
    text: z.string(),
    start: z.number(),
    end: z.number(),
  }),
);
type LyricsType = z.infer<typeof LyricsSchema>;

export const ArgsSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  imageAssetIds: z.array(z.string().min(1)).min(1),
  trackLengthSeconds: z.number().int().min(30).max(1200).optional(),
});

@Injectable()
export class AiService {
  private readonly openApiKey = config.OPENAI_API_KEY;
  private readonly openApiModel = config.OPENAI_MODEL;
  private readonly openApiMaxToken = config.OPENAI_MAX_TOKENS;
  private readonly openApiTemperature = config.OPENAI_TEMPERATURE;

  constructor(
    private readonly storageService: StorageService,
    private readonly assetsService: AssetsService,
  ) {}
  async generateAudio(args: {
    projectId: string;
    prompt: string;
    lyricsPrompt: string;
    userId: string;
  }) {
    const { projectId, prompt, lyricsPrompt, userId } = args;
    const result = await fal.subscribe('fal-ai/minimax-music/v1.5', {
      input: {
        prompt: prompt,
        lyrics_prompt: `${lyricsPrompt}`,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    const parsedData = AudioSchema.parse(result.data);
    const audioResponse = await fetch(parsedData.audio.url);
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch generated audio file: ${audioResponse.statusText}`,
      );
    }
    const filename = `${new Date().getTime()}-${parsedData.audio.file_name}`;
    const audioBuffer = await audioResponse.arrayBuffer();
    await this.storageService.uploadFile(
      userId,
      projectId,
      filename,
      Buffer.from(audioBuffer),
    );

    // Prepare base metadata with proper typing
    let metadata: AssetMetadata = {
      size: parsedData.audio.file_size,
      mimetype: parsedData.audio.content_type,
      fileType: 'audio',
      duration: undefined,
    };

    metadata = await this.assetsService.fillMetadataFromBuffer(
      metadata,
      audioBuffer,
    );

    const asset = await this.assetsService.create({
      userId: userId,
      projectId,
      originalName: parsedData.audio.file_name,
      storageName: filename,
      metadata,
      format: AssetFormat.AI_AUDIO,
    });

    const url = await this.storageService.getDownloadPresignedUrl(
      userId,
      projectId,
      filename,
    );

    return {
      ...asset,
      downloadUrl: url,
    };
  }

  async generateLyrics(args: {
    projectId: string;
    userId: string;
    imageAssetIds: string[];
    trackLengthSeconds?: number;
  }) {
    const {
      projectId,
      userId,
      imageAssetIds,
      trackLengthSeconds = 180,
    } = ArgsSchema.parse(args);

    try {
      // Fetch and validate images
      const assets = await Promise.all(
        imageAssetIds.map(async (assetId) => {
          const asset = await this.assetsService.findOne(assetId);
          if (!asset || asset.format !== AssetFormat.IMAGE) {
            throw new Error(`Asset ${assetId} not found or is not an image`);
          }
          const imageUrl = await this.storageService.getDownloadPresignedUrl(
            userId,
            projectId,
            asset.storageName,
          );
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to fetch image ${assetId}: ${imageResponse.statusText}`,
            );
          }
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const mimeType = asset.metadata?.mimetype || 'image/jpeg';
          return `data:${mimeType};base64,${base64Image}`;
        }),
      );

      // Prompt
      const secondsPerImage = Math.round(
        trackLengthSeconds / imageAssetIds.length,
      );
      // TODO: Move prompt to separate file
      const prompt = [
        `You will be given ${imageAssetIds.length} images in order. Generate song lyrics for a ${trackLengthSeconds}-second track.`,
        '',
        'STRICT INSTRUCTIONS:',
        '- Limit output to 600 characters.',
        '- Return ONLY plain text lyrics. NO JSON, NO timestamps, NO code blocks, NO formatting markers.',
        `- Divide the song equally among the ${imageAssetIds.length} images. Each image should inspire about ${secondsPerImage} seconds of lyrics.`,
        '- Follow the image order provided. Write lyrics inspired by image 1 first, then image 2, etc.',
        '- Use proper song structure with double line breaks between sections.',
        '- Each line should be on its own line.',
        '',
        'DO NOT use JSON. DO NOT include timestamps. DO NOT wrap in code blocks.',
        'Return only the lyrics as plain text. Example:',
        '',
        'First verse line here',
        'Second verse line here',
        'Third verse line here',
        'Fourth verse line here',
        '',
        'Chorus line one here',
        'Chorus line two here',
        'Chorus line three here',
        'Chorus line four here',
        '',
        'Second verse line here',
        'Second verse line here',
        '',
        'RETURN ONLY THE LYRICS TEXT. NOTHING ELSE.',
      ].join('\n');

      const content = [
        { type: 'text', text: prompt },
        ...assets.map((imageData) => ({
          type: 'image_url',
          image_url: { url: imageData, detail: 'high' },
        })),
      ];

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openApiKey}`,
          },
          body: JSON.stringify({
            model: this.openApiModel,
            messages: [
              {
                role: 'user',
                content,
              },
            ],
            max_tokens: this.openApiMaxToken,
            temperature: this.openApiTemperature,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const lyricsContent = data.choices?.[0]?.message?.content;

      if (!lyricsContent) {
        throw new Error('No lyrics generated from OpenAI');
      }

      // Clean up the response using utility
      const cleanedLyrics = cleanLyricsResponse(lyricsContent);

      return {
        lyrics: cleanedLyrics,
        duration: trackLengthSeconds,
        imageCount: imageAssetIds.length,
        timePerImage: secondsPerImage,
      };
    } catch (error) {
      console.error('Error generating lyrics:', error);
      throw new Error(`Failed to generate lyrics: ${(error as Error).message}`);
    }
  }

  /**
   * Generate lyrics with timestamps, matching each image's duration.
   * Returns an array of { text, start, end, imageAssetId }.
   */
  async generateLyricsWithTimestamps(args: {
    projectId: string;
    userId: string;
    imageAssetIds: string[];
    trackLengthSeconds?: number;
  }) {
    const {
      projectId,
      userId,
      imageAssetIds,
      trackLengthSeconds = 180,
    } = ArgsSchema.parse(args);

    // Fetch images (validate as in generateLyrics)
    const assets = await Promise.all(
      imageAssetIds.map(async (assetId) => {
        const asset = await this.assetsService.findOne(
          assetId,
          AssetFormat.IMAGE,
        );
        if (!asset) {
          throw new Error(`Asset ${assetId} not found or is not an image`);
        }
        const imageUrl = await this.storageService.getDownloadPresignedUrl(
          userId,
          projectId,
          asset.storageName,
        );
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to fetch image ${assetId}: ${imageResponse.statusText}`,
          );
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = asset.metadata?.mimetype || 'image/jpeg';
        return `data:${mimeType};base64,${base64Image}`;
      }),
    );

    // Calculate duration per image
    const secondsPerImage = Math.round(
      trackLengthSeconds / imageAssetIds.length,
    );

    // Prompt for lyrics (requesting timestamps in seconds, one line per lyric)
    const prompt = [
      `You will be given ${imageAssetIds.length} images in order. Generate song lyrics for a ${trackLengthSeconds}-second track.`,
      '',
      'STRICT INSTRUCTIONS:',
      '- Limit output to 600 characters.',
      '- Return ONLY a JSON array of objects: [{ "text": "...", "start": 0 }].',
      `- The lyrics must cover the entire track duration, from 0 to ${trackLengthSeconds} seconds.`,
      '- Add a 5-10 seconds long intro with no lyrics at the start and end of the song',
      `- Divide the song into sections, one per image, in the order provided. Each section should be inspired by its image and cover an equal portion of the total duration (about ${Math.floor(trackLengthSeconds / imageAssetIds.length)} seconds per image).`,
      '- Each lyric line should have a realistic start timestamp (in seconds), and the last line should be near the end of the track.',
      '- The number of lyric lines should be enough to fill the whole track, not just a few lines.',
      '- Each object should have text (a single lyric line), and start (the timestamp in seconds when the line should begin, using realistic musical phrasing, not just equal division).',
      '- The first line should start at 0. Each subsequent line should have a start time that reflects natural song pacing (e.g., 2-5 seconds apart, depending on the lyric).',
      '- Use proper song structure, but each object should be a single line.',
      '- Each lyric line should match the image order.',
      '',
      'Example:',
      '[{"text": "Tell me that I\'m special", "start": 4.074}, {"text": "Tell me I look pretty", "start": 6.226}]',
      '',
      'RETURN ONLY THE JSON ARRAY. NOTHING ELSE.',
    ].join('\n');

    const content = [
      { type: 'text', text: prompt },
      ...assets.map((imageData) => ({
        type: 'image_url',
        image_url: { url: imageData, detail: 'high' },
      })),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openApiKey}`,
      },
      body: JSON.stringify({
        model: this.openApiModel,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        max_tokens: this.openApiMaxToken,
        temperature: this.openApiTemperature,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    let lyricsArr: LyricsType = [];
    try {
      const content = data.choices?.[0]?.message?.content?.trim();
      if (typeof content != 'string' || !content)
        throw new Error('No lyrics generated');
      // Remove code blocks using utility
      const jsonStr = stripCodeBlocks(content);
      lyricsArr = JSON.parse(jsonStr) as LyricsType;
    } catch (e) {
      throw new Error(
        'Failed to parse lyrics with timestamps: ' + (e as Error).message,
      );
    }

    const lyricsWithTimestampsStr = lyricsArr
      .map((item) => {
        const text = (item.text || '').trim();
        if (!text) return '';
        const ts = formatTimestamp(Number(item.start ?? 0));
        return `${ts} ${text}`;
      })
      .filter(Boolean)
      .join('\n');

    return {
      lyrics: lyricsWithTimestampsStr,
      duration: trackLengthSeconds,
      imageCount: imageAssetIds.length,
      timePerImage: secondsPerImage,
    };
  }

  async generateAudioDiffrhythm(args: {
    projectId: string;
    userId: string;
    lyrics: string;
    stylePrompt: string;
  }) {
    const { projectId, userId, lyrics, stylePrompt } = args;
    console.log('WHERE AM I??');

    // Call FAL AI with diffrhythm model, passing the formatted string and style prompt
    const result = await fal.subscribe('fal-ai/diffrhythm', {
      input: {
        lyrics: lyrics,
        style_prompt: stylePrompt,
        scheduler: 'rk4',
        cfg_strength: 8,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    const parsedData = AudioSchema.parse(result.data);
    const audioResponse = await fetch(parsedData.audio.url);
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch generated audio file: ${audioResponse.statusText}`,
      );
    }
    const filename = `${new Date().getTime()}-${parsedData.audio.file_name}`;
    const audioBuffer = await audioResponse.arrayBuffer();
    await this.storageService.uploadFile(
      userId,
      projectId,
      filename,
      Buffer.from(audioBuffer),
    ); // Prepare base metadata with proper typing

    let metadata: AssetMetadata = {
      size: parsedData.audio.file_size,
      mimetype: parsedData.audio.content_type,
      fileType: 'audio',
      duration: undefined,
    };

    metadata = await this.assetsService.fillMetadataFromBuffer(
      metadata,
      audioBuffer,
    );

    const asset = await this.assetsService.create({
      userId: userId,
      projectId,
      originalName: parsedData.audio.file_name,
      storageName: filename,
      metadata,
      format: AssetFormat.AI_AUDIO,
    });

    const url = await this.storageService.getDownloadPresignedUrl(
      userId,
      projectId,
      filename,
    );

    return {
      ...asset,
      downloadUrl: url,
    };
  }
}
