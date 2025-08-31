/**
 * 에러를 안전하게 처리하는 유틸리티 함수
 */
export function safely(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error('Safely caught error:', error);
  }
}