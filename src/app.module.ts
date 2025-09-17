import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { MinioModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { AssetsModule } from './assets/assets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaService } from './media/media.service';
import { AiModule } from './ai/ai.module';
import { config } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      username: config.DB_USER,
      password: config.DB_PASSWORD,
      ssl:
        config.DB_SSL || config.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: config.DB_SYNCHRONIZE || config.NODE_ENV === 'development',
      logging: config.DB_LOGGING,
    }),
    UsersModule,
    ProjectsModule,
    MinioModule,
    TasksModule,
    AssetsModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService, MediaService],
})
export class AppModule {}
