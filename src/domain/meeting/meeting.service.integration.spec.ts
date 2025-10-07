import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { MeetingService } from './meeting.service';
import { MeetingRepository } from './meeting.repository';
import { ResourceService } from '../resource/resource.service';
import { Meeting, MeetingStatus } from './entity/meeting.entity';
import { ResourceVisibility } from '../resource/entity/resource.entity';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import {
  createMeetingFixture,
  createWorkspaceMemberFixture,
} from '../../../test/fixtures/meeting.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import { ResourceType } from '../resource/entity/resource.entity';
import { PaginationQuery } from '../../shared/dto/request/pagination.query';
import { FilterQuery } from '../../shared/dto/request/filter.query';
import { AppError } from '../../shared/exception/app.error';
import { MeetingModule } from './meeting.module';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

/**
 * MeetingService 통합 테스트
 *
 * @description
 * Testcontainer로 격리된 PostgreSQL에서 Service 비즈니스 로직 검증
 * - Transaction 기반 데이터 격리 (begin → rollback)
 * - E2E: HTTP + Controller / Integration: Service + Repository
 */
describe('MeetingService Integration Tests', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: MeetingService;
  let repository: MeetingRepository;
  let resourceService: ResourceService;
  const containerKey = 'meeting-service-integration-test';

  /**
   * beforeAll: 테스트 환경 초기화
   *
   * @description
   * 1. Testcontainer 시작 (containerKey로 컨테이너 재사용 가능)
   * 2. TestingModule 빌드 (MeetingModule + Guards mock)
   * 3. PostgreSQL ltree 확장 설치 (Resource 엔티티 필요)
   * 4. 스키마 생성 (dropSchema + createSchema)
   */
  beforeAll(async () => {
    const module = await TestModuleBuilder.create()
      .withModule(MeetingModule)
      .withTestcontainer(containerKey) // ✅ 격리된 PostgreSQL 컨테이너
      .mockGuard(AuthGuard)
      .mockGuard(WorkspaceMemberGuard)
      .build();

    orm = module.get<MikroORM>(MikroORM);
    em = orm.em as EntityManager;
    service = module.get<MeetingService>(MeetingService);
    repository = module.get<MeetingRepository>(MeetingRepository);
    resourceService = module.get<ResourceService>(ResourceService);

    // ltree 확장 설치 (Resource 엔티티의 path 필드 사용)
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성 (깨끗한 DB 상태)
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000); // Testcontainer 시작 시간 고려

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

    // Testcontainer 정리
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  }, 30000);

  describe('createMeeting', () => {
    it('리소스와 기본값을 가진 미팅을 생성해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      const meeting = await service.createMeeting({
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        parentPath: '/',
      });

      // Meeting created with correct relationships
      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.DRAFT);
      expect(meeting.resource).toBeDefined();
      expect(meeting.resource.title).toBe('Untitled');
      expect(meeting.resource.owner.id).toBe(member.id);

      // Resource fields set correctly
      expect(meeting.resource.type).toBe(ResourceType.MEETING);
      expect(meeting.resource.visibility).toBe(ResourceVisibility.PUBLIC);
      expect(meeting.resource.workspace.id).toBe(workspace.id);

      // Default values set correctly
      expect(meeting.memo).toBeNull();
      expect(meeting.summary).toBeNull();
      expect(meeting.tags).toEqual([]);
    });
  });

  describe('updateMeeting', () => {
    it('미팅 필드를 업데이트해야 함', async () => {
      const meeting = await createMeetingFixture(em);

      const updated = await service.updateMeeting(meeting.id, {
        memo: 'Updated memo',
        summary: 'Updated summary',
      });

      expect(updated.id).toBe(meeting.id);
      expect(updated.memo).toBe('Updated memo');
      expect(updated.summary).toBe('Updated summary');
    });

    it('존재하지 않는 미팅에 대해 AppError를 던져야 함', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      try {
        await service.updateMeeting(nonExistentId, { memo: 'New memo' });
        fail('Should have thrown AppError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('meeting.update.notFound');
        expect((error as AppError).context).toEqual({
          meetingId: nonExistentId,
        });
      }
    });

    it('미팅 상태를 업데이트해야 함', async () => {
      const meeting = await createMeetingFixture(em, {
        status: MeetingStatus.DRAFT,
      });

      const updated = await service.updateMeeting(meeting.id, {
        status: MeetingStatus.IN_PROGRESS,
      });

      expect(updated.status).toBe(MeetingStatus.IN_PROGRESS);
    });
  });

  describe('deleteMeeting', () => {
    it('meeting을 소프트 삭제해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await service.deleteMeeting(meeting.id);

      const found = await repository.findById(meeting.id, workspace.id);
      expect(found).toBeNull();
    });

    it('삭제된 meeting을 찾지 못해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await service.deleteMeeting(meeting.id);

      const found = await service.getMeetingById(meeting.id, workspace.id);
      expect(found).toBeNull();
    });
  });

  describe('publishMeeting', () => {
    it('완료된 meeting을 발행해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.COMPLETED,
      });

      const published = await service.publishMeeting({
        id: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        data: { visibility: ResourceVisibility.PUBLIC },
      });

      expect(published.status).toBe(MeetingStatus.PUBLISHED);
      expect(published.resource.visibility).toBe(ResourceVisibility.PUBLIC);
    });

    it('존재하지 않는 미팅에 대해 AppError를 던져야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await expect(
        service.publishMeeting({
          id: nonExistentId,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
          data: { visibility: ResourceVisibility.PUBLIC },
        })
      ).rejects.toThrow(AppError);

      await expect(
        service.publishMeeting({
          id: nonExistentId,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
          data: { visibility: ResourceVisibility.PUBLIC },
        })
      ).rejects.toMatchObject({
        code: 'meeting.publish.notFound',
        context: { meetingId: nonExistentId },
      });
    });

    it('완료되지 않은 meeting에 대해 AppError를 던져야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });

      await expect(
        service.publishMeeting({
          id: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
          data: { visibility: ResourceVisibility.PUBLIC },
        })
      ).rejects.toThrow(AppError);

      await expect(
        service.publishMeeting({
          id: meeting.id,
          workspaceId: workspace.id,
          workspaceMemberId: member.id,
          data: { visibility: ResourceVisibility.PUBLIC },
        })
      ).rejects.toMatchObject({
        code: 'meeting.publish.isDraft',
        context: {
          currentStatus: MeetingStatus.DRAFT,
          requiredStatus: MeetingStatus.COMPLETED,
        },
      });
    });

    it('resource 가시성을 원자적으로 업데이트해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });
      const meeting = await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.COMPLETED,
      });

      await service.publishMeeting({
        id: meeting.id,
        workspaceId: workspace.id,
        workspaceMemberId: member.id,
        data: { visibility: ResourceVisibility.PRIVATE },
      });

      const updated = await repository.findById(meeting.id, workspace.id);
      expect(updated!.status).toBe(MeetingStatus.PUBLISHED);
      expect(updated!.resource.visibility).toBe(ResourceVisibility.PRIVATE);
    });
  });

  describe('getMeetingById', () => {
    it('ID로 meeting을 조회해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      const found = await service.getMeetingById(meeting.id, workspace.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(meeting.id);
    });

    it('존재하지 않는 meeting에 대해 null을 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const found = await service.getMeetingById(nonExistentId, workspace.id);

      expect(found).toBeNull();
    });
  });

  describe('findMeetingsByWorkspace', () => {
    it('페이지네이션된 meeting 목록을 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      // Create non-draft meetings (findByWorkspace excludes DRAFT status)
      for (let i = 0; i < 5; i++) {
        await createMeetingFixture(em, {
          workspace,
          status: MeetingStatus.PUBLISHED,
        });
      }

      const pagination = new PaginationQuery();
      pagination.page = 1;
      pagination.limit = 3;

      const result = await service.findMeetingsByWorkspace(
        workspace.id,
        pagination
      );

      expect(result.data).toHaveLength(3);
      expect(result.totalCount).toBe(5);
    });

    it('workspace 목록에서 DRAFT meeting을 제외해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.PUBLISHED,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.PUBLISHED,
      });

      const pagination = new PaginationQuery();
      pagination.page = 1;
      pagination.limit = 10;

      const result = await service.findMeetingsByWorkspace(
        workspace.id,
        pagination
      );

      expect(result.totalCount).toBe(2);
      expect(result.data.every((m) => m.status !== MeetingStatus.DRAFT)).toBe(
        true
      );
    });

    it('상태로 meeting을 필터링해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);

      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.DRAFT,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.PUBLISHED,
      });
      await createMeetingFixture(em, {
        workspace,
        status: MeetingStatus.PUBLISHED,
      });

      const pagination = new PaginationQuery();
      pagination.page = 1;
      pagination.limit = 10;

      const filterQuery = new FilterQuery();
      filterQuery.filter = `status:${MeetingStatus.PUBLISHED}`;

      const result = await service.findMeetingsByWorkspace(
        workspace.id,
        pagination,
        filterQuery
      );

      expect(result.totalCount).toBe(2);
      expect(
        result.data.every((m) => m.status === MeetingStatus.PUBLISHED)
      ).toBe(true);
    });

    it('workspace별로 meeting을 격리해야 함', async () => {
      const workspace1 = await createWorkspaceFixture(em);
      const workspace2 = await createWorkspaceFixture(em);

      // Create non-draft meetings (findByWorkspace excludes DRAFT status)
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

      const pagination1 = new PaginationQuery();
      pagination1.page = 1;
      pagination1.limit = 10;

      const pagination2 = new PaginationQuery();
      pagination2.page = 1;
      pagination2.limit = 10;

      const result1 = await service.findMeetingsByWorkspace(
        workspace1.id,
        pagination1
      );
      const result2 = await service.findMeetingsByWorkspace(
        workspace2.id,
        pagination2
      );

      expect(result1.totalCount).toBe(2);
      expect(result2.totalCount).toBe(1);
    });
  });

  describe('findMyDraftMeetings', () => {
    it('특정 멤버의 draft meeting 목록을 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member1 = await createWorkspaceMemberFixture(em, { workspace });
      const member2 = await createWorkspaceMemberFixture(em, { workspace });

      // Create meetings for member1
      const resource1 = await resourceService.create({
        workspaceId: workspace.id,
        ownerId: member1.id,
        title: 'Member1 Meeting',
        type: ResourceType.MEETING,
        parentPath: '/',
        visibility: ResourceVisibility.PUBLIC,
      });
      await createMeetingFixture(em, {
        workspace,
        resource: resource1,
        status: MeetingStatus.DRAFT,
      });

      // Create meeting for member2
      const resource2 = await resourceService.create({
        workspaceId: workspace.id,
        ownerId: member2.id,
        title: 'Member2 Meeting',
        type: ResourceType.MEETING,
        parentPath: '/',
        visibility: ResourceVisibility.PUBLIC,
      });
      await createMeetingFixture(em, {
        workspace,
        resource: resource2,
        status: MeetingStatus.DRAFT,
      });

      const pagination = new PaginationQuery();
      pagination.page = 1;
      pagination.limit = 10;

      const result = await service.findMyDraftMeetings(
        workspace.id,
        member1.id,
        pagination
      );

      expect(result.totalCount).toBe(1);
      expect(result.data[0].resource.owner.id).toBe(member1.id);
    });

    it('draft meeting만 반환해야 함', async () => {
      const workspace = await createWorkspaceFixture(em);
      const member = await createWorkspaceMemberFixture(em, { workspace });

      const draftResource = await resourceService.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        title: 'Draft',
        type: ResourceType.MEETING,
        parentPath: '/',
        visibility: ResourceVisibility.PUBLIC,
      });
      await createMeetingFixture(em, {
        workspace,
        resource: draftResource,
        status: MeetingStatus.DRAFT,
      });

      const publishedResource = await resourceService.create({
        workspaceId: workspace.id,
        ownerId: member.id,
        title: 'Published',
        type: ResourceType.MEETING,
        parentPath: '/',
        visibility: ResourceVisibility.PUBLIC,
      });
      await createMeetingFixture(em, {
        workspace,
        resource: publishedResource,
        status: MeetingStatus.PUBLISHED,
      });

      const pagination = new PaginationQuery();
      pagination.page = 1;
      pagination.limit = 10;

      const result = await service.findMyDraftMeetings(
        workspace.id,
        member.id,
        pagination
      );

      expect(result.totalCount).toBe(1);
      expect(result.data[0].status).toBe(MeetingStatus.DRAFT);
    });
  });
});
