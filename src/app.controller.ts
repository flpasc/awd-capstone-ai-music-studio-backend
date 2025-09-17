import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHealth() {
    try {
      return await this.appService.getHealth();
    } catch (error) {
      // Optionally log the error
      // Return a proper HTTP error response
      console.error(error);
      throw new InternalServerErrorException('Healthcheck failed');
    }
  }
}
