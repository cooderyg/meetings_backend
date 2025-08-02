import { EntityManager } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { WorkspaceMemberRepository } from './workspace-member.repository';
import { WorkspaceMemberService } from './workspace-member.service';

@Module({
  imports: [MikroOrmModule.forFeature([WorkspaceMember])],
  providers: [
    WorkspaceMemberService,
    {
      provide: WorkspaceMemberRepository,
      useFactory: (em: EntityManager) => em.getRepository(WorkspaceMember),
      inject: [EntityManager],
    },
  ],
  exports: [WorkspaceMemberService],
})
export class WorkspaceMemberModule {}
