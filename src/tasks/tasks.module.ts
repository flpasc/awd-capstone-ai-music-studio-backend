import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { TasksController } from './tasks.controller';
import { Project } from 'src/projects/entities/project.entity';
import { StorageService } from 'src/storage/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project])],
  controllers: [TasksController],
  providers: [TasksService, AuthService, StorageService],
  exports: [TasksService],
})
export class TasksModule {}
