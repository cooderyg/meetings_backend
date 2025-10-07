import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingParticipantService } from './meeting-participant.service';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { AppError } from '../../shared/exception/app.error';
import { MeetingParticipantModule } from './meeting-participant.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  createMeetingFixture,
  createWorkspaceMemberFixture,
} from '../../../test/fixtures/meeting.fixture';

describe('MeetingParticipantService Integration Tests with Testcontainer', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: MeetingParticipantService;
  let repository: MeetingParticipantRepository;
  const containerKey = 'meeting-participant-service-integration-test';

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(MeetingParticipantModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<MeetingParticipantService>(MeetingParticipantService);
    repository = module.get<MeetingParticipantRepository>(
      MeetingParticipantRepository
    );

    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  beforeEach(async () => {
    await orm.em.begin();
  });

  afterEach(async () => {
    await orm.em.rollback();
    orm.em.clear();
  });

  afterAll(async () => {
    if (em) {
      await em.getConnection().close(true);
    }

    if (orm) {
      await orm.close();
    }

    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('create', () => {
    it('워크스페이스 멤버로 MeetingParticipant를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      // When
      const participant = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      // Then
      expect(participant).toBeDefined();
      expect(participant.id).toBeDefined();
      expect(participant.meeting.id).toBe(meeting.id);
      expect(participant.workspaceMember!.id).toBe(member.id);
      expect(participant.guestName).toBeNull();
    });

    it('게스트로 MeetingParticipant를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      // When
      const participant = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        guestName: '게스트 홍길동',
      });

      // Then
      expect(participant).toBeDefined();
      expect(participant.guestName).toBe('게스트 홍길동');
      expect(participant.workspaceMember).toBeNull();
    });

    it('@Transactional로 MeetingParticipant가 자동으로 flush되어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      // When
      const participant = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      const participantId = participant.id;
      em.clear();

      // Then - 새 컨텍스트에서 조회 가능해야 함
      const found = await repository.findById(participantId);
      expect(found).toBeDefined();
      expect(found!.id).toBe(participantId);
    });

    it('존재하지 않는 Meeting으로 참여자 생성 시 AppError를 던져야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const nonExistentMeetingId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.create({
          meetingId: nonExistentMeetingId,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.create({
          meetingId: nonExistentMeetingId,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
        })
      ).rejects.toMatchObject({
        code: 'meetingParticipant.create.meetingNotFound',
      });
    });

    it('존재하지 않는 WorkspaceMember로 참여자 생성 시 AppError를 던져야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });
      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(
        service.create({
          meetingId: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: nonExistentMemberId,
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.create({
          meetingId: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: nonExistentMemberId,
        })
      ).rejects.toMatchObject({
        code: 'meetingParticipant.create.memberNotFound',
      });
    });

    it('중복된 참여자 생성 시 AppError를 던져야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      // 첫 번째 참여자 생성
      await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      // When/Then - 동일한 멤버로 재참여 시도
      await expect(
        service.create({
          meetingId: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.create({
          meetingId: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
        })
      ).rejects.toMatchObject({
        code: 'meetingParticipant.create.duplicate',
      });
    });
  });

  describe('delete', () => {
    it('MeetingParticipant를 삭제해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      const participant = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      const participantId = participant.id;
      em.clear();

      // When
      await service.delete(participantId);
      em.clear();

      // Then
      const found = await repository.findById(participantId);
      expect(found).toBeNull();
    });

    it('@Transactional로 삭제가 자동으로 flush되어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      const participant = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      const participantId = participant.id;
      em.clear();

      // When
      await service.delete(participantId);

      // Then - 즉시 삭제 확인 가능
      em.clear();
      const found = await repository.findById(participantId);
      expect(found).toBeNull();
    });

    it('존재하지 않는 MeetingParticipant 삭제 시 AppError를 던져야 함', async () => {
      // Given
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // When/Then
      await expect(service.delete(nonExistentId)).rejects.toThrow(AppError);
      await expect(service.delete(nonExistentId)).rejects.toMatchObject({
        code: 'meetingParticipant.delete.notFound',
      });
    });
  });

  describe('findByMeetingAndMember', () => {
    it('Meeting과 WorkspaceMember로 참여자를 찾아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      const created = await service.create({
        meetingId: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
      });

      em.clear();

      // When
      const found = await service.findByMeetingAndMember(meeting.id, member.id);

      // Then
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });

    it('존재하지 않는 조합에 대해 null을 반환해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
      });

      // When
      const found = await service.findByMeetingAndMember(meeting.id, member.id);

      // Then
      expect(found).toBeNull();
    });
  });
});
