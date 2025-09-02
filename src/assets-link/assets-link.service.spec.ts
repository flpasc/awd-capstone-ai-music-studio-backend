import { Test, TestingModule } from '@nestjs/testing';
import { AssetsLinkService } from './assets-link.service';

describe('AssetsLinkService', () => {
  let service: AssetsLinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetsLinkService],
    }).compile();

    service = module.get<AssetsLinkService>(AssetsLinkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
