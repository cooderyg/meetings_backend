export const MAIL_LOG_DETAIL_FIELDS = {
  id: true,
  email: true,
  type: true,
  subject: true,
  status: true,
  createdAt: true,
  sentAt: true,
  errorMessage: true,
  retryCount: true,
  user: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  },
} as const;

export const MAIL_LOG_LIST_FIELDS = {
  id: true,
  email: true,
  type: true,
  subject: true,
  status: true,
  createdAt: true,
  sentAt: true,
} as const;

export const MAIL_LOG_DETAIL_POPULATE = ['user'] as const;
