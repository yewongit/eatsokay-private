import { MenuStatus } from '../../menus/dto/analyze-menu-response.dto';

/**
 * MenusService.buildAnalysisItem(menus.service.ts)의 상태 판정 규칙을 그대로 추출한 순수 함수.
 * 알레르기 유발 재료가 1개라도 검출되면 DANGER, 그 외에는 전부 NEEDS_CHECK(확인 필요)로 판정한다.
 */
export function deriveMenuStatus(hasConflict: boolean): MenuStatus {
  return hasConflict ? 'DANGER' : 'NEEDS_CHECK';
}
