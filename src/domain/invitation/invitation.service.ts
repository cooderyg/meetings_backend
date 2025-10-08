import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Invitation } from './entity/invitation.entity';
import { InvitationRepository } from './invitation.repository';
import { InvitationStatus } from './enum/invitation-status.enum';
import { ICreateWorkspaceInvitationArgs } from './interface/create-workspace-invitation-args.interface';
import { ICreateSpaceInvitationArgs } from './interface/create-space-invitation-args.interface';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { RoleService } from '../role/role.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { UserService } from '../user/user.service';
import { AppError } from '../../shared/exception/app.error';
import { WorkspaceMember } from '../workspace-member/entity/workspace-member.entity';

@Injectable()
export class InvitationService {
  constructor(
    private readonly repository: InvitationRepository,
    private readonly workspaceMemberService: WorkspaceMemberService,
    private readonly roleService: RoleService,
    private readonly workspaceService: WorkspaceService,
    private readonly userService: UserService,
    private readonly em: EntityManager
  ) {}

  /**
   * 워크스페이스 초대 생성
   */
  async createWorkspaceInvitation(
    args: ICreateWorkspaceInvitationArgs
  ): Promise<Invitation> {
    const { workspaceId, inviterId, inviteeEmail, roleId, expirationDays = 7 } = args;

    // 중복 초대 확인
    const duplicate = await this.repository.findDuplicatePending(
      workspaceId,
      null,
      inviteeEmail
    );

    if (duplicate) {
      throw new AppError('invitation.create.duplicatePending', {
        workspaceId,
        inviteeEmail,
      });
    }

    // 워크스페이스, 초대자, 역할 확인
    const workspace = await this.workspaceService.findById(workspaceId);
    if (!workspace) {
      throw new AppError('workspace.fetch.notFound', { workspaceId });
    }

    const inviter = await this.workspaceMemberService.findById(inviterId);
    if (!inviter) {
      throw new AppError('invitation.create.inviterNotFound', { inviterId });
    }

    const role = await this.roleService.findById(roleId);
    if (!role) {
      throw new AppError('invitation.create.roleNotFound', { roleId });
    }

    // 만료 시간 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // 초대 생성
    const invitation = await this.repository.create({
      workspace,
      space: null,
      inviteeEmail,
      role,
      inviter,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    return invitation;
  }

  /**
   * 워크스페이스 초대 수락
   */
  async acceptWorkspaceInvitation(
    token: string,
    userId: string
  ): Promise<WorkspaceMember> {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new AppError('invitation.accept.notFound', { token });
    }

    if (!invitation.canAccept()) {
      throw new AppError('invitation.accept.cannotAccept', {
        status: invitation.status,
        expired: invitation.isExpired(),
      });
    }

    // 사용자 확인
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new AppError('user.fetch.notFound');
    }

    // 이메일 일치 확인
    if (user.email !== invitation.inviteeEmail) {
      throw new AppError('invitation.accept.emailMismatch', {
        expected: invitation.inviteeEmail,
        actual: user.email,
      });
    }

    // 이미 워크스페이스 멤버인지 확인
    const existingMember =
      await this.workspaceMemberService.findByUserAndWorkspace(
        userId,
        invitation.workspace.id
      );

    if (existingMember) {
      // 이미 멤버이면 초대만 ACCEPTED로 변경
      await this.repository.updateStatus(invitation.id, InvitationStatus.ACCEPTED);
      return existingMember;
    }

    // 워크스페이스 멤버 생성
    const member = await this.workspaceMemberService.createWorkspaceMember({
      user,
      workspace: invitation.workspace,
      role: invitation.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: true,
    });

    // 초대 상태 업데이트
    await this.repository.updateStatus(invitation.id, InvitationStatus.ACCEPTED);

    return member;
  }

  /**
   * OAuth 기반 초대 수락 (신규 사용자 또는 기존 사용자)
   */
  async acceptInvitationWithOAuth(
    token: string,
    user: any
  ): Promise<WorkspaceMember> {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new AppError('invitation.accept.notFound', { token });
    }

    if (!invitation.canAccept()) {
      throw new AppError('invitation.accept.cannotAccept', {
        status: invitation.status,
        expired: invitation.isExpired(),
      });
    }

    // 이메일 일치 확인
    if (user.email !== invitation.inviteeEmail) {
      throw new AppError('invitation.accept.emailMismatch', {
        expected: invitation.inviteeEmail,
        actual: user.email,
      });
    }

    // 이미 워크스페이스 멤버인지 확인
    const existingMember =
      await this.workspaceMemberService.findByUserAndWorkspace(
        user.id,
        invitation.workspace.id
      );

    if (existingMember) {
      throw new AppError('invitation.accept.alreadyMember', {
        userId: user.id,
        workspaceId: invitation.workspace.id,
      });
    }

    // 워크스페이스 멤버 생성
    const member = await this.workspaceMemberService.createWorkspaceMember({
      user,
      workspace: invitation.workspace,
      role: invitation.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: true,
    });

    // 초대 상태 업데이트
    await this.repository.updateStatus(invitation.id, InvitationStatus.ACCEPTED);

    return member;
  }

  /**
   * 스페이스 초대 생성
   * TODO: SpaceMember 도메인 구현 후 완성
   */
  async createSpaceInvitation(
    args: ICreateSpaceInvitationArgs
  ): Promise<{ workspaceInvitation: Invitation | null; spaceInvitation: Invitation }> {
    throw new Error('SpaceMember domain not implemented yet');
  }

  /**
   * 스페이스 초대 수락
   * TODO: SpaceMember 도메인 구현 후 완성
   */
  async acceptSpaceInvitation(
    token: string,
    userId: string
  ): Promise<{ workspaceMember: WorkspaceMember; spaceMember: any }> {
    throw new Error('SpaceMember domain not implemented yet');
  }

  /**
   * 이메일로 대기 중인 초대 조회
   */
  async findPendingInvitationsByEmail(email: string): Promise<Invitation[]> {
    return this.repository.findPendingByEmail(email);
  }

  /**
   * 토큰으로 초대 조회
   */
  async findInvitationByToken(token: string): Promise<Invitation | null> {
    return this.repository.findByToken(token);
  }

  /**
   * 초대 취소
   */
  async cancelInvitation(id: string, inviterId: string): Promise<void> {
    const invitation = await this.repository.findById(id);

    if (!invitation) {
      throw new AppError('invitation.cancel.notFound', { invitationId: id });
    }

    if (invitation.inviter.id !== inviterId) {
      throw new AppError('invitation.cancel.unauthorized', {
        inviterId,
        ownerId: invitation.inviter.id,
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError('invitation.cancel.alreadyProcessed', {
        status: invitation.status,
      });
    }

    await this.repository.updateStatus(id, InvitationStatus.CANCELLED);
  }

}
