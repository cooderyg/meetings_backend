import { Options } from '@mikro-orm/core';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { join } from 'path';
import { AppConfig } from '../shared/module/app-config/app-config';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

import { ACTIVE_ONLY, NOT_DELETED } from '../shared/const/index';

export function createDatabaseConfig(appConfig: AppConfig): Options {
  const commonConfig = {
    entities: ['./dist/**/*.entity.js'], // 컴파일된 엔티티 위치
    entitiesTs: ['./src/**/*.entity.ts'], // TypeScript 소스 엔티티 위치
    metadataProvider: TsMorphMetadataProvider,
    migrations: {
      path: join(process.cwd(), 'dist/database/migration'),
      pathTs: join(process.cwd(), 'src/database/migration'),
      glob: '!(*.d).{js,ts}',
    },
    seeder: {
      path: join(process.cwd(), 'dist/infrastructure/database/seeder'),
      pathTs: join(process.cwd(), 'src/infrastructure/database/seeder'),
      glob: '!(*.d).{js,ts}',
    },
    driver: PostgreSqlDriver,
  };

  const nodeEnv = appConfig.nodeEnv;

  switch (nodeEnv) {
    case 'production':
      return {
        ...commonConfig,
        host: appConfig.database.host,
        port: appConfig.database.port,
        user: appConfig.database.username,
        password: appConfig.database.password,
        dbName: appConfig.database.name,
        debug: false,
        driverOptions: {
          connection: {
            ssl: {
              rejectUnauthorized: false, // SSL 설정 (필요한 경우)
            },
          },
        },
        pool: { min: 2, max: 10 }, // 커넥션 풀 설정
      };
    case 'staging':
      return {
        ...commonConfig,
        host: appConfig.database.host,
        port: appConfig.database.port,
        user: appConfig.database.username,
        password: appConfig.database.password,
        dbName: appConfig.database.name,
        debug: false,
        driverOptions: {
          connection: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
        },
        pool: { min: 1, max: 5 },
      };
    default: // 'development'
      return {
        ...commonConfig,
        host: appConfig.database.host,
        port: appConfig.database.port,
        user: appConfig.database.username,
        password: appConfig.database.password,
        dbName: appConfig.database.name,
        debug: true,
        driverOptions: {
          connection: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
        },
        // SQL 구문 하이라이팅 (개발 환경에서만 사용)
        highlighter: new SqlHighlighter(),
        allowGlobalContext: true, // 개발 환경에서만 허용
      };
  }
}
