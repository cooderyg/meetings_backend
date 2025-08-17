import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { DevTestController } from './dev-test.controller';
import { DevTestService } from './dev-test.service';

@Module({
  imports: [
    JwtModule.register({}),
    UserModule,
    WorkspaceModule,
    WorkspaceMemberModule,
  ],
  controllers: [DevTestController],
  providers: [DevTestService],
})
export class DevTestModule {}