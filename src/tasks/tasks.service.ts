import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      const { kind, projectId, status } = createTaskDto;
      const newTask = this.taskRepo.create({
        projectId,
        kind,
        status,
      });

      return await this.taskRepo.save(newTask);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknow error creating task';
      console.error(`Create task error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to create task`);
    }
  }

  async findAll(): Promise<Task[]> {
    try {
      return await this.taskRepo.find();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknow error listing tasks';
      console.error(`List tasks error: ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to list tasks`);
    }
  }

  async findOne(id: string) {
    if (!id) {
      throw new BadRequestException(`Task ID is requiered`);
    }
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
    if (!id) {
      throw new BadRequestException(`Task ID is required`);
    }

    try {
      await this.taskRepo.update(id, updateTaskDto);
      return await this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Update task error: ${errorMessage} - ID: ${id}`);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async remove(id: string) {
    if (!id) {
      throw new InternalServerErrorException(`Task ID is required`);
    }

    try {
      const task = await this.findOne(id);
      await this.taskRepo.delete(id);
      return task;
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
