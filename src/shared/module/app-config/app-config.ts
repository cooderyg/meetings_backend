import { Injectable } from '@nestjs/common';
import * as Joi from 'joi';

type NodeEnv = 'development' | 'staging' | 'production' | 'test';

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
  };

  readonly oauth = {
    gcpClientId: '',
    gcpClientSecret: '',
    redirectUri: '',
  };

  readonly stt = {
    provider: 'GCP' as 'GCP' | 'AWS',
  };

  readonly storage = {
    provider: 'AWS' as 'AWS' | 'GCP',
    aws: {
      region: '',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
    },
  };

  readonly langchain = {
    openaiApiKey: '',
    langsmithTracing: false,
    langsmithEndpoint: '',
    langsmithApiKey: '',
    langsmithProject: '',
  };

  static validationSchema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'staging', 'production', 'test')
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
    OAUTH_GCP_CLIENT_ID: Joi.string().required(),
    OAUTH_GCP_CLIENT_SECRET: Joi.string().required(),
    OAUTH_REDIRECT_URI: Joi.string().required(),
    STT_PROVIDER: Joi.string().valid('GCP', 'AWS').default('GCP'),
    STORAGE_PROVIDER: Joi.string().valid('AWS', 'GCP').default('AWS'),
    AWS_REGION: Joi.string().default('ap-northeast-2'),
    AWS_S3_BUCKET: Joi.string().required(),
    AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
    AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
    OPENAI_API_KEY: Joi.string().required(),
    LANGSMITH_TRACING: Joi.boolean().default(false),
    LANGSMITH_ENDPOINT: Joi.string().default('https://api.smith.langchain.com'),
    LANGSMITH_API_KEY: Joi.string().allow('').optional(),
    LANGSMITH_PROJECT: Joi.string().default('meetings_backend'),
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
    };

    this.stt = {
      provider: (process.env.STT_PROVIDER as 'GCP' | 'AWS') || 'GCP',
    };

    this.oauth = {
      gcpClientId: process.env.OAUTH_GCP_CLIENT_ID || '',
      gcpClientSecret: process.env.OAUTH_GCP_CLIENT_SECRET || '',
      redirectUri: process.env.OAUTH_REDIRECT_URI || '',
    };
    this.storage = {
      provider: (process.env.STORAGE_PROVIDER as 'AWS' | 'GCP') || 'AWS',
      aws: {
        region: process.env.AWS_REGION || 'ap-northeast-2',
        bucket: process.env.AWS_S3_BUCKET || '',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    };

    this.langchain = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      langsmithTracing: process.env.LANGSMITH_TRACING === 'true',
      langsmithEndpoint:
        process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
      langsmithApiKey: process.env.LANGSMITH_API_KEY || '',
      langsmithProject: process.env.LANGSMITH_PROJECT || 'meetings_backend',
    };
  }
}
