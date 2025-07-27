import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios, { AxiosResponse } from 'axios';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import { ISignIn } from '../interfaces/sign-in.interface';
import { IOAuthStrategy } from './o-auth.strategy.interface';

// Google OAuth 토큰 응답 타입 정의
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token: string;
}

// Google OAuth 에러 응답 타입 정의
interface GoogleErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
}

// Google ID 토큰 페이로드 타입 정의
interface GoogleIdTokenPayload {
  iss: string; // issuer
  sub: string; // subject (user ID)
  aud: string; // audience (client ID)
  exp: number; // expiration time
  iat: number; // issued at
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
}

export class GoogleAuthStrategy implements IOAuthStrategy {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly jwtService: JwtService
  ) {}

  get clientId(): string {
    return this.appConfig.gcp.clientId;
  }

  get clientSecret(): string {
    return this.appConfig.gcp.clientSecret;
  }

  get redirectUri(): string {
    return this.appConfig.oauth.redirectUri;
  }

  async signIn(args: ISignIn): Promise<string> {
    const { code } = args;

    // getToken 메서드를 호출해서 실제 토큰을 받아옴
    const tokenResponse = await this.getOauthToken(code);

    // Google ID 토큰 검증 및 디코딩 (타입 안전성 확보)
    const decodedIdToken = this.jwtService.verify<GoogleIdTokenPayload>(
      tokenResponse.id_token
    );
    if (decodedIdToken === null) {
      throw new BadRequestException('Invalid Google ID token');
    }

    // uid만 반환 (sub 필드가 Google의 user ID)
    return decodedIdToken.sub;
  }

  async getOauthToken(code: string): Promise<GoogleTokenResponse> {
    const grant_type = 'authorization_code';

    try {
      const response: AxiosResponse<GoogleTokenResponse> = await axios.post(
        `https://oauth2.googleapis.com/token?code=${code}&client_id=${this.clientId}&client_secret=${this.clientSecret}&redirect_uri=${this.redirectUri}&grant_type=${grant_type}`,
        null,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            charset: 'UTF-8',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorResponse = error.response.data as GoogleErrorResponse;
        throw new BadRequestException(
          errorResponse.error_description || errorResponse.error
        );
      }
      throw new BadRequestException('Google OAuth 토큰 요청 실패');
    }
  }
}
