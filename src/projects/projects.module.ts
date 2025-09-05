import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from 'src/tasks/tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task]), TasksService],
  controllers: [ProjectsController],
  providers: [ProjectsService, TasksService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
