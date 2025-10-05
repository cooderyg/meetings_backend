import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingRepository } from './meeting.repository';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { initializeTestDatabase, cleanupTestDatabase } from '../../../test/utils/db-helpers';
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
    em = orm.em as any; // Use global EntityManager to share context with repository
    repository = module.get<MeetingRepository>(MeetingRepository);

    await initializeTestDatabase(orm);
  });

  beforeEach(async () => {
    // Clear identity map before each test to prevent cache pollution
    em.clear();
  });

  afterEach(async () => {
    // Clean up test data - safe approach using DELETE instead of TRUNCATE
    await em.execute('DELETE FROM meeting_participants');
    await em.execute('DELETE FROM meetings');
    await em.execute('DELETE FROM resources');
    await em.execute('DELETE FROM workspace_member_roles');
    await em.execute('DELETE FROM workspace_members');
    await em.execute('DELETE FROM roles');
    await em.execute('DELETE FROM workspaces');
    await em.execute('DELETE FROM users');
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await orm.close();
  });

  describe('create', () => {
    it('should create a meeting with all required fields', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      expect(meeting).toBeDefined();
      expect(meeting.id).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.DRAFT);
      expect(meeting.workspace.id).toBe(workspace.id);
      expect(meeting.resource).toBeDefined();
    });

    it('should create meeting with custom status', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.IN_PROGRESS,
      });

      expect(meeting.status).toBe(MeetingStatus.IN_PROGRESS);
    });

    it('should populate resource relationship', async () => {
      const meeting = await createMeetingFixture(em);

      expect(meeting.resource.title).toBe('Test Meeting');
      expect(meeting.resource.workspace).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find meeting by id and workspace', async () => {
      const workspace = await createWorkspaceFixture(em);
      const created = await createMeetingFixture(em, { workspace });

      const found = await repository.findById(created.id, workspace.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.resource.workspace.id).toBe(workspace.id);
    });

    it('should return null for non-existent meeting', async () => {
      const workspace = await createWorkspaceFixture(em);

      const found = await repository.findById('00000000-0000-0000-0000-000000000000', workspace.id);

      expect(found).toBeNull();
    });

    it('should return null for different workspace', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace: workspace1 });

      const found = await repository.findById(meeting.id, workspace2.id);

      expect(found).toBeNull();
    });

    it('should populate relationships correctly', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      const found = await repository.findById(meeting.id, workspace.id);

      expect(found!.resource).toBeDefined();
      expect(found!.resource.workspace).toBeDefined();
      expect(found!.resource.owner).toBeDefined();
    });
  });

  describe('updateEntity', () => {
    it('should update meeting status', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.DRAFT,
      });

      const updated = await repository.updateEntity(meeting, {
        status: MeetingStatus.PUBLISHED,
      });

      expect(updated.status).toBe(MeetingStatus.PUBLISHED);
      expect(updated.id).toBe(meeting.id);
    });

    it('should update meeting memo', async () => {
      const meeting = await createMeetingFixture(em);

      const updated = await repository.updateEntity(meeting, {
        memo: 'Updated memo content',
      });

      expect(updated.memo).toBe('Updated memo content');
    });

    it('should update multiple fields', async () => {
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
    it('should soft delete a meeting', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await repository.delete(meeting.id);

      const found = await repository.findById(meeting.id, workspace.id);
      expect(found).toBeNull();
    });

    it('should set deletedAt timestamp', async () => {
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
    it('should return paginated meetings', async () => {
      const workspace = await createWorkspaceFixture(em);

      // Create 5 meetings (non-draft status as findByWorkspace excludes drafts)
      for (let i = 0; i < 5; i++) {
        await createMeetingFixture(em, { workspace, status: MeetingStatus.PUBLISHED });
      }

      // Clear identity map to force fresh database queries
      em.clear();

      const result = await repository.findByWorkspace(
        workspace.id,
        { page: 1, limit: 3, offset: 0 }
      );

      expect(result.data).toHaveLength(3);
      expect(result.totalCount).toBe(5);
    });

    it('should filter by status', async () => {
      const workspace = await createWorkspaceFixture(em);

      await createMeetingFixture(em, { workspace, status: MeetingStatus.DRAFT });
      await createMeetingFixture(em, { workspace, status: MeetingStatus.DRAFT });
      await createMeetingFixture(em, { workspace, status: MeetingStatus.PUBLISHED });

      // Clear identity map to force fresh database queries
      em.clear();

      const result = await repository.findByWorkspace(
        workspace.id,
        { page: 1, limit: 10, offset: 0 },
        { status: MeetingStatus.DRAFT }
      );

      expect(result.totalCount).toBe(2);
      expect(result.data.every((m) => m.status === MeetingStatus.DRAFT)).toBe(true);
    });

    it('should isolate meetings by workspace', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);

      await createMeetingFixture(em, { workspace: workspace1, status: MeetingStatus.PUBLISHED });
      await createMeetingFixture(em, { workspace: workspace1, status: MeetingStatus.PUBLISHED });
      await createMeetingFixture(em, { workspace: workspace2, status: MeetingStatus.PUBLISHED });

      // Clear identity map to force fresh database queries
      em.clear();

      const result1 = await repository.findByWorkspace(workspace1.id, { page: 1, limit: 10, offset: 0 });
      const result2 = await repository.findByWorkspace(workspace2.id, { page: 1, limit: 10, offset: 0 });

      expect(result1.totalCount).toBe(2);
      expect(result2.totalCount).toBe(1);
    });
  });
});
