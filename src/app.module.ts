import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { createDatabaseConfig } from './config/database-config';
import { AuthModule } from './domain/auth/auth.module';
import { DevTestModule } from './domain/dev-test/dev-test.module';
import { FileModule } from './domain/file/file.module';
import { MeetingRecordModule } from './domain/meeting-record/meeting-record.module';
import { SpaceModule } from './domain/space/space.module';
import { UserModule } from './domain/user/user.module';
import { WorkspaceMemberModule } from './domain/workspace-member/workspace-member.module';
import { WorkspaceMemberRoleModule } from './domain/workspace-member-role/workspace-member-role.module';
import { WorkspaceModule } from './domain/workspace/workspace.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { LangchainModule } from './infrastructure/langchain/langchain.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { SttModule } from './infrastructure/stt/stt.module';
import { AppConfig } from './shared/module/app-config/app-config';
import { AppConfigModule } from './shared/module/app-config/app-config.module';
import { LoggerModule } from './shared/module/logger/logger.module';
import { LoggingMiddleware } from './shared/module/logger/logging.middleware';
import { WorkspaceMiddleware } from './shared/middleware/workspace.middleware';
import { ResourceModule } from './domain/resource/resource.module';
import { MeetingModule } from './domain/meeting/meeting.module';
import { MeetingParticipantModule } from './domain/meeting-participant/meeting-participant.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => uuidv4(),
      },
    }),
    AppConfigModule,
    MikroOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (appConfig: AppConfig) => createDatabaseConfig(appConfig),
      inject: [AppConfig],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
      global: true,
    }),
    LoggerModule,
    CacheModule,
    LangchainModule,
    StorageModule,
    SpaceModule,
    SttModule,
    UserModule,
    AuthModule,
    DevTestModule,
    WorkspaceModule,
    WorkspaceMemberModule,
    WorkspaceMemberRoleModule,
    ResourceModule,
    FileModule,
    MeetingModule,
    MeetingRecordModule,
    MeetingParticipantModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
    consumer
      .apply(WorkspaceMiddleware)
      .forRoutes('dev-test/workspace/:workspaceId/*');
  }
}
