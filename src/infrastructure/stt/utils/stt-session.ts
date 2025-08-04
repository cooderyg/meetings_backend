import Pumpify from 'pumpify';

export class SttSession {
  constructor(id: string, recognizeStream: Pumpify) {
    this.id = id;
    this.recognizeStream = recognizeStream;
  }
  id: string;
  recognizeStream: Pumpify;
  isActive: boolean = true;
  createdAt: Date = new Date();
  lastActivity: Date = new Date();
}
