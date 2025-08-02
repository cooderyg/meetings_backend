import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import { User } from '../../user/entity/user.entity';
import { UserService } from '../../user/user.service';
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
    private readonly workspaceService: WorkspaceService
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
      throw new BadRequestException('Invalid OAuth type');
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

      await this.workspaceService.createWorkspace({
        name: `${oauthResult.firstName}'s Workspace`,
        subscriptionTier: SubscriptionTier.FREE,
      });

      return this.getTokens(newUser);
    }

    return this.getTokens(user);
  }

  private getTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { uid: user.uid },
      {
        expiresIn: this.accessTokenExpiresIn,
        secret: this.accessTokenSecret,
      }
    );
    const refreshToken = this.jwtService.sign(
      { uid: user.uid },
      {
        expiresIn: this.refreshTokenExpiresIn,
        secret: this.refreshTokenSecret,
      }
    );

    return { accessToken, refreshToken };
  }
}
