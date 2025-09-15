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
import { DeleteResult, Repository, MoreThan } from 'typeorm';
import type { Response } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus } from './entities/task.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class TasksService {
  private connections = new Map<string, Set<Response>>();
  private heartbeats = new WeakMap<Response, NodeJS.Timeout>();
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
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

    await this.replyUpdatedTasks(res, userId, lastUpdate);

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

  private async replyUpdatedTasks(
    res: Response,
    userId: string,
    lastUpdate?: Date,
  ): Promise<void> {
    let where: object;
    if (lastUpdate) {
      where = {
        project: { userId },
        updatedAt: MoreThan(lastUpdate),
      };
    } else {
      where = {
        project: { userId },
      };
    }

    const tasks = await this.taskRepo.find({
      where,
      relations: ['project'],
      order: { updatedAt: 'ASC' },
    });

    for (const task of tasks) {
      this.dispatchTaskToResponse(res, task);
    }
  }

  private dispatchTaskToResponse(res: Response, task: Task): void {
    const payload = {
      id: task.id,
      projectId: task.projectId,
      kind: task.kind,
      status: task.status,
      progress: task.progress,
      error: task.error,
      params: task.params,
      result: task.result,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
    res.write(`id: ${task.updatedAt.toISOString()}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  private async dispatchTaskUpdate(task: Task): Promise<void> {
    // Find all users connected for this task's project
    const taskWithProject = await this.taskRepo.findOne({
      where: { id: task.id },
      relations: ['project'],
    });

    if (!taskWithProject?.project?.userId) {
      return;
    }

    const userConnections = this.connections.get(
      taskWithProject.project.userId,
    );
    if (userConnections) {
      for (const res of userConnections) {
        this.dispatchTaskToResponse(res, task);
      }
    }
  }

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

      // Dispatch task update to connected clients
      if (result) {
        await this.dispatchTaskUpdate(result);
      }

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
