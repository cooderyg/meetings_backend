export interface ICreateUser {
  uid?: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash?: string;
}
