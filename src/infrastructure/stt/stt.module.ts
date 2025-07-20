import { Module } from '@nestjs/common';
import { STT_SERVICE } from './interface/stt.interface';
import { AppConfigModule } from '../../shared/module/app-config/app-config.module';
import { SttFactoryService } from './stt-factory.service';

@Module({
  imports: [AppConfigModule],
  providers: [
    SttFactoryService,
    {
      provide: STT_SERVICE,
      useFactory: (sttFactory: SttFactoryService) => {
        return sttFactory.createSttService();
      },
      inject: [SttFactoryService],
    },
  ],
  exports: [STT_SERVICE, SttFactoryService],
})
export class SttModule {}
