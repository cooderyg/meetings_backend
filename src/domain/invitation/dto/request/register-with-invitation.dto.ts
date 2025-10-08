import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterWithInvitationDto {
  @ApiProperty({
    description: '회원가입 이메일 (초대받은 이메일과 일치해야 함)',
    example: 'newuser@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: '이름',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    description: '성',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}
