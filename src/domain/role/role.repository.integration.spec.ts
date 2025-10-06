import { TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { MikroORM } from '@mikro-orm/core';
import { TestModuleBuilder } from '../../../test/utils/test-module.builder';
import { TestContainerManager } from '../../../test/utils/testcontainer-singleton';
import { RoleModule } from './role.module';
import { RoleRepository } from './role.repository';
import { Role } from './entity/role.entity';
import { SystemRole } from './enum/system-role.enum';

describe('RoleRepository Integration Tests', () => {
  let module: TestingModule;
  let repository: RoleRepository;
  let em: EntityManager;
  let orm: MikroORM;
  const containerKey = 'role-integration-test';

  beforeAll(async () => {
    module = await TestModuleBuilder.create()
      .withModule(RoleModule)
      .withTestcontainer(containerKey)
      .build();

    repository = module.get<RoleRepository>(RoleRepository);
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
    it('시스템 Role을 생성해야 함', async () => {
      // Given
      const role = Role.createSystemRole(
        SystemRole.CAN_EDIT,
        'Test CAN_EDIT role'
      );

      // When
      await repository.create(role);

      // Then
      const found = await em.findOne(Role, { id: role.id });
      expect(found).toBeDefined();
      expect(found?.name).toBe(SystemRole.CAN_EDIT);
      expect(found?.workspace).toBeNull();
    });

    it('커스텀 Role을 생성해야 함', async () => {
      // Given
      const role = new Role();
      role.name = 'CUSTOM_ROLE';
      role.description = 'Custom test role';
      role.workspace = null;

      // When
      await repository.create(role);

      // Then
      const found = await em.findOne(Role, { id: role.id });
      expect(found).toBeDefined();
      expect(found?.name).toBe('CUSTOM_ROLE');
      expect(found?.description).toBe('Custom test role');
    });
  });

  describe('findOneSystemRole', () => {
    it('존재하는 시스템 Role을 조회해야 함', async () => {
      // Given
      const role = Role.createSystemRole(SystemRole.CAN_VIEW, 'Test role');
      await em.persistAndFlush(role);

      // When
      const found = await repository.findOneSystemRole(SystemRole.CAN_VIEW);

      // Then
      expect(found).toBeDefined();
      expect(found?.id).toBe(role.id);
      expect(found?.name).toBe(SystemRole.CAN_VIEW);
    });

    it('존재하지 않는 시스템 Role 조회 시 null을 반환해야 함', async () => {
      // When
      const found = await repository.findOneSystemRole(
        'NON_EXISTENT_ROLE' as SystemRole
      );

      // Then
      expect(found).toBeNull();
    });

    it('시스템 Role 조회 시 workspace가 null이어야 함', async () => {
      // Given
      const role = Role.createSystemRole(SystemRole.OWNER, 'Owner role');
      await em.persistAndFlush(role);

      // When
      const found = await repository.findOneSystemRole(SystemRole.OWNER);

      // Then
      expect(found).toBeDefined();
      expect(found?.workspace).toBeNull(); // 시스템 Role은 workspace가 null
      expect(found?.name).toBe(SystemRole.OWNER);
    });
  });
});
