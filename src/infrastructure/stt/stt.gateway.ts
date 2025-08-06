import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SttService } from './stt.service';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { ResponseStreamingRecognizeData } from './stt.type';
import {
  END_STREAMING_RECOGNIZE,
  ERROR_STREAMING_RECOGNIZE,
  INIT_STREAMING_RECOGNIZE,
  PAUSE_STREAMING_RECOGNIZE,
  RESUME_STREAMING_RECOGNIZE,
  WRITE_STREAMING_RECOGNIZE,
} from './stt.constant';
import { SttSessionErrorResponse } from './classes/stt-session-error-response';
import { SttSessionSuccessResponse } from './classes/stt-session-success-response';
import { safely } from '../../shared/util/safely';
import { SttSessionWriteResponse } from './classes/stt-session-write-response';

@WebSocketGateway(2052, { cors: true })
export class SttGateway implements OnGatewayDisconnect {
  constructor(private sttService: SttService) {}

  @WebSocketServer()
  server: Server;

  /**
   * **스트리밍 초기화**
   * */
  @SubscribeMessage(INIT_STREAMING_RECOGNIZE)
  handleInitStreamingRecognize(client: Socket, meetingId: string) {
    this.sttService.initStreamingRecognize(client.id, meetingId);
  }

  /**
   * **스트리밍 데이터 쓰기**
   * */
  @SubscribeMessage(WRITE_STREAMING_RECOGNIZE)
  handleWriteStreamingRecognize(client: Socket, audio: Buffer) {
    this.sttService.writeStreamingRecognize(client.id, audio);
  }

  /**
   * **스트리밍 데이터 쓰기 응답**
   * */
  @OnEvent(WRITE_STREAMING_RECOGNIZE)
  handleWriteStreamingRecognizeResponseEvent({
    clientId,
    ...data
  }: SttSessionWriteResponse) {
    this.server.to(clientId).emit(WRITE_STREAMING_RECOGNIZE, data);
  }

  /**
   * **스트리밍 일시정지**
   * */
  @SubscribeMessage(PAUSE_STREAMING_RECOGNIZE)
  handlePauseStreamingRecognize(client: Socket) {
    this.sttService.pauseStreamingRecognize(client.id);
  }

  /**
   * **스트리밍 일시정지 응답**
   * */
  @OnEvent(PAUSE_STREAMING_RECOGNIZE)
  handlePauseStreamingRecognizeResponseEvent({
    clientId,
    ...data
  }: SttSessionSuccessResponse) {
    this.server.to(clientId).emit(PAUSE_STREAMING_RECOGNIZE, data);
  }

  /**
   * **스트리밍 재개**
   * */
  @SubscribeMessage(RESUME_STREAMING_RECOGNIZE)
  handleResumeStreamingRecognize(client: Socket) {
    this.sttService.resumeStreamingRecognize(client.id);
  }

  /**
   * **스트리밍 재개 응답**
   * */
  @OnEvent(RESUME_STREAMING_RECOGNIZE)
  handleResumeStreamingRecognizeResponseEvent({
    clientId,
    ...data
  }: SttSessionSuccessResponse) {
    this.server.to(clientId).emit(RESUME_STREAMING_RECOGNIZE, data);
  }

  /**
   * **스트리밍 종료**
   * */
  @SubscribeMessage(END_STREAMING_RECOGNIZE)
  handleEndStreamingRecognize(client: Socket) {
    this.sttService.endStreamingRecognize(client.id);
  }

  /**
   * **스트리밍 종료 응답**
   * */
  @OnEvent(END_STREAMING_RECOGNIZE)
  handleEndStreamingRecognizeResponseEvent({
    clientId,
    ...data
  }: SttSessionSuccessResponse) {
    this.server.to(clientId).emit(END_STREAMING_RECOGNIZE, data);
  }

  /**
   * **스트리밍 오류 응답**
   * */
  @OnEvent(ERROR_STREAMING_RECOGNIZE)
  handleErrorStreamingRecognizeResponseEvent({
    clientId,
    ...data
  }: SttSessionErrorResponse) {
    this.server.to(clientId).emit(ERROR_STREAMING_RECOGNIZE, data);
  }

  /**
   * **소켓 종료 시 스트리밍 종료**
   * */
  handleDisconnect(client: Socket) {
    safely(() => this.sttService.endStreamingRecognize(client.id));
  }
}
