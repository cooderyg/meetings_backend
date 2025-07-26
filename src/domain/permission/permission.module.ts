import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PermissionService } from './permission.service';
import { PermissionRepository } from './permission.repository';
import { MemberResourcePermission } from './entity/member-resource-permission.entity';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';
import { Resource } from '../resource/entity/resource.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      MemberResourcePermission,
      WorkspaceMember,
      Resource,
    ]),
  ],
  providers: [
    {
      provide: PermissionRepository,
      useFactory: (em) => em.getRepository(MemberResourcePermission),
      inject: ['EntityManager'],
    },
    PermissionService,
  ],
  exports: [PermissionService, PermissionRepository],
})
export class PermissionModule {}