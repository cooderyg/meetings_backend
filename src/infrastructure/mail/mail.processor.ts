import { Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SendMailJobData } from './interface/send-mail-job.data';
import { MailTemplateService } from './mail-template.service';
import { MailRepository } from '../../domain/mail/mail.repository';
import { MailStatus } from '../../domain/mail/enum/mail-status.enum';
import { ConfigService } from '@nestjs/config';

/**
 * Bull Queue 메일 발송 Processor (AWS SES SDK 사용)
 *
 * 작업 흐름:
 * 1. Queue에서 작업 수신
 * 2. 템플릿 컴파일
 * 3. AWS SES SDK로 메일 발송 (HTTPS API)
 * 4. MailLog 상태 업데이트 (SENT | FAILED)
 * 5. 실패 시 재시도 (최대 3회, 지수 백오프)
 *
 * 변경 사항:
 * - Nodemailer (SMTP) → AWS SES SDK (HTTPS)
 * - 성능 향상: 20-30 emails/sec (기존 5-10 emails/sec)
 * - IAM Role 기반 인증 지원
 */
@Processor('mail')
@Injectable()
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private readonly templateService: MailTemplateService,
    private readonly mailRepository: MailRepository,
    @Inject('SES_CLIENT') private readonly sesClient: SESClient,
    private readonly configService: ConfigService
  ) {
    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM_EMAIL',
      'noreply@anote.app'
    );
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Anote');
  }

  /**
   * 메일 발송 작업 처리 (AWS SES SDK 사용)
   */
  @Process('send-mail')
  async handleSendMail(job: Job<SendMailJobData>): Promise<void> {
    const { mailLogId, email, type, subject, templateData } = job.data;

    this.logger.log(
      `Processing mail job: ${mailLogId} (type: ${type}, to: ${email})`
    );

    try {
      // 1. 템플릿 컴파일
      const html = this.templateService.compileTemplate(type, templateData);

      // 2. AWS SES SendEmailCommand 생성
      const command = new SendEmailCommand({
        Source: `"${this.fromName}" <${this.fromEmail}>`,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html,
            },
          },
        },
      });

      // 3. AWS SES로 메일 발송
      const result = await this.sesClient.send(command);

      // 4. MailLog 상태를 SENT로 업데이트 (SES MessageId 저장)
      await this.mailRepository.updateStatus(
        mailLogId,
        MailStatus.SENT,
        result.MessageId
      );
      this.logger.log(
        `Mail sent successfully: ${mailLogId} (MessageId: ${result.MessageId})`
      );
    } catch (error) {
      this.logger.error(`Failed to send mail: ${mailLogId}`, error);

      // 5. 실패 처리
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // 재시도 횟수 증가
      await this.mailRepository.incrementRetryCount(mailLogId, errorMessage);

      // 최대 재시도 횟수 초과 확인
      const mailLog = await this.mailRepository.findById(mailLogId);
      if (mailLog && mailLog.retryCount >= 2) {
        // 3번 재시도 (0, 1, 2)
        await this.mailRepository.updateStatus(mailLogId, MailStatus.FAILED);
        this.logger.error(
          `Mail failed after max retries: ${mailLogId} (retries: ${mailLog.retryCount + 1})`
        );
      }

      // 에러를 다시 throw하여 Bull Queue가 재시도하도록 함
      throw error;
    }
  }
}
