import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { TasksService } from 'src/tasks/tasks.service';
import { Project } from 'src/projects/entities/project.entity';
import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Task, Project])],
  controllers: [NotificationsController],
  providers: [NotificationsService, TasksService, AuthService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
