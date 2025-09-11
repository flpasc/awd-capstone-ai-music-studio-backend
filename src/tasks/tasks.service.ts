import {
  BadRequestException,
  ConflictException,
  Inject,
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
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) { }

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

  /**
   * Get a user-friendly title for a task based on its kind.
   */
  private getTaskTitle(task: Task): string {
    const kindTitles = {
      CREATE_SLIDESHOW: 'Create slideshow',
      RENDER_VIDEO: 'Render video',
    };
    return String(kindTitles[task.kind] || 'Task-' + task.id.slice(0, 8));
  }

  private getTaskChangeStatusText(status: TaskStatus): string {
    const statusTexts = {
      [TaskStatus.PENDING]: 'is pending',
      [TaskStatus.RUNNING]: 'is now in progress',
      [TaskStatus.FINISHED]: 'completed successfully',
      [TaskStatus.ERROR]: 'failed',
      [TaskStatus.CANCELED]: 'was cancelled',
    };
    return statusTexts[status] || 'Unknown status';
  }

  /**
   * Generate a user-friendly notification message for a task.
   * Example : Create slideshow completed successfully
   */
  private generateNotificationMessage(task: Task): string {
    const messageParts: string[] = [];
    messageParts.push(this.getTaskTitle(task));
    messageParts.push(this.getTaskChangeStatusText(task.status));
    return messageParts.join(' ');
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    try {
      // Get existing task with project relation to access userId
      const existingTask = await this.taskRepo.findOne({
        where: { id },
        relations: ['project'],
      });

      if (!existingTask) {
        throw new NotFoundException(`Task with the id: ${id} does not exist`);
      }

      const updatedTask = { ...existingTask, ...updateTaskDto };
      const savedTask = await this.taskRepo.save(updatedTask);

      const result = await this.taskRepo.findOneBy({ id });

      if (existingTask.project?.userId) {
        if (existingTask.status !== updateTaskDto.status) {
          const message = this.generateNotificationMessage(savedTask);
          await this.notificationsService.create(
            existingTask.project.userId,
            id,
            message,
          );
        }
      }

      return result;
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