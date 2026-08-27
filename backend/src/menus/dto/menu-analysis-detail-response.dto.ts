import { ApiProperty } from '@nestjs/swagger';
import { MenuStatus } from './analyze-menu-response.dto';

// Response DTO - 특정 알레르기가 어떤 재료 때문에 감지됐는지 (질문하기 카드에서 구체적인 재료명을 보여주기 위함)
export class ConflictDetailDto {
  @ApiProperty({ example: '대두 (Soybean)' })
  allergyLabel: string;

  // 이 알레르기를 유발하는 것으로 확인된 재료명 (menu_ingredient -> ingredient_allergy 경로로 도출, 여러 개일 수 있음)
  @ApiProperty({ example: ['두부'], type: [String] })
  ingredientNames: string[];
}

// Response DTO - 메뉴 1건에 대한 상세 분석/판정 결과 (GET /menus/analyze/:sessionId/:menuId)
export class MenuAnalysisDetailDto {
  @ApiProperty({ example: '김치찌개' })
  originalNameKo: string;

  @ApiProperty({ example: 'Kimchi Stew' })
  translatedNameEn: string;

  @ApiProperty({ example: 'DANGER', enum: ['DANGER', 'NEEDS_CHECK'] })
  status: MenuStatus;

  @ApiProperty({ example: ['돼지고기 (Pork)', '대두 (Soybean)'], type: [String] })
  conflictAllergies: string[];

  // conflictAllergies와 같은 내용을 "어떤 재료 때문인지"까지 구조화한 버전 (질문하기 카드가 재료명을 물을 때 사용)
  @ApiProperty({ type: [ConflictDetailDto] })
  conflictDetails: ConflictDetailDto[];

  @ApiProperty({ example: 'OFFICIAL' })
  dataSource: string;

  @ApiProperty({
    example: [
      'AI가 추정한 퓨전/신규 메뉴입니다. 매장에 원재료를 한 번 더 확인하세요.',
      '재료에 대한 알러지 정보를 AI로부터 가져왔습니다.',
    ],
    type: [String],
    required: false,
  })
  noticeMessages?: string[];
}

// Response DTO - Swagger 문서용 최종 성공 응답 형태 ({ success: true, data: {...} })
export class MenuAnalysisDetailSuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: MenuAnalysisDetailDto })
  data: MenuAnalysisDetailDto;
}
