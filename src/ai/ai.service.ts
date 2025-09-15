import { fal } from '@fal-ai/client';
import { Injectable } from '@nestjs/common';
import { AssetsService } from 'src/assets/assets.service';
import { AssetFormat } from 'src/assets/entities/asset.entity';
import { StorageService } from 'src/storage/storage.service';
import { z } from 'zod';
@Injectable()
export class AiService {
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
        prompt: `[verse]
       Fast and Limitless
       In the heart of the code, where dreams collide,

        FAL's the name, taking tech for a ride.
      Generative media, blazing the trail,

        Fast inference power, we'll never fail.
      ##`,
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

    await this.assetsService.create({
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
    return audioBuffer;
  }
}
