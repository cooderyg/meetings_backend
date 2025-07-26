import { Injectable } from '@nestjs/common';
import { WorkspaceMemberRepository } from './workspace-member.repository';

@Injectable()
export class WorkspaceMemberService {
  constructor(
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  // TODO: 멤버 관리 로직 구현
}