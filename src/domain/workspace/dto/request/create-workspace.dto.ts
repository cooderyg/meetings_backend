import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Workspace name',
    example: 'My Workspace',
    type: () => String,
  })
  @IsNotEmpty()
  @IsString()
  name: string; //TODO: 최대 길이 제한 추가

  @ApiProperty({
    description: 'Workspace image URL',
    example: 'https://example.com/image.png',
    type: () => String,
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
