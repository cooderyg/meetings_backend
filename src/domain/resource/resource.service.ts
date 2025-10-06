import { Injectable } from '@nestjs/common';
import { Transactional } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ResourceRepository, UpdateResourceData } from './resource.repository';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ResourceType, ResourceVisibility } from './entity/resource.entity';
import { AppError } from '../../shared/exception/app.error';
import { Resource } from './entity/resource.entity';

export interface CreateResourceDto {
  workspaceId: string;
  ownerId: string;
  type: ResourceType;
  title: string;
  visibility?: ResourceVisibility;
  parentPath?: string;
}

@Injectable()
export class ResourceService {
  constructor(
    private readonly em: EntityManager,
    private readonly resourceRepository: ResourceRepository,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {}

  /**
   * Resource 생성
   * @param data Resource 생성 데이터
   * @Transactional 데코레이터가 자동으로 flush/commit 처리
   */
  @Transactional()
  async create(data: CreateResourceDto): Promise<Resource> {
    // 워크스페이스 검증
    const workspace = await this.workspaceService.findById(data.workspaceId);
    if (!workspace) {
      throw new AppError('workspace.fetch.notFound', {
        workspaceId: data.workspaceId,
      });
    }

    // 소유자 검증
    const owner = await this.workspaceMemberService.findById(data.ownerId);
    if (!owner || owner.workspace.id !== data.workspaceId) {
      throw new AppError('workspace.member.fetch.notFound');
    }

    // 비즈니스 로직: path 생성
    const path = this.generatePath(data.parentPath);

    // Repository에 위임
    return this.resourceRepository.create({
      workspace,
      owner,
      type: data.type,
      title: data.title,
      visibility: data.visibility,
      path,
    });
  }

  @Transactional()
  async update(id: string, data: UpdateResourceData) {
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new AppError('resource.fetch.notFound', { resourceId: id });
    }

    return this.resourceRepository.update(id, data);
  }

  async findById(id: string): Promise<Resource | null> {
    return this.resourceRepository.findById(id);
  }

  async findByIdWithRelations(id: string): Promise<Resource | null> {
    return this.resourceRepository.findByIdWithRelations(id);
  }

  async findByWorkspace(workspaceId: string): Promise<Resource[]> {
    return this.resourceRepository.findByWorkspace(workspaceId);
  }

  async findByWorkspaceAndType(
    workspaceId: string,
    type: ResourceType
  ): Promise<Resource[]> {
    return this.resourceRepository.findByWorkspaceAndType(workspaceId, type);
  }

  async deleteResource(id: string): Promise<void> {
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new AppError('resource.fetch.notFound', { resourceId: id });
    }

    await this.resourceRepository.delete(id);
  }

  private generatePath(parentPath?: string): string {
    const timestamp = Date.now().toString();
    const label = `r${timestamp}`; // ltree requires labels to start with letter

    // Handle root path: '/' should be treated as empty (root level)
    if (!parentPath || parentPath === '/') {
      return label;
    }

    return `${parentPath}.${label}`;
  }
}
