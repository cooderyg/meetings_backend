import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { User } from '../user/entity/user.entity';
import { CreateSpaceDto } from './dto/request/create-space.dto';
import { SpaceService } from './space.service';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { WorkspaceMemberId } from '../../shared/decorator';
import { ApiSpaceResponse } from '../../shared/decorator/api-field-response.decorator';
import {
  SPACE_LIST_FIELDS,
  SPACE_DETAIL_FIELDS,
} from './constant/space-fields';

@ApiTags('Spaces')
@ApiBearerAuth()
@ApiParam({
  name: 'workspaceId',
  example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
})
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/spaces')
export class SpaceController {
  constructor(private readonly spaceService: SpaceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all spaces' })
  @ApiSpaceResponse(SPACE_LIST_FIELDS, {
    isArray: true,
    description: '워크스페이스의 스페이스 목록을 조회합니다.',
  })
  async getSpaces(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @UserInfo() user: User
  ) {
    const spaces = await this.spaceService.findByWorkspaceAndUserId(
      workspaceId,
      user.id
    );
    return spaces;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new space' })
  @ApiSpaceResponse(SPACE_DETAIL_FIELDS, {
    description: '새로운 스페이스를 생성합니다.',
  })
  async create(
    @Body() dto: CreateSpaceDto,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string
  ) {
    return this.spaceService.create({
      ...dto,
      workspaceMemberId,
      workspaceId,
    });
  }
}
