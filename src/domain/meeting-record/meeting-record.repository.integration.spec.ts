import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { MeetingRecordModule } from './meeting-record.module';
import { MeetingRecordRepository } from './meeting-record.repository';
import { MeetingRecord } from './entity/meeting-record.entity';
import { createMeetingFixture } from '../../../test/fixtures/meeting.fixture';
import { createWorkspaceFixture } from '../../../test/fixtures/workspace.fixture';
import {
  MeetingRecordCreate,
  MeetingRecordUpdate,
} from './meeting-record.type';

describe('MeetingRecordRepository Integration Tests', () => {
  let module: TestingModule;
  let repository: MeetingRecordRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'meeting-record-integration-test';

  beforeAll(async () => {
    module = await TestModuleBuilder.create()
      .withModule(MeetingRecordModule)
      .withTestcontainer(containerKey)
      .build();

    repository = module.get<MeetingRecordRepository>(MeetingRecordRepository);
    em = module.get<EntityManager>(EntityManager);
    orm = module.get<MikroORM>(MikroORM);

    // ltree 확장 설치
    await em.execute('CREATE EXTENSION IF NOT EXISTS ltree');

    // 스키마 생성
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema({ wrap: false });
    await generator.createSchema({ wrap: false });
  }, 30000);

  afterAll(async () => {
    if (em) {
      await em.getConnection().close(true);
    }
    if (module) {
      await module.close();
    }
    const manager = TestContainerManager.getInstance();
    await manager.cleanup(containerKey);
  });

  beforeEach(async () => {
    await em.begin();
  });

  afterEach(async () => {
    await em.rollback();
  });

  describe('create', () => {
    it('MeetingRecord를 생성해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      const data: MeetingRecordCreate = {
        meeting: meeting.id,
        time: 120,
        content: 'Test record at 2 minutes',
      };

      // When
      const created = await repository.create(data);

      // Then
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.time).toBe(120);
      expect(created.content).toBe('Test record at 2 minutes');
      expect(created.meeting).toBeDefined();
    });

    it('여러 MeetingRecord를 생성할 수 있어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      const data1: MeetingRecordCreate = {
        meeting: meeting.id,
        time: 60,
        content: 'First record',
      };
      const data2: MeetingRecordCreate = {
        meeting: meeting.id,
        time: 120,
        content: 'Second record',
      };

      // When
      const record1 = await repository.create(data1);
      const record2 = await repository.create(data2);

      // Then
      expect(record1.id).not.toBe(record2.id);
      expect(record1.time).toBe(60);
      expect(record2.time).toBe(120);
    });
  });

  describe('update', () => {
    it('MeetingRecord를 수정해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });
      const data: MeetingRecordCreate = {
        meeting: meeting.id,
        time: 60,
        content: 'Original content',
      };
      const created = await repository.create(data);

      const updateData: MeetingRecordUpdate = {
        content: 'Updated content',
      };

      // When
      const updated = await repository.update(created.id, updateData);

      // Then
      expect(updated.id).toBe(created.id);
      expect(updated.content).toBe('Updated content');
      expect(updated.time).toBe(60); // 변경되지 않음
    });

    it('시간을 수정할 수 있어야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });
      const created = await repository.create({
        meeting: meeting.id,
        time: 60,
        content: 'Test',
      });

      // When
      const updated = await repository.update(created.id, { time: 180 });

      // Then
      expect(updated.time).toBe(180);
      expect(updated.content).toBe('Test'); // 변경되지 않음
    });
  });

  describe('findByMeeting', () => {
    it('특정 Meeting의 모든 Record를 조회해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      await repository.create({
        meeting: meeting.id,
        time: 120,
        content: 'Second',
      });
      await repository.create({
        meeting: meeting.id,
        time: 60,
        content: 'First',
      });
      await repository.create({
        meeting: meeting.id,
        time: 180,
        content: 'Third',
      });

      // When
      const records = await repository.findByMeeting(meeting.id);

      // Then
      expect(records).toHaveLength(3);
      expect(records[0].time).toBe(60); // time 순으로 정렬
      expect(records[1].time).toBe(120);
      expect(records[2].time).toBe(180);
    });

    it('다른 Meeting의 Record는 조회되지 않아야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting1 = await createMeetingFixture(em, { workspace });
      const meeting2 = await createMeetingFixture(em, { workspace });

      await repository.create({
        meeting: meeting1.id,
        time: 60,
        content: 'Meeting 1',
      });
      await repository.create({
        meeting: meeting2.id,
        time: 60,
        content: 'Meeting 2',
      });

      // When
      const records = await repository.findByMeeting(meeting1.id);

      // Then
      expect(records).toHaveLength(1);
      expect(records[0].content).toBe('Meeting 1');
    });

    it('Record가 없으면 빈 배열을 반환해야 함', async () => {
      // Given
      const workspace = await createWorkspaceFixture(em);
      const meeting = await createMeetingFixture(em, { workspace });

      // When
      const records = await repository.findByMeeting(meeting.id);

      // Then
      expect(records).toEqual([]);
    });
  });
});
