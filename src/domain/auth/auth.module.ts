import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [UserModule, WorkspaceModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
