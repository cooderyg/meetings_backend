import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberRoleService } from './workspace-member-role.service';
import { WorkspaceMemberRoleRepository } from './workspace-member-role.repository';
import { RoleService } from '../role/role.service';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Role } from '../role/entity/role.entity';
import { WorkspaceMemberRole } from './entity/workspace-member-role.entity';
import { SystemRole } from '../role/enum/system-role.enum';
import { AppError } from '../../shared/exception/app.error';

describe('WorkspaceMemberRoleService', () => {
  let service: WorkspaceMemberRoleService;
  let repository: WorkspaceMemberRoleRepository;
  let roleService: RoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMemberRoleService,
        {
          provide: WorkspaceMemberRoleRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: RoleService,
          useValue: {
            findOneSystemRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceMemberRoleService>(
      WorkspaceMemberRoleService
    );
    repository = module.get<WorkspaceMemberRoleRepository>(
      WorkspaceMemberRoleRepository
    );
    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('워크스페이스 멤버 역할을 성공적으로 생성해야 함', async () => {
      // Given
      const mockWorkspaceMember = {
        id: 'wm-123',
      } as unknown as WorkspaceMember;

      const mockRole = {
        id: 1,
        name: 'Admin',
      } as unknown as Role;

      // When
      const result = await service.create(mockWorkspaceMember, mockRole);

      // Then
      expect(result.workspaceMember).toBe(mockWorkspaceMember);
      expect(result.role).toBe(mockRole);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceMember: mockWorkspaceMember,
          role: mockRole,
        })
      );
    });
  });

  describe('createSystemWorkspaceMemberRole', () => {
    it('시스템 역할로 워크스페이스 멤버 역할을 성공적으로 생성해야 함', async () => {
      // Given
      const mockWorkspaceMember = {
        id: 'wm-123',
      } as unknown as WorkspaceMember;

      const mockRole = {
        id: 1,
        name: SystemRole.OWNER,
      } as unknown as Role;

      jest.spyOn(roleService, 'findOneSystemRole').mockResolvedValue(mockRole);

      // When
      const result = await service.createSystemWorkspaceMemberRole(
        SystemRole.OWNER,
        mockWorkspaceMember
      );

      // Then
      expect(result.workspaceMember).toBe(mockWorkspaceMember);
      expect(result.role).toBe(mockRole);
      expect(roleService.findOneSystemRole).toHaveBeenCalledWith(
        SystemRole.OWNER
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceMember: mockWorkspaceMember,
          role: mockRole,
        })
      );
    });

    it('시스템 역할을 찾지 못하면 에러를 발생시켜야 함', async () => {
      // Given
      const mockWorkspaceMember = {
        id: 'wm-123',
      } as unknown as WorkspaceMember;

      jest.spyOn(roleService, 'findOneSystemRole').mockResolvedValue(null);

      // When & Then
      await expect(
        service.createSystemWorkspaceMemberRole(
          SystemRole.OWNER,
          mockWorkspaceMember
        )
      ).rejects.toThrow(AppError);

      await expect(
        service.createSystemWorkspaceMemberRole(
          SystemRole.OWNER,
          mockWorkspaceMember
        )
      ).rejects.toMatchObject({
        code: 'role.system.notFound',
      });

      expect(roleService.findOneSystemRole).toHaveBeenCalledWith(
        SystemRole.OWNER
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
