import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { User } from '../user/entity/user.entity';
import { CreateWorkspaceDto } from './dto/request/create-workspace.dto';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { UpdateWorkspaceNameResDto } from './dto/response/update-workspace-name.res.dto';
import { SubscriptionTier } from './entity/workspace.entity';
import { WorkspaceService } from './workspace.service';

@ApiTags('Workspace')
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // @NeedAuth()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
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

  @Patch('name/:id')
  async updateWorkspaceName(
    @Body() data: UpdateWorkspaceNameDto,
    @Param('id') id: string
  ): Promise<UpdateWorkspaceNameResDto> {
    const name = await this.workspaceService.updateWorkspaceName(id, data);

    return { name };
  }
}
