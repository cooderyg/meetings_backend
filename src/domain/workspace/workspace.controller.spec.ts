import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/request/create-workspace.dto';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { UpdateWorkspaceNameResDto } from './dto/response/update-workspace-name.res.dto';
import { Workspace, SubscriptionTier } from './entity/workspace.entity';
import { User } from '../user/entity/user.entity';
import { AuthGuard } from '../../shared/guard/auth.guard';

describe('WorkspaceController', () => {
  let controller: WorkspaceController;
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceController],
      providers: [
        {
          provide: WorkspaceService,
          useValue: {
            findByUserId: jest.fn(),
            createWorkspace: jest.fn(),
            updateWorkspaceName: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<WorkspaceController>(WorkspaceController);
    workspaceService = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkspaces', () => {
    it('사용자의 워크스페이스 목록을 반환해야 함', async () => {
      // Given
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

      const expectedWorkspaces: Workspace[] = [
        {
          id: 'workspace-1',
          name: 'Test Workspace 1',
          subscriptionTier: SubscriptionTier.FREE,
          imagePath: null,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Workspace,
        {
          id: 'workspace-2',
          name: 'Test Workspace 2',
          subscriptionTier: SubscriptionTier.FREE,
          imagePath: null,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Workspace,
      ];

      (workspaceService.findByUserId as jest.Mock).mockResolvedValue(
        expectedWorkspaces
      );

      // When
      const result = await controller.getWorkspaces(user);

      // Then
      expect(result).toEqual(expectedWorkspaces);
      expect(workspaceService.findByUserId).toHaveBeenCalledWith(user.id);
    });

    it('사용자에게 워크스페이스가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
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

      (workspaceService.findByUserId as jest.Mock).mockResolvedValue([]);

      // When
      const result = await controller.getWorkspaces(user);

      // Then
      expect(result).toEqual([]);
      expect(workspaceService.findByUserId).toHaveBeenCalledWith(user.id);
    });
  });

  describe('createWorkspace', () => {
    it('새 워크스페이스를 생성해야 함', async () => {
      // Given
      const createDto: CreateWorkspaceDto = {
        name: 'New Workspace',
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

      const expectedWorkspace: Workspace = {
        id: 'workspace-123',
        name: 'New Workspace',
        subscriptionTier: SubscriptionTier.FREE,
        imagePath: null,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workspace;

      (workspaceService.createWorkspace as jest.Mock).mockResolvedValue(
        expectedWorkspace
      );

      // When
      const result = await controller.createWorkspace(createDto, user);

      // Then
      expect(result).toEqual(expectedWorkspace);
      expect(workspaceService.createWorkspace).toHaveBeenCalledWith(
        {
          name: createDto.name,
          subscriptionTier: SubscriptionTier.FREE,
        },
        user
      );
    });
  });

  describe('updateWorkspaceName', () => {
    it('워크스페이스 이름을 업데이트해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const updateDto: UpdateWorkspaceNameDto = {
        name: 'Updated Workspace Name',
      };

      const expectedResponse: UpdateWorkspaceNameResDto = {
        name: 'Updated Workspace Name',
      };

      (workspaceService.updateWorkspaceName as jest.Mock).mockResolvedValue(
        'Updated Workspace Name'
      );

      // When
      const result = await controller.updateWorkspaceName(
        updateDto,
        workspaceId
      );

      // Then
      expect(result).toEqual(expectedResponse);
      expect(workspaceService.updateWorkspaceName).toHaveBeenCalledWith(
        workspaceId,
        updateDto
      );
    });

    it('워크스페이스 이름이 빈 문자열이면 그대로 업데이트해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const updateDto: UpdateWorkspaceNameDto = {
        name: '',
      };

      const expectedResponse: UpdateWorkspaceNameResDto = {
        name: '',
      };

      (workspaceService.updateWorkspaceName as jest.Mock).mockResolvedValue('');

      // When
      const result = await controller.updateWorkspaceName(
        updateDto,
        workspaceId
      );

      // Then
      expect(result).toEqual(expectedResponse);
      expect(workspaceService.updateWorkspaceName).toHaveBeenCalledWith(
        workspaceId,
        updateDto
      );
    });
  });
});
