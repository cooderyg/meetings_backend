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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 컨트롤러에서 data와 pagination을 분리해서 전달한 경우
        let responseData = data;
        let pagination = undefined;

        // 컨트롤러에서 { data, pagination } 형태로 반환한 경우 처리
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'pagination' in data
        ) {
          responseData = data.data;
          pagination = data.pagination;
        }

        // 응답 생성
        const response: StandardResponse<any> = {
          success: true,
        };

        // 페이지네이션 정보가 있으면 pagination 추가
        if (pagination) {
          response.pagination = pagination;
        }

        // null이나 undefined가 아닌 경우에만 data 필드 추가
        if (responseData !== null && responseData !== undefined) {
          response.data = responseData;
        }

        return response;
      }),
    );
  }
}
