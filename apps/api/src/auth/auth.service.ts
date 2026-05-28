import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly token = 'dev-admin-token';
  private readonly admin = { id: 'admin-1', name: 'Blog Admin', role: 'editor' };

  login(input: LoginDto) {
    const username = process.env.ADMIN_USERNAME ?? 'admin';
    const password = process.env.ADMIN_PASSWORD ?? 'admin123';

    if (input.username !== username || input.password !== password) {
      throw new ApiException(401, 'AUTH_INVALID', 'Invalid username or password');
    }

    return {
      token: this.token,
      admin: this.admin,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    };
  }

  currentAdmin() {
    return this.admin;
  }

  isValidToken(value: string): boolean {
    return value === this.token;
  }
}
