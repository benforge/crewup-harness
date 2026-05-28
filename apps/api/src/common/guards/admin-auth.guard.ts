import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { ApiException } from '../errors/api.exception';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.readBearerToken(request.header('authorization'));

    if (!token || !this.authService.isValidToken(token)) {
      throw new ApiException(401, 'AUTH_REQUIRED', 'Admin token is required');
    }

    return true;
  }

  private readBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
