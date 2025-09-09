import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { TasksController } from './tasks.controller';
import { Project } from 'src/projects/entities/project.entity';
import { StorageService } from 'src/storage/storage.service';
import { AssetsService } from 'src/assets/assets.service';
import { Asset } from 'src/assets/entities/asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, Asset])],
  controllers: [TasksController],
  providers: [TasksService, AuthService, StorageService, AssetsService],
  exports: [TasksService],
})
export class TasksModule {}
