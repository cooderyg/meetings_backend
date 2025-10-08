import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PermissionService } from './permission.service';
import { PermissionRepository } from './permission.repository';
import { MemberResourcePermission } from './entity/member-resource-permission.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Resource } from '../resource/entity/resource.entity';
import { Space } from '../space/entity/space.entity';
import { Meeting } from '../meeting/entity/meeting.entity';
import { EntityManager } from '@mikro-orm/core';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      MemberResourcePermission,
      WorkspaceMember,
      Resource,
      Space,
      Meeting,
    ]),
  ],
  providers: [
    {
      provide: PermissionRepository,
      useFactory: (em: EntityManager) => {
        // PermissionRepository의 커스텀 인스턴스 생성
        const repo = em.getRepository(MemberResourcePermission);
        Object.setPrototypeOf(repo, PermissionRepository.prototype);
        return repo as PermissionRepository;
      },
      inject: [EntityManager],
    },
    PermissionService,
  ],
  exports: [PermissionService, PermissionRepository],
})
export class PermissionModule {}
