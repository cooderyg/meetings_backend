import { INestApplication } from '@nestjs/common';

/**
 * E2E 테스트 환경에 등록된 모든 라우트를 출력하는 디버깅 유틸리티
 *
 * @description
 * NestJS E2E 테스트에서 404 오류가 발생할 때, 실제로 어떤 라우트들이
 * 등록되었는지 확인하기 위한 도구입니다.
 *
 * @usage
 * ```typescript
 * beforeAll(async () => {
 *   app = moduleFixture.createNestApplication();
 *   await app.init();
 *   listAllRoutes(app); // 라우트 목록 출력
 * });
 * ```
 *
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function listAllRoutes(app: INestApplication): void {
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  // Express 라우터 스택 접근
  const router = instance._router;

  if (!router || !router.stack) {
    console.log('⚠️  Router stack not accessible');
    return;
  }

  console.log('\n=== 📍 Registered Routes ===');

  const routes = router.stack
    .filter((layer: any) => layer.route) // 라우트만 필터링
    .map((layer: any) => {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods)
        .join(',')
        .toUpperCase();
      return { methods, path };
    });

  if (routes.length === 0) {
    console.log('❌ No routes registered!');
  } else {
    routes.forEach(({ methods, path }) => {
      console.log(`   ${methods.padEnd(10)} ${path}`);
    });
  }

  console.log('============================\n');
}

/**
 * 특정 경로가 등록되었는지 확인하는 헬퍼 함수
 *
 * @param app - NestJS 애플리케이션 인스턴스
 * @param method - HTTP 메서드 (GET, POST, PUT, DELETE 등)
 * @param path - 라우트 경로 (예: '/workspace')
 * @returns 라우트가 등록되어 있으면 true
 */
export function isRouteRegistered(
  app: INestApplication,
  method: string,
  path: string
): boolean {
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();
  const router = instance._router;

  if (!router || !router.stack) {
    return false;
  }

  return router.stack.some((layer: any) => {
    if (!layer.route) return false;
    const hasMethod = layer.route.methods[method.toLowerCase()];
    const hasPath = layer.route.path === path;
    return hasMethod && hasPath;
  });
}
