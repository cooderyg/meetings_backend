import { Module } from '@nestjs/common';
import { GcpClient } from './utils/gcp-client';
import { GcpSttService } from './gcp-stt.service';

@Module({
  imports: [],
  providers: [GcpClient, GcpSttService],
  exports: [GcpSttService],
})
export class GcpSttModule {}
