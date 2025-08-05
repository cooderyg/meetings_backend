import { Request } from 'express';
import { User } from '../../domain/user/entity/user.entity';

export interface IRequest extends Request {
  user?: User;
}
