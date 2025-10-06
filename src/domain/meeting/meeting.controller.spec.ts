import { Test, TestingModule } from '@nestjs/testing';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { PublishMeetingDto } from './dto/publish-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { FilterQuery } from '../../shared/dto/request/filter.query';
import { SortQuery } from '../../shared/dto/request/sort.query';
import { ResourceVisibility } from '../resource/entity/resource.entity';

describe('MeetingController', () => {
  let controller: MeetingController;
  let service: MeetingService;

  const mockMeeting = {
    id: 'meeting-123',
    status: MeetingStatus.DRAFT,
    memo: null,
    summary: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Meeting;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingController],
      providers: [
        {
          provide: MeetingService,
          useValue: {
            createMeeting: jest.fn(),
            findMeetingsByWorkspace: jest.fn(),
            findMyDraftMeetings: jest.fn(),
            publishMeeting: jest.fn(),
            deleteMeeting: jest.fn(),
            getMeetingById: jest.fn(),
            updateMeeting: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MeetingController>(MeetingController);
    service = module.get<MeetingService>(MeetingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('미팅을 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const createDto: CreateMeetingDto = {
        parentPath: 'root',
      };

      jest.spyOn(service, 'createMeeting').mockResolvedValue(mockMeeting);

      // When
      const result = await controller.create(
        workspaceId,
        workspaceMemberId,
        createDto
      );

      // Then
      expect(result).toEqual(mockMeeting);
      expect(service.createMeeting).toHaveBeenCalledWith({
        workspaceId,
        workspaceMemberId,
        parentPath: 'root',
      });
    });
  });

  describe('findAll', () => {
    it('워크스페이스의 미팅 목록을 조회해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const pagination = new PaginationQuery();
      const filter = new FilterQuery();
      const sort = new SortQuery();

      const expectedResult = {
        data: [mockMeeting],
        totalCount: 1,
      };

      jest
        .spyOn(service, 'findMeetingsByWorkspace')
        .mockResolvedValue(expectedResult);

      // When
      const result = await controller.findAll(
        workspaceId,
        pagination,
        filter,
        sort
      );

      // Then
      expect(result).toEqual(expectedResult);
      expect(service.findMeetingsByWorkspace).toHaveBeenCalledWith(
        workspaceId,
        pagination,
        filter,
        sort
      );
    });
  });

  describe('findDraftMy', () => {
    it('나의 임시저장 미팅 목록을 조회해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const pagination = new PaginationQuery();
      const sort = new SortQuery();

      const expectedResult = {
        data: [mockMeeting],
        totalCount: 1,
      };

      jest
        .spyOn(service, 'findMyDraftMeetings')
        .mockResolvedValue(expectedResult);

      // When
      const result = await controller.findDraftMy(
        workspaceId,
        workspaceMemberId,
        pagination,
        sort
      );

      // Then
      expect(result).toEqual(expectedResult);
      expect(service.findMyDraftMeetings).toHaveBeenCalledWith(
        workspaceId,
        workspaceMemberId,
        pagination,
        sort
      );
    });
  });

  describe('publish', () => {
    it('미팅을 발행해야 함', async () => {
      // Given
      const id = 'meeting-123';
      const workspaceId = 'workspace-123';
      const workspaceMemberId = 'member-123';
      const publishDto: PublishMeetingDto = {
        visibility: ResourceVisibility.PUBLIC,
      };

      const publishedMeeting = {
        ...mockMeeting,
        status: MeetingStatus.PUBLISHED,
      };

      jest.spyOn(service, 'publishMeeting').mockResolvedValue(publishedMeeting);

      // When
      const result = await controller.publish(
        id,
        workspaceId,
        workspaceMemberId,
        publishDto
      );

      // Then
      expect(result).toEqual(publishedMeeting);
      expect(service.publishMeeting).toHaveBeenCalledWith({
        id,
        workspaceId,
        workspaceMemberId,
        data: publishDto,
      });
    });
  });

  describe('remove', () => {
    it('미팅을 삭제해야 함', async () => {
      // Given
      const id = 'meeting-123';
      const workspaceId = 'workspace-123';

      jest.spyOn(service, 'deleteMeeting').mockResolvedValue(mockMeeting);

      // When
      await controller.remove(id, workspaceId);

      // Then
      expect(service.deleteMeeting).toHaveBeenCalledWith(id);
    });
  });

  describe('findOne', () => {
    it('미팅 상세 정보를 조회해야 함', async () => {
      // Given
      const id = 'meeting-123';
      const workspaceId = 'workspace-123';

      jest.spyOn(service, 'getMeetingById').mockResolvedValue(mockMeeting);

      // When
      const result = await controller.findOne(id, workspaceId);

      // Then
      expect(result).toEqual(mockMeeting);
      expect(service.getMeetingById).toHaveBeenCalledWith(id, workspaceId);
    });
  });

  describe('update', () => {
    it('미팅을 수정해야 함', async () => {
      // Given
      const id = 'meeting-123';
      const workspaceId = 'workspace-123';
      const updateDto: UpdateMeetingDto = {
        memo: 'Updated memo',
      };

      const updatedMeeting = {
        ...mockMeeting,
        memo: 'Updated memo',
      };

      jest.spyOn(service, 'updateMeeting').mockResolvedValue(updatedMeeting);

      // When
      const result = await controller.update(id, workspaceId, updateDto);

      // Then
      expect(result).toEqual(updatedMeeting);
      expect(service.updateMeeting).toHaveBeenCalledWith(id, updateDto);
    });
  });
});
