export interface AudioFormat {
  encoding:
    | 'LINEAR16'
    | 'FLAC'
    | 'MP3'
    | 'OGG_OPUS'
    | 'MULAW'
    | 'AMR'
    | 'AMR_WB'
    | 'SPEEX_WITH_HEADER_BYTE';
  sampleRateHertz?: number;
  channelCount?: number;
}

export interface DiarizationConfig {
  enableSpeakerDiarization: boolean;
  minSpeakerCount?: number;
  maxSpeakerCount?: number;
}

export interface SpeechAdaptationConfig {
  phrases: string[];
  boost?: number;
}

export interface TranscriptionFeatures {
  enableAutomaticPunctuation?: boolean;
  enableWordConfidence?: boolean;
  enableWordTimeOffsets?: boolean;
  diarizationConfig?: DiarizationConfig;
  speechAdaptation?: SpeechAdaptationConfig;
}

export interface TranscriptionConfig {
  languageCode: string; // BCP-47 language tag (e.g., 'ko-KR')
  audioFormat?: AudioFormat; // 선택적 - 자동 감지도 지원
  features?: TranscriptionFeatures;
}
