import { Injectable } from '@nestjs/common';
import { SafeUser } from './current-user.decorator';

@Injectable()
export class AuthService {
  /**
   * Fake auth always returns same user!!
   */
  validateUser(): SafeUser {
    return {
      id: '1',
      email: 'test@testmail.com',
      firstName: 'Thorsten',
      lastName: 'Tester',
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getCurrentUser(): Promise<SafeUser> {
    return this.validateUser();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async login(
    email: string,
    //password: string,
  ): Promise<SafeUser> {
    return {
      id: '1',
      email: email || 'test@testmail.com',
      firstName: 'Thorsten',
      lastName: 'Tester',
    };
  }
}
