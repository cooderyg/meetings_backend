import { Injectable } from '@nestjs/common';
import { AppError } from '../../../shared/exception/app.error';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../../../shared/type/token.type';
import { User } from '../../user/entity/user.entity';
import { UserService } from '../../user/user.service';
import { WorkspaceMemberService } from '../../workspace-member/workspace-member.service';
import { SubscriptionTier } from '../../workspace/entity/workspace.entity';
import { WorkspaceService } from '../../workspace/workspace.service';
import { OAuthType } from '../enums/oauth-type.enum';
import { ISignIn, ISignInReturn } from '../interfaces/sign-in.interface';
import { GoogleAuthStrategy } from '../strategies/google-auth.strategy';
import { IOAuthStrategy } from '../strategies/o-auth.strategy.interface';

@Injectable()
export class AuthService {
  private readonly appConfig: AppConfig;
  private readonly strategies: Record<OAuthType, IOAuthStrategy>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceMemberService: WorkspaceMemberService
  ) {
    this.appConfig = new AppConfig();
    this.strategies = {
      [OAuthType.GOOGLE]: new GoogleAuthStrategy(
        this.appConfig,
        this.jwtService
      ),
    };
  }

  get accessTokenSecret(): string {
    return this.appConfig.auth.jwtSecret;
  }

  get accessTokenExpiresIn(): string {
    return this.appConfig.auth.jwtExpiresIn;
  }

  get refreshTokenSecret(): string {
    return this.appConfig.auth.refreshSecret;
  }

  get refreshTokenExpiresIn(): string {
    return this.appConfig.auth.refreshExpiresIn;
  }

  async signIn(args: ISignIn): Promise<ISignInReturn> {
    const { code, type } = args;

    const strategy = this.strategies[type];
    if (!strategy) {
      throw new AppError('auth.authorize.denied');
    }

    const oauthResult = await strategy.verifyOAuthToken({ code });

    const user = await this.userService.getUserByUid(oauthResult.uid);
    if (!user) {
      const newUser = await this.userService.createUser({
        uid: oauthResult.uid,
        email: oauthResult.email,
        firstName: oauthResult.firstName,
        lastName: oauthResult.lastName,
      });

      await this.workspaceService.createWorkspace(
        {
          name: `${oauthResult.firstName}'s Workspace`,
          subscriptionTier: SubscriptionTier.FREE,
        },
        newUser
      );

      return this.getTokens(newUser);
    }

    return this.getTokens(user);
  }

  private getTokens(user: User) {
    const accessTokenPayload: AccessTokenPayload = {
      uid: user.uid,
      id: user.id,
    };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.accessTokenExpiresIn,
      secret: this.accessTokenSecret,
    });

    const refreshTokenPayload: RefreshTokenPayload = { id: user.id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.refreshTokenExpiresIn,
      secret: this.refreshTokenSecret,
    });

    return { accessToken, refreshToken };
  }
}
