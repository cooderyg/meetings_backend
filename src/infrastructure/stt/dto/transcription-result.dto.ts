export interface WordDetail {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number; // 0.0 to 1.0
  speakerId?: string | number;
}

export interface TranscriptionResult {
  transcript: string; // 전체 변환 텍스트
  confidence: number; // 전체 텍스트에 대한 신뢰도 점수
  words?: WordDetail[]; // 단어별 상세 정보 배열
  languageCode: string; // 감지된 언어 코드
}
