import { Injectable } from '@nestjs/common';
import { Allergy } from '../../entities';

/**
 * Service 계층 - 알레르기 필터링 로직.
 * 메뉴가 가진 알레르기 목록과 사용자가 선택한 알레르기ID(표준 22종)를 교차 검증하는
 * 순수 함수형 비즈니스 로직. DB에 접근하지 않는다.
 */
@Injectable()
export class AllergyFilterService {
  // 입력 : 1개의 메뉴에 대해서 메뉴의 알레르기 목록, 사용자의 알러지 정보(22종)
  // 출력 : 1개의 메뉴에 걸리는 알러지 목록
  filter(menuAllergies: Allergy[], userAllergyIds: number[]): Allergy[] {
    // allergy_id는 DB에서 bigint(문자열)로 반환되므로 Number로 정규화해 비교한다
    const userAllergyIdSet = new Set(userAllergyIds.map(Number));
    return menuAllergies.filter((allergy) => userAllergyIdSet.has(Number(allergy.allergyId)));
  }
}
