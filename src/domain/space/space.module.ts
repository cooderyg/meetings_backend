import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Space } from './entity/space.entity';
import { SpaceController } from './space.controller';
import { SpaceRepository } from './space.repository';
import { SpaceService } from './space.service';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { ResourceModule } from '../resource/resource.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Space]),
    WorkspaceMemberModule,
    ResourceModule,
  ],
  controllers: [SpaceController],
  providers: [SpaceService, SpaceRepository],
  exports: [SpaceService],
})
export class SpaceModule {}
