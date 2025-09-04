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
  CreateSlideshowResponseDto,
  createSlideshowResponseSchema,
} from './dto/create-slideshow.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

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

  // @Post('/:id/slideshow')
  @Post('/slideshow')
  async createSlideshow(
    @Body() createSlideshowDto: CreateSlideshowDto,
  ): Promise<CreateSlideshowResponseDto> {
    const payload = {
      imageUrls: createSlideshowDto.imageUrls,
      imageTimings: createSlideshowDto.imageTimings,
      audioUrls: createSlideshowDto.audioUrls,
      audioTimings: createSlideshowDto.audioTimings,
      outputVideoKey: createSlideshowDto.outputVideoKey,
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
      });
    const unsafeResponse: unknown = await slideshowRequest.json();
    const safeSlideshowResponse =
      createSlideshowResponseSchema.safeParse(unsafeResponse);
    if (!safeSlideshowResponse.success) {
      throw new Error('Invalid response from video service');
    }

    return safeSlideshowResponse.data;
  }
}
