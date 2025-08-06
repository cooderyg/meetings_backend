import { SttSessionResponse } from './stt-session-response';

export class SttSessionErrorResponse extends SttSessionResponse {
  constructor(clientId: string, message?: string) {
    super(clientId, 'error', false, message);
  }
}
