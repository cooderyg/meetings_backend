import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfig } from '../../shared/module/app-config/app-config';
import { LoggerService } from '../../shared/module/logger/logger.service';
import {
  createCacheConfig,
  createRedisConfig,
} from '../../config/cache-config';
import { ICacheService, CacheConfig } from './interface/cache.interface';
import { MemoryCacheService } from './memory/memory-cache.service';
import { RedisCacheService } from './redis/redis-cache.service';

@Injectable()
export class CacheFactoryService implements OnModuleInit, OnModuleDestroy {
  private redis?: Redis;

  constructor(
    private readonly appConfig: AppConfig,
    private readonly logger: LoggerService
  ) {}

  createCacheService(config?: CacheConfig): ICacheService {
    const cacheConfig = config || createCacheConfig(this.appConfig);

    switch (cacheConfig.type) {
      case 'redis':
        return this.createRedisCache();
      case 'memory':
      default:
        return this.createMemoryCache(cacheConfig.memory);
    }
  }

  private createMemoryCache(
    config?: CacheConfig['memory']
  ): MemoryCacheService {
    return new MemoryCacheService(config);
  }

  private createRedisCache(): RedisCacheService {
    const redisConfig = createRedisConfig(this.appConfig);
    const redis = new Redis(redisConfig);
    this.redis = redis;

    redis.on('error', (error) => {
      this.logger.error(
        'Redis connection error',
        error.stack,
        'CacheFactoryService',
        { error: error.message }
      );
    });

    redis.on('connect', () => {
      this.logger.info('Redis connected successfully', 'CacheFactoryService');
    });

    return new RedisCacheService(redis);
  }

  async onModuleInit(): Promise<void> {
    const cacheConfig = createCacheConfig(this.appConfig);

    if (cacheConfig.type === 'redis') {
      const redisConfig = createRedisConfig(this.appConfig);
      this.redis = new Redis(redisConfig);

      await this.redis.ping();
      this.logger.info('Cache service initialized', 'CacheFactoryService');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.info('Redis connection closed', 'CacheFactoryService');
    }
  }
}
