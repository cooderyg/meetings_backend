import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { UserRepository } from './user.repository';
import { User } from './entity/user.entity';

describe('UserRepository with Mock', () => {
  let repository: UserRepository;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockEntityRepository: jest.Mocked<EntityRepository<User>>;

  beforeEach(() => {
    // Mock EntityManager
    mockEntityManager = {
      findOne: jest.fn(),
      persistAndFlush: jest.fn(),
    } as any;

    // Mock EntityRepository
    mockEntityRepository = {
      getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    } as any;

    // Create repository instance with mocked dependencies
    repository = new UserRepository(mockEntityRepository);
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      // Given
      const mockUser = new User();
      mockUser.id = 'test-id';
      mockUser.email = 'test@example.com';
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      // When
      const result = await repository.findById('test-id');

      // Then
      expect(result).toBe(mockUser);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { id: 'test-id' });
    });

    it('should return null when user not found', async () => {
      // Given
      mockEntityManager.findOne.mockResolvedValue(null);

      // When
      const result = await repository.findById('non-existent');

      // Then
      expect(result).toBeNull();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { id: 'non-existent' });
    });
  });

  describe('findByUid', () => {
    it('should find user by uid', async () => {
      // Given
      const mockUser = new User();
      mockUser.uid = 'test-uid';
      mockUser.email = 'test@example.com';
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      // When
      const result = await repository.findByUid('test-uid');

      // Then
      expect(result).toBe(mockUser);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { uid: 'test-uid' });
    });

    it('should return null when uid not found', async () => {
      // Given
      mockEntityManager.findOne.mockResolvedValue(null);

      // When
      const result = await repository.findByUid('non-existent-uid');

      // Then
      expect(result).toBeNull();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { uid: 'non-existent-uid' });
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Given
      const mockUser = new User();
      mockUser.email = 'test@example.com';
      mockEntityManager.findOne.mockResolvedValue(mockUser);

      // When
      const result = await repository.findByEmail('test@example.com');

      // Then
      expect(result).toBe(mockUser);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { email: 'test@example.com' });
    });

    it('should return null when email not found', async () => {
      // Given
      mockEntityManager.findOne.mockResolvedValue(null);

      // When
      const result = await repository.findByEmail('notfound@example.com');

      // Then
      expect(result).toBeNull();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, { email: 'notfound@example.com' });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Given
      const mockUser = new User();
      mockUser.id = 'test-id';
      mockUser.email = 'test@example.com';
      mockEntityManager.persistAndFlush.mockResolvedValue(undefined);

      // When
      await repository.updateUser(mockUser);

      // Then
      expect(mockEntityManager.persistAndFlush).toHaveBeenCalledWith(mockUser);
    });

    it('should handle update errors', async () => {
      // Given
      const mockUser = new User();
      const error = new Error('Database error');
      mockEntityManager.persistAndFlush.mockRejectedValue(error);

      // When/Then
      await expect(repository.updateUser(mockUser)).rejects.toThrow('Database error');
    });
  });
});