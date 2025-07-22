export interface ISignIn {
  code: string;
}

export interface ISignInReturn {
  accessToken: string;
  refreshToken: string;
}
