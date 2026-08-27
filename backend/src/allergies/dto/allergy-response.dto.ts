import { ApiProperty } from '@nestjs/swagger';

// Response DTO - 알레르기 1건의 응답 형태 (Swagger 문서용 예시값 포함)
export class AllergyDto {
  @ApiProperty({ example: 5 })
  allergyId: number;

  @ApiProperty({ example: 'SOYBEAN' })
  code: string;

  @ApiProperty({ example: '대두' })
  nameKo: string;

  @ApiProperty({ example: 'Soybean' })
  nameEn: string;
}

// Response DTO - 알레르기 목록 조회 API의 최종 성공 응답 래퍼
export class AllergyListSuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [AllergyDto] })
  data: AllergyDto[];
}
