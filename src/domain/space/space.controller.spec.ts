import { Test, TestingModule } from '@nestjs/testing';
import { SpaceController } from './space.controller';
import { SpaceService } from './space.service';
import { CreateSpaceDto } from './dto/request/create-space.dto';
import { Space } from './entity/space.entity';
import { User } from '../user/entity/user.entity';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { SpaceFactory } from '../../../test/factories/space.factory';
import { ResourceFactory } from '../../../test/factories/resource.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';

describe('SpaceController', () => {
  let controller: SpaceController;
  let spaceService: SpaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpaceController],
      providers: [
        {
          provide: SpaceService,
          useValue: {
            findByWorkspaceAndUserId: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SpaceController>(SpaceController);
    spaceService = module.get<SpaceService>(SpaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpaces', () => {
    it('워크스페이스의 사용자 스페이스 목록을 조회해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
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

      const workspace = WorkspaceFactory.create({ id: workspaceId });
      const resource = ResourceFactory.create({ workspace });
      const expectedSpaces = [
        SpaceFactory.createWithResource(resource, { description: 'Space 1' }),
        SpaceFactory.createWithResource(resource, { description: 'Space 2' }),
      ];

      jest
        .spyOn(spaceService, 'findByWorkspaceAndUserId')
        .mockResolvedValue(expectedSpaces);

      // When
      const result = await controller.getSpaces(workspaceId, user);

      // Then
      expect(result).toEqual(expectedSpaces);
      expect(spaceService.findByWorkspaceAndUserId).toHaveBeenCalledWith(
        workspaceId,
        user.id
      );
    });

    it('사용자에게 접근 가능한 스페이스가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
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

      jest
        .spyOn(spaceService, 'findByWorkspaceAndUserId')
        .mockResolvedValue([]);

      // When
      const result = await controller.getSpaces(workspaceId, user);

      // Then
      expect(result).toEqual([]);
      expect(spaceService.findByWorkspaceAndUserId).toHaveBeenCalledWith(
        workspaceId,
        user.id
      );
    });
  });

  describe('create', () => {
    it('새 스페이스를 성공적으로 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const createDto: CreateSpaceDto = {
        title: 'New Space',
        description: 'This is a new space',
        parentPath: 'root',
      };

      const workspace = WorkspaceFactory.create({ id: workspaceId });
      const resource = ResourceFactory.create({ workspace });
      const expectedSpace = SpaceFactory.createWithResource(resource, {
        description: createDto.description,
      });

      jest.spyOn(spaceService, 'create').mockResolvedValue(expectedSpace);

      // When
      const result = await controller.create(
        createDto,
        workspaceId,
        workspaceMemberId
      );

      // Then
      expect(result).toEqual(expectedSpace);
      expect(spaceService.create).toHaveBeenCalledWith({
        ...createDto,
        workspaceMemberId,
        workspaceId,
      });
    });

    it('설명 없이 스페이스를 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const createDto: CreateSpaceDto = {
        title: 'New Space',
        parentPath: 'root',
      };

      const workspace = WorkspaceFactory.create({ id: workspaceId });
      const resource = ResourceFactory.create({ workspace });
      const expectedSpace = SpaceFactory.createWithResource(resource, {
        description: null,
      });

      jest.spyOn(spaceService, 'create').mockResolvedValue(expectedSpace);

      // When
      const result = await controller.create(
        createDto,
        workspaceId,
        workspaceMemberId
      );

      // Then
      expect(result).toEqual(expectedSpace);
      expect(spaceService.create).toHaveBeenCalledWith({
        ...createDto,
        workspaceMemberId,
        workspaceId,
      });
    });

    it('부모 경로 없이 스페이스를 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const createDto: CreateSpaceDto = {
        title: 'New Space',
        description: 'This is a new space',
      };

      const workspace = WorkspaceFactory.create({ id: workspaceId });
      const resource = ResourceFactory.create({ workspace });
      const expectedSpace = SpaceFactory.createWithResource(resource, {
        description: createDto.description,
      });

      jest.spyOn(spaceService, 'create').mockResolvedValue(expectedSpace);

      // When
      const result = await controller.create(
        createDto,
        workspaceId,
        workspaceMemberId
      );

      // Then
      expect(result).toEqual(expectedSpace);
      expect(spaceService.create).toHaveBeenCalledWith({
        ...createDto,
        workspaceMemberId,
        workspaceId,
      });
    });
  });
});
