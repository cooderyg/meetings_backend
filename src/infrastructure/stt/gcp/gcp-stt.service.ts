import { Injectable, Logger } from '@nestjs/common';
import { v2 } from '@google-cloud/speech';
import * as mp3Duration from 'mp3-duration';
import {
  ISttService,
  TranscriptionResult,
  WordInfo,
  TranscriptionConfig,
} from '../interface/stt.interface';
import { AppException } from '../../../shared/exception/app.exception';
import { ERROR_CODES } from '../../../shared/const/error-code.const';
import { AppConfig } from '../../../shared/module/app-config/app-config';

@Injectable()
export class GcpSttService implements ISttService {
  private readonly logger = new Logger(GcpSttService.name);
  private readonly speechClient: v2.SpeechClient;

  constructor(private readonly appConfig: AppConfig) {
    const gcpConfig = this.appConfig.gcp;

    this.speechClient = new v2.SpeechClient({
      projectId: gcpConfig.projectId,
      credentials: {
        type: gcpConfig.type,
        project_id: gcpConfig.projectId,
        private_key_id: gcpConfig.privateKeyId,
        private_key: gcpConfig.privateKey.replace(/\\n/g, '\n'),
        client_email: gcpConfig.clientEmail,
        client_id: gcpConfig.clientId,
      },
    });
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    try {
      // V2 API 동기식 인식: 10MB 또는 1분 중 먼저 도달하는 제한
      // 작은 파일은 직접 처리 시도
      const maxDirectSize = 2 * 1024 * 1024; // 2MB (보통 1분 이하)

      if (audioBuffer.length <= maxDirectSize) {
        this.logger.log(
          `Small file (${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB), processing directly...`
        );
        return this.processSingleChunk(audioBuffer, config);
      }

      // 큰 파일은 시간 기반 청크 분할
      this.logger.log(
        `Large file detected (${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB), splitting by time...`
      );
      return this.processTimeBasedChunks(audioBuffer, config);
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);

      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(ERROR_CODES.STT_SERVICE_ERROR);
    }
  }

  private async processSingleChunk(
    audioBuffer: Buffer,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    const gcpConfig = this.appConfig.gcp;
    const recognizerName = `projects/${gcpConfig.projectId}/locations/global/recognizers/_`;

    // V2 API 정확한 구조 - 자동 디코딩 사용 (청크 처리 호환성)
    const request = {
      recognizer: recognizerName,
      config: {
        autoDecodingConfig: {}, // 자동 오디오 포맷 감지 (M4A, MP3 등 지원)
        languageCodes: [this.getLanguageCode(config)],
        features: this.buildV2Features(config),
        model: 'latest_long',
      },
      content: audioBuffer.toString('base64'), // V2 API는 base64 string 요구
    };

    this.logger.log('Starting V2 recognition with improved config...');
    this.logger.debug(
      'Request config:',
      JSON.stringify(request.config, null, 2)
    );

    const response = await this.speechClient.recognize(request);
    const result = response[0]; // 구조분해할당 대신 직접 접근

    if (!result.results || result.results.length === 0) {
      throw new AppException(ERROR_CODES.STT_NO_RESULTS);
    }

    const firstResult = result.results[0];
    const alternative = firstResult.alternatives?.[0];

    if (!alternative) {
      throw new AppException(ERROR_CODES.STT_NO_ALTERNATIVES);
    }

    return {
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0,
      languageCode: this.getLanguageCode(config),
      // words 정보 완전 제거
    };
  }

  private async processTimeBasedChunks(
    audioBuffer: Buffer,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    try {
      // MP3 전체 길이 계산
      const totalDuration = await this.getAudioDuration(audioBuffer);
      this.logger.log(`Audio duration: ${totalDuration.toFixed(2)} seconds`);

      // 50초 단위로 분할 (60초 제한 안전 마진)
      const chunkDuration = 50; // 초
      const chunks = this.splitAudioByTimeEstimate(
        audioBuffer,
        totalDuration,
        chunkDuration
      );

      this.logger.log(
        `Processing ${chunks.length} time-based chunks (${chunkDuration}s each estimated)...`
      );

      // 최고속 완전 병렬 처리 (모든 청크 동시 처리)
      this.logger.log(
        `Starting FULL parallel processing of all ${chunks.length} chunks simultaneously...`
      );

      const allPromises = chunks.map(async (chunk, index) => {
        try {
          this.logger.log(
            `Processing chunk ${index + 1}/${chunks.length} in full parallel mode...`
          );
          return await this.processSingleChunk(chunk, config);
        } catch (error) {
          this.logger.warn(`Failed to process chunk ${index + 1}:`, error);
          return {
            transcript: '',
            confidence: 0,
            languageCode: this.getLanguageCode(config),
          };
        }
      });

      // 모든 청크를 동시에 처리하고 완료까지 대기
      const results = await Promise.all(allPromises);

      return this.mergeChunkResults(results, config);
    } catch (error) {
      this.logger.error('Failed to process time-based chunks:', error);
      throw error;
    }
  }

  private async getAudioDuration(audioBuffer: Buffer): Promise<number> {
    return new Promise((resolve, reject) => {
      mp3Duration(
        audioBuffer,
        (err: Error | null, duration: number | undefined) => {
          if (err) {
            reject(err);
          } else {
            resolve(duration || 0);
          }
        }
      );
    });
  }

  private splitAudioByTimeEstimate(
    audioBuffer: Buffer,
    totalDuration: number,
    chunkDuration: number
  ): Buffer[] {
    const chunks: Buffer[] = [];
    const totalSize = audioBuffer.length;
    const bytesPerSecond = totalSize / totalDuration;
    const bytesPerChunk = Math.floor(bytesPerSecond * chunkDuration);

    this.logger.log(
      `Splitting audio: ${totalDuration}s total, ${bytesPerSecond.toFixed(0)} bytes/sec`
    );

    let offset = 0;
    let chunkIndex = 0;

    while (offset < totalSize) {
      // MP3 프레임 경계를 찾기 위해 조정
      const chunkSize = Math.min(bytesPerChunk, totalSize - offset);
      let chunkEnd = offset + chunkSize;

      // MP3 동기화 헤더 찾기 (0xFF로 시작하는 패턴)
      if (chunkEnd < totalSize) {
        chunkEnd = this.findMp3FrameBoundary(audioBuffer, chunkEnd);
      }

      const chunk = audioBuffer.subarray(offset, chunkEnd);
      chunks.push(chunk);

      this.logger.log(
        `Chunk ${chunkIndex + 1}: ${offset}-${chunkEnd} (${(chunk.length / 1024 / 1024).toFixed(2)}MB)`
      );

      offset = chunkEnd;
      chunkIndex++;

      // 무한루프 방지
      if (chunkIndex > 100) {
        this.logger.warn('Too many chunks, breaking');
        break;
      }
    }

    return chunks;
  }

  private findMp3FrameBoundary(buffer: Buffer, startPos: number): number {
    // MP3 프레임은 0xFF로 시작하므로 가장 가까운 프레임 경계를 찾음
    for (
      let i = startPos;
      i < Math.min(startPos + 1000, buffer.length - 1);
      i++
    ) {
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        return i;
      }
    }
    // 프레임 경계를 찾지 못하면 원래 위치 반환
    return startPos;
  }

  private mergeChunkResults(
    results: TranscriptionResult[],
    config?: TranscriptionConfig
  ): TranscriptionResult {
    const transcripts = results
      .map((r) => r.transcript)
      .filter((t) => t.length > 0);
    const confidences = results.map((r) => r.confidence).filter((c) => c > 0);

    // 전체 전사 텍스트 합치기
    const mergedTranscript = transcripts.join(' ');

    // 평균 신뢰도 계산
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : 0;

    return {
      transcript: mergedTranscript,
      confidence: avgConfidence,
      languageCode: this.getLanguageCode(config),
      // words 정보 완전 제거로 응답 간소화
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async transcribeStream(
    audioStream: NodeJS.ReadableStream,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    try {
      // 스트림을 버퍼로 변환하여 배치 처리 사용 (V2 스트리밍 API가 복잡하므로)
      const chunks: Buffer[] = [];

      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      const audioBuffer = Buffer.concat(chunks);
      return this.transcribeAudio(audioBuffer, config);
    } catch (error) {
      this.logger.error('Failed to transcribe audio stream', error);

      if (error instanceof AppException) {
        throw error;
      }

      throw new AppException(ERROR_CODES.STT_SERVICE_ERROR);
    }
  }

  private buildV2Features(config?: TranscriptionConfig) {
    // V2 API에서 기본 recognizer가 지원하는 features만 사용 (Word 정보 제거)
    return {
      enableWordTimeOffsets: false, // Word 정보 비활성화
      enableWordConfidence: false, // Word 신뢰도 비활성화
      enableAutomaticPunctuation:
        config?.features?.enableAutomaticPunctuation !== false,
      // Speaker Diarization은 기본 recognizer에서 지원하지 않으므로 제거
    };
  }

  private getLanguageCode(config?: TranscriptionConfig): string {
    return config?.languageCode || 'ko-KR';
  }

  private shouldIncludeWords(config?: TranscriptionConfig): boolean {
    return false; // 항상 false로 Word 정보 제거
  }

  private convertDurationToSeconds(duration: any): number {
    if (!duration) return 0;

    const seconds = Number(duration.seconds || 0);
    const nanos = Number(duration.nanos || 0);

    return seconds + nanos / 1000000000;
  }
}
