import { MeetingRecordCreated } from './meeting-record-created';
import { google } from '@google-cloud/speech/build/protos/protos';
import IStreamingRecognitionResult = google.cloud.speech.v1.IStreamingRecognitionResult;

export class MeetingRecordCreatedForGcp extends MeetingRecordCreated {
  constructor(meeting: string, data: IStreamingRecognitionResult) {
    const alternatives = data.alternatives!;
    const result = alternatives[0].transcript as string;
    const time = Number(data.resultEndTime?.seconds);

    super(meeting, result, time);
  }
}
