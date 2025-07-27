export interface IOAuthStrategy {
  get clientId(): string;
  get clientSecret(): string;
  get redirectUri(): string;

  /**
   * @param args : OAuth 로그인 코드
   * @returns uid
   */
  signIn(args: { code: string }): Promise<string>;
}
