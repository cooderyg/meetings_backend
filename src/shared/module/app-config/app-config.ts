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
  }
}
