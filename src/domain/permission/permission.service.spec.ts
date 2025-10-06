import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PermissionRepository } from './permission.repository';
import { Action, ResourceSubject } from './entity/permission.entity';
import { createMockRepository } from '../../../test/utils/mock-providers';

describe('PermissionService', () => {
  let service: PermissionService;
  let repository: PermissionRepository;

  beforeEach(async () => {
    const mockRepository = {
      ...createMockRepository(),
      hasPermission: jest.fn(),
      getSpaceByPath: jest.fn(),
      getMeetingByPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PermissionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    repository = module.get<PermissionRepository>(PermissionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasSpacePermission', () => {
    it('공간에 대한 권한이 있을 때 true를 반환해야 함', async () => {
      // Given
      const memberId = 'member-123';
      const spaceId = 'space-123';
      const mockSpace = {
        id: spaceId,
        path: '/workspace/space',
        visibility: 'PUBLIC',
      };

      (service as any).getSpaceWithPath = jest.fn().mockResolvedValue(mockSpace);
      (service as any).checkResourceTreeVisibility = jest.fn().mockResolvedValue(true);
      (service as any).checkPermissionsOnly = jest.fn().mockResolvedValue(true);

      // When
      const result = await service.hasSpacePermission(
        memberId,
        Action.READ,
        spaceId
      );

      // Then
      expect(result).toBe(true);
    });

    it('공간을 찾을 수 없을 때 false를 반환해야 함', async () => {
      // Given
      const memberId = 'member-123';
      const spaceId = 'non-existent';

      (service as any).getSpaceWithPath = jest.fn().mockResolvedValue(null);

      // When
      const result = await service.hasSpacePermission(
        memberId,
        Action.READ,
        spaceId
      );

      // Then
      expect(result).toBe(false);
    });

    it('Visibility 체크가 실패할 때 false를 반환해야 함', async () => {
      // Given
      const memberId = 'member-123';
      const spaceId = 'space-123';
      const mockSpace = {
        id: spaceId,
        path: '/workspace/space',
        visibility: 'PRIVATE',
      };

      (service as any).getSpaceWithPath = jest.fn().mockResolvedValue(mockSpace);
      (service as any).checkResourceTreeVisibility = jest.fn().mockResolvedValue(false);

      // When
      const result = await service.hasSpacePermission(
        memberId,
        Action.READ,
        spaceId
      );

      // Then
      expect(result).toBe(false);
      expect((service as any).checkResourceTreeVisibility).toHaveBeenCalledWith(
        '/workspace/space',
        memberId,
        Action.READ
      );
    });
  });

  describe('hasMeetingPermission', () => {
    it('미팅에 대한 권한이 있을 때 true를 반환해야 함', async () => {
      // Given
      const memberId = 'member-123';
      const meetingId = 'meeting-123';
      const mockMeeting = {
        id: meetingId,
        path: '/workspace/meeting',
        visibility: 'PUBLIC',
      };

      (service as any).getMeetingWithPath = jest.fn().mockResolvedValue(mockMeeting);
      (service as any).checkResourceTreeVisibility = jest.fn().mockResolvedValue(true);
      (service as any).checkPermissionsOnly = jest.fn().mockResolvedValue(true);

      // When
      const result = await service.hasMeetingPermission(
        memberId,
        Action.READ,
        meetingId
      );

      // Then
      expect(result).toBe(true);
    });

    it('미팅을 찾을 수 없을 때 false를 반환해야 함', async () => {
      // Given
      const memberId = 'member-123';
      const meetingId = 'non-existent';

      (service as any).getMeetingWithPath = jest.fn().mockResolvedValue(null);

      // When
      const result = await service.hasMeetingPermission(
        memberId,
        Action.READ,
        meetingId
      );

      // Then
      expect(result).toBe(false);
    });
  });
});