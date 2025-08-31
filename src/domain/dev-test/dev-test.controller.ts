import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { NeedAuth } from '../../shared/decorator/need-auth.decorator';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AccessTokenPayload } from '../../shared/type/token.type';
import { TokenResponseDto } from '../auth/dto/response/token-res.dto';
import { DevTestService } from './dev-test.service';
import { DevLoginDto } from './dto/request/dev-login.dto';
import { WorkspaceActionDto } from './dto/request/workspace-test.dto';

@ApiTags('Dev Test')
@Controller('dev-test')
export class DevTestController {
  constructor(private readonly devTestService: DevTestService) {}

  @Post('login')
  @ApiOperation({
    summary: '개발용 직접 로그인 (OAuth 우회)',
    description: '개발환경에서만 사용 가능한 테스트용 로그인 엔드포인트입니다.',
  })
  async devLogin(@Body() dto: DevLoginDto): Promise<TokenResponseDto> {
    return this.devTestService.devLogin(dto.email);
  }

  @Get('auth-test')
  @NeedAuth()
  @ApiOperation({
    summary: '인증 테스트',
    description: 'JWT 토큰 인증이 제대로 작동하는지 테스트합니다.',
  })
  async authTest(@UserInfo() user: AccessTokenPayload) {
    return {
      message: 'Authentication successful!',
      user: {
        uid: user.uid,
        id: user.id,
      },
    };
  }

  @Get('workspace/:workspaceId/member-test')
  @NeedAuth()
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({
    summary: 'WorkspaceMemberGuard 테스트',
    description: '사용자가 해당 워크스페이스의 멤버인지 확인합니다.',
  })
  @ApiParam({
    name: 'workspaceId',
    description: '워크스페이스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async workspaceMemberTest(
    @Param('workspaceId') workspaceId: string,
    @UserInfo() user: AccessTokenPayload
  ) {
    return {
      message: 'WorkspaceMemberGuard passed!',
      user: {
        uid: user.uid,
        id: user.id,
      },
      workspaceId,
      details: 'You are a member of this workspace',
    };
  }

  @Post('workspace/:workspaceId/action-test')
  @UseGuards(WorkspaceMemberGuard)
  @NeedAuth()
  @ApiOperation({
    summary: '워크스페이스 액션 테스트',
    description: 'WorkspaceMiddleware + WorkspaceMemberGuard 조합 테스트',
  })
  @ApiParam({
    name: 'workspaceId',
    description: '워크스페이스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async workspaceActionTest(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: WorkspaceActionDto,
    @UserInfo() user: AccessTokenPayload
  ) {
    return this.devTestService.performWorkspaceAction(
      workspaceId,
      dto.message,
      user
    );
  }
}
