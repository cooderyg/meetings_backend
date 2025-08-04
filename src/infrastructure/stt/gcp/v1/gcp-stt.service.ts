// 기존 GcpSttService에 추가
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../shared/module/app-config/app-config';
import { GcpClient } from './utils/gcp-client';
import { SttSession } from '../../utils/stt-session';
import { gcpStreamingRecognitionConfig } from './utils/gcp-streaming-recognition-config';
import { google } from '@google-cloud/speech/build/protos/protos';
import { LoggerService } from '../../../../shared/module/logger/logger.service';
import IStreamingRecognizeResponse = google.cloud.speech.v1.IStreamingRecognizeResponse;
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 } from 'uuid';
import { GcpSttUtil } from './gcp-stt.util';

@Injectable()
export class GcpSttService {
  constructor(
    private appConfig: AppConfig,
    private gcpClient: GcpClient,
    private logger: LoggerService,
    private eventEmitter: EventEmitter2
  ) {}
  private streams: Map<string, SttSession> = new Map(); // 실시간 스트림 관리

  /**
   * **실시간 스트리밍 초기화**
   * */
  initStreamingRecognize(clientId: string, meetingId: string) {
    // 기존 세션 정보가 있을 경우 종료 필요
    const session = this.hasStreamingRecognize(clientId);
    if (session) this.endStreamingRecognize(clientId);

    // 실시간 스트리밍 생성
    const init = this.gcpClient
      .streamingRecognize(gcpStreamingRecognitionConfig)
      .on('data', (data: IStreamingRecognizeResponse) => {
        data.results?.forEach((result) => {
          const isFinal = result.isFinal;
          const alternatives = result.alternatives;

          if (alternatives && isFinal) {
            console.log(result);
            void this.eventEmitter.emit('meeting-record.created', {
              meeting: meetingId,
              content: alternatives[0].transcript,
              time: Number(result.resultEndTime?.seconds),
            });
          }

          if (alternatives) {
            void this.eventEmitter.emit('response-streaming-recognize', {
              clientId,
              result: alternatives[0].transcript,
              isFinal,
            });
          }
        });
      })
      .on('error', (err) => {
        // todo 오류 로그
        this.endStreamingRecognize(clientId);
      });

    // 생성된 실시간 스트리밍 저장
    this.streams.set(clientId, new SttSession(clientId, init));

    console.log('good');
  }

  /**
   * **실시간 스트리밍 데이터 전송**
   * */
  writeStreamingRecognize(clientId: string, audio: Buffer) {
    const session = this.findStreamingRecognize(clientId);
    session.recognizeStream.write(audio);
    session.lastActivity = new Date();
  }

  /**
   * **실시간 스트리밍 존재여부**
   * */
  hasStreamingRecognize(clientId: string) {
    return this.streams.has(clientId);
  }

  /**
   * **실시간 스트리밍 존재여부**
   * @desc 없을 경우 오류를 반환합니다.
   * */
  findStreamingRecognize(clientId: string) {
    const session = this.streams.get(clientId);
    if (!session) throw new Error('session not found');
    return session;
  }

  /**
   * **실시간 스트리밍 재개**
   * */
  resumeStreamingRecognize(clientId: string) {
    const session = this.findStreamingRecognize(clientId);
    session.isActive = true;
    session.lastActivity = new Date();
    session.recognizeStream.resume();
    return true;
  }

  /**
   * **실시간 스트리밍 일시정지**
   * */
  pauseStreamingRecognize(clientId: string) {
    const session = this.findStreamingRecognize(clientId);
    session.isActive = false;
    session.recognizeStream.pause();
  }

  /**
   * **실시간 스트리밍 종료**
   * */
  endStreamingRecognize(clientId: string) {
    const session = this.findStreamingRecognize(clientId);
    session.recognizeStream.end();
    this.streams.delete(clientId);
  }
}
