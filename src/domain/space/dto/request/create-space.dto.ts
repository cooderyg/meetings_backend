import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSpaceDto {
  @ApiProperty({
    description: 'The title of the space',
    example: 'My Space',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The description of the space',
    example: 'This is a space for my project',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The parent path',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  parentPath?: string;
}
