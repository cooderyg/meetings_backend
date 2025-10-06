import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node', // Testcontainer는 일반 node 환경에서 실행

  // 테스트 환경변수 로딩
  setupFiles: ['<rootDir>/../test/config/setup-env.ts'],

  // 모듈 경로 매핑 (tsconfig paths와 동일하게)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // 테스트 타임아웃 (Testcontainer 시작 시간 고려)
  testTimeout: 60000,
};

export default config;