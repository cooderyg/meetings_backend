import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, Collection } from '@mikro-orm/core';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { RoleService } from '../role/role.service';
import { Workspace, SubscriptionTier } from './entity/workspace.entity';
import { User } from '../user/entity/user.entity';
import { Role } from '../role/entity/role.entity';
import { SystemRole } from '../role/enum/system-role.enum';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { AppError } from '../../shared/exception/app.error';
import { WorkspaceMemberRole } from '../workspace-member-role/entity/workspace-member-role.entity';
import { RolePermission } from '../permission/entity/role-permission.entity';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let workspaceRepository: WorkspaceRepository;
  let workspaceMemberService: WorkspaceMemberService;
  let roleService: RoleService;
  let em: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: WorkspaceService,
          useValue: {
            createWorkspace: jest.fn(),
            updateWorkspaceName: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
        {
          provide: 'WorkspaceRepository',
          useValue: {
            assign: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: WorkspaceMemberService,
          useValue: {
            createWorkspaceMember: jest.fn(),
          },
        },
        {
          provide: RoleService,
          useValue: {
            findSystemRoles: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            flush: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceRepository = module.get('WorkspaceRepository');
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );
    roleService = module.get<RoleService>(RoleService);
    em = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('워크스페이스와 멤버를 성공적으로 생성해야 함', async () => {
      // Given
      const workspaceData = {
        name: 'Test Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      };

      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
        uid: 'uid-123',
        passwordHash: 'hashed',
        isActive: true,
        isDeleted: false,
        lastLoginAt: null,
        imagePath: null,
        settings: { theme: { mode: 'system' } },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      const ownerRole = new Role();
      ownerRole.id = 1;
      ownerRole.name = SystemRole.OWNER;
      ownerRole.workspace = null;
      ownerRole.description = 'System Owner Role';
      ownerRole.createdAt = new Date();
      ownerRole.updatedAt = new Date();

      const createdWorkspace: Workspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        subscriptionTier: SubscriptionTier.FREE,
        imagePath: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workspace;

      (roleService.findSystemRoles as jest.Mock).mockResolvedValue(ownerRole);
      (workspaceRepository.assign as jest.Mock).mockReturnValue(
        createdWorkspace
      );
      (
        workspaceMemberService.createWorkspaceMember as jest.Mock
      ).mockResolvedValue(undefined);

      // Mock 설정
      (service.createWorkspace as jest.Mock).mockResolvedValue(
        createdWorkspace
      );

      // When
      const result = await service.createWorkspace(workspaceData, user);

      // Then
      expect(result).toEqual(createdWorkspace);
      expect(service.createWorkspace).toHaveBeenCalledWith(workspaceData, user);
    });

    it('시스템 역할을 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      // Given
      const workspaceData = {
        name: 'Test Workspace',
        subscriptionTier: SubscriptionTier.FREE,
      };

      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: '길동',
        lastName: '홍',
        uid: 'uid-123',
        passwordHash: 'hashed',
        isActive: true,
        isDeleted: false,
        lastLoginAt: null,
        imagePath: null,
        settings: { theme: { mode: 'system' } },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      // Mock 설정
      (service.createWorkspace as jest.Mock).mockRejectedValue(
        new AppError('role.system.notFound')
      );

      // When & Then
      await expect(
        service.createWorkspace(workspaceData, user)
      ).rejects.toThrow(AppError);
      expect(service.createWorkspace).toHaveBeenCalledWith(workspaceData, user);
    });
  });

  describe('updateWorkspaceName', () => {
    it('워크스페이스 이름을 성공적으로 업데이트해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const updateDto: UpdateWorkspaceNameDto = {
        name: 'Updated Workspace Name',
      };

      const existingWorkspace: Workspace = {
        id: workspaceId,
        name: 'Old Workspace Name',
        subscriptionTier: SubscriptionTier.FREE,
        imagePath: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workspace;

      // Mock 설정
      (service.updateWorkspaceName as jest.Mock).mockResolvedValue(
        'Updated Workspace Name'
      );

      // When
      const result = await service.updateWorkspaceName(workspaceId, updateDto);

      // Then
      expect(result).toBe('Updated Workspace Name');
      expect(service.updateWorkspaceName).toHaveBeenCalledWith(
        workspaceId,
        updateDto
      );
    });

    it('워크스페이스를 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      // Given
      const workspaceId = 'non-existent-workspace';
      const updateDto: UpdateWorkspaceNameDto = {
        name: 'Updated Workspace Name',
      };

      // Mock 설정
      (service.updateWorkspaceName as jest.Mock).mockRejectedValue(
        new AppError('workspace.fetch.notFound', { workspaceId })
      );

      // When & Then
      await expect(
        service.updateWorkspaceName(workspaceId, updateDto)
      ).rejects.toThrow(AppError);
      expect(service.updateWorkspaceName).toHaveBeenCalledWith(
        workspaceId,
        updateDto
      );
    });
  });

  describe('findById', () => {
    it('ID로 워크스페이스를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const expectedWorkspace: Workspace = {
        id: workspaceId,
        name: 'Test Workspace',
        subscriptionTier: SubscriptionTier.FREE,
        imagePath: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workspace;

      // Mock 설정
      (service.findById as jest.Mock).mockResolvedValue(expectedWorkspace);

      // When
      const result = await service.findById(workspaceId);

      // Then
      expect(result).toEqual(expectedWorkspace);
      expect(service.findById).toHaveBeenCalledWith(workspaceId);
    });

    it('존재하지 않는 ID로 조회하면 null을 반환해야 함', async () => {
      // Given
      const workspaceId = 'non-existent-workspace';

      // Mock 설정
      (service.findById as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findById(workspaceId);

      // Then
      expect(result).toBeNull();
      expect(service.findById).toHaveBeenCalledWith(workspaceId);
    });
  });

  describe('findByUserId', () => {
    it('사용자 ID로 워크스페이스 목록을 찾아야 함', async () => {
      // Given
      const userId = 'user-123';
      const expectedWorkspaces: Workspace[] = [
        {
          id: 'workspace-1',
          name: 'Workspace 1',
          subscriptionTier: SubscriptionTier.FREE,
          imagePath: null,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Workspace,
        {
          id: 'workspace-2',
          name: 'Workspace 2',
          subscriptionTier: SubscriptionTier.FREE,
          imagePath: null,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Workspace,
      ];

      // Mock 설정
      (service.findByUserId as jest.Mock).mockResolvedValue(expectedWorkspaces);

      // When
      const result = await service.findByUserId(userId);

      // Then
      expect(result).toEqual(expectedWorkspaces);
      expect(service.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('사용자가 속한 워크스페이스가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const userId = 'user-with-no-workspaces';

      // Mock 설정
      (service.findByUserId as jest.Mock).mockResolvedValue([]);

      // When
      const result = await service.findByUserId(userId);

      // Then
      expect(result).toEqual([]);
      expect(service.findByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
