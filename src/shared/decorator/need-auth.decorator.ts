import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../guard/auth.guard';

export const NeedAuth = () =>
  applyDecorators(ApiBearerAuth(), UseGuards(AuthGuard));
