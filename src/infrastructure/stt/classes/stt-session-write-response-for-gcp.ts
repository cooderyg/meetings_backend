import { google } from '@google-cloud/speech/build/protos/protos';
import IStreamingRecognitionResult = google.cloud.speech.v1.IStreamingRecognitionResult;
import { SttSessionWriteResponse } from './stt-session-write-response';

export class SttSessionWriteResponseForGcp extends SttSessionWriteResponse {
  constructor(clientId: string, data: IStreamingRecognitionResult) {
    const alternatives = data.alternatives!;
    const result = alternatives[0].transcript as string;
    const time = Number(data.resultEndTime?.seconds);
    const isFinal = data.isFinal!;

    super(clientId, null, time, result, isFinal);
  }
}
