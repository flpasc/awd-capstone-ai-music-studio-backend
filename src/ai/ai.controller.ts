import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser, type SafeUser } from 'src/auth/current-user.decorator';
import { AiService } from './ai.service';
@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('/:id/generate-audio')
  generateAudio(
    @Param('id') projectId: string,
    @CurrentUser() user: SafeUser,
    // TODO: Add type for body
    @Body() body: { prompt: string; lyricsPrompt: string },
  ) {
    return this.aiService.generateAudio({
      projectId,
      userId: user.id,
      prompt: body.prompt,
      lyricsPrompt: body.lyricsPrompt,
    });
  }

  @Post('/:id/generate-lyrics')
  generateLyrics(
    @Param('id') projectId: string,
    @CurrentUser() user: SafeUser,
    // TODO: Add type for body
    @Body() body: { imageAssetIds: string[] },
  ) {
    return this.aiService.generateLyrics({
      projectId,
      userId: user.id,
      imageAssetIds: body.imageAssetIds,
    });
  }

  @Post('/:id/generate-lyrics-timestamp')
  generateTimestampLyrics(
    @Param('id') projectId: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { imageAssetIds: string[] },
  ) {
    return this.aiService.generateLyricsWithTimestamps({
      projectId,
      userId: user.id,
      imageAssetIds: body.imageAssetIds,
    });
  }

  @Post('/:id/generate-audio-timestamp')
  generateTimestampAudio(
    @Param('id') projectId: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { lyricsPrompt: string; prompt: string },
  ) {
    return this.aiService.generateAudioDiffrhythm({
      projectId,
      userId: user.id,
      lyrics: body.prompt,
      stylePrompt: body.lyricsPrompt,
    });
  }
}
