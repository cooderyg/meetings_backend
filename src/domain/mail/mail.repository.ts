import { Injectable } from '@nestjs/common';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MailLog } from './entity/mail-log.entity';
import { MailType } from './enum/mail-type.enum';
import { MailStatus } from './enum/mail-status.enum';
import { CreateMailLogData } from './interface/mail-log.data';
import {
  MAIL_LOG_DETAIL_POPULATE,
  MAIL_LOG_LIST_FIELDS,
} from './constant/mail-log.constant';

@Injectable()
export class MailRepository {
  constructor(
    @InjectRepository(MailLog)
    private readonly repository: EntityRepository<MailLog>
  ) {
    this.em = repository.getEntityManager();
  }

  private em: EntityManager;

  async create(data: CreateMailLogData): Promise<MailLog> {
    const mailLog = new MailLog();
    mailLog.email = data.email;
    mailLog.type = data.type;
    mailLog.subject = data.subject;
    mailLog.templateData = data.templateData;
    mailLog.status = data.status;

    if (data.userId) {
      mailLog.user = this.em.getReference('User', data.userId) as any;
    }

    await this.em.persistAndFlush(mailLog);
    await this.em.populate(mailLog, MAIL_LOG_DETAIL_POPULATE);
    return mailLog;
  }

  async findById(id: string): Promise<MailLog | null> {
    return this.repository.findOne(
      { id },
      { populate: MAIL_LOG_DETAIL_POPULATE }
    );
  }

  async findUserHistory(
    userId: string,
    limit: number = 10
  ): Promise<MailLog[]> {
    return this.repository.find(
      { user: { id: userId } },
      {
        orderBy: { createdAt: 'DESC' },
        limit,
      }
    );
  }

  async updateStatus(
    id: string,
    status: MailStatus,
    sesMessageId?: string
  ): Promise<void> {
    const mailLog = await this.repository.findOne({ id });
    if (!mailLog) return;

    mailLog.status = status;
    if (status === MailStatus.SENT) {
      mailLog.sentAt = new Date();
      if (sesMessageId) {
        mailLog.sesMessageId = sesMessageId;
      }
    }

    await this.em.flush();
  }

  async incrementRetryCount(id: string, errorMessage: string): Promise<void> {
    const mailLog = await this.repository.findOne({ id });
    if (!mailLog) return;

    mailLog.retryCount += 1;
    mailLog.errorMessage = errorMessage;
    mailLog.status = MailStatus.FAILED;

    await this.em.flush();
  }

  async deleteOldSentLogs(beforeDate: Date): Promise<number> {
    return this.repository.nativeDelete({
      createdAt: { $lt: beforeDate },
      status: MailStatus.SENT,
    });
  }
}
