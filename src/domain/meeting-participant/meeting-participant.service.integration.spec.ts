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
    // Testcontainer를 사용한 모듈 빌드
    const module = await TestModuleBuilder.create()
      .withModule(MeetingParticipantModule)
      .withTestcontainer(containerKey)
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as any; // Use root EM instead of fork
    service = module.get<MeetingParticipantService>(MeetingParticipantService);
    repository = module.get<MeetingParticipantRepository>(
      MeetingParticipantRepository
    );

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성 (기존 스키마 삭제 후 재생성)
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000); // Testcontainer 시작 시간 고려

  beforeEach(async () => {
    // 각 테스트를 트랜잭션으로 격리
    await orm.em.begin();
  });

  afterEach(async () => {
    // 트랜잭션 롤백으로 데이터 초기화
    await orm.em.rollback();
    orm.em.clear();
  });

  afterAll(async () => {
    // 정리 작업
    if (em) {
      await em.getConnection().close(true);
    }

    if (orm) {
      await orm.close();
    }

    // Testcontainer 정리
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
      const member = await createWorkspaceMemberFixture(em, { workspace });
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
      const member = await createWorkspaceMemberFixture(em, { workspace });
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
      const found = await service.findByMeetingAndMember(
        meeting.id,
        member.id
      );

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
      const found = await service.findByMeetingAndMember(
        meeting.id,
        member.id
      );

      // Then
      expect(found).toBeNull();
    });
  });
});
