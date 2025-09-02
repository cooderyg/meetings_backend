import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceMemberService } from './workspace-member.service';
import {
  ApiBearerAuth,
  ApiParam,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthGuard } from '../../shared/guard/auth.guard';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { ApiEntityArray } from '../../shared/decorator/api-entity.decorator';
import { ApiCommonErrors } from '../../shared/decorator/api-domain-errors.decorator';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { WORKSPACE_MEMBER_LIST_FIELDS } from './constant/workspace-member-fields';

@ApiTags('Workspace Members')
@ApiParam({
  name: 'workspaceId',
  example: 'e720eee0-2997-4d27-af68-d5de5b84f911',
})
@ApiBearerAuth()
@UseGuards(AuthGuard, WorkspaceMemberGuard)
@Controller('workspace/:workspaceId/workspace-members')
export class WorkspaceMemberController {
  constructor(private readonly service: WorkspaceMemberService) {}

  @Get()
  @ApiOperation({
    summary: '워크스페이스 멤버 목록 조회',
    description: '워크스페이스에 속한 활성화된 멤버들의 목록을 조회합니다.',
  })
  @ApiEntityArray(
    WorkspaceMember,
    WORKSPACE_MEMBER_LIST_FIELDS,
    '워크스페이스 멤버 목록이 조회되었습니다.'
  )
  @ApiCommonErrors()
  async getWorkspaceMembers(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string
  ) {
    return this.service.findByWorkspace(workspaceId);
  }
}
