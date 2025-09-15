import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { TasksService } from './tasks.service';
import { CreateTaskSchema, type CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskSchema, type UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { SafeUser } from 'src/auth/current-user.decorator';
import { TaskKind, TaskStatus } from './entities/task.entity';
import { AssetsService } from 'src/assets/assets.service';
import type { CreateSlideshowResult } from './entities/task.entity';
import type { CreateAssetDto } from 'src/assets/dto/create-asset.dto';
import { getAssetFormat } from 'src/assets/helpers/asset-format.helper';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get('stream')
  @UseGuards(AuthGuard)
  async stream(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: SafeUser,
  ) {
    // Get Last-Event-ID header for reconnection logic
    const lastEventId = req.headers['last-event-id'] as string;
    const lastUpdateDate = lastEventId ? new Date(lastEventId) : undefined;
    await this.tasksService.handleSseConnection(user.id, res, lastUpdateDate);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateTaskSchema)) createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.tasksService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // TODO: only authorized users and worker service can update tasks
  // for the worker service validate incoming requests using JWT or API keys
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema))
    updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: SafeUser,
  ) {
    console.log('Webhook received for task:', id, 'payload:', updateTaskDto);
    const updatedTask = await this.tasksService.update(id, updateTaskDto);

    // create the asset if task is done
    if (updatedTask && updatedTask.status === TaskStatus.FINISHED) {
      if (updatedTask.kind === TaskKind.CREATE_SLIDESHOW) {
        // FIXME: this cast is not safe, need to validate the result shape with zod
        const result = updateTaskDto.result as unknown as CreateSlideshowResult;

        if (result?.videoKey ?? result?.videoEtag) {
          const originalName =
            result.videoKey.split('/').pop() ?? 'slideshow.mp4';
          const storageName = result.videoKey.split('/').pop();
          if (!storageName) {
            throw new Error(
              `Invalid videoKey format, cannot extract file name: ${result.videoKey}`,
            );
          }
          const createAssetDto: CreateAssetDto = {
            userId: user.id,
            projectId: updatedTask.projectId,
            originalName,
            storageName,
            metadata: {
              size: 0, // TODO: Size will be determined by storage service or by worker service
              mimetype: 'video/mp4',
              fileType: 'video',
            },
            format: getAssetFormat(result.videoKey),
          };

          const asset = await this.assetsService.create(createAssetDto);
          console.log(
            `Asset ${asset.id} created for completed slideshow task:`,
            id,
          );
        }
      }
      if (updatedTask.kind === TaskKind.RENDER_VIDEO) {
        throw new Error('Not implemented yet');
      }
      if (updatedTask.kind === TaskKind.GENERATING_AUDIO) {
        throw new Error('Not implemented yet');
      }
    }
    return updatedTask;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
