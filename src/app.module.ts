import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { MinioModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { AssetsModule } from './assets/assets.module';
import { AssetsLinkService } from './assets-link/assets-link.service';
import { AssetsLinkModule } from './assets-link/assets-link.module';
import { AssetLinkController } from './asset-link/asset-link.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
    ProjectsModule,
    MinioModule,
    TasksModule,
    AssetsModule,
    AssetsLinkModule,
  ],
  controllers: [AppController, AssetLinkController],
  providers: [AppService, AssetsLinkService],
})
export class AppModule {}
