import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { User } from '../user/entity/user.entity';
import { WorkspaceIdParamDto } from '../workspace/dto/request/workspace-id-param.dto';
import { CreateSpaceDto } from './dto/request/create-space.dto';
import { Space } from './entity/space.entity';
import { SpaceService } from './space.service';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';

@ApiTags('Spaces')
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all spaces' })
  @ApiResponse({
    status: 200,
    description: 'Spaces fetched successfully',
    type: () => Space,
    isArray: true,
  })
  async getSpaces(
    @Param() param: WorkspaceIdParamDto,
    @UserInfo() user: User
  ): Promise<Space[]> {
    const spaces = await this.spaceService.findByWorkspaceAndUserId(
      param.workspaceId,
      user.id
    );
    return spaces;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  @ApiResponse({
    status: 201,
    description: 'The space has been successfully created.',
    type: Space,
  })
  async create(
    @Body() dto: CreateSpaceDto,
    @Param() param: WorkspaceIdParamDto,
    @UserInfo() user: User
  ): Promise<Space> {
    return this.spaceService.create({
      ...dto,
      userId: user.id,
      workspaceId: param.workspaceId,
    });
  }
}
