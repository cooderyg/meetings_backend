import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Resource } from './entity/resource.entity';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { ResourceRepository } from './resource.repository';
import { WorkspaceModule } from '../workspace/workspace.module';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Resource]),
    WorkspaceModule,
    WorkspaceMemberModule,
  ],
  controllers: [ResourceController],
  providers: [ResourceService, ResourceRepository],
  exports: [ResourceService],
})
export class ResourceModule {}
