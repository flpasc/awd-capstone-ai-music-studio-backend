import { Injectable } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  /**
   * Fake auth always returns same user!!
   */
  validateUser(): Omit<User, 'password' | 'createdAt'> {
    return {
      id: '1',
      email: 'test@testmail.com',
      firstName: 'Thorsten',
      lastName: 'Tester',
    };
  }

  async getCurrentUser(): Promise<Omit<User, 'password' | 'createdAt'>> {
    return await this.validateUser();
  }

  async login(
    email: string,
    //password: string,
  ): Promise<Omit<User, 'password' | 'createdAt'>> {
    return await {
      id: '1',
      email: email || 'test@testmail.com',
      firstName: 'Thorsten',
      lastName: 'Tester',
    };
  }
}
