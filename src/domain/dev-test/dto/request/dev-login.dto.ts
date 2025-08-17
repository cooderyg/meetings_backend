import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DevLoginDto {
  @ApiProperty({
    description: '테스트용 이메일 주소',
    example: 'test@example.com',
  })
  @IsEmail()
  email: string;
}