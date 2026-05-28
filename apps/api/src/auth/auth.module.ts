import { Module } from '@nestjs/common';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
