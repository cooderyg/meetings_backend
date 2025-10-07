import { TestingModule } from '@nestjs/testing';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { MeetingParticipantRepository } from './meeting-participant.repository';
import { MeetingParticipant } from './entity/meeting-participant.entity';
import { Meeting } from '../meeting/entity/meeting.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { User } from '../user/entity/user.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { UserFactory } from '../../../test/factories/user.factory';
import { WorkspaceFactory } from '../../../test/factories/workspace.factory';
import { MeetingFactory } from '../../../test/factories/meeting.factory';
import { v4 as uuid } from 'uuid';

describe('MeetingParticipantRepository Integration Tests with Testcontainer', () => {
  let module: TestingModule;
  let repository: MeetingParticipantRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'meeting-participant-integration-test';

  // Helper functions
  const createUser = async (overrides: Partial<User> = {}) => {
    const user = UserFactory.create(overrides);
    await em.persistAndFlush(user);
    return user;
  };

  const createWorkspace = async (overrides: Partial<Workspace> = {}) => {
    const workspace = WorkspaceFactory.create(overrides);
    await em.persistAndFlush(workspace);
    return workspace;
  };

  const createMeeting = async (
    workspace: Workspace,
    owner?: WorkspaceMember,
    overrides: Partial<Meeting> = {}
  ) => {
    const meeting = MeetingFactory.createForWorkspace(workspace, owner, overrides);
    // resource를 먼저 persist
    if (meeting.resource) {
      await em.persistAndFlush(meeting.resource);
    }
    await em.persistAndFlush(meeting);
    return meeting;
  };

  const createWorkspaceMember = async (user: User, workspace: Workspace) => {
    const workspaceMember = new WorkspaceMember();
    workspaceMember.id = uuid();
    workspaceMember.user = user;
    workspaceMember.workspace = workspace;
    workspaceMember.firstName = user.firstName;
    workspaceMember.lastName = user.lastName;
    workspaceMember.isActive = true;
    workspaceMember.createdAt = new Date();
    workspaceMember.updatedAt = new Date();
    await em.persistAndFlush(workspaceMember);
    return workspaceMember;
  };

  beforeAll(async () => {
    // Testcontainer를 사용한 모듈 빌드
    module = await TestModuleBuilder.create()
      .withTestcontainer(containerKey)
      .build();

    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // Repository 직접 생성
    const entityRepository = new EntityRepository(em, MeetingParticipant);
    repository = new MeetingParticipantRepository(entityRepository);

    // ltree 확장 설치 (Resource 엔티티에서 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

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
    it('워크스페이스 멤버로 미팅 참여자를 생성해야 함', async () => {
      // Given
      const user = await createUser();
      const workspace = await createWorkspace();
      const workspaceMember = await createWorkspaceMember(user, workspace);
      const meeting = await createMeeting(workspace, workspaceMember);

      const createData = {
        meeting,
        workspaceMember,
      };

      // When
      const result = await repository.create(createData);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.meeting.id).toBe(meeting.id);
      expect(result.workspaceMember?.id).toBe(workspaceMember.id);
      expect(result.guestName).toBeNull();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('게스트 이름으로 미팅 참여자를 생성해야 함', async () => {
      // Given
      const user = await createUser();
      const workspace = await createWorkspace();
      const workspaceMember = await createWorkspaceMember(user, workspace);
      const meeting = await createMeeting(workspace, workspaceMember);

      const createData = {
        meeting,
        guestName: '홍길동',
      };

      // When
      const result = await repository.create(createData);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.meeting.id).toBe(meeting.id);
      expect(result.workspaceMember).toBeNull();
      expect(result.guestName).toBe('홍길동');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('findById', () => {
    it('ID로 미팅 참여자를 찾아야 함', async () => {
      // Given
      const user = await createUser();
      const workspace = await createWorkspace();
      const workspaceMember = await createWorkspaceMember(user, workspace);
      const meeting = await createMeeting(workspace, workspaceMember);

      const createData = {
        meeting,
        workspaceMember,
      };

      const createdParticipant = await repository.create(createData);

      // When
      const result = await repository.findById(createdParticipant.id);

      // Then
      expect(result).toBeDefined();
      expect(result?.id).toBe(createdParticipant.id);
      expect(result?.meeting.id).toBe(meeting.id);
      expect(result?.workspaceMember?.id).toBe(workspaceMember.id);
    });

    it('존재하지 않는 ID로 찾으면 null을 반환해야 함', async () => {
      // Given
      const nonExistentId = uuid();

      // When
      const result = await repository.findById(nonExistentId);

      // Then
      expect(result).toBeNull();
    });
  });

  describe('findByMeetingAndMember', () => {
    it('미팅과 멤버로 참여자를 찾아야 함', async () => {
      // Given
      const user = await createUser();
      const workspace = await createWorkspace();
      const workspaceMember = await createWorkspaceMember(user, workspace);
      const meeting = await createMeeting(workspace, workspaceMember);

      const createData = {
        meeting,
        workspaceMember,
      };

      await repository.create(createData);

      // When
      const result = await repository.findByMeetingAndMember(
        meeting.id,
        workspaceMember.id
      );

      // Then
      expect(result).toBeDefined();
      expect(result?.meeting.id).toBe(meeting.id);
      expect(result?.workspaceMember?.id).toBe(workspaceMember.id);
    });

    it('존재하지 않는 조합으로 찾으면 null을 반환해야 함', async () => {
      // Given
      const nonExistentMeetingId = uuid();
      const nonExistentMemberId = uuid();

      // When
      const result = await repository.findByMeetingAndMember(
        nonExistentMeetingId,
        nonExistentMemberId
      );

      // Then
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('미팅 참여자를 삭제해야 함', async () => {
      // Given
      const user = await createUser();
      const workspace = await createWorkspace();
      const workspaceMember = await createWorkspaceMember(user, workspace);
      const meeting = await createMeeting(workspace, workspaceMember);

      const createData = {
        meeting,
        workspaceMember,
      };

      const createdParticipant = await repository.create(createData);

      // When
      await repository.delete(createdParticipant);

      // Then
      const result = await repository.findById(createdParticipant.id);
      expect(result).toBeNull();
    });
  });
});
