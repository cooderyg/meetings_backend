import { SubscriptionTier } from '../entity/workspace.entity';

export interface ICreateWorkspace {
  name: string;
  subscriptionTier: SubscriptionTier;
}
