import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { DeleteResult, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
  ) {}

  // TODO: Task worker needs from frontend:
  // - ImageUrls: []
  // - imageTimings: []
  // - audioUrls: []
  // - audioTimings: []
  // - outputVideoKey: string
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      const { projectId, kind, status, progress, error, params } =
        createTaskDto;

      const project = await this.projectsRepo.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException(
          `Project with the id: ${projectId} not found`,
        );
      }

      const newTask = this.taskRepo.create({
        project,
        kind,
        status: status || TaskStatus.PENDING,
        progress: progress || 0,
        error,
        params,
      });
      return await this.taskRepo.save(newTask);
    } catch (error) {
      console.error(`Create task error:`, error);
      throw new InternalServerErrorException(`Failed to create task`);
    }
  }

  async findAllByUser(userId: string): Promise<Task[]> {
    try {
      return await this.taskRepo.find({
        where: { project: { userId } },
        relations: ['project'],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknow error listing tasks';
      console.error(`List tasks error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to list tasks`);
    }
  }

  async findOne(id: string) {
    try {
      const task = await this.taskRepo.findOneBy({ id });

      if (!task) {
        throw new NotFoundException(`Task with the id: ${id} does not exist`);
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknow error finding task';
      console.error(`Find task error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to find task`);
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    try {
      // Get existing task
      const existingTask = await this.findOne(id);

      // Update the task entity with new values
      const updatedTask = { ...existingTask, ...updateTaskDto };

      // Save the updated task (this handles JSON fields properly)
      await this.taskRepo.save(updatedTask);

      return await this.taskRepo.findOneBy({ id });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Update task error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    try {
      return this.taskRepo.delete({ id });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Delete task error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to delete task');
    }
  }
}
