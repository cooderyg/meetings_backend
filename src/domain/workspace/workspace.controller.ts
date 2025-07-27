import { Body, Controller, Param, Patch } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceNameDto } from './dto/request/update-workspace-name.dto';
import { UpdateWorkspaceNameResDto } from './dto/response/update-workspace-name.res.dto';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Patch('name/:id')
  async updateWorkspaceName(
    @Body() data: UpdateWorkspaceNameDto,
    @Param('id') id: string
  ): Promise<UpdateWorkspaceNameResDto> {
    const name = await this.workspaceService.updateWorkspaceName(id, data);

    return { name };
  }
}
