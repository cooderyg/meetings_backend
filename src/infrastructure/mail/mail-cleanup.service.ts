import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailRepository } from '../../domain/mail/mail.repository';

/**
 * 메일 로그 정리 서비스 (Cron Job)
 *
 * 매일 자정(KST 00:00)에 1년 이상 된 SENT 상태 로그 자동 삭제
 * - SENT 상태: 정상 발송 완료 (삭제 대상)
 * - FAILED 상태: 발송 실패 (보존, 디버깅용)
 * - PENDING 상태: 발송 대기 중 (보존)
 */
@Injectable()
export class MailCleanupService {
  private readonly logger = new Logger(MailCleanupService.name);

  constructor(private readonly mailRepository: MailRepository) {}

  /**
   * 1년 이상 된 SENT 로그 자동 삭제
   * Cron: 매일 00:00 (서버 로컬 타임존)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldSentLogs(): Promise<void> {
    this.logger.log('Starting mail log cleanup...');

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const deletedCount =
        await this.mailRepository.deleteOldSentLogs(oneYearAgo);

      this.logger.log(
        `Mail log cleanup completed. Deleted ${deletedCount} old SENT logs (older than ${oneYearAgo.toISOString()})`
      );
    } catch (error) {
      this.logger.error('Failed to cleanup mail logs', error);
    }
  }
}
