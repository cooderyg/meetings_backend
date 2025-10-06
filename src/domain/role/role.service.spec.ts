import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { Role } from './entity/role.entity';
import { SystemRole } from './enum/system-role.enum';
import { createMockRepository } from '../../../test/utils/mock-providers';

describe('RoleService', () => {
  let service: RoleService;
  let repository: RoleRepository;

  const mockSystemRole: Role = Object.assign(new Role(), {
    id: 1,
    name: SystemRole.ADMIN,
    description: '시스템 관리자 역할',
    workspace: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockRepository = {
      ...createMockRepository<Role>(),
      findOneSystemRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: RoleRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    repository = module.get<RoleRepository>(RoleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOneSystemRole', () => {
    it('시스템 역할을 이름으로 찾아야 함', async () => {
      // Given
      (repository.findOneSystemRole as jest.Mock).mockResolvedValue(mockSystemRole);

      // When
      const result = await service.findOneSystemRole(SystemRole.ADMIN);

      // Then
      expect(result).toBe(mockSystemRole);
      expect(repository.findOneSystemRole).toHaveBeenCalledWith(SystemRole.ADMIN);
    });

    it('시스템 역할을 찾을 수 없을 때 null을 반환해야 함', async () => {
      // Given
      (repository.findOneSystemRole as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findOneSystemRole(SystemRole.CAN_VIEW);

      // Then
      expect(result).toBeNull();
      expect(repository.findOneSystemRole).toHaveBeenCalledWith(SystemRole.CAN_VIEW);
    });
  });

  describe('findSystemRoles', () => {
    it('시스템 역할을 반환해야 함', async () => {
      // Given
      (repository.findOneSystemRole as jest.Mock).mockResolvedValue(mockSystemRole);

      // When
      const result = await service.findSystemRoles(SystemRole.ADMIN);

      // Then
      expect(result).toBe(mockSystemRole);
      expect(repository.findOneSystemRole).toHaveBeenCalledWith(SystemRole.ADMIN);
    });
  });

  describe('미구현 메서드', () => {
    it('create 메서드는 undefined를 반환해야 함', async () => {
      // When
      const result = await service.create();

      // Then
      expect(result).toBeUndefined();
    });

    it('update 메서드는 undefined를 반환해야 함', async () => {
      // When
      const result = await service.update();

      // Then
      expect(result).toBeUndefined();
    });

    it('delete 메서드는 undefined를 반환해야 함', async () => {
      // When
      const result = await service.delete();

      // Then
      expect(result).toBeUndefined();
    });

    it('findOne 메서드는 undefined를 반환해야 함', async () => {
      // When
      const result = await service.findOne(1);

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('Role 엔티티 메서드', () => {
    it('시스템 역할인지 확인해야 함', () => {
      // Given
      const systemRole = Role.createSystemRole(SystemRole.ADMIN);
      const workspaceRole = new Role();
      workspaceRole.workspace = {} as any;

      // Then
      expect(systemRole.isSystemRole()).toBe(true);
      expect(workspaceRole.isSystemRole()).toBe(false);
    });

    it('특정 시스템 역할인지 확인해야 함', () => {
      // Given
      const adminRole = Role.createSystemRole(SystemRole.ADMIN);
      const memberRole = Role.createSystemRole(SystemRole.CAN_VIEW);

      // Then
      expect(adminRole.isSpecificSystemRole(SystemRole.ADMIN)).toBe(true);
      expect(adminRole.isSpecificSystemRole(SystemRole.CAN_VIEW)).toBe(false);
      expect(memberRole.isSpecificSystemRole(SystemRole.CAN_VIEW)).toBe(true);
    });
  });
});