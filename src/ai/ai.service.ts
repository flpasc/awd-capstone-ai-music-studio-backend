import { fal } from '@fal-ai/client';
import { Injectable } from '@nestjs/common';
import { Buffer } from 'buffer';
import { AssetsService } from 'src/assets/assets.service';
import { AssetFormat } from 'src/assets/entities/asset.entity';
import { config } from 'src/config';
import { StorageService } from 'src/storage/storage.service';
import { z } from 'zod';

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
    console.log(prompt, lyricsPrompt);
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
    const audioSchema = z.object({
      audio: z.object({
        url: z.string(),
        file_name: z.string(),
        file_size: z.number(),
        content_type: z.string(),
      }),
    });
    const parsedData = audioSchema.parse(result.data);
    const audioResponse = await fetch(parsedData.audio.url);
    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch generated audio file: ${audioResponse.statusText}`,
      );
    }
    const audioBuffer = await audioResponse.arrayBuffer();
    await this.storageService.uploadFile(
      userId,
      projectId,
      parsedData.audio.file_name,
      Buffer.from(audioBuffer),
    );

    const asset = await this.assetsService.create({
      userId: userId,
      projectId,
      originalName: parsedData.audio.file_name,
      storageName: parsedData.audio.file_name,
      metadata: {
        size: parsedData.audio.file_size,
        mimetype: parsedData.audio.content_type,
      },
      format: AssetFormat.AUDIO,
    });

    const url = await this.storageService.getDownloadPresignedUrl(
      userId,
      projectId,
      parsedData.audio.file_name,
    );

    return {
      ...asset,
      downloadUrl: url,
    };
  }

  // TODO: Add type for body
  async generateLyrics(args: {
    projectId: string;
    userId: string;
    imageAssetIds: string[];
    trackLengthSeconds?: number;
  }) {
    // TODO: Add types folder
    const ArgsSchema = z.object({
      projectId: z.string().min(1),
      userId: z.string().min(1),
      imageAssetIds: z.array(z.string().min(1)).min(1),
      trackLengthSeconds: z.number().int().min(30).max(1200).optional(),
    });
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

      // Clean up the response - remove markdown/code blocks, stray formatting, and JSON if present
      let cleanedLyrics = lyricsContent.trim();
      cleanedLyrics = cleanedLyrics
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '');
      if (cleanedLyrics.startsWith('{') && cleanedLyrics.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanedLyrics) as {
            lyrics?: Array<{ text?: string }>;
          };
          if (
            parsed &&
            Array.isArray(parsed.lyrics) &&
            parsed.lyrics.every((item) => typeof item.text === 'string')
          ) {
            cleanedLyrics = parsed.lyrics
              .map((item) => item.text as string)
              .join('\n');
          }
        } catch (error) {
          console.error(error);
        }
      }
      cleanedLyrics = cleanedLyrics.replace(/^['"`]+|['"`]+$/g, '').trim();

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
}
