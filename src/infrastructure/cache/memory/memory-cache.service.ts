import { Injectable } from '@nestjs/common';
import { ICacheService } from '../interface/cache.interface';

interface CacheItem<T> {
  value: T;
  expiration?: number;
}

@Injectable()
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(options?: { ttl?: number; maxSize?: number }) {
    this.defaultTtl = options?.ttl || 300000; // 5분
    this.maxSize = options?.maxSize || 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (item.expiration && Date.now() > item.expiration) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiration = ttl
      ? Date.now() + ttl
      : this.defaultTtl
        ? Date.now() + this.defaultTtl
        : undefined;

    this.cache.set(key, { value, expiration });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (item.expiration && Date.now() > item.expiration) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());

    if (!pattern) {
      return allKeys;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter((key) => regex.test(key));
  }
}
