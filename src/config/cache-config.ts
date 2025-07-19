import { RedisOptions } from 'ioredis';
import { CacheConfig } from '../infrastructure/cache/interface/cache.interface';
import { AppConfig } from '../shared/module/app-config/app-config';

export function createCacheConfig(appConfig: AppConfig): CacheConfig {
  switch (appConfig.cache.type) {
    case 'redis':
      return {
        type: 'redis',
        redis: {
          host: appConfig.cache.redis.host,
          port: appConfig.cache.redis.port,
        },
      };
    case 'memory':
    default:
      return {
        type: 'memory',
        memory: {
          maxSize: appConfig.cache.memory.maxSize,
          ttl: appConfig.cache.memory.ttl,
        },
      };
  }
}

export function createRedisConfig(appConfig: AppConfig): RedisOptions {
  return {
    host: appConfig.cache.redis.host,
    port: appConfig.cache.redis.port,
    connectTimeout: 3000,
    ...(appConfig.nodeEnv === 'development' && {
      password: appConfig.cache.redis.password,
    }),
    ...(appConfig.nodeEnv !== 'development' && {
      tls: {
        servername: appConfig.cache.redis.host,
        rejectUnauthorized: true,
      },
    }),
  };
}
