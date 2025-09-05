import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  CreateSlideshowDto,
  createSlideshowWorkerResponseDtoSchema,
  CreateSlideshowResponseDto,
} from './dto/create-slideshow.dto';
import { TasksService } from 'src/tasks/tasks.service';
import { TaskKind, TaskStatus } from 'src/tasks/entities/task.entity';
import { CreateTaskDto } from 'src/tasks/dto/create-task.dto';
import { AssetsService } from 'src/assets/assets.service';
import { StorageService } from 'src/storage/storage.service';
import { UpdateTaskDto } from 'src/tasks/dto/update-task.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly assetsService: AssetsService,
  ) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  // TODO: Return all project related assets with presigned urls
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post('/:id/slideshow')
  async createSlideshow(
    @Param('id') projectId: string,
    @Body() createSlideshowDto: CreateSlideshowDto,
  ): Promise<CreateSlideshowResponseDto> {
    // FIXME: get userId from auth service
    const userId = '1';

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
    const slideshowRequest = await fetch(
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
    const unsafeResponse: unknown = await slideshowRequest.json();
    const safeSlideshowResponse =
      createSlideshowWorkerResponseDtoSchema.safeParse(unsafeResponse);
    if (!safeSlideshowResponse.success) {
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
