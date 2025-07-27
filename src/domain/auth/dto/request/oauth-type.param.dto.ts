import { IsEnum } from 'class-validator';
import { OAuthType } from '../../enums/oauth-type.enum';

export class OAuthTypeParamDto {
  @IsEnum(OAuthType)
  type: OAuthType;
}
