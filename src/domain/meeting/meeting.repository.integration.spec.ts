import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingRepository } from './meeting.repository';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import {
  initializeTestDatabase,
  cleanupTestDatabase,
} from '../../../test/utils/db-helpers';
import { createMeetingFixture } from '../../../test/fixtures/meeting.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';

describe('MeetingRepository', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let repository: MeetingRepository;

  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withEntity(Meeting)
      .withProvider(MeetingRepository)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    repository = module.get<MeetingRepository>(MeetingRepository);

    await initializeTestDatabase(orm);
  });

  beforeEach(async () => {
    em.clear();
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await orm.close();
  });

  describe('create', () => {
    it('필수 필드를 모두 포함하여 meeting을 생성해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      expect(meeting).toBeDefined();
      expect(meeting.id).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.DRAFT);
      expect(meeting.workspace.id).toBe(workspace.id);
      expect(meeting.resource).toBeDefined();
    });

    it('커스텀 상태로 meeting을 생성해야 함', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.IN_PROGRESS,
      });

      expect(meeting.status).toBe(MeetingStatus.IN_PROGRESS);
    });

    it('resource 관계를 populate해야 함', async () => {
      const meeting = await createMeetingFixture(em);

      expect(meeting.resource.title).toBe('Test Meeting');
      expect(meeting.resource.workspace).toBeDefined();
    });
  });

  describe('findById', () => {
    it('ID와 workspace로 meeting을 찾아야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const created = await createMeetingFixture(em, { workspace });

      const found = await repository.findById(created.id, workspace.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.resource.workspace.id).toBe(workspace.id);
    });

    it('존재하지 않는 meeting에 대해 null을 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      const found = await repository.findById(
        '00000000-0000-0000-0000-000000000000',
        workspace.id
      );

      expect(found).toBeNull();
    });

    it('다른 workspace의 meeting에 대해 null을 반환해야 함', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace: workspace1 });

      const found = await repository.findById(meeting.id, workspace2.id);

      expect(found).toBeNull();
    });

    it('관계를 올바르게 populate해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      const found = await repository.findById(meeting.id, workspace.id);

      expect(found!.resource).toBeDefined();
      expect(found!.resource.workspace).toBeDefined();
      expect(found!.resource.owner).toBeDefined();
    });
  });

  describe('updateEntity', () => {
    it('meeting 상태를 업데이트해야 함', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.DRAFT,
      });

      const updated = await repository.updateEntity(meeting, {
        status: MeetingStatus.PUBLISHED,
      });

      expect(updated.status).toBe(MeetingStatus.PUBLISHED);
      expect(updated.id).toBe(meeting.id);
    });

    it('meeting 메모를 업데이트해야 함', async () => {
      const meeting = await createMeetingFixture(em);

      const updated = await repository.updateEntity(meeting, {
        memo: 'Updated memo content',
      });

      expect(updated.memo).toBe('Updated memo content');
    });

    it('여러 필드를 업데이트해야 함', async () => {
      const meeting = await createMeetingFixture(em);

      const updated = await repository.updateEntity(meeting, {
        status: MeetingStatus.IN_PROGRESS,
        memo: 'New memo',
        summary: 'New summary',
      });

      expect(updated.status).toBe(MeetingStatus.IN_PROGRESS);
      expect(updated.memo).toBe('New memo');
      expect(updated.summary).toBe('New summary');
    });
  });

  describe('delete', () => {
    it('meeting을 소프트 삭제해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await repository.delete(meeting.id);

      const found = await repository.findById(meeting.id, workspace.id);
      expect(found).toBeNull();
    });

    it('deletedAt 타임스탬프를 설정해야 함', async () => {
      const meeting = await createMeetingFixture(em);

      await repository.delete(meeting.id);

      // Use getReference to bypass soft delete filter
      const deleted = await em.findOne(
        Meeting,
        { id: meeting.id },
        { filters: { softDelete: false } }
      );

      expect(deleted).toBeDefined();
      expect(deleted!.deletedAt).toBeDefined();
      expect(deleted!.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('pagination', () => {
    it('페이지네이션된 meeting 목록을 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      for (let i = 0; i < 5; i++) {
        await createMeetingFixture(em, {
          workspace,
          status: MeetingStatus.PUBLISHED,
        });
      }

      em.clear();

      const result = await repository.findByWorkspace(workspace.id, {
        page: 1,
        limit: 3,
        offset: 0,
      });

      expect(result.data).toHaveLength(3);
      expect(result.totalCount).toBe(5);
    });

    it('상태로 필터링해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.PUBLISHED,
      });

      em.clear();

      const result = await repository.findByWorkspace(
        workspace.id,
        { page: 1, limit: 10, offset: 0 },
        { status: MeetingStatus.DRAFT }
      );

      expect(result.totalCount).toBe(2);
      expect(result.data.every((m) => m.status === MeetingStatus.DRAFT)).toBe(
        true
      );
    });

    it('workspace별로 meeting을 격리해야 함', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);

      await createMeetingFixture(em, {
        workspace: workspace1,
        status: MeetingStatus.PUBLISHED,
      });
      await createMeetingFixture(em, {
        workspace: workspace1,
        status: MeetingStatus.PUBLISHED,
      });
      await createMeetingFixture(em, {
        workspace: workspace2,
        status: MeetingStatus.PUBLISHED,
      });

      em.clear();

      const result1 = await repository.findByWorkspace(workspace1.id, {
        page: 1,
        limit: 10,
        offset: 0,
      });
      const result2 = await repository.findByWorkspace(workspace2.id, {
        page: 1,
        limit: 10,
        offset: 0,
      });

      expect(result1.totalCount).toBe(2);
      expect(result2.totalCount).toBe(1);
    });
  });
});
