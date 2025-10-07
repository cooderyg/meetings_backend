import { Module } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Meeting } from './entity/meeting.entity';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';
import { ResourceModule } from '../resource/resource.module';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Meeting]),
    ResourceModule,
    WorkspaceMemberModule,
    RoleModule,
  ],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingRepository],
  exports: [MeetingService],
})
export class MeetingModule {}
