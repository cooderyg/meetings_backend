import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../shared/module/app-config/app-config';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../../shared/type/token.type';
import { TokenResponseDto } from '../auth/dto/response/token-res.dto';
import { User } from '../user/entity/user.entity';
import { UserService } from '../user/user.service';
import { WorkspaceMemberService } from '../workspace-member/workspace-member.service';
import { SubscriptionTier } from '../workspace/entity/workspace.entity';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class DevTestService {
  private readonly appConfig: AppConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {
    this.appConfig = new AppConfig();
  }

  async devLogin(email: string): Promise<TokenResponseDto> {
    // 개발환경에서만 동작
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('개발환경에서만 사용 가능합니다');
    }

    // 이메일로 사용자 찾기
    let user = await this.userService.getUserByEmail(email);

    // 사용자가 없으면 생성
    if (!user) {
      const testUid = `dev-test-${email}-${Date.now()}`;
      const [firstName, lastName] = this.parseEmailToName(email);

      user = await this.userService.createUser({
        uid: testUid,
        email,
        firstName,
        lastName,
      });

      // 기본 워크스페이스 생성
      await this.workspaceService.createWorkspace(
        {
          name: `${firstName}'s Workspace`,
          subscriptionTier: SubscriptionTier.FREE,
        },
        user
      );
    }

    return this.generateTokens(user);
  }

  private parseEmailToName(email: string): [string, string] {
    const localPart = email.split('@')[0];
    const parts = localPart.split('.');

    if (parts.length >= 2) {
      return [parts[0], parts[1]];
    }

    return [localPart, 'User'];
  }

  private generateTokens(user: User): TokenResponseDto {
    const accessTokenPayload: AccessTokenPayload = {
      uid: user.uid,
      id: user.id,
    };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.appConfig.auth.jwtExpiresIn,
      secret: this.appConfig.auth.jwtSecret,
    });

    const refreshTokenPayload: RefreshTokenPayload = { id: user.id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.appConfig.auth.refreshExpiresIn,
      secret: this.appConfig.auth.refreshSecret,
    });

    return { accessToken, refreshToken };
  }

  async performWorkspaceAction(
    workspaceId: string,
    message: string,
    user: AccessTokenPayload
  ) {
    // 개발환경에서만 동작
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('개발환경에서만 사용 가능합니다');
    }

    // WorkspaceMemberGuard를 통과했다면 이미 멤버십이 확인된 상태
    const isActiveMember = await this.workspaceMemberService.isActiveMember(
      user.id,
      workspaceId
    );

    return {
      success: true,
      message: 'Workspace action performed successfully!',
      data: {
        workspaceId,
        userId: user.id,
        userUid: user.uid,
        actionMessage: message,
        isActiveMember,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
