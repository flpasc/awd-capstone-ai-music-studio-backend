import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  CreateSlideshowDto,
  CreateSlideshowResponseDto,
  createSlideshowResponseDtoSchema,
} from './dto/create-slideshow.dto';
import { TasksService } from 'src/tasks/tasks.service';
import { TaskKind, TaskStatus } from 'src/tasks/entities/task.entity';
import { CreateTaskDto } from 'src/tasks/dto/create-task.dto';
import { AssetsService } from 'src/assets/assets.service';
import { StorageService } from 'src/storage/storage.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

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
    @CurrentUser() user: User,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create({
      ...createProjectDto,
      userId: user.id,
    });
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return await this.projectsService.findAllByUser(user.id);
  }

  // TODO: Return all project related assets with presigned urls
  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return (this.projectsService.findOne(id), user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectsService.remove(id, user.id);
  }

  @Post('/:id/slideshow')
  async createSlideshow(
    @Param('id') projectId: string,
    @CurrentUser() user: User,
    @Body() createSlideshowDto: CreateSlideshowDto,
  ): Promise<CreateSlideshowResponseDto> {
    // FIXME: get userId from auth service
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
    const payload = {
      imageKeys,
      imageTimings,
      audioKeys,
      audioTimings,
      outputKey,
    };

    const slideshowRequest = await fetch(
      `${process.env.VIDEO_WORKER_URL}/tasks`,
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
      createSlideshowResponseDtoSchema.safeParse(unsafeResponse);
    if (!safeSlideshowResponse.success) {
      throw new Error('Invalid response from video service');
    }

    /// Create task in our db mapping response from video service to our Task entity

    const { taskId: id, progress, error } = safeSlideshowResponse.data;
    let status: TaskStatus;
    switch (safeSlideshowResponse.data.status) {
      case 'processing':
        status = TaskStatus.RUNNING;
        break;
      case 'done':
        status = TaskStatus.FINISHED;
        break;
      case 'error':
        status = TaskStatus.ERROR;
        break;
      default:
        throw new Error('Invalid status from video service');
    }
    let createTaskDto: CreateTaskDto = {
      id,
      projectId,
      kind: TaskKind.CREATE_SLIDESHOW,
      status,
      progress,
    };
    if (error) createTaskDto = { ...createTaskDto, error };

    await this.tasksService.create(createTaskDto);

    /// End of task creation in our db

    return safeSlideshowResponse.data;
  }
}
