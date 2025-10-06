import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberService } from './workspace-member.service';
import { WorkspaceMemberRepository } from './workspace-member.repository';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { WorkspaceMemberFactory } from '../../../test/factories/workspace-member.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { RoleFactory } from '../../../test/factories/role.factory';
import { IWorkspaceMemberCreateData } from './interfaces/workspace-member-create-data.interface';

describe('WorkspaceMemberService', () => {
  let service: WorkspaceMemberService;
  let repository: WorkspaceMemberRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMemberService,
        {
          provide: WorkspaceMemberRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByWorkspace: jest.fn(),
            findByUserAndWorkspace: jest.fn(),
            findActiveByUserAndWorkspace: jest.fn(),
            findByUserAndWorkspaceForAuth: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceMemberService>(WorkspaceMemberService);
    repository = module.get<WorkspaceMemberRepository>(
      WorkspaceMemberRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspaceMember', () => {
    it('새 워크스페이스 멤버를 성공적으로 생성해야 함', async () => {
      // Given
      const user = UserFactory.create();
      const workspace = WorkspaceFactory.create();
      const role = RoleFactory.create();
      const createData: IWorkspaceMemberCreateData = {
        user,
        workspace,
        role,
        firstName: '길동',
        lastName: '홍',
        isActive: true,
      };
      const expectedMember = WorkspaceMemberFactory.createWithUserAndWorkspace(
        user,
        workspace,
        createData
      );

      (repository.create as jest.Mock).mockResolvedValue(expectedMember);

      // When
      const result = await service.createWorkspaceMember(createData);

      // Then
      expect(result).toEqual(expectedMember);
      expect(repository.create).toHaveBeenCalledWith(createData);
    });
  });

  describe('findById', () => {
    it('ID로 워크스페이스 멤버를 찾아야 함', async () => {
      // Given
      const memberId = 'member-123';
      const expectedMember = WorkspaceMemberFactory.create({ id: memberId });

      (repository.findById as jest.Mock).mockResolvedValue(expectedMember);

      // When
      const result = await service.findById(memberId);

      // Then
      expect(result).toEqual(expectedMember);
      expect(repository.findById).toHaveBeenCalledWith(memberId);
    });

    it('워크스페이스 멤버를 찾을 수 없으면 null을 반환해야 함', async () => {
      // Given
      const memberId = 'non-existent';

      (repository.findById as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findById(memberId);

      // Then
      expect(result).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith(memberId);
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 멤버를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const expectedMembers = WorkspaceMemberFactory.createMany(3);

      (repository.findByWorkspace as jest.Mock).mockResolvedValue(
        expectedMembers
      );

      // When
      const result = await service.findByWorkspace(workspaceId);

      // Then
      expect(result).toEqual(expectedMembers);
      expect(repository.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });

    it('워크스페이스에 멤버가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const workspaceId = 'empty-workspace';

      (repository.findByWorkspace as jest.Mock).mockResolvedValue([]);

      // When
      const result = await service.findByWorkspace(workspaceId);

      // Then
      expect(result).toEqual([]);
      expect(repository.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });
  });

  describe('findByUserAndWorkspace', () => {
    it('사용자와 워크스페이스로 멤버를 찾아야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const expectedMember = WorkspaceMemberFactory.create();

      (repository.findByUserAndWorkspace as jest.Mock).mockResolvedValue(
        expectedMember
      );

      // When
      const result = await service.findByUserAndWorkspace(userId, workspaceId);

      // Then
      expect(result).toEqual(expectedMember);
      expect(repository.findByUserAndWorkspace).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });

    it('멤버를 찾을 수 없으면 null을 반환해야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';

      (repository.findByUserAndWorkspace as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findByUserAndWorkspace(userId, workspaceId);

      // Then
      expect(result).toBeNull();
      expect(repository.findByUserAndWorkspace).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });
  });

  describe('isActiveMember', () => {
    it('활성화된 멤버가 있으면 true를 반환해야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const activeMember = WorkspaceMemberFactory.create({ isActive: true });

      (repository.findActiveByUserAndWorkspace as jest.Mock).mockResolvedValue(
        activeMember
      );

      // When
      const result = await service.isActiveMember(userId, workspaceId);

      // Then
      expect(result).toBe(true);
      expect(repository.findActiveByUserAndWorkspace).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });

    it('활성화된 멤버가 없으면 false를 반환해야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';

      (repository.findActiveByUserAndWorkspace as jest.Mock).mockResolvedValue(
        null
      );

      // When
      const result = await service.isActiveMember(userId, workspaceId);

      // Then
      expect(result).toBe(false);
      expect(repository.findActiveByUserAndWorkspace).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });
  });

  describe('findByUserAndWorkspaceForAuth', () => {
    it('인증용 멤버 정보를 찾아야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';
      const expectedMember = WorkspaceMemberFactory.create();

      (repository.findByUserAndWorkspaceForAuth as jest.Mock).mockResolvedValue(
        expectedMember
      );

      // When
      const result = await service.findByUserAndWorkspaceForAuth(
        userId,
        workspaceId
      );

      // Then
      expect(result).toEqual(expectedMember);
      expect(repository.findByUserAndWorkspaceForAuth).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });

    it('인증용 멤버 정보를 찾을 수 없으면 null을 반환해야 함', async () => {
      // Given
      const userId = 'user-123';
      const workspaceId = 'workspace-123';

      (repository.findByUserAndWorkspaceForAuth as jest.Mock).mockResolvedValue(
        null
      );

      // When
      const result = await service.findByUserAndWorkspaceForAuth(
        userId,
        workspaceId
      );

      // Then
      expect(result).toBeNull();
      expect(repository.findByUserAndWorkspaceForAuth).toHaveBeenCalledWith(
        userId,
        workspaceId
      );
    });
  });
});
