import { google } from '@google-cloud/speech/build/protos/protos';
import IStreamingRecognitionConfig = google.cloud.speech.v1.IStreamingRecognitionConfig;

export const gcpStreamingRecognitionConfig: IStreamingRecognitionConfig = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'ko-KR',
    model: 'latest_long',
    enableAutomaticPunctuation: false, // 구두점 비활성화로 속도 향상
    maxAlternatives: 1, // 대안 개수 최소화
    profanityFilter: false, // 욕설 필터 비활성화

    enableWordTimeOffsets: true,
    enableWordConfidence: true,

    // 오디오 설정
    // audioChannelCount: 1,
    useEnhanced: true, // Enhanced 모델은 더 정확하지만 느림
  },
  interimResults: true,
  singleUtterance: false,
};
