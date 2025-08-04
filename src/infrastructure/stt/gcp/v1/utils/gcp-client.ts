import { AppConfig } from '../../../../../shared/module/app-config/app-config';
import { Injectable } from '@nestjs/common';
import { SpeechClient } from '@google-cloud/speech';

@Injectable()
export class GcpClient extends SpeechClient {
  constructor(private appConfig: AppConfig) {
    super({
      projectId: appConfig.gcp.projectId,
      credentials: {
        type: appConfig.gcp.type,
        project_id: appConfig.gcp.projectId,
        private_key_id: appConfig.gcp.privateKeyId,
        private_key: appConfig.gcp.privateKey.replace(/\\n/g, '\n'),
        client_email: appConfig.gcp.clientEmail,
        client_id: appConfig.gcp.clientId,
      },
    });
  }
}
