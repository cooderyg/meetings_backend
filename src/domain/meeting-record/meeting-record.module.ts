import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MeetingRecord } from './entity/meeting-record.entity';
import { MeetingRecordRepository } from './meeting-record.repository';
import { MeetingRecordService } from './meeting-record.service';

@Module({
  imports: [MikroOrmModule.forFeature([MeetingRecord])],
  providers: [MeetingRecordService, MeetingRecordRepository],
  exports: [MeetingRecordService],
})
export class MeetingRecordModule {}
