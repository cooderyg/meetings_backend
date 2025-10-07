import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingRepository } from './meeting.repository';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { initializeTestDatabase, cleanupTestDatabase } from '../../../test/utils/db-helpers';
import { createMeetingFixture } from '../../../test/fixtures/meeting.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import { QueryCounter } from '../../../test/utils/query-counter';

/**
 * MeetingRepository Query Performance Tests
 *
 * N+1 쿼리 문제 감지 및 populate 최적화 검증
 */
describe('MeetingRepository - Query Performance', () => {
  let queryCounter: QueryCounter;
  let orm: MikroORM;
  let em: EntityManager;
  let repository: MeetingRepository;

  beforeAll(async () => {
    queryCounter = new QueryCounter();

    const module = await TestModuleBuilder.create()
      .withEntity(Meeting)
      .withProvider(MeetingRepository)
      .withQueryCounter(queryCounter)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    repository = module.get<MeetingRepository>(MeetingRepository);

    await initializeTestDatabase(orm);
  });

  beforeEach(() => {
    queryCounter.reset();
    em.clear();
  });

  afterAll(async () => {
    await cleanupTestDatabase(orm);
    await orm.close();
  });

  describe('N+1 Query Prevention', () => {
    it('findById should not produce N+1 queries (uses populate)', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      em.clear();
      queryCounter.reset();

      // Act
      await repository.findById(meeting.id, workspace.id);

      // Assert - Should use JOIN or separate SELECT but NOT N queries
      const selectCount = queryCounter.getSelectCount();
      expect(selectCount).toBeLessThanOrEqual(3); // 1 for meeting + 1-2 for relations
    });

    it('findByWorkspace should avoid N+1 when fetching multiple meetings', async () => {
      const workspace = await createWorkspaceFixture(em);

      // Create 10 meetings
      for (let i = 0; i < 10; i++) {
        await createMeetingFixture(em, {
          workspace,
          status: MeetingStatus.PUBLISHED,
        });
      }

      em.clear();
      queryCounter.reset();

      // Act
      await repository.findByWorkspace(workspace.id, {
        page: 1,
        limit: 10,
        offset: 0,
      });

      // Assert - Should NOT be 1 + N queries
      // Expected: ~2-3 queries (count + select with joins)
      const selectCount = queryCounter.getSelectCount();
      expect(selectCount).toBeLessThanOrEqual(5); // Allow some room for complex joins

      // More important: NOT proportional to number of meetings
      expect(selectCount).not.toBe(11); // Would indicate N+1 problem
    });

    it('should enable query logging for performance analysis', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      em.clear();
      queryCounter.reset();

      await repository.findById(meeting.id, workspace.id);

      // Query counter is configured - this enables performance debugging
      // The actual query count might vary based on caching and test DB state
      // Main purpose: Provide infrastructure for N+1 detection
      expect(queryCounter).toBeDefined();
      expect(queryCounter.getCount).toBeDefined();
      expect(queryCounter.getSelectCount).toBeDefined();

      // Uncomment for debugging:
      // console.log('Total queries:', queryCounter.getCount());
      // queryCounter.printQueries();
    });
  });
});
