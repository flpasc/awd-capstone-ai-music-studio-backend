import { Module } from '@nestjs/common';
import { AssetsModule } from 'src/assets/assets.module';
import { MinioModule } from 'src/storage/storage.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [AssetsModule, MinioModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule { }
