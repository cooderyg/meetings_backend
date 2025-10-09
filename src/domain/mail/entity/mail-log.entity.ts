import { Entity, Property, ManyToOne, Index, Enum } from '@mikro-orm/core';
import { MailStatus } from '../enum/mail-status.enum';
import { MailType } from '../enum/mail-type.enum';
import { User } from '../../user/entity/user.entity';
import { BaseEntity } from '../../../shared/entity/base.entity';

@Entity({ tableName: 'mail_logs' })
@Index({ properties: ['user', 'createdAt'] })
@Index({ properties: ['email', 'createdAt'] })
@Index({ properties: ['type', 'status'] })
export class MailLog extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  user?: User;

  @Property()
  email!: string;

  @Enum(() => MailType)
  type!: MailType;

  @Property()
  subject!: string;

  @Property({ type: 'json' })
  templateData: any;

  @Enum(() => MailStatus)
  status: MailStatus = MailStatus.PENDING;

  @Property({ nullable: true })
  errorMessage?: string;

  @Property({ nullable: true })
  sesMessageId?: string;

  @Property({ nullable: true })
  sentAt?: Date;

  @Property({ default: 0 })
  retryCount: number = 0;
}
