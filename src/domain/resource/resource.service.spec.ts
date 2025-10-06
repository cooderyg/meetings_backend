import { Test, TestingModule } from '@nestjs/testing';
import { ResourceService } from './resource.service';
import { ResourceRepository } from './resource.repository';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { WorkspaceService } from '../workspace/workspace.service';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
} from './entity/resource.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { AppError } from '../../shared/exception/app.error';
import { ResourceFactory } from '../../../test/factories/resource.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { UserFactory } from '../../../test/factories/user.factory';

describe('ResourceService', () => {
  let service: ResourceService;
  let resourceRepository: ResourceRepository;
  let workspaceMemberService: WorkspaceMemberService;
  let workspaceService: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        {
          provide: ResourceRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByIdWithRelations: jest.fn(),
            update: jest.fn(),
            findByWorkspace: jest.fn(),
            findByWorkspaceAndType: jest.fn(),
            findByOwner: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: WorkspaceMemberService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: WorkspaceService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
    resourceRepository = module.get<ResourceRepository>(ResourceRepository);
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );
    workspaceService = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('새 리소스를 성공적으로 생성해야 함', async () => {
      // Given
      const workspace = WorkspaceFactory.create();
      const owner = {
        id: 'member-123',
        workspace: { id: workspace.id },
      } as WorkspaceMember;
      const createData = {
        workspaceId: workspace.id,
        ownerId: owner.id,
        type: ResourceType.SPACE,
        title: 'Test Space',
        visibility: ResourceVisibility.PUBLIC,
        parentPath: 'root',
      };

      const expectedResource = ResourceFactory.create({
        workspace,
        owner,
        type: ResourceType.SPACE,
        title: 'Test Space',
        visibility: ResourceVisibility.PUBLIC,
      });

      (workspaceService.findById as jest.Mock).mockResolvedValue(workspace);
      (workspaceMemberService.findById as jest.Mock).mockResolvedValue(owner);
      (resourceRepository.create as jest.Mock).mockResolvedValue(
        expectedResource
      );

      // When
      const result = await service.create(createData);

      // Then
      expect(result).toEqual(expectedResource);
      expect(workspaceService.findById).toHaveBeenCalledWith(workspace.id);
      expect(workspaceMemberService.findById).toHaveBeenCalledWith(owner.id);
      expect(resourceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace,
          owner,
          type: ResourceType.SPACE,
          title: 'Test Space',
          visibility: ResourceVisibility.PUBLIC,
        })
      );
    });

    it('워크스페이스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const createData = {
        workspaceId: 'non-existent-workspace',
        ownerId: 'member-123',
        type: ResourceType.SPACE,
        title: 'Test Space',
      };

      (workspaceService.findById as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(service.create(createData)).rejects.toThrow(AppError);
      await expect(service.create(createData)).rejects.toMatchObject({
        code: 'workspace.fetch.notFound',
      });
    });

    it('워크스페이스 멤버를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const workspace = WorkspaceFactory.create();
      const createData = {
        workspaceId: workspace.id,
        ownerId: 'non-existent-member',
        type: ResourceType.SPACE,
        title: 'Test Space',
      };

      (workspaceService.findById as jest.Mock).mockResolvedValue(workspace);
      (workspaceMemberService.findById as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(service.create(createData)).rejects.toThrow(AppError);
      await expect(service.create(createData)).rejects.toMatchObject({
        code: 'workspace.member.fetch.notFound',
      });
    });
  });

  describe('findById', () => {
    it('ID로 리소스를 찾아야 함', async () => {
      // Given
      const resourceId = 'resource-123';
      const expectedResource = ResourceFactory.create({ id: resourceId });
      (resourceRepository.findById as jest.Mock).mockResolvedValue(
        expectedResource
      );

      // When
      const result = await service.findById(resourceId);

      // Then
      expect(result).toEqual(expectedResource);
      expect(resourceRepository.findById).toHaveBeenCalledWith(resourceId);
    });

    it('리소스를 찾을 수 없으면 null을 반환해야 함', async () => {
      // Given
      const resourceId = 'non-existent';
      (resourceRepository.findById as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findById(resourceId);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('관계를 포함하여 ID로 리소스를 찾아야 함', async () => {
      // Given
      const resourceId = 'resource-123';
      const expectedResource = ResourceFactory.create({ id: resourceId });
      (resourceRepository.findByIdWithRelations as jest.Mock).mockResolvedValue(
        expectedResource
      );

      // When
      const result = await service.findByIdWithRelations(resourceId);

      // Then
      expect(result).toEqual(expectedResource);
      expect(resourceRepository.findByIdWithRelations).toHaveBeenCalledWith(
        resourceId
      );
    });
  });

  describe('findByWorkspace', () => {
    it('워크스페이스의 모든 리소스를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const expectedResources = ResourceFactory.createMany(3);
      (resourceRepository.findByWorkspace as jest.Mock).mockResolvedValue(
        expectedResources
      );

      // When
      const result = await service.findByWorkspace(workspaceId);

      // Then
      expect(result).toEqual(expectedResources);
      expect(resourceRepository.findByWorkspace).toHaveBeenCalledWith(
        workspaceId
      );
    });
  });

  describe('findByWorkspaceAndType', () => {
    it('워크스페이스와 타입으로 리소스를 찾아야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const type = ResourceType.SPACE;
      const expectedResources = ResourceFactory.createMany(2, { type });
      (
        resourceRepository.findByWorkspaceAndType as jest.Mock
      ).mockResolvedValue(expectedResources);

      // When
      const result = await service.findByWorkspaceAndType(workspaceId, type);

      // Then
      expect(result).toEqual(expectedResources);
      expect(resourceRepository.findByWorkspaceAndType).toHaveBeenCalledWith(
        workspaceId,
        type
      );
    });
  });

  describe('update', () => {
    it('리소스를 성공적으로 업데이트해야 함', async () => {
      // Given
      const resourceId = 'resource-123';
      const existingResource = ResourceFactory.create({ id: resourceId });
      const updateData = { title: 'Updated Title' };
      const updatedResource = { ...existingResource, ...updateData };

      (resourceRepository.findById as jest.Mock).mockResolvedValue(
        existingResource
      );
      (resourceRepository.update as jest.Mock).mockResolvedValue(
        updatedResource
      );

      // When
      const result = await service.update(resourceId, updateData);

      // Then
      expect(result).toEqual(updatedResource);
      expect(resourceRepository.findById).toHaveBeenCalledWith(resourceId);
      expect(resourceRepository.update).toHaveBeenCalledWith(
        resourceId,
        updateData
      );
    });

    it('리소스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const resourceId = 'non-existent';
      const updateData = { title: 'Updated Title' };
      (resourceRepository.findById as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(service.update(resourceId, updateData)).rejects.toThrow(
        AppError
      );
      await expect(
        service.update(resourceId, updateData)
      ).rejects.toMatchObject({
        code: 'resource.fetch.notFound',
      });
    });
  });

  describe('deleteResource', () => {
    it('리소스를 성공적으로 삭제해야 함', async () => {
      // Given
      const resourceId = 'resource-123';
      const existingResource = ResourceFactory.create({ id: resourceId });
      (resourceRepository.findById as jest.Mock).mockResolvedValue(
        existingResource
      );
      (resourceRepository.delete as jest.Mock).mockResolvedValue(undefined);

      // When
      await service.deleteResource(resourceId);

      // Then
      expect(resourceRepository.findById).toHaveBeenCalledWith(resourceId);
      expect(resourceRepository.delete).toHaveBeenCalledWith(resourceId);
    });

    it('리소스를 찾을 수 없으면 AppError를 던져야 함', async () => {
      // Given
      const resourceId = 'non-existent';
      (resourceRepository.findById as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(service.deleteResource(resourceId)).rejects.toThrow(
        AppError
      );
      await expect(service.deleteResource(resourceId)).rejects.toMatchObject({
        code: 'resource.fetch.notFound',
      });
    });
  });

  describe('generatePath', () => {
    it('부모 경로가 없으면 루트 레벨 경로를 생성해야 함', () => {
      // Given
      const parentPath = undefined;

      // When
      const path = (service as any).generatePath(parentPath);

      // Then
      expect(path).toMatch(/^r\d+$/);
    });

    it('부모 경로가 "/"이면 루트 레벨 경로를 생성해야 함', () => {
      // Given
      const parentPath = '/';

      // When
      const path = (service as any).generatePath(parentPath);

      // Then
      expect(path).toMatch(/^r\d+$/);
    });

    it('부모 경로가 있으면 하위 경로를 생성해야 함', () => {
      // Given
      const parentPath = 'root.parent';

      // When
      const path = (service as any).generatePath(parentPath);

      // Then
      expect(path).toMatch(/^root\.parent\.r\d+$/);
    });
  });
});
