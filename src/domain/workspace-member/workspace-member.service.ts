import { Injectable } from '@nestjs/common';
import { WorkspaceMemberRepository } from './workspace-member.repository';

@Injectable()
export class WorkspaceMemberService {
  constructor(
    private readonly workspaceMemberRepository: WorkspaceMemberRepository
  ) {}

  async findById(id: string) {
    return await this.workspaceMemberRepository.findById(id);
  }
}
