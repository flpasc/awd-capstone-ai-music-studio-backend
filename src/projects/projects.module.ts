import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from 'src/tasks/tasks.service';
import { StorageService } from 'src/storage/storage.service';
import { AssetsService } from 'src/assets/assets.service';
import { Asset } from 'src/assets/entities/asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task, Asset])],
  controllers: [ProjectsController],
  providers: [ProjectsService, TasksService, StorageService, AssetsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
