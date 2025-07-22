import { Body, Controller, Post } from '@nestjs/common';
import { SignInGoogleDto } from '../dto/request/sign-in-google.dto';
import { TokenResponseDto } from '../dto/response/token-res.dto';
import { AuthService } from '../services/auth.service';

@Controller({
  path: 'auth',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in/google')
  async signInWithGoogle(
    @Body() dto: SignInGoogleDto
  ): Promise<TokenResponseDto> {
    return this.authService.signInWithGoogle(dto);
  }
}
