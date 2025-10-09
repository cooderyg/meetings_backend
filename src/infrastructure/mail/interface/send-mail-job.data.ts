import { MailType } from '../../../domain/mail/enum/mail-type.enum';

/**
 * Bull Queue에 전달되는 메일 발송 작업 데이터
 */
export interface SendMailJobData {
  /** 메일 로그 ID */
  mailLogId: string;

  /** 수신자 이메일 */
  email: string;

  /** 메일 타입 */
  type: MailType;

  /** 메일 제목 */
  subject: string;

  /** 템플릿 데이터 (Handlebars 변수) */
  templateData: Record<string, any>;
}
