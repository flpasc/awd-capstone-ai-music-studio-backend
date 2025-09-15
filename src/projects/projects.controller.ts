import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AssetsService } from 'src/assets/assets.service';
import { AuthGuard } from 'src/auth/auth.guard';
import type { SafeUser } from 'src/auth/current-user.decorator';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { StorageService } from 'src/storage/storage.service';
import { CreateTaskDto } from 'src/tasks/dto/create-task.dto';
import { UpdateTaskDto } from 'src/tasks/dto/update-task.dto';
import { TaskKind, TaskStatus } from 'src/tasks/entities/task.entity';
import { TasksService } from 'src/tasks/tasks.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { CreateSlideshowDto } from './dto/create-slideshow.dto';
import { CreateProjectSchema } from './dto/create-project.dto';
import { CreateSlideshowSchema } from './dto/create-slideshow.dto';
import {
  CreateSlideshowResponseDto,
  createSlideshowWorkerResponseDtoSchema,
} from './dto/create-slideshow.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectSchema } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly assetsService: AssetsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: SafeUser,
    @Body(new ZodValidationPipe(CreateProjectSchema))
    createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(createProjectDto, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: SafeUser) {
    return await this.projectsService.findAllByUser(user.id);
  }

  // TODO: Return all project related assets with presigned urls
  @Get(':id')
  findOne(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.projectsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProjectSchema))
    updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.projectsService.remove(id, user.id);
  }

  @Post('/:id/slideshow')
  async createSlideshow(
    @Param('id') projectId: string,
    @CurrentUser() user: SafeUser,
    @Body(new ZodValidationPipe(CreateSlideshowSchema))
    createSlideshowDto: CreateSlideshowDto,
  ): Promise<CreateSlideshowResponseDto> {
    const userId = user.id;

    /// Call video service to create slideshow

    // get image and audio keys from ids
    const imageKeys: string[] = [];
    const audioKeys: string[] = [];
    const images = await this.assetsService.findAllByIds(
      createSlideshowDto.imageIds,
    );
    if (images.length !== createSlideshowDto.imageIds.length) {
      throw new Error(`One or more images not found`);
    }
    for (const image of images) {
      imageKeys.push(
        StorageService.generateObjectPath(userId, projectId, image.storageName),
      );
    }
    const audios = await this.assetsService.findAllByIds(
      createSlideshowDto.audioIds,
    );
    if (audios.length !== createSlideshowDto.audioIds.length) {
      throw new Error(`One or more audio files not found`);
    }
    for (const audio of audios) {
      audioKeys.push(
        StorageService.generateObjectPath(userId, projectId, audio.storageName),
      );
    }

    const imageTimings =
      createSlideshowDto.imageTimings ?? imageKeys.map(() => 5);
    const audioTimings =
      createSlideshowDto.audioTimings ?? audioKeys.map(() => 5);

    // TODO: create function to get output video key
    const outputKey = StorageService.generateObjectPath(
      userId,
      projectId,
      `slideshow-${new Date().toISOString()}.mp4`,
    );

    /// Create a task in our db with status "pending"
    const createTaskDto: CreateTaskDto = {
      projectId,
      kind: TaskKind.CREATE_SLIDESHOW,
      params: {
        imageKeys,
        audioKeys,
        imageTimings,
        audioTimings,
        outputKey,
      },
    };
    const task = await this.tasksService.create(createTaskDto);

    /// Make request to video service

    const payload = {
      imageKeys,
      imageTimings,
      audioKeys,
      audioTimings,
      outputKey,
    };
    let slideshowResponse: Response;
    try {
      slideshowResponse = await fetch(
        `${process.env.VIDEO_WORKER_URL}/tasks/${task.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      console.error('Error calling video service:', error);
      // update task status to error
      const updateTaskDto: UpdateTaskDto = {
        status: TaskStatus.ERROR,
        error: 'Error calling video service',
      };
      await this.tasksService.update(task.id, updateTaskDto);
      throw new Error('Error calling video service');
    }
    if (!slideshowResponse.ok) {
      console.error(
        'Video service returned error:',
        slideshowResponse.status,
        await slideshowResponse.text(),
      );
      // update task status to error
      const updateTaskDto: UpdateTaskDto = {
        status: TaskStatus.ERROR,
        error: `Video service returned status ${slideshowResponse.status}`,
      };
      await this.tasksService.update(task.id, updateTaskDto);
      throw new Error(
        `Video service returned status ${slideshowResponse.status}`,
      );
    }
    const unsafeResponse: unknown = await slideshowResponse.json();
    const safeSlideshowResponse =
      createSlideshowWorkerResponseDtoSchema.safeParse(unsafeResponse);
    if (!safeSlideshowResponse.success) {
      console.error(
        'Invalid response from video service:',
        safeSlideshowResponse.error,
      );
      throw new Error('Invalid response from video service');
    }

    /// Update our task in db with returned status from video service

    const { progress, error } = safeSlideshowResponse.data;
    function mapStatus(status: string): TaskStatus {
      switch (status) {
        case 'processing':
          return TaskStatus.RUNNING;
        case 'done':
          return TaskStatus.FINISHED;
        case 'error':
          return TaskStatus.ERROR;
        default:
          throw new Error('Invalid status from video service');
      }
    }
    const status: TaskStatus = mapStatus(safeSlideshowResponse.data.status);
    let updateTaskDto: UpdateTaskDto = {
      status,
      progress,
    };
    if (error) updateTaskDto = { ...updateTaskDto, error };

    await this.tasksService.update(task.id, updateTaskDto);

    /// End of task creation in our db

    return task;
  }
}
