import { google } from '@google-cloud/speech/build/protos/protos';
import ISpeechRecognitionAlternative = google.cloud.speech.v1.ISpeechRecognitionAlternative;

export class GcpSttUtil {
  static processSpeakerDiarization(
    alternatives: ISpeechRecognitionAlternative[]
  ) {
    const words = alternatives[0]?.words || [];
    console.log(words);
  }
}
