import { SttSessionResponse } from './stt-session-response';

export class SttSessionWriteResponse extends SttSessionResponse {
  constructor(
    clientId: string,
    speakerTag: string | null,
    time: number,
    content: string,
    isFinal: boolean
  ) {
    super(clientId, 'write', true);
    this.speakerTag = speakerTag;
    this.time = time;
    this.content = content;
    this.isFinal = isFinal;
  }
  speakerTag: string | null = null;
  time: number;
  content: string;
  isFinal: boolean;
}
