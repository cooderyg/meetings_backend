export const ERROR_MESSAGES = {
  // 인증 관련
  AUTH: {
    UNAUTHORIZED: '로그인이 필요합니다',
    TOKEN_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해주세요',
    FORBIDDEN: '이 기능을 사용할 권한이 없습니다',
  },

  // 검증 관련
  VALIDATION: {
    INVALID_INPUT: '입력한 정보를 다시 확인해주세요',
    INVALID_PARAM: '요청 정보가 올바르지 않습니다',
    VALIDATION_FAILED: '입력한 정보를 다시 확인해주세요',
  },

  // 리소스 관련
  RESOURCE: {
    NOT_FOUND: '요청하신 정보를 찾을 수 없습니다',
    DUPLICATE_ENTRY: '이미 등록된 정보입니다',
  },

  // 비즈니스 로직 관련
  BUSINESS: {
    INSUFFICIENT_FUNDS: '잔액이 부족합니다. 충전 후 이용해주세요',
    PAYMENT_FAILED: '결제 처리 중 오류가 발생했습니다. 다시 시도해주세요',
    ORDER_ALREADY_PROCESSED: '이미 처리된 주문입니다',
    PRODUCT_OUT_OF_STOCK: '선택하신 상품이 품절되었습니다',
    USER_QUOTA_EXCEEDED: '일일 사용 한도를 초과했습니다',
    SUBSCRIPTION_REQUIRED: '프리미엄 구독이 필요한 기능입니다',
    INVALID_COUPON: '쿠폰이 유효하지 않거나 만료되었습니다',
    INVALID_TRANSACTION: '거래 정보가 올바르지 않습니다',
  },

  // 시스템 관련
  SYSTEM: {
    INTERNAL_ERROR: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
    EXTERNAL_API_ERROR: '외부 서비스 연동 중 오류가 발생했습니다',
    DATABASE_ERROR: '데이터 처리 중 오류가 발생했습니다',
    SERVICE_UNAVAILABLE: '서비스를 일시적으로 사용할 수 없습니다',
  },
} as const;
