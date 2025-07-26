import { Injectable } from '@nestjs/common';
import { WorkspaceRepository } from './workspace.repository';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  async updateWorkspaceName(id: string, data: UpdateWorkspaceNameDto) {
    const { name } = data;

    const workspace = await this.findById(id);

    if (!workspace) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    workspace.name = name;

    await this.workspaceRepository.update(workspace);

    return name;
  }

  async findById(id: string) {
    return await this.workspaceRepository.findOne({ id });
  }
}
