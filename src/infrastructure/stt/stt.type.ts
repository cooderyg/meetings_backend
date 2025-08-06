export interface ResponseStreamingRecognizeData {
  clientId: string;
  time: number;
  speakerTag: string | null;
  result: string;
  isFinal: boolean;
}

export interface ResponseStreamingRecognize {
  clientId: string;
  result: boolean;
  message: string | null;
}
