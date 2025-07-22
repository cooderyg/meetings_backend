import { IsNotEmpty, IsString } from 'class-validator';

export class SignInGoogleDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}
