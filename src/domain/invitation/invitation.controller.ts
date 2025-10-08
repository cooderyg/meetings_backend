import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NeedAuth } from '../../shared/decorator/need-auth.decorator';
import { UserInfo } from '../../shared/decorator/user-info.decorator';
import { WorkspaceMemberId } from '../../shared/decorator/workspace-member-id.decorator';
import { WorkspaceMemberGuard } from '../../shared/guard/workspace-member.guard';
import { AppError } from '../../shared/exception/app.error';
import { User } from '../user/entity/user.entity';
import { CreateWorkspaceInvitationDto } from './dto/request/create-workspace-invitation.dto';
import { AcceptInvitationDto } from './dto/response/accept-invitation.dto';
import { InvitationDto } from './dto/response/invitation.dto';
import { InvitationService } from './invitation.service';
import { Invitation } from './entity/invitation.entity';

@ApiTags('Invitation')
@Controller()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * 워크스페이스 초대 생성
   */
  @NeedAuth()
  @UseGuards(WorkspaceMemberGuard)
  @Post('workspace/:workspaceId/invitations')
  @ApiOperation({
    summary: '워크스페이스 초대 생성',
    description: '새로운 사용자를 워크스페이스에 초대합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '초대가 성공적으로 생성되었습니다.',
    type: InvitationDto,
  })
  async createWorkspaceInvitation(
    @Param('workspaceId') workspaceId: string,
    @WorkspaceMemberId() workspaceMemberId: string,
    @Body() dto: CreateWorkspaceInvitationDto
  ): Promise<InvitationDto> {
    const invitation = await this.invitationService.createWorkspaceInvitation({
      workspaceId,
      inviterId: workspaceMemberId,
      inviteeEmail: dto.inviteeEmail,
      roleId: dto.roleId,
      expirationDays: dto.expirationDays,
    });

    return this.mapToDto(invitation);
  }

  /**
   * 초대 수락 (Public - 토큰 기반)
   */
  @NeedAuth()
  @Post('invitations/accept/:token')
  @ApiOperation({
    summary: '초대 수락',
    description: '초대 토큰을 사용하여 워크스페이스에 참여합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '초대가 성공적으로 수락되었습니다.',
    type: AcceptInvitationDto,
  })
  async acceptInvitation(
    @Param('token') token: string,
    @UserInfo() user: User
  ): Promise<AcceptInvitationDto> {
    const member = await this.invitationService.acceptWorkspaceInvitation(
      token,
      user.id
    );

    return {
      workspaceMemberId: member.id,
      workspaceId: member.workspace.id,
      message: 'Invitation accepted successfully',
    };
  }

  /**
   * 내 대기 중인 초대 목록 조회
   */
  @NeedAuth()
  @Get('invitations/pending')
  @ApiOperation({
    summary: '대기 중인 초대 조회',
    description: '현재 사용자의 이메일로 온 대기 중인 초대 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '대기 중인 초대 목록',
    type: [InvitationDto],
  })
  async getPendingInvitations(
    @UserInfo() user: User
  ): Promise<InvitationDto[]> {
    const invitations =
      await this.invitationService.findPendingInvitationsByEmail(user.email);

    return invitations.map((inv) => this.mapToDto(inv));
  }

  /**
   * 토큰으로 초대 조회 (Public - 인증 불필요)
   */
  @Get('invitations/:token')
  @ApiOperation({
    summary: '초대 정보 조회',
    description: '토큰으로 초대 정보를 조회합니다. (미가입자도 접근 가능)',
  })
  @ApiResponse({
    status: 200,
    description: '초대 정보',
    type: InvitationDto,
  })
  @ApiResponse({
    status: 404,
    description: '초대를 찾을 수 없습니다.',
  })
  async getInvitationByToken(
    @Param('token') token: string
  ): Promise<InvitationDto> {
    const invitation =
      await this.invitationService.findInvitationByToken(token);

    if (!invitation) {
      throw new AppError('invitation.fetch.notFound', { token });
    }

    return this.mapToDto(invitation);
  }


  /**
   * 초대 취소
   */
  @NeedAuth()
  @UseGuards(WorkspaceMemberGuard)
  @Delete('workspace/:workspaceId/invitations/:invitationId')
  @ApiOperation({
    summary: '초대 취소',
    description: '생성한 초대를 취소합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '초대가 성공적으로 취소되었습니다.',
  })
  async cancelInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @WorkspaceMemberId() workspaceMemberId: string
  ): Promise<{ message: string }> {
    await this.invitationService.cancelInvitation(
      invitationId,
      workspaceMemberId
    );

    return {
      message: 'Invitation cancelled successfully',
    };
  }

  /**
   * Invitation 엔티티를 DTO로 변환
   */
  private mapToDto(invitation: Invitation): InvitationDto {
    return {
      id: invitation.id,
      workspaceId: invitation.workspace.id,
      spaceId: invitation.space?.id ?? null,
      inviteeEmail: invitation.inviteeEmail,
      roleId: invitation.role.id,
      status: invitation.status,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      inviterId: invitation.inviter.id,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }
}
