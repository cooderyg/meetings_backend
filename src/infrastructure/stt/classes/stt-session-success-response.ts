import { SttSessionResponse } from './stt-session-response';

export class SttSessionSuccessResponse extends SttSessionResponse {
  constructor(clientId: string, type: string, message?: string) {
    super(clientId, type, true, message);
  }
}
