import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../shared/module/app-config/app-config.module';
import { SttService } from './stt.service';
import { GcpSttModule } from './gcp/v1/gcp-stt.module';
import { SttGateway } from './stt.gateway';

@Module({
  imports: [AppConfigModule, GcpSttModule],
  providers: [SttService, SttGateway],
  exports: [SttService],
})
export class SttModule {}
