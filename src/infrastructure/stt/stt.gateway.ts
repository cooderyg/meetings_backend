import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SttService } from './stt.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway(2052, { cors: true })
export class SttGateway {
  constructor(private sttService: SttService) {}

  @WebSocketServer()
  server: any;

  @SubscribeMessage('init-streaming-recognize')
  handleInitStreamingRecognize(client: any, meetingId: string) {
    this.sttService.initStreamingRecognize(client.id, meetingId);
  }

  @SubscribeMessage('write-streaming-recognize')
  handleWriteStreamingRecognize(client: any, audio: Buffer) {
    this.sttService.writeStreamingRecognize(client.id, audio);
  }

  @SubscribeMessage('pause-streaming-recognize')
  handlePauseStreamingRecognize(client: any) {
    this.sttService.pauseStreamingRecognize(client.id);
  }

  @SubscribeMessage('resume-streaming-recognize')
  handleResumeStreamingRecognize(client: any) {
    this.sttService.resumeStreamingRecognize(client.id);
  }

  @SubscribeMessage('end-streaming-recognize')
  handleEndStreamingRecognize(client: any) {
    this.sttService.endStreamingRecognize(client.id);
  }

  @OnEvent('response-streaming-recognize')
  handleResponseStreamingRecognize(data: any) {
    this.server
      .to(data.clientId)
      .emit('response-streaming-recognize', {
        result: data.result,
        isFinal: data.isFinal,
      });
  }
}
