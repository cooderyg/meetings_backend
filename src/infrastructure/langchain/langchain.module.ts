import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LangchainService } from './langchain.service';
import { LANGCHAIN_SERVICE } from './const/langchain.const';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LANGCHAIN_SERVICE,
      useClass: LangchainService,
    },
  ],
  exports: [LANGCHAIN_SERVICE],
})
export class LangchainModule {}
