import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { PaginationQuery } from '../dto/request/pagination.query';
import { PaginatedResponse } from '../dto/response/pagination.response';

export interface PaginationOptions<T> {
  where?: FilterQuery<T>;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  populate?: any;
  fields?: string[];
}

/**
 * 페이지네이션 처리를 위한 유틸리티 함수
 * @param repository - MikroORM EntityRepository
 * @param paginationQuery - 페이지네이션 요청 DTO
 * @param options - 추가 쿼리 옵션 (where, orderBy, populate 등)
 * @returns PaginatedResponse
 */
export async function paginate<T extends object>(
  repository: EntityRepository<T>,
  paginationQuery: PaginationQuery,
  options: PaginationOptions<T> = {}
): Promise<PaginatedResponse<T>> {
  const { limit, page, offset } = paginationQuery;
  const { where, orderBy, populate, fields } = options;

  // 데이터와 전체 개수를 동시에 조회
  const [data, totalCount] = await repository.findAndCount(where || {}, {
    limit,
    offset,
    orderBy: orderBy as any,
    populate,
    fields: fields as any,
  });

  return new PaginatedResponse(data, totalCount, page, limit);
}

/**
 * 페이지네이션된 데이터 조회
 * data와 totalCount만 반환하여 responseUtil과 함께 사용 가능
 */
export async function findPaginated<T extends object>(
  repository: EntityRepository<T>,
  paginationQuery: PaginationQuery,
  options: PaginationOptions<T> = {}
): Promise<{ data: T[]; totalCount: number }> {
  const { limit, offset } = paginationQuery;
  const { where, orderBy, populate, fields } = options;

  const [data, totalCount] = await repository.findAndCount(where || {}, {
    limit,
    offset,
    orderBy: orderBy as any,
    populate,
    fields: fields as any,
  });

  return { data, totalCount };
}
