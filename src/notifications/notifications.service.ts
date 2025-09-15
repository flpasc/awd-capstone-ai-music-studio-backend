import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import type { Response } from 'express';
import { Notification, NotificationStatus } from './notification.entity';

@Injectable()
export class NotificationsService {
  private connections = new Map<string, Set<Response>>();
  private heartbeats = new WeakMap<Response, NodeJS.Timeout>();
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async handleSseConnection(userId: string, res: Response, lastUpdate?: Date) {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    });
    res.flushHeaders();

    // save user connection
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)?.add(res);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      // lines starting with ':' are comments and ignored by clients
      res.write(': ping\n\n');
    }, 15000);
    this.heartbeats.set(res, heartbeat);

    await this.replyPendingNotifications(res, userId, lastUpdate);

    res.on('close', () => {
      console.log(`SSE connection closed for user ${userId}`);
      this.connections.get(userId)?.delete(res);
      clearInterval(heartbeat);
      this.heartbeats.delete(res);
      const userConnections = this.connections.get(userId);
      if (userConnections && userConnections.size === 0) {
        this.connections.delete(userId);
      }
    });
  }

  private async replyPendingNotifications(
    res: Response,
    userId: string,
    lastUpdate?: Date,
  ): Promise<void> {
    let where: object;
    if (lastUpdate) {
      where = {
        userId,
        isDeleted: false,
        status: In([NotificationStatus.PENDING, NotificationStatus.SENT]),
        updatedAt: MoreThan(lastUpdate),
      };
    } else {
      where = {
        userId,
        isDeleted: false,
        status: In([NotificationStatus.PENDING, NotificationStatus.SENT]),
      };
    }

    const notifications = await this.notificationRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });

    for (const notification of notifications) {
      this.dispatchNotificationToResponse(res, notification);
      if (notification.status === NotificationStatus.PENDING) {
        await this.markAsSent(notification);
      }
    }
  }

  private async markAsSent(notification: Notification): Promise<void> {
    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    notification.updatedAt = new Date();
    await this.notificationRepository.save(notification);
  }

  private dispatchNotificationToResponse(
    res: Response,
    notification: Notification,
  ): void {
    const payload = {
      id: notification.id,
      taskId: notification.taskId,
      message: notification.message,
      status: notification.status,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
    res.write(`id: ${notification.updatedAt.toISOString()}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  // Public method to create notification and dispatch to connected clients
  async create(
    userId: string,
    taskId: string,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      message,
      taskId,
      status: NotificationStatus.PENDING,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    await this.dispatchNotification(savedNotification);

    return savedNotification;
  }

  private async dispatchNotification(
    notification: Notification,
  ): Promise<void> {
    const userConnections = this.connections.get(notification.userId);
    if (userConnections) {
      for (const res of userConnections) {
        this.dispatchNotificationToResponse(res, notification);
      }
      await this.markAsSent(notification);
    }
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId, isDeleted: false },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    notification.updatedAt = new Date();

    return await this.notificationRepository.save(notification);
  }

  async markAsDeleted(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isDeleted = true;
    notification.updatedAt = new Date();

    return await this.notificationRepository.save(notification);
  }
}
