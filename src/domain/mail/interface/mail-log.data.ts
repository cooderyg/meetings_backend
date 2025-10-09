import { MailType } from '../enum/mail-type.enum';
import { MailStatus } from '../enum/mail-status.enum';

export interface CreateMailLogData {
  userId?: string;
  email: string;
  type: MailType;
  subject: string;
  templateData: any;
  status: MailStatus;
}
