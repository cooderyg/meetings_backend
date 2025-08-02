import { Body, Controller, Param, Post } from '@nestjs/common';
import { OAuthTypeParamDto } from '../dto/request/oauth-type.param.dto';
import { SignInGoogleDto } from '../dto/request/sign-in-google.dto';
import { TokenResponseDto } from '../dto/response/token-res.dto';
import { AuthService } from '../services/auth.service';

@Controller({
  path: 'auth',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in/:type')
  async signIn(
    @Param() param: OAuthTypeParamDto,
    @Body() dto: SignInGoogleDto
  ): Promise<TokenResponseDto> {
    return this.authService.signIn({
      code: dto.code,
      type: param.type,
    });
  }
}
