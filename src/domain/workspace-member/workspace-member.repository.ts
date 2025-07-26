import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { WorkspaceMember } from './entity/workspace-member.entity';

@Injectable()
export class WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly repository: EntityRepository<WorkspaceMember>
  ) {}

  // TODO: 커스텀 쿼리 메소드 구현
}