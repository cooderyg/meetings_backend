import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateWorkspaceNameDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
