import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [MikroOrmModule.forFeature([Workspace]), WorkspaceMemberModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceRepository],
  exports: [WorkspaceService, WorkspaceRepository],
})
export class WorkspaceModule {}
