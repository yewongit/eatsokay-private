import { NotFoundException } from '@nestjs/common';

/**
 * 세션ID + 메뉴ID로 저장된 분석 결과를 찾지 못했을 때 발생하는 예외.
 * sessionId와 id를 함께 검사해서 조회하므로, 다른 세션의 결과를 menuId만 추측해 조회하는 것도 이 예외로 막힌다.
 */
export class MenuAnalysisResultNotFoundException extends NotFoundException {
  constructor(sessionId: string, menuId: number) {
    super({
      code: 'ANALYSIS_RESULT_NOT_FOUND',
      message: '요청한 세션ID/메뉴ID에 해당하는 분석 결과를 찾을 수 없습니다.',
      reason: `sessionId=${sessionId}, menuId=${menuId}`,
    });
  }
}
