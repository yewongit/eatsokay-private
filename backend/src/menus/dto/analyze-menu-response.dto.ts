import { ApiProperty } from '@nestjs/swagger';

// 알레르기 유발 재료가 하나라도 검출되면 DANGER, 그 외 경우는 전부 NEEDS_CHECK(확인 필요)로 판정한다.
export type MenuStatus = 'DANGER' | 'NEEDS_CHECK';

// Response DTO - 메뉴판 1장에서 인식된 메뉴 1건의 요약. 상세 정보는 menuId로 GET /menus/analyze/:sessionId/:menuId 를 호출해 조회한다.
export class MenuAnalysisSummaryItem {
  @ApiProperty({ example: 101, description: '이 세션 안에서 이 분석 결과를 가리키는 ID (상세 조회 시 사용)' })
  menuId: number;

  @ApiProperty({ example: '김치찌개' })
  originalNameKo: string;

  @ApiProperty({ example: 'Kimchi Stew' })
  translatedNameEn: string;

  @ApiProperty({ example: 'DANGER', enum: ['DANGER', 'NEEDS_CHECK'] })
  status: MenuStatus;
}

// Response DTO - 메뉴판 1장 전체의 분석 요약 목록 + 세션ID
export class AnalyzeMenuResponseDto {
  @ApiProperty({ example: '3f1a9c2e-64b1-4e2f-9c3a-1a2b3c4d5e6f', description: '상세 조회에 사용할 세션 ID' })
  sessionId: string;

  @ApiProperty({ example: 3 })
  menuCount: number;

  @ApiProperty({ type: [MenuAnalysisSummaryItem] })
  resultList: MenuAnalysisSummaryItem[];
}

// Response DTO - Swagger 문서용 최종 성공 응답 형태 ({ success: true, data: {...} })
export class AnalyzeMenuSuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: AnalyzeMenuResponseDto })
  data: AnalyzeMenuResponseDto;
}
