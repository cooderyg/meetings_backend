import { IsOptional, IsEnum } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsEnum(['system', 'light', 'dark'])
  themeMode?: 'system' | 'light' | 'dark';
}
