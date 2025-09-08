import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();

    // Fake authentication - always allow and attach user
    const user = this.authService.validateUser(); // Note: use validateUser, not getCurrentUser
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    request.user = user;

    return true; // Always allow access for now
  }
}
