import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SESClient } from '@aws-sdk/client-ses';

// Domain Layer
import { MailLog } from './entity/mail-log.entity';
import { MailRepository } from './mail.repository';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

// Infrastructure Layer
import { MailProcessor } from '../../infrastructure/mail/mail.processor';
import { MailTemplateService } from '../../infrastructure/mail/mail-template.service';
import { MailCleanupService } from '../../infrastructure/mail/mail-cleanup.service';

@Module({
  imports: [
    ConfigModule, // ✅ ConfigService를 위해 필요

    // Entity 등록
    MikroOrmModule.forFeature([MailLog]),

    // Bull Queue 등록 (메일 발송 큐)
    BullModule.registerQueueAsync({
      name: 'mail',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3, // 최대 3회 재시도
          backoff: {
            type: 'exponential', // 지수 백오프
            delay: 5000, // 5초부터 시작
          },
          removeOnComplete: true, // 완료된 작업 자동 삭제
          removeOnFail: false, // 실패한 작업은 보존 (디버깅용)
        },
      }),
      inject: [ConfigService],
    }),

    // Cron Job 활성화
    ScheduleModule.forRoot(),
  ],
  controllers: [MailController],
  providers: [
    // Domain Layer
    MailRepository,
    MailService,

    // Infrastructure Layer
    MailProcessor,
    MailTemplateService,
    MailCleanupService,

    // AWS SES Client Provider
    {
      provide: 'SES_CLIENT',
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('AWS_REGION', 'ap-northeast-2');
        return new SESClient({ region });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
