import { TranscriptionResult, WordDetail, TranscriptionConfig } from '../dto';
export { TranscriptionResult, WordDetail as WordInfo, TranscriptionConfig };

export interface ISttService {
  transcribeAudio(
    audioBuffer: Buffer,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult>;
  transcribeStream(
    audioStream: NodeJS.ReadableStream,
    config?: TranscriptionConfig
  ): Promise<TranscriptionResult>;
}

/**
 * STT 서비스 의존성 주입 토큰
 */
export const STT_SERVICE = Symbol('ISttService');
