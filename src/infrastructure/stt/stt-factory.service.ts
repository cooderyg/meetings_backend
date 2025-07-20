import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../shared/module/app-config/app-config';
import { ISttService } from './interface/stt.interface';
import { GcpSttService } from './gcp/gcp-stt.service';

@Injectable()
export class SttFactoryService {
  constructor(private readonly appConfig: AppConfig) {}

  createSttService(): ISttService {
    const sttProvider = this.appConfig.stt.provider || 'GCP';

    switch (sttProvider) {
      case 'GCP':
        return new GcpSttService(this.appConfig);
      // 향후 AWS, Azure 등 추가 가능
      // case 'AWS':
      //   return new AwsSttService(this.appConfig);
      default:
        throw new Error(`Unsupported STT provider: ${sttProvider}`);
    }
  }
}
