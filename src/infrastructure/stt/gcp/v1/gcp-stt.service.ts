// 기존 GcpSttService에 추가
import { Inject, Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../shared/module/app-config/app-config';
import { GcpClient } from './utils/gcp-client';
import { SttSession } from '../../classes/stt-session';
import { gcpStreamingRecognitionConfig } from './utils/gcp-streaming-recognition-config';
import { google } from '@google-cloud/speech/build/protos/protos';
import { LoggerService } from '../../../../shared/module/logger/logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  END_STREAMING_RECOGNIZE,
  ERROR_STREAMING_RECOGNIZE,
  PAUSE_STREAMING_RECOGNIZE,
  RESUME_STREAMING_RECOGNIZE,
  WRITE_STREAMING_RECOGNIZE,
} from '../../stt.constant';
import { SttSessionWriteResponseForGcp } from '../../classes/stt-session-write-response-for-gcp';
import { MeetingRecordCreatedForGcp } from '../../../../domain/meeting-record/classes/meeting-record-created-for-gcp';
import { SttSessionErrorResponse } from '../../classes/stt-session-error-response';
import { SttSessionSuccessResponse } from '../../classes/stt-session-success-response';
import { LangchainService } from '../../../langchain/langchain.service';
import { LANGCHAIN_SERVICE } from '../../../langchain/const/langchain.const';
import { MeetingRecordService } from '../../../../domain/meeting-record/meeting-record.service';
import { MeetingService } from '../../../../domain/meeting/meeting.service';
import IStreamingRecognizeResponse = google.cloud.speech.v1.IStreamingRecognizeResponse;
import { MeetingStatus } from '../../../../domain/meeting/entity/meeting.entity';

@Injectable()
export class GcpSttService {
  constructor(
    private appConfig: AppConfig,
    private gcpClient: GcpClient,
    private logger: LoggerService,
    private eventEmitter: EventEmitter2,
    private meetingRecordService: MeetingRecordService,
    private meetingService: MeetingService,
    @Inject(LANGCHAIN_SERVICE) private langChainService: LangchainService
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
    try {
      const stream = this.gcpClient.streamingRecognize(
        gcpStreamingRecognitionConfig
      );

      // (콜백) 스트리밍 데이터 정상 수신
      stream.on('data', (data: IStreamingRecognizeResponse) => {
        data.results?.forEach((result) => {
          const isFinal = result.isFinal;
          const alternatives = result.alternatives;

          if (alternatives && alternatives[0].transcript && isFinal) {
            void this.meetingRecordService.create(
              new MeetingRecordCreatedForGcp(meetingId, result)
            );
          }

          if (alternatives) {
            void this.eventEmitter.emit(
              WRITE_STREAMING_RECOGNIZE,
              new SttSessionWriteResponseForGcp(clientId, result)
            );
          }
        });
      });

      // (콜백) 스트리밍 오류
      stream.on('error', (err) => {
        this.endStreamingRecognize(clientId);

        this.eventEmitter.emit(
          ERROR_STREAMING_RECOGNIZE,
          new SttSessionErrorResponse(clientId, err.message)
        );
      });

      // (콜백) 스트리밍 일시정지
      stream.on('pause', () => {
        this.eventEmitter.emit(
          PAUSE_STREAMING_RECOGNIZE,
          new SttSessionSuccessResponse(clientId, 'pause')
        );
      });

      // (콜백) 스트리밍 재개
      stream.on('resume', () => {
        this.eventEmitter.emit(
          RESUME_STREAMING_RECOGNIZE,
          new SttSessionSuccessResponse(clientId, 'resume')
        );
      });

      // (콜백) 스트리밍 종료
      stream.on('end', () => {
        (async () => {
          const records =
            await this.meetingRecordService.findByMeeting(meetingId);

          const transform = records.map(({ content, createdAt }) => ({
            content,
            createdAt,
          }));

          const toJson = JSON.stringify(transform, null, 2);

          const summary = await this.langChainService.generateText(toJson, {
            systemPrompt: `
            1. Always return to Korean
            2. Always return to Markdown format
            3. I sent you the meeting minutes data. Please summarize the contents.
            4. Omit code block symbols.
            5. Use titles and subtitles if necessary.
            `.trim(),
          });

          // 미팅 요약 업데이트
          await this.meetingService.updateMeeting(meetingId, {
            summary,
            status: MeetingStatus.COMPLETED,
          });

          this.eventEmitter.emit(
            END_STREAMING_RECOGNIZE,
            new SttSessionSuccessResponse(clientId, 'end')
          );
        })();
      });

      // 생성된 실시간 스트리밍 저장
      this.streams.set(clientId, new SttSession(clientId, stream));
    } catch (error) {
      // todo 오류 로그
      console.error(error);
    }
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
