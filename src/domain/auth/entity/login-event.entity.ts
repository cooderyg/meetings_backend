import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../shared/entity/base.entity';
import { User } from '../../user/entity/user.entity';

export enum LoginMethod {
  EMAIL_PASSWORD = 'email_password',
  GOOGLE_OAUTH = 'google_oauth',
  GITHUB_OAUTH = 'github_oauth',
  MICROSOFT_OAUTH = 'microsoft_oauth',
  SSO = 'sso',
  API_KEY = 'api_key'
}

export enum LoginEventType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  LOGOUT = 'logout'
}

@Entity({ tableName: 'login_events' })
export class LoginEvent extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @Index()
  user?: User;

  @Enum({ items: () => LoginMethod })
  loginMethod!: LoginMethod;

  @Enum({ items: () => LoginEventType })
  eventType!: LoginEventType;

  @Property({ length: 45, nullable: true })
  @Index()
  ipAddress?: string;

  @Property({ type: 'text', nullable: true })
  userAgent?: string;

  @Property({ length: 255, nullable: true })
  failureReason?: string;

  @Property({ length: 255, nullable: true })
  @Index()
  sessionId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: {
    deviceFingerprint?: string;
    location?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
    riskScore?: number;
  };

  isSuccessful(): boolean {
    return this.eventType === LoginEventType.SUCCESS;
  }

  isFailure(): boolean {
    return this.eventType === LoginEventType.FAILURE;
  }

  isLogout(): boolean {
    return this.eventType === LoginEventType.LOGOUT;
  }

  isOAuthLogin(): boolean {
    return [
      LoginMethod.GOOGLE_OAUTH,
      LoginMethod.GITHUB_OAUTH,
      LoginMethod.MICROSOFT_OAUTH
    ].includes(this.loginMethod);
  }
}