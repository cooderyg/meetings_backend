import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class WorkspaceIdParamDto {
  @ApiProperty({
    description: 'The workspace ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  workspaceId: string;
}
