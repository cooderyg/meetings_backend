import { Injectable } from '@nestjs/common';
import { WorkspaceRepository } from './workspace.repository';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { AppException } from '../../shared/exception/app.exception';
import { ERROR_CODES } from '../../shared/const';

@Injectable()
export class WorkspaceService {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async updateWorkspaceName(
    id: string,
    workspaceMemberId: string,
    data: UpdateWorkspaceNameDto
  ) {
    const workspace = await this.workspaceRepository.findOne({ id });
    if (!workspace) throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND);

    // TODO
  }
}
