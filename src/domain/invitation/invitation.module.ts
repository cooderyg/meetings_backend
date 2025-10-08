import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Invitation } from './entity/invitation.entity';
import { InvitationService } from './invitation.service';
import { InvitationRepository } from './invitation.repository';
import { InvitationController } from './invitation.controller';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { RoleModule } from '../role/role.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { UserModule } from '../user/user.module';
import { SpaceModule } from '../space/space.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Invitation]),
    WorkspaceMemberModule,
    RoleModule,
    WorkspaceModule,
    UserModule,
    SpaceModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationRepository],
  exports: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
