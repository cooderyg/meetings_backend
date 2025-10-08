import { OAuthType } from '../enums/oauth-type.enum';

export interface ISignIn {
  code: string;
  type: OAuthType;
  invitationToken?: string;
}

export interface ISignInReturn {
  accessToken: string;
  refreshToken: string;
}
