export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
}

export const CACHE_SERVICE = Symbol('CACHE_SERVICE');

export interface CacheConfig {
  type: 'memory' | 'redis';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
  };
  memory?: {
    maxSize?: number;
    ttl?: number;
  };
}
