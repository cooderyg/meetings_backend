import { EntityManager } from '@mikro-orm/core';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/user/entity/user.entity';
import { IRequest } from '../type/request.type';
import { AccessTokenPayload } from '../type/token.type';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly em: EntityManager
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IRequest>();
    const token = request.headers.authorization;
    if (!token) {
      throw new UnauthorizedException('No token provided'); //TODO: 커스텀 예외로 수정
    }

    try {
      const accessToken = token.startsWith('Bearer ')
        ? token.substring(7)
        : token;

      const decoded = this.jwtService.verify<AccessTokenPayload>(accessToken);
      const { id } = decoded;
      const user = await this.em.findOne(User, { id });

      if (!user) {
        throw new UnauthorizedException('User not found'); //TODO: 커스텀 예외로 수정
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token'); //TODO: 커스텀 예외로 수정
    }
  }
}
