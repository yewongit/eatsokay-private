import { ApiProperty } from '@nestjs/swagger';

// DTO - 개별 에러 정보 형태. HttpExceptionFilter가 이 형태로 에러를 직렬화한다.
export class ApiErrorDto {
  @ApiProperty({ example: 'INVALID_IMAGE_OR_NOT_MENU' })
  code: string;

  @ApiProperty({ example: '메뉴판을 인식할 수 없습니다. 빛 반사나 흔들림을 피하여 사각형 가이드에 맞게 다시 촬영해 주세요.' })
  message: string;

  @ApiProperty({ example: 'BLURRY_OR_NO_TEXT', required: false })
  reason?: string;
}

// DTO - 모든 API 공용 에러 응답 래퍼 ({ success: false, error: {...} })
export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ type: ApiErrorDto })
  error: ApiErrorDto;
}
