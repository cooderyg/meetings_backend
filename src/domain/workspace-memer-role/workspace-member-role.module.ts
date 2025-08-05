import { Module } from '@nestjs/common';
import { WorkspaceMemberRoleService } from './workspace-member-role.service';
import { WorkspaceMemberRoleRepository } from './workspace-member-role.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WorkspaceMemberRole } from './entity/workspace-member-role.entity';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [MikroOrmModule.forFeature([WorkspaceMemberRole]), RoleModule],
  controllers: [],
  providers: [WorkspaceMemberRoleService, WorkspaceMemberRoleRepository],
  exports: [WorkspaceMemberRoleService],
})
export class WorkspaceMemberRoleModule {}
