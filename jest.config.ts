import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',

  // 테스트 환경변수 로딩
  setupFiles: ['<rootDir>/../test/config/setup-env.ts'],

  // 전역 setup/teardown (스키마 생성/삭제)
  globalSetup: '<rootDir>/../test/global-setup.ts',
  globalTeardown: '<rootDir>/../test/global-teardown.ts',

  // 모듈 경로 매핑 (tsconfig paths와 동일하게)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // 테스트 타임아웃 (DB 작업 고려)
  testTimeout: 10000,
};

export default config;
