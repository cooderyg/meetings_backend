import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MailRepository } from './mail.repository';
import { MailLog } from './entity/mail-log.entity';
import { MailType } from './enum/mail-type.enum';
import { MailStatus } from './enum/mail-status.enum';
import { SendWelcomeMailArgs } from './interface/send-welcome-mail.args';
import { SendInvitationMailArgs } from './interface/send-invitation-mail.args';
import { SendMailJobData } from '../../infrastructure/mail/interface/send-mail-job.data';
import { AppError } from '../../shared/exception/app.error';

@Injectable()
export class MailService {
  constructor(
    private readonly mailRepository: MailRepository,
    @InjectQueue('mail') private readonly mailQueue: Queue<SendMailJobData>
  ) {}

  /**
   * 환영 메일 발송
   */
  async sendWelcomeMail(args: SendWelcomeMailArgs): Promise<MailLog> {
    // 이메일 형식 검증
    const validation = this.validateEmail(args.email);
    if (!validation.isValid) {
      throw new AppError('mail.send.invalidEmail', {
        email: args.email,
        reason: validation.reason,
      });
    }

    // 메일 로그 생성
    const mailLog = await this.mailRepository.create({
      userId: args.userId,
      email: args.email,
      type: MailType.WELCOME,
      subject: `${args.name}님, 환영합니다!`,
      templateData: {
        name: args.name,
      },
      status: MailStatus.PENDING,
    });

    // Bull Queue에 메일 발송 작업 추가
    await this.mailQueue.add('send-mail', {
      mailLogId: mailLog.id,
      email: mailLog.email,
      type: mailLog.type,
      subject: mailLog.subject,
      templateData: mailLog.templateData,
    });

    return mailLog;
  }

  /**
   * 초대 메일 발송
   */
  async sendInvitationMail(args: SendInvitationMailArgs): Promise<MailLog> {
    // 이메일 형식 검증
    const validation = this.validateEmail(args.email);
    if (!validation.isValid) {
      throw new AppError('mail.send.invalidEmail', {
        email: args.email,
        reason: validation.reason,
      });
    }

    // 초대 만료 검증
    if (args.expiresAt < new Date()) {
      throw new AppError('mail.send.expiredInvitation', {
        expiresAt: args.expiresAt,
      });
    }

    // 제목 생성
    const subject = args.isWorkspaceInvitation
      ? `${args.inviterName}님이 ${args.workspaceName}에 초대했습니다`
      : `${args.inviterName}님이 ${args.spaceName}에 초대했습니다`;

    // 메일 로그 생성
    const mailLog = await this.mailRepository.create({
      userId: args.userId,
      email: args.email,
      type: MailType.INVITATION,
      subject,
      templateData: {
        inviterName: args.inviterName,
        workspaceName: args.workspaceName,
        spaceName: args.spaceName,
        invitationToken: args.invitationToken,
        expiresAt: args.expiresAt,
        isWorkspaceInvitation: args.isWorkspaceInvitation,
      },
      status: MailStatus.PENDING,
    });

    // Bull Queue에 메일 발송 작업 추가
    await this.mailQueue.add('send-mail', {
      mailLogId: mailLog.id,
      email: mailLog.email,
      type: mailLog.type,
      subject: mailLog.subject,
      templateData: mailLog.templateData,
    });

    return mailLog;
  }

  /**
   * 메일 로그 조회
   */
  async getMailLog(id: string): Promise<MailLog> {
    const mailLog = await this.mailRepository.findById(id);

    if (!mailLog) {
      throw new AppError('mail.fetch.notFound', { id });
    }

    return mailLog;
  }

  /**
   * 사용자 메일 이력 조회
   */
  async getUserMailHistory(userId: string, limit?: number): Promise<MailLog[]> {
    return this.mailRepository.findUserHistory(userId, limit);
  }

  /**
   * 이메일 형식 검증 (Helper)
   */
  private validateEmail(email: string): { isValid: boolean; reason?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      return { isValid: false, reason: 'Email is required' };
    }

    if (!emailRegex.test(email)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    return { isValid: true };
  }
}
