import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfig } from './shared/module/app-config/app-config';
import { AppConfigModule } from './shared/module/app-config/app-config.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { createDatabaseConfig } from './config/database-config';
import { UserModule } from './domain/user/user.module';
import { LoggerModule } from './shared/module/logger/logger.module';
import { LoggingMiddleware } from './shared/module/logger/logging.middleware';
import { CacheModule } from './infrastructure/cache/cache.module';
import { ClsModule } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';

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
    UserModule,
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
