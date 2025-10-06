import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
    UserModule,
    WorkspaceModule,
    WorkspaceMemberModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
