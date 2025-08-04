import { Injectable } from '@nestjs/common';
import { GcpSttService } from './gcp/v1/gcp-stt.service';

@Injectable()
export class SttService {
  constructor(private gcpSttService: GcpSttService) {}

  initStreamingRecognize(clientId: string, meetingId: string) {
    this.gcpSttService.initStreamingRecognize(clientId, meetingId);
  }

  writeStreamingRecognize(clientId: string, audio: Buffer) {
    this.gcpSttService.writeStreamingRecognize(clientId, audio);
  }

  hasStreamingRecognize(clientId: string) {
    return this.gcpSttService.hasStreamingRecognize(clientId);
  }

  findStreamingRecognize(clientId: string) {
    return this.gcpSttService.findStreamingRecognize(clientId);
  }

  resumeStreamingRecognize(clientId: string) {
    return this.gcpSttService.resumeStreamingRecognize(clientId);
  }

  pauseStreamingRecognize(clientId: string) {
    return this.gcpSttService.pauseStreamingRecognize(clientId);
  }

  endStreamingRecognize(clientId: string) {
    return this.gcpSttService.endStreamingRecognize(clientId);
  }
}
