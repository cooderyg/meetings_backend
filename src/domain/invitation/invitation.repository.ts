import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Invitation } from './entity/invitation.entity';
import { InvitationStatus } from './enum/invitation-status.enum';

@Injectable()
export class InvitationRepository {
  private em: EntityManager;

  constructor(
    @InjectRepository(Invitation)
    private readonly repository: EntityRepository<Invitation>
  ) {
    this.em = repository.getEntityManager();
  }

  /**
   * 초대 생성
   */
  async create(data: Partial<Invitation>): Promise<Invitation> {
    const invitation = this.repository.assign(new Invitation(), data);
    await this.em.persistAndFlush(invitation);
    return invitation;
  }

  /**
   * 토큰으로 초대 조회
   */
  async findByToken(token: string): Promise<Invitation | null> {
    return this.repository.findOne(
      { token },
      {
        populate: [
          'workspace',
          'space',
          'role',
          'inviter',
          'inviter.user',
        ] as any,
      }
    );
  }

  /**
   * 이메일의 대기 중인 초대 조회
   */
  async findPendingByEmail(email: string): Promise<Invitation[]> {
    return this.repository.find(
      {
        inviteeEmail: email,
        status: InvitationStatus.PENDING,
      },
      {
        populate: ['workspace', 'space', 'role', 'inviter'] as any,
      }
    );
  }

  /**
   * 워크스페이스의 초대 목록 조회
   */
  async findByWorkspace(workspaceId: string): Promise<Invitation[]> {
    return this.repository.find(
      { workspace: workspaceId },
      {
        populate: ['workspace', 'space', 'role', 'inviter'] as any,
        orderBy: { createdAt: 'DESC' },
      }
    );
  }

  /**
   * 중복 PENDING 초대 확인
   */
  async findDuplicatePending(
    workspaceId: string,
    spaceId: string | null,
    email: string
  ): Promise<Invitation | null> {
    return this.repository.findOne({
      workspace: workspaceId,
      space: spaceId,
      inviteeEmail: email,
      status: InvitationStatus.PENDING,
    });
  }

  /**
   * 초대 상태 업데이트
   */
  async updateStatus(
    id: string,
    status: InvitationStatus
  ): Promise<Invitation> {
    const invitation = await this.repository.findOneOrFail({ id });
    invitation.status = status;
    await this.em.flush();
    return invitation;
  }

  /**
   * 만료된 초대 조회 (배치 작업용)
   */
  async findExpiredInvitations(): Promise<Invitation[]> {
    return this.repository.find({
      status: InvitationStatus.PENDING,
      expiresAt: { $lt: new Date() },
    });
  }

  /**
   * ID로 초대 조회
   */
  async findById(id: string): Promise<Invitation | null> {
    return this.repository.findOne(
      { id },
      {
        populate: [
          'workspace',
          'space',
          'role',
          'inviter',
          'inviter.user',
        ] as any,
      }
    );
  }

  /**
   * 이메일과 워크스페이스로 대기 중인 워크스페이스 초대 조회
   */
  async findPendingWorkspaceInvitation(
    email: string,
    workspaceId: string
  ): Promise<Invitation | null> {
    return this.repository.findOne({
      inviteeEmail: email,
      workspace: workspaceId,
      space: null,
      status: InvitationStatus.PENDING,
    });
  }
}
