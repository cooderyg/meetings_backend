export interface IOAuthStrategy {
  get clientId(): string;
  get clientSecret(): string;
  get redirectUri(): string;

  /**
   * @param args : OAuth 로그인 코드
   * @returns uid
   */
  verifyOAuthToken(args: { code: string }): Promise<IVerifyOAuthTokenReturn>;
}

export interface IVerifyOAuthTokenReturn {
  uid: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
}
