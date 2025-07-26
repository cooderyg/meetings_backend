import { Body, Controller, Param, Patch } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Patch('name/:id')
  async updateWorkspaceName(
    @Body() data: UpdateWorkspaceNameDto,
    @Param('id') id: string
  ) {
    // TODO 토큰 파싱해서 WorkspaceMemberId 넣기
    const workspaceMemberId = 'sdasdassdasduuid';

    const name = await this.workspaceService.updateWorkspaceName(
      id,
      workspaceMemberId,
      data
    );
  }
}
