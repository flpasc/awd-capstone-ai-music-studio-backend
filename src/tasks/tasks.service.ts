import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  // TODO: Task worker needs from frontend:
  // - ImageUrls: []
  // - imageTimings: []
  // - audioUrls: []
  // - audioTimings: []
  // - outputVideoKey: string
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      const { kind, projectId, status, id, progress, error } = createTaskDto;
      let plainTask: Partial<Task> = {
        projectId,
        kind,
        status,
        progress,
        error,
      };
      if (id) plainTask = { ...plainTask, id };
      const newTask = this.taskRepo.create(plainTask);

      return this.taskRepo.save(newTask);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknow error creating task';
      console.error(`Create task error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to create task`);
    }
  }

  async findAll(): Promise<Task[]> {
    try {
      return this.taskRepo.find();
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
      await this.taskRepo.update(id, updateTaskDto);
      return this.findOne(id);
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
