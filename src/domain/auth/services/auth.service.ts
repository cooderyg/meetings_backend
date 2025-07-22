import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISignIn, ISignInReturn } from '../interfaces/sign-in.interface';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  private get GcpClientId(): string {
    return this.configService.getOrThrow<string>('GCP_CLIENT_ID');
  }

  private get GcpClientSecret(): string {
    return this.configService.getOrThrow<string>('GCP_CLIENT_SECRET');
  }

  private get GcpRedirectUri(): string {
    return this.configService.getOrThrow<string>('GCP_REDIRECT_URI');
  }

  async signInWithGoogle(args: ISignIn): Promise<ISignInReturn> {
    const { code, type } = args;

    return {
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    };
  }
}
