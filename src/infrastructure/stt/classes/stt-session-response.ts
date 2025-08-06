export class SttSessionResponse {
  constructor(
    clientId: string,
    type: string,
    isConnected: boolean,
    message?: string
  ) {
    this.clientId = clientId;
    this.type = type;
    this.isConnected = isConnected;
    this.message = message || null;
  }
  clientId: string;
  type: string;
  isConnected: boolean;
  message: string | null = null;
}
