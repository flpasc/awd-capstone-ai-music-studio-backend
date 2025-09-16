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
      ...body,
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
      ...body,
    });
  }
}
