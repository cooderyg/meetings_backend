import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NeedAuth } from '../../shared/decorator/need-auth.decorator';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { User } from '../user/entity/user.entity';
import { CreateWorkspaceDto } from './dto/request/create-workspace.dto';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { UpdateWorkspaceNameResDto } from './dto/response/update-workspace-name.res.dto';
import { SubscriptionTier, Workspace } from './entity/workspace.entity';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}
  @NeedAuth()
  @Get()
  @ApiOperation({
    summary: 'Get workspaces',
    description: 'Get all workspaces',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspaces fetched successfully',
    type: () => Workspace,
    isArray: true,
  })
  async getWorkspaces(@UserInfo() user: User): Promise<Workspace[]> {
    const workspaces = await this.workspaceService.findByUserId(user.id);
    return workspaces;
  }

  @NeedAuth()
  @ApiOperation({
    summary: 'Create workspace',
    description: 'Create a new workspace',
  })
  @Post()
  async createWorkspace(
    @Body() data: CreateWorkspaceDto,
    @UserInfo() user: User
  ) {
    const workspace = await this.workspaceService.createWorkspace(
      {
        name: data.name,
        subscriptionTier: SubscriptionTier.FREE,
      },
      user
    );

    return workspace;
  }

  @NeedAuth()
  @Patch('name/:id')
  async updateWorkspaceName(
    @Body() data: UpdateWorkspaceNameDto,
    @Param('id') id: string
  ): Promise<UpdateWorkspaceNameResDto> {
    const name = await this.workspaceService.updateWorkspaceName(id, data);

    return { name };
  }
}
