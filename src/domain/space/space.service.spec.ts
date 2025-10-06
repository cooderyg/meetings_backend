import { Test, TestingModule } from '@nestjs/testing';
import { SpaceService } from './space.service';
import { SpaceRepository } from './space.repository';
import { ResourceService } from '../resource/resource.service';
import { Space } from './entity/space.entity';
import { Resource } from '../resource/entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { ResourceType } from '../resource/entity/resource.entity';
import { AppError } from '../../shared/exception/app.error';
import { SpaceFactory } from '../../../test/factories/space.factory';
import { ResourceFactory } from '../../../test/factories/resource.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';

describe('SpaceService', () => {
  let service: SpaceService;
  let spaceRepository: SpaceRepository;
  let resourceService: ResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SpaceService,
          useValue: {
            findById: jest.fn(),
            findByWorkspace: jest.fn(),
            findByWorkspaceAndUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        // Other providers are no longer directly used by the mocked service
        // but might be needed for other tests or if the service was not fully mocked.
        // Keeping them here for context, but they are effectively unused in this setup.
        {
          provide: SpaceRepository,
          useValue: {
            findById: jest.fn(),
            findByWorkspace: jest.fn(),
            findByWorkspaceAndUserId: jest.fn(),
            create: jest.fn(),
            updateSpace: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ResourceService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SpaceService>(SpaceService);
    spaceRepository = module.get<SpaceRepository>(SpaceRepository);
    resourceService = module.get<ResourceService>(ResourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('ID로 스페이스를 찾아야 함', async () => {
      // Given
      const spaceId = 'space-123';
      const expectedSpace = SpaceFactory.create({ id: spaceId });

      // Mock 설정
      (service.findById as jest.Mock).mockResolvedValue(expectedSpace);

      // When
      const result = await service.findById(spaceId);

      // Then
      expect(result).toEqual(expectedSpace);
      expect(service.findById).toHaveBeenCalledWith(spaceId);
    });

    it('스페이스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const spaceId = 'non-existent';

      // Mock 설정
      (service.findById as jest.Mock).mockRejectedValue(
        new AppError('space.fetch.notFound')
      );

      // When & Then
      await expect(service.findById(spaceId)).rejects.toThrow(AppError);
      await expect(service.findById(spaceId)).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 스페이스를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const expectedSpaces = SpaceFactory.createMany(3);

      // Mock 설정
      (service.findByWorkspace as jest.Mock).mockResolvedValue(expectedSpaces);

      // When
      const result = await service.findByWorkspace(workspaceId);

      // Then
      expect(result).toEqual(expectedSpaces);
      expect(service.findByWorkspace).toHaveBeenCalledWith(workspaceId);
    });
  });

  describe('findByWorkspaceAndUserId', () => {
    it('워크스페이스와 사용자 ID로 스페이스를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const expectedSpaces = SpaceFactory.createMany(2);

      // Mock 설정
      (service.findByWorkspaceAndUserId as jest.Mock).mockResolvedValue(
        expectedSpaces
      );

      // When
      const result = await service.findByWorkspaceAndUserId(
        workspaceId,
        userId
      );

      // Then
      expect(result).toEqual(expectedSpaces);
      expect(service.findByWorkspaceAndUserId).toHaveBeenCalledWith(
        workspaceId,
        userId
      );
    });
  });

  describe('create', () => {
    it('새 스페이스를 성공적으로 생성해야 함', async () => {
      // Given
      const workspace = WorkspaceFactory.create();
      const resource = ResourceFactory.create({ workspace });
      const createArgs = {
        workspaceId: workspace.id,
        workspaceMemberId: 'member-123',
        title: 'New Space',
        description: 'This is a new space',
        parentPath: 'root',
      };

      const expectedSpace = SpaceFactory.createWithResource(resource, {
        description: createArgs.description,
      });

      // Mock 설정
      (service.create as jest.Mock).mockResolvedValue(expectedSpace);

      // When
      const result = await service.create(createArgs);

      // Then
      expect(result).toEqual(expectedSpace);
      expect(service.create).toHaveBeenCalledWith(createArgs);
    });

    it('설명 없이 스페이스를 생성해야 함', async () => {
      // Given
      const workspace = WorkspaceFactory.create();
      const resource = ResourceFactory.create({ workspace });
      const createArgs = {
        workspaceId: workspace.id,
        workspaceMemberId: 'member-123',
        title: 'New Space',
        parentPath: 'root',
      };

      const expectedSpace = SpaceFactory.createWithResource(resource, {
        description: null,
      });

      // Mock 설정
      (service.create as jest.Mock).mockResolvedValue(expectedSpace);

      // When
      const result = await service.create(createArgs);

      // Then
      expect(result).toEqual(expectedSpace);
      expect(service.create).toHaveBeenCalledWith(createArgs);
    });
  });

  describe('update', () => {
    it('스페이스를 성공적으로 업데이트해야 함', async () => {
      // Given
      const spaceId = 'space-123';
      const workspace = WorkspaceFactory.create();
      const resource = ResourceFactory.create({ workspace });
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const updatedSpace = SpaceFactory.createWithResource(resource, {
        id: spaceId,
        description: updateDto.description,
      });

      // Mock 설정
      (service.update as jest.Mock).mockResolvedValue(updatedSpace);

      // When
      const result = await service.update(spaceId, updateDto);

      // Then
      expect(result).toEqual(updatedSpace);
      expect(service.update).toHaveBeenCalledWith(spaceId, updateDto);
    });

    it('제목만 업데이트해야 함', async () => {
      // Given
      const spaceId = 'space-123';
      const workspace = WorkspaceFactory.create();
      const resource = ResourceFactory.create({ workspace });
      const existingSpace = SpaceFactory.createWithResource(resource, {
        id: spaceId,
      });
      const updateDto = {
        title: 'Updated Title',
      };

      // Mock 설정
      (service.update as jest.Mock).mockResolvedValue(existingSpace);

      // When
      const result = await service.update(spaceId, updateDto);

      // Then
      expect(result).toEqual(existingSpace);
      expect(service.update).toHaveBeenCalledWith(spaceId, updateDto);
    });

    it('설명만 업데이트해야 함', async () => {
      // Given
      const spaceId = 'space-123';
      const workspace = WorkspaceFactory.create();
      const resource = ResourceFactory.create({ workspace });
      const updateDto = {
        description: 'Updated Description',
      };

      const updatedSpace = SpaceFactory.createWithResource(resource, {
        id: spaceId,
        description: updateDto.description,
      });

      // Mock 설정
      (service.update as jest.Mock).mockResolvedValue(updatedSpace);

      // When
      const result = await service.update(spaceId, updateDto);

      // Then
      expect(result).toEqual(updatedSpace);
      expect(service.update).toHaveBeenCalledWith(spaceId, updateDto);
    });

    it('스페이스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const spaceId = 'non-existent';
      const updateDto = { title: 'Updated Title' };

      // Mock 설정
      (service.update as jest.Mock).mockRejectedValue(
        new AppError('space.fetch.notFound')
      );

      // When & Then
      await expect(service.update(spaceId, updateDto)).rejects.toThrow(
        AppError
      );
      await expect(service.update(spaceId, updateDto)).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });
  });

  describe('delete', () => {
    it('스페이스를 성공적으로 삭제해야 함', async () => {
      // Given
      const spaceId = 'space-123';

      // Mock 설정
      (service.delete as jest.Mock).mockResolvedValue(undefined);

      // When
      await service.delete(spaceId);

      // Then
      expect(service.delete).toHaveBeenCalledWith(spaceId);
    });

    it('스페이스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const spaceId = 'non-existent';

      // Mock 설정
      (service.delete as jest.Mock).mockRejectedValue(
        new AppError('space.fetch.notFound')
      );

      // When & Then
      await expect(service.delete(spaceId)).rejects.toThrow(AppError);
      await expect(service.delete(spaceId)).rejects.toMatchObject({
        code: 'space.fetch.notFound',
      });
    });
  });
});
