import { Module } from '@nestjs/common';
import { MeetingParticipantController } from './meeting-participant.controller';
import { MeetingParticipantService } from './meeting-participant.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { MeetingModule } from '../meeting/meeting.module';
import { WorkspaceMemberModule } from '../workspace-member/workspace-member.module';
import { MeetingParticipantRepository } from './meeting-participant.repository';

@Module({
  imports: [
    MikroOrmModule.forFeature([MeetingParticipant]),
    MeetingModule,
    WorkspaceMemberModule,
  ],
  controllers: [MeetingParticipantController],
  providers: [MeetingParticipantService, MeetingParticipantRepository],
})
export class MeetingParticipantModule {}
