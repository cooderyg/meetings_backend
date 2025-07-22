import { Injectable } from '@nestjs/common';
import * as Joi from 'joi';

type NodeEnv = 'development' | 'staging' | 'production';

@Injectable()
export class AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly appName: string;
  readonly apiVersion: string;

  readonly database = {
    host: '',
    port: 5432,
    username: '',
    password: '',
    name: '',
    synchronize: false,
  };

  readonly auth = {
    jwtSecret: '',
    jwtExpiresIn: '1d',
    refreshSecret: '',
    refreshExpiresIn: '7d',
  };

  readonly cache = {
    type: '',
    redis: {
      host: '',
      port: 6379,
      password: '',
    },
    memory: {
      maxSize: 1000,
      ttl: 300000,
    },
  };

  readonly gcp = {
    type: '',
    projectId: '',
    privateKeyId: '',
    privateKey: '',
    clientEmail: '',
    clientId: '',
    clientSecret: '',
  };

  readonly oauth = {
    redirectUri: '',
  };

  readonly stt = {
    provider: 'GCP' as 'GCP' | 'AWS',
  };

  static validationSchema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'staging', 'production')
      .default('development'),
    PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().required(),
    API_VERSION: Joi.string().required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_SYNCHRONIZE: Joi.boolean().default(false),
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().required(),
    REFRESH_SECRET: Joi.string().required(),
    REFRESH_EXPIRES_IN: Joi.string().required(),
    CACHE_TYPE: Joi.string().valid('memory', 'redis').default('memory'),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    REDIS_DB: Joi.number().default(0),
    CACHE_MAX_SIZE: Joi.number().default(1000),
    CACHE_TTL: Joi.number().default(300000),
    GCP_TYPE: Joi.string().default('service_account'),
    GCP_PROJECT_ID: Joi.string().required(),
    GCP_PRIVATE_KEY_ID: Joi.string().required(),
    GCP_PRIVATE_KEY: Joi.string().required(),
    GCP_CLIENT_EMAIL: Joi.string().required(),
    GCP_CLIENT_ID: Joi.string().required(),
    GCP_CLIENT_SECRET: Joi.string().required(),
    OAUTH_REDIRECT_URI: Joi.string().required(),
    STT_PROVIDER: Joi.string().valid('GCP', 'AWS').default('GCP'),
  });

  constructor() {
    this.nodeEnv = (process.env.NODE_ENV as NodeEnv) || 'development';
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.appName = process.env.APP_NAME || '';
    this.apiVersion = process.env.API_VERSION || '';

    this.database = {
      host: process.env.DB_HOST || '',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || '',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || '',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    };

    this.auth = {
      jwtSecret: process.env.JWT_SECRET || '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
      refreshSecret: process.env.REFRESH_SECRET || '',
      refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
    };

    this.cache = {
      type: (process.env.CACHE_TYPE as 'memory' | 'redis') || 'memory',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
      },
      memory: {
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
        ttl: parseInt(process.env.CACHE_TTL || '300000', 10),
      },
    };

    this.gcp = {
      type: process.env.GCP_TYPE || 'service_account',
      projectId: process.env.GCP_PROJECT_ID || '',
      privateKeyId: process.env.GCP_PRIVATE_KEY_ID || '',
      privateKey: process.env.GCP_PRIVATE_KEY || '',
      clientEmail: process.env.GCP_CLIENT_EMAIL || '',
      clientId: process.env.GCP_CLIENT_ID || '',
      clientSecret: process.env.GCP_CLIENT_SECRET || '',
    };

    this.stt = {
      provider: (process.env.STT_PROVIDER as 'GCP' | 'AWS') || 'GCP',
    };
  }
}
