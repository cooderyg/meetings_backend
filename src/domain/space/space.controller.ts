import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NeedAuth } from '../../shared/decorator/need-auth.decorator';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { User } from '../user/entity/user.entity';
import { WorkspaceIdParamDto } from '../workspace/dto/request/workspace-id-param.dto';
import { CreateSpaceDto } from './dto/request/create-space.dto';
import { Space } from './entity/space.entity';
import { SpaceService } from './space.service';

@ApiTags('Spaces')
@Controller('workspace/:workspaceId/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @NeedAuth()
  @Get()
  @ApiOperation({ summary: 'Get all spaces' })
  @ApiResponse({
    status: 200,
    description: 'Spaces fetched successfully',
    type: () => Space,
    isArray: true,
  })
  async getSpaces(
    @Param() workspaceId: WorkspaceIdParamDto,
    @UserInfo() user: User
  ): Promise<Space[]> {
    const spaces = await this.spaceService.findByWorkspaceAndUserId(
      workspaceId.workspaceId,
      user.id
    );
    return spaces;
  }

  @NeedAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  @ApiResponse({
    status: 201,
    description: 'The space has been successfully created.',
    type: Space,
  })
  async create(
    @Body() dto: CreateSpaceDto,
    @Param() workspaceId: WorkspaceIdParamDto,
    @UserInfo() user: User
  ): Promise<Space> {
    return this.spaceService.create({
      ...dto,
      userId: user.id,
      workspaceId: workspaceId.workspaceId,
    });
  }
}
