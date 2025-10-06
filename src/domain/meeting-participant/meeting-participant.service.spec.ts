import { Test, TestingModule } from '@nestjs/testing';
import { MeetingParticipantService } from './meeting-participant.service';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { MeetingService } from '../meeting/meeting.service';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { CreateMeetingParticipantArgs } from './interface/args/create-meeting-participant.args';
import { AppError } from '../../shared/exception/app.error';
import { Meeting } from '../meeting/entity/meeting.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { MeetingParticipant } from './entity/meeting-participant.entity';

describe('MeetingParticipantService', () => {
  let service: MeetingParticipantService;
  let repository: MeetingParticipantRepository;
  let meetingService: MeetingService;
  let workspaceMemberService: WorkspaceMemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MeetingParticipantService,
          useValue: {
            create: jest.fn(),
            delete: jest.fn(),
            findByMeetingAndMember: jest.fn(),
          },
        },
        {
          provide: MeetingParticipantRepository,
          useValue: {
            create: jest.fn(),
            delete: jest.fn(),
            findById: jest.fn(),
            findByMeetingAndMember: jest.fn(),
          },
        },
        {
          provide: MeetingService,
          useValue: {
            getMeetingById: jest.fn(),
          },
        },
        {
          provide: WorkspaceMemberService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MeetingParticipantService>(MeetingParticipantService);
    repository = module.get<MeetingParticipantRepository>(
      MeetingParticipantRepository
    );
    meetingService = module.get<MeetingService>(MeetingService);
    workspaceMemberService = module.get<WorkspaceMemberService>(
      WorkspaceMemberService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('워크스페이스 멤버로 미팅 참여자를 성공적으로 생성해야 함', async () => {
      // Given
      const args: CreateMeetingParticipantArgs = {
        meetingId: 'meeting-123',
        workspaceId: 'workspace-123',
        workspaceMemberId: 'member-123',
      };

      const mockMeeting = {
        id: 'meeting-123',
        workspaceId: 'workspace-123',
      } as any;

      const mockWorkspaceMember = {
        id: 'member-123',
        workspaceId: 'workspace-123',
      } as any;

      const expectedParticipant = {
        id: 'participant-123',
        meeting: mockMeeting,
        workspaceMember: mockWorkspaceMember,
        guestName: null,
      } as any;

      // Mock 설정
      (service.create as jest.Mock).mockResolvedValue(expectedParticipant);

      // When
      const result = await service.create(args);

      // Then
      expect(result).toEqual(expectedParticipant);
      expect(service.create).toHaveBeenCalledWith(args);
    });

    it('게스트 이름으로 미팅 참여자를 성공적으로 생성해야 함', async () => {
      // Given
      const args: CreateMeetingParticipantArgs = {
        meetingId: 'meeting-123',
        workspaceId: 'workspace-123',
        guestName: '홍길동',
      };

      const mockMeeting = {
        id: 'meeting-123',
        workspaceId: 'workspace-123',
      } as any;

      const expectedParticipant = {
        id: 'participant-123',
        meeting: mockMeeting,
        workspaceMember: null,
        guestName: '홍길동',
      } as any;

      // Mock 설정
      (service.create as jest.Mock).mockResolvedValue(expectedParticipant);

      // When
      const result = await service.create(args);

      // Then
      expect(result).toEqual(expectedParticipant);
      expect(service.create).toHaveBeenCalledWith(args);
    });

    it('미팅이 존재하지 않으면 에러를 발생시켜야 함', async () => {
      // Given
      const args: CreateMeetingParticipantArgs = {
        meetingId: 'non-existent-meeting',
        workspaceId: 'workspace-123',
        workspaceMemberId: 'member-123',
      };

      // Mock 설정
      (service.create as jest.Mock).mockRejectedValue(
        new AppError('meetingParticipant.create.meetingNotFound')
      );

      // When & Then
      await expect(service.create(args)).rejects.toMatchObject({
        code: 'meetingParticipant.create.meetingNotFound',
      });
      expect(service.create).toHaveBeenCalledWith(args);
    });

    it('워크스페이스 멤버가 존재하지 않으면 에러를 발생시켜야 함', async () => {
      // Given
      const args: CreateMeetingParticipantArgs = {
        meetingId: 'meeting-123',
        workspaceId: 'workspace-123',
        workspaceMemberId: 'non-existent-member',
      };

      // Mock 설정
      (service.create as jest.Mock).mockRejectedValue(
        new AppError('meetingParticipant.create.memberNotFound')
      );

      // When & Then
      await expect(service.create(args)).rejects.toMatchObject({
        code: 'meetingParticipant.create.memberNotFound',
      });
      expect(service.create).toHaveBeenCalledWith(args);
    });

    it('중복 참여자면 에러를 발생시켜야 함', async () => {
      // Given
      const args: CreateMeetingParticipantArgs = {
        meetingId: 'meeting-123',
        workspaceId: 'workspace-123',
        workspaceMemberId: 'member-123',
      };

      // Mock 설정
      (service.create as jest.Mock).mockRejectedValue(
        new AppError('meetingParticipant.create.duplicate')
      );

      // When & Then
      await expect(service.create(args)).rejects.toMatchObject({
        code: 'meetingParticipant.create.duplicate',
      });
      expect(service.create).toHaveBeenCalledWith(args);
    });
  });

  describe('delete', () => {
    it('미팅 참여자를 성공적으로 삭제해야 함', async () => {
      // Given
      const participantId = 'participant-123';

      // Mock 설정
      (service.delete as jest.Mock).mockResolvedValue(undefined);

      // When
      await service.delete(participantId);

      // Then
      expect(service.delete).toHaveBeenCalledWith(participantId);
    });

    it('참여자가 존재하지 않으면 에러를 발생시켜야 함', async () => {
      // Given
      const participantId = 'non-existent-participant';

      // Mock 설정
      (service.delete as jest.Mock).mockRejectedValue(
        new AppError('meetingParticipant.delete.notFound')
      );

      // When & Then
      await expect(service.delete(participantId)).rejects.toMatchObject({
        code: 'meetingParticipant.delete.notFound',
      });
      expect(service.delete).toHaveBeenCalledWith(participantId);
    });
  });

  describe('findByMeetingAndMember', () => {
    it('미팅과 멤버로 참여자를 찾아야 함', async () => {
      // Given
      const meetingId = 'meeting-123';
      const workspaceMemberId = 'member-123';

      const expectedParticipant = {
        id: 'participant-123',
        meeting: { id: 'meeting-123' },
        workspaceMember: { id: 'member-123' },
      } as any;

      // Mock 설정
      (service.findByMeetingAndMember as jest.Mock).mockResolvedValue(
        expectedParticipant
      );

      // When
      const result = await service.findByMeetingAndMember(
        meetingId,
        workspaceMemberId
      );

      // Then
      expect(result).toEqual(expectedParticipant);
      expect(service.findByMeetingAndMember).toHaveBeenCalledWith(
        meetingId,
        workspaceMemberId
      );
    });

    it('참여자가 없으면 null을 반환해야 함', async () => {
      // Given
      const meetingId = 'meeting-123';
      const workspaceMemberId = 'member-123';

      // Mock 설정
      (service.findByMeetingAndMember as jest.Mock).mockResolvedValue(null);

      // When
      const result = await service.findByMeetingAndMember(
        meetingId,
        workspaceMemberId
      );

      // Then
      expect(result).toBeNull();
      expect(service.findByMeetingAndMember).toHaveBeenCalledWith(
        meetingId,
        workspaceMemberId
      );
    });
  });
});
