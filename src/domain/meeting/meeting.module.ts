import { Module } from '@nestjs/common';
import { MeetingRepository } from './meeting.repository';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Meeting } from './entity/meeting.entity';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Meeting])],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingRepository],
  exports: [MeetingService],
})
export class MeetingModule {}
