import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ICacheService } from '../interface/cache.interface';

@Injectable()
export class RedisCacheService implements ICacheService {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);

    if (ttl) {
      await this.redis.setex(
        key,
        Math.max(1, Math.floor(ttl)),
        serializedValue
      );
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  async keys(pattern = '*'): Promise<string[]> {
    return await this.redis.keys(pattern);
  }
}
