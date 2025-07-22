import { Controller } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller({
  path: 'auth',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
