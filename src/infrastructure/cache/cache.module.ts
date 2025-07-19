import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ICacheService, CACHE_SERVICE } from './interface/cache.interface';
import { CacheFactoryService } from './cache-factory.service';
import { AppConfigModule } from '../../shared/module/app-config/app-config.module';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    CacheFactoryService,
    {
      provide: CACHE_SERVICE,
      useFactory: (cacheFactory: CacheFactoryService): ICacheService => {
        return cacheFactory.createCacheService();
      },
      inject: [CacheFactoryService],
    },
  ],
  exports: [CACHE_SERVICE, CacheFactoryService],
})
export class CacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cacheFactoryService: CacheFactoryService) {}

  async onModuleInit(): Promise<void> {
    await this.cacheFactoryService.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.cacheFactoryService.onModuleDestroy();
  }
}
