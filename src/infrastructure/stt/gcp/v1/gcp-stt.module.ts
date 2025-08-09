import { Module } from '@nestjs/common';
import { GcpClient } from './utils/gcp-client';
import { GcpSttService } from './gcp-stt.service';
import { LangchainModule } from '../../../langchain/langchain.module';
import { MeetingRecordModule } from '../../../../domain/meeting-record/meeting-record.module';
import { MeetingModule } from '../../../../domain/meeting/meeting.module';

@Module({
  imports: [LangchainModule, MeetingRecordModule, MeetingModule],
  providers: [GcpClient, GcpSttService],
  exports: [GcpSttService],
})
export class GcpSttModule {}
