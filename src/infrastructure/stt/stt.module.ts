import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/module/app-config/app-config.module';
import { SttService } from './stt.service';
import { GcpSttModule } from './gcp/v1/gcp-stt.module';
import { MeetingRecordModule } from '../../domain/meeting-record/meeting-record.module';
import { SttGateway } from './stt.gateway';

@Module({
  imports: [AppConfigModule, GcpSttModule, MeetingRecordModule],
  providers: [SttService, SttGateway],
  exports: [SttService],
})
export class SttModule {}
