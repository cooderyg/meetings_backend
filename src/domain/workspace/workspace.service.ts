import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from '../../shared/const';
import { AppException } from '../../shared/exception/app.exception';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { Workspace } from './entity/workspace.entity';
import { ICreateWorkspace } from './interfaces/create-workspace.interface';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceMemberService: WorkspaceMemberService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly em: EntityManager
  ) {}

  async createWorkspace(workspace: ICreateWorkspace) {
    const createdWorkspace = this.workspaceRepository.assign(
      new Workspace(),
      workspace
    );
    await this.em.flush();
    return createdWorkspace;
  }

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
