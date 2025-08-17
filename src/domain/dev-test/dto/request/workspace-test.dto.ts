import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class WorkspaceTestDto {
  @ApiProperty({
    description: '테스트할 워크스페이스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  workspaceId: string;
}

export class WorkspaceActionDto extends WorkspaceTestDto {
  @ApiProperty({
    description: '테스트 메시지',
    example: 'Hello from workspace test!',
  })
  message: string;
}