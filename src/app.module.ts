import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createDatabaseConfig } from './config/database-config';
import { AuthModule } from './domain/auth/auth.module';
import { UserModule } from './domain/user/user.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { SttModule } from './infrastructure/stt/stt.module';
import { AppConfig } from './shared/module/app-config/app-config';
import { AppConfigModule } from './shared/module/app-config/app-config.module';
import { LoggerModule } from './shared/module/logger/logger.module';
import { LoggingMiddleware } from './shared/module/logger/logging.middleware';

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
    LoggerModule,
    CacheModule,
    SttModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfig],
  exports: [AppConfig],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
