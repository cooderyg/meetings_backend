import { EntityManager, EntityRepository } from '@mikro-orm/core';

/**
 * Reusable mock providers for testing
 */

/**
 * Creates a mock EntityManager with commonly used methods
 */
export const createMockEntityManager = () => ({
  assign: jest.fn(),
  flush: jest.fn(),
  fork: jest.fn().mockReturnThis(),
  transactional: jest.fn((fn) => fn()),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  persistAndFlush: jest.fn(),
  persist: jest.fn(),
  clear: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  execute: jest.fn(),
  getConnection: jest.fn().mockReturnValue({
    close: jest.fn(),
  }),
  populate: jest.fn(),
  removeAndFlush: jest.fn(),
  nativeDelete: jest.fn(),
});

/**
 * Creates a mock EntityRepository
 */
export const createMockRepository = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAll: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  assign: jest.fn(),
  persist: jest.fn(),
  persistAndFlush: jest.fn(),
  flush: jest.fn(),
  remove: jest.fn(),
  removeAndFlush: jest.fn(),
  nativeUpdate: jest.fn(),
  nativeDelete: jest.fn(),
  getEntityManager: jest.fn(),
  count: jest.fn(),
});

/**
 * Creates a mock service with common methods
 */
export const createMockService = (methods: string[]) => {
  const mock: any = {};
  methods.forEach((method) => {
    mock[method] = jest.fn();
  });
  return mock;
};

/**
 * Creates a mock logger
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

/**
 * Creates a mock ConfigService
 */
export const createMockConfigService = (config: Record<string, any> = {}) => ({
  get: jest.fn((key: string) => config[key]),
  getOrThrow: jest.fn((key: string) => {
    if (config[key] === undefined) {
      throw new Error(`Config key ${key} not found`);
    }
    return config[key];
  }),
});

/**
 * Creates a mock repository with EntityManager
 * Useful for testing custom repositories
 */
export const createMockRepositoryWithEntityManager = <T>() => {
  const mockEntityManager = createMockEntityManager();
  const mockRepository = createMockRepository<T>();

  (mockRepository.getEntityManager as jest.Mock).mockReturnValue(mockEntityManager);

  return {
    repository: mockRepository,
    entityManager: mockEntityManager,
  };
};

/**
 * Helper to reset all mocks in a test suite
 */
export const resetAllMocks = (...mocks: any[]) => {
  mocks.forEach((mock) => {
    if (typeof mock === 'object' && mock !== null) {
      Object.keys(mock).forEach((key) => {
        if (typeof mock[key] === 'function' && mock[key].mockReset) {
          mock[key].mockReset();
        }
      });
    }
  });
};