import { ISignIn, ISignInReturn } from '../interfaces/sign-in.interface';

export interface IAuthStrategy {
  get clientId(): string;
  get clientSecret(): string;
  get redirectUri(): string;

  signIn(args: ISignIn): Promise<ISignInReturn>;
}
