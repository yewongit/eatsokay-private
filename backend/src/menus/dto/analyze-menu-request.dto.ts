import { Transform } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

/**
 * Request DTO - 메뉴판 분석 API(POST /api/v1/menus/analyze) 요청 형태.
 * multipart/form-data로는 배열을 직접 보낼 수 없어 문자열("1,5,10")로 전달되므로,
 * @Transform으로 이를 숫자 배열로 정규화하고 class-validator로 유효성을 검증한다.
 */
export class AnalyzeMenuRequestDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((item) => Number(item));
    // "1,5,10" 형태의 쉼표구분 문자열을 숫자 배열로 변환
    if (typeof value === 'string' && value.length > 0) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => Number(item));
    }
    return [];
  })
  allergyIds: number[] = [];
}
