import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import { User } from '../../user/entity/user.entity';
import { UserRepository } from '../../user/user.repository';
import { OAuthType } from '../enums/oauth-type.enum';
import { ISignIn, ISignInReturn } from '../interfaces/sign-in.interface';
import { GoogleAuthStrategy } from '../strategies/google-auth.strategy';
import { IOAuthStrategy } from '../strategies/o-auth.strategy.interface';

@Injectable()
export class AuthService {
  private readonly appConfig: AppConfig;
  private readonly strategies: Record<OAuthType, IOAuthStrategy>;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository
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
    return this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET');
  }

  get accessTokenExpiresIn(): string {
    return this.configService.getOrThrow<string>('ACCESS_TOKEN_EXPIRES_IN');
  }

  get refreshTokenSecret(): string {
    return this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');
  }

  get refreshTokenExpiresIn(): string {
    return this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN');
  }

  async signIn(args: ISignIn): Promise<ISignInReturn> {
    const { code, type } = args;

    const strategy = this.strategies[type];
    if (!strategy) {
      throw new BadRequestException('Invalid OAuth type');
    }

    const uid = await strategy.signIn({ code });

    const userInfo = await this.getUserInfo(uid);
    if (!userInfo) {
      throw new NotFoundException('User not found');
    }

    return this.getTokens(userInfo);
  }

  private async getUserInfo(uid: string) {
    const userInfo = await this.userRepository.findByUid(uid);
    return userInfo;
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
