import { Module } from '@nestjs/common';
import { MeetingParticipantController } from './meeting-participant.controller';
import { MeetingParticipantService } from './meeting-participant.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MeetingParticipant } from './entity/meeting-participant.entity';

@Module({
  imports: [MikroOrmModule.forFeature([MeetingParticipant])],
  controllers: [MeetingParticipantController],
  providers: [MeetingParticipantService],
})
export class MeetingParticipantModule {}
