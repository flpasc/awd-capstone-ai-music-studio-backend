import { Test, TestingModule } from '@nestjs/testing';
import { MinioController } from './storage.controller';
import { MinioService } from './storage.service';

describe('MinioController', () => {
  let controller: MinioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinioController],
      providers: [MinioService],
    }).compile();

    controller = module.get<MinioController>(MinioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
