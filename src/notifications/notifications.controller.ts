import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type SafeUser } from 'src/auth/current-user.decorator';
import { AuthGuard } from 'src/auth/auth.guard';
import { randomUUID } from 'node:crypto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('stream')
  @UseGuards(AuthGuard)
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: SafeUser,
  ) {
    // Get Last-Event-ID header for reconnection logic
    // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#resuming_a_broken_connection
    const lastEventId = req.headers['last-event-id'] as string;
    const lastUpdateDate = lastEventId ? new Date(lastEventId) : undefined;
    await this.notificationsService.handleSseConnection(
      user.id,
      res,
      lastUpdateDate,
    );
  }

  @Post('test')
  @UseGuards(AuthGuard)
  async createTestNotification(
    @CurrentUser() user: SafeUser,
    @Body('message') message?: string,
  ) {
    const taskIdentifier = randomUUID();
    const notification = await this.notificationsService.create(
      user.id,
      taskIdentifier,
      message ?? `Test notification for task ${taskIdentifier}`,
    );
    return { success: true, notification };
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  async markAsRead(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const notification = await this.notificationsService.markAsRead(
      id,
      user.id,
    );
    return { success: true, notification };
  }

  @Patch(':id/delete')
  @UseGuards(AuthGuard)
  async markAsDeleted(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    const notification = await this.notificationsService.markAsDeleted(
      id,
      user.id,
    );
    return { success: true, notification };
  }
}
