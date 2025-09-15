import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { LoginDto } from './dto/login-user.dto';
import { User } from 'src/users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { SafeUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.login(loginDto.email);

    return {
      user,
      message: 'Login succesful (fake login)',
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getProfile(
    @CurrentUser() user: SafeUser,
  ): Promise<Omit<User, 'password' | 'createdAt'>> {
    return user;
  }
}
