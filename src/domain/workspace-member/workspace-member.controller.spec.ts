import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberController } from './workspace-member.controller';
import { WorkspaceMemberService } from './workspace-member.service';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { WorkspaceMemberFactory } from '../../../test/factories/workspace-member.factory';

describe('WorkspaceMemberController', () => {
  let controller: WorkspaceMemberController;
  let service: WorkspaceMemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceMemberController],
      providers: [
        {
          provide: WorkspaceMemberService,
          useValue: {
            findByWorkspace: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<WorkspaceMemberController>(
      WorkspaceMemberController
    );
    service = module.get<WorkspaceMemberService>(WorkspaceMemberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkspaceMembers', () => {
    it('워크스페이스 멤버 목록을 성공적으로 조회해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const expectedMembers = WorkspaceMemberFactory.createMany(3);

      jest.spyOn(service, 'findByWorkspace').mockResolvedValue(expectedMembers);

      // When
      const result = await controller.getWorkspaceMembers(workspaceId);

      // Then
      expect(result).toEqual(expectedMembers);
      expect(service.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });

    it('워크스페이스에 멤버가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const workspaceId = 'empty-workspace';

      jest.spyOn(service, 'findByWorkspace').mockResolvedValue([]);

      // When
      const result = await controller.getWorkspaceMembers(workspaceId);

      // Then
      expect(result).toEqual([]);
      expect(service.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });

    it('서비스에서 에러가 발생하면 에러를 전파해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const error = new Error('Database connection failed');

      jest.spyOn(service, 'findByWorkspace').mockRejectedValue(error);

      // When & Then
      await expect(controller.getWorkspaceMembers(workspaceId)).rejects.toThrow(
        error
      );
      expect(service.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });
  });
});
