import { BadRequestException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { AppConfig } from '../../../shared/module/app-config/app-config';
import { ISignIn, ISignInReturn } from '../interfaces/sign-in.interface';
import { IAuthStrategy } from './auth.strategy.interface';

// Google OAuth 토큰 응답 타입 정의
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

// Google OAuth 에러 응답 타입 정의
interface GoogleErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export class GoogleAuthStrategy implements IAuthStrategy {
  constructor(private readonly appConfig: AppConfig) {}

  get clientId(): string {
    return this.appConfig.gcp.clientId;
  }

  get clientSecret(): string {
    return this.appConfig.gcp.clientSecret;
  }

  get redirectUri(): string {
    return this.appConfig.oauth.redirectUri;
  }

  async signIn(args: ISignIn): Promise<ISignInReturn> {
    const { code } = args;

    // getToken 메서드를 호출해서 실제 토큰을 받아옴
    const tokenResponse = await this.getToken(code);

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || '',
    };
  }

  async getToken(code: string): Promise<GoogleTokenResponse> {
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
      // axios 에러 타입 안전하게 처리
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
