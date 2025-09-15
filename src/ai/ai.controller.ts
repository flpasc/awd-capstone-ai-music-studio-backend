import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser, type SafeUser } from 'src/auth/current-user.decorator';
import { AiService } from './ai.service';
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post(':id/generate-audio')
  generateAudio(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
    @Body() body: { prompt: string },
  ) {
    return this.aiService.generateAudio(id, body.prompt, user.id);
  }
}
