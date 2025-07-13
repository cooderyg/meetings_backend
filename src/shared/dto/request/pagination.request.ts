import { IsNotEmpty, IsNumber } from 'class-validator';

export class PaginationRequest {
  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @IsNumber()
  @IsNotEmpty()
  page: number;
}
