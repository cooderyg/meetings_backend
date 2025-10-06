import { Test, TestingModule } from '@nestjs/testing';
import { MeetingParticipantController } from './meeting-participant.controller';
import { MeetingParticipantService } from './meeting-participant.service';
import { CreateMeetingParticipantDto } from './dto/create-meeting-participant.dto';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

describe('MeetingParticipantController', () => {
  let controller: MeetingParticipantController;
  let service: MeetingParticipantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingParticipantController],
      providers: [
        {
          provide: MeetingParticipantService,
          useValue: {
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(WorkspaceMemberGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<MeetingParticipantController>(
      MeetingParticipantController
    );
    service = module.get<MeetingParticipantService>(MeetingParticipantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('미팅 참여자를 성공적으로 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const dto: CreateMeetingParticipantDto = {
        meetingId: 'meeting-123',
        workspaceMemberId: 'member-123',
      };

      const expectedParticipant = {
        id: 'participant-123',
        meeting: { id: 'meeting-123' },
        workspaceMember: { id: 'member-123' },
        guestName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as MeetingParticipant;

      jest.spyOn(service, 'create').mockResolvedValue(expectedParticipant);

      // When
      const result = await controller.create(dto, workspaceId);

      // Then
      expect(result).toEqual(expectedParticipant);
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId,
      });
    });

    it('게스트 이름으로 미팅 참여자를 생성해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const dto: CreateMeetingParticipantDto = {
        meetingId: 'meeting-123',
        guestName: '홍길동',
      };

      const expectedParticipant = {
        id: 'participant-123',
        meeting: { id: 'meeting-123' },
        workspaceMember: null,
        guestName: '홍길동',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as MeetingParticipant;

      jest.spyOn(service, 'create').mockResolvedValue(expectedParticipant);

      // When
      const result = await controller.create(dto, workspaceId);

      // Then
      expect(result).toEqual(expectedParticipant);
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId,
      });
    });

    it('Service에서 에러가 발생하면 에러를 전파해야 함', async () => {
      // Given
      const workspaceId = 'workspace-123';
      const dto: CreateMeetingParticipantDto = {
        meetingId: 'meeting-123',
        workspaceMemberId: 'member-123',
      };

      const error = new Error('Meeting not found');
      jest.spyOn(service, 'create').mockRejectedValue(error);

      // When & Then
      await expect(controller.create(dto, workspaceId)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        workspaceId,
      });
    });
  });

  describe('delete', () => {
    it('미팅 참여자를 성공적으로 삭제해야 함', async () => {
      // Given
      const participantId = 'participant-123';

      jest.spyOn(service, 'delete').mockResolvedValue(undefined);

      // When
      await controller.delete(participantId);

      // Then
      expect(service.delete).toHaveBeenCalledWith(participantId);
    });

    it('Service에서 에러가 발생하면 에러를 전파해야 함', async () => {
      // Given
      const participantId = 'participant-123';

      const error = new Error('Participant not found');
      jest.spyOn(service, 'delete').mockRejectedValue(error);

      // When & Then
      await expect(controller.delete(participantId)).rejects.toThrow(error);
      expect(service.delete).toHaveBeenCalledWith(participantId);
    });
  });
});
