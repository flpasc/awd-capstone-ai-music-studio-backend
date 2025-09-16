import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with specific settings for SSE
  app.enableCors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // This is required for SSE with credentials
  });

  // Set global prefix
  app.setGlobalPrefix('api/v1');
  await app.listen(config.PORT);
}
bootstrap().catch((err) => {
  console.error('Error during app bootstrap:', err);
  process.exit(1);
});
