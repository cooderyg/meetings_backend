import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  totalCount?: number;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 컨트롤러에서 data와 totalCount를 분리해서 전달한 경우
        let responseData = data;
        let totalCount = undefined;

        // 컨트롤러에서 { data, totalCount } 형태로 반환한 경우 처리
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'totalCount' in data
        ) {
          responseData = data.data;
          totalCount = data.totalCount;
        }

        // 응답 생성
        const response: StandardResponse<any> = {
          success: true,
        };

        // totalCount 정보가 있으면 추가
        if (totalCount !== undefined) {
          response.totalCount = totalCount;
        }

        // null이나 undefined가 아닌 경우에만 data 필드 추가
        if (responseData !== null && responseData !== undefined) {
          response.data = responseData;
        }

        return response;
      })
    );
  }
}
