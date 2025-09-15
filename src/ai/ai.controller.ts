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
    @Body() body: { prompt: string },
  ) {
    return this.aiService.generateAudio({
      projectId,
      prompt: body.prompt,
      userId: user.id,
    });
  }
}
