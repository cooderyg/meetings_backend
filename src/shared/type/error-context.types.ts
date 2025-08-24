export interface ErrorContextMap {
  // 인증 관련
  AUTH_UNAUTHORIZED: undefined;
  AUTH_TOKEN_INVALID: undefined;
  AUTH_TOKEN_EXPIRED: undefined;
  AUTH_INSUFFICIENT_PERMISSION: { requiredRole: string; currentRole: string };
  AUTH_USER_NOT_FOUND: { email: string };
  AUTH_INVALID_CREDENTIALS: undefined;
  AUTH_SESSION_EXPIRED: undefined;

  // 미팅 관련
  MEETING_NOT_FOUND: { meetingId: string };
  MEETING_CANNOT_PUBLISH_DRAFT: { currentStatus: string; requiredStatus: string };
  MEETING_NO_RESOURCES: undefined;
  MEETING_UNAUTHORIZED_ACTION: { userId: string; meetingId: string };
  MEETING_PUBLISHED_CANNOT_DELETE: { resourceCount: number };
  MEETING_ALREADY_PUBLISHED: undefined;
  MEETING_INVALID_STATUS_TRANSITION: { from: string; to: string };

  // 워크스페이스 관련
  WORKSPACE_NOT_FOUND: { workspaceId: string };
  WORKSPACE_ALREADY_MEMBER: { userId: string; workspaceId: string };
  WORKSPACE_MEMBER_LIMIT: { currentCount: number; maxCount: number };
  WORKSPACE_CANNOT_LEAVE_LAST_OWNER: undefined;
  WORKSPACE_NAME_DUPLICATE: { name: string };
  WORKSPACE_FEATURE_NOT_ALLOWED: { feature: string; requiredPlan: string };
  WORKSPACE_QUOTA_EXCEEDED: { resource: string; currentCount: number; maxCount: number };

  // 리소스 관련
  RESOURCE_NOT_FOUND: { resourceType: string; resourceId?: string };
  RESOURCE_ACCESS_DENIED: { resourceType: string; resourceId: string };
  RESOURCE_INVALID_OPERATION: { operation: string; reason: string };
  RESOURCE_ALREADY_EXISTS: { resourceType: string; identifier: string };

  // 파일/스토리지 관련
  FILE_TOO_LARGE: { maxSize: number; actualSize: number };
  FILE_INVALID_TYPE: { allowedTypes: string[]; actualType: string };
  FILE_UPLOAD_FAILED: { reason: string };
  STORAGE_QUOTA_EXCEEDED: { currentUsage: number; quota: number };

  // 유효성 검증
  VALIDATION_FAILED: { fields: Record<string, string[]> };
  INVALID_INPUT: { field: string; reason: string };
  REQUIRED_FIELD_MISSING: { field: string };

  // 일반 에러
  BAD_REQUEST: undefined;
  NOT_FOUND: undefined;
  INTERNAL_SERVER_ERROR: undefined;
  SERVICE_UNAVAILABLE: undefined;
  RATE_LIMIT_EXCEEDED: { retryAfter: number };
  OPERATION_TIMEOUT: { operation: string; timeoutMs: number };
}