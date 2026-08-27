import type { Allergy, MenuResult, Profile, QuestionCardText } from './types';

/**
 * 질문 카드 문구 조립 (FRONTEND_FLOW.md §4).
 *
 * 이 모듈은 API 도 AI 도 호출하지 않는다. 필요한 데이터(알레르기 nameKo/nameEn,
 * 메뉴명)가 전부 이미 클라이언트 메모리에 있기 때문이다.
 *
 * 문구 규칙 (§4.2) — 바꾸기 전에 반드시 읽을 것:
 *  - 이모지 / 마크다운 / 굵게 표시 금지. 화면을 그대로 매장에 보여주고 스크린샷으로도 저장한다.
 *  - `\n` 으로 3덩어리 고정: (1) 알레르기 목록 (2) 먹어도 되는지 질문 (3) 확인 요청.
 *  - 매칭 실패한 커스텀 키워드도 반드시 포함한다. 시스템이 못 잡는 걸 사람이 잡게 하는 것이
 *    이 기능의 존재 이유다.
 *  - 한국어 카드의 알레르기명은 nameKo, 영문 카드는 nameEn. 커스텀 키워드는 양쪽 모두
 *    사용자 입력 원문 그대로 (번역하지 않는다 — 직원이 읽을 단어를 앱이 바꿔선 안 된다).
 */

/** 조사는 문서 §4.1 템플릿을 그대로 따른다. 바꿀 일이 생기면 이 상수만 손대면 된다. */
const OBJECT_PARTICLE_KO = '을(를)';

const PRICE_PATTERNS: RegExp[] = [
  // 앞쪽 목록 번호: "1. 김치찌개", "3) 김치찌개", "- 김치찌개"
  /^[\s\-•*·]*\d{1,2}\s*[.)]\s+/,
  // 뒤쪽 가격: "김치찌개 8,000원", "김치찌개 ₩8,000", "김치찌개 ..... 8000"
  /[\s.·…\-~|/]*[₩$¥]?\s*\d{1,3}(?:,\d{3})+\s*(?:원|won|krw|₩)?\s*$/i,
  /[\s.·…\-~|/]*[₩$¥]\s*\d+\s*$/,
  // 아래 두 개는 숫자 앞에 구분자를 요구한다. 그러지 않으면 "6,000" 의 "000" 만
  // 떼어내 "6," 같은 쓰레기가 남는다.
  /[\s.·…\-~|/]\d{3,}\s*(?:원|won|krw)?\s*$/i,
  /[\s.·…\-~|/]\d+\s*(?:원|won|krw)\s*$/i,
  // 남은 점선 리더 / 구분자
  /[\s.·…\-~|/]+$/,
];

/**
 * OCR 원문에서 가격·목록 번호·점선을 떼어낸 "읽기 좋은 메뉴명".
 * `"김치찌개 8,000"` 을 직원에게 그대로 읽히면 어색하기 때문이다 (§4.2).
 * 떼어낸 결과가 비면 원문을 그대로 쓴다 — 이름을 잃는 것이 더 나쁘다.
 */
export function cleanMenuName(raw: string): string {
  let name = (raw ?? '').trim();
  if (!name) return '';

  // 가격이 여러 개 붙는 경우("6,000 / 8,000")가 있어 변화가 없을 때까지 반복한다.
  for (let i = 0; i < 4; i += 1) {
    const before = name;
    for (const pattern of PRICE_PATTERNS) {
      name = name.replace(pattern, '').trim();
    }
    if (name === before) break;
  }

  name = name.replace(/\s{2,}/g, ' ').trim();
  return name || raw.trim();
}

/** 한국어 카드용 알레르기 목록: 표준은 nameKo, 커스텀은 입력 원문. */
function allergyNamesKo(profile: Profile, master: readonly Allergy[]): string[] {
  const byId = new Map(master.map((a) => [a.allergyId, a]));
  const standard = profile.allergyIds
    .map((id) => byId.get(id)?.nameKo)
    .filter((n): n is string => Boolean(n));
  return dedupe([...standard, ...profile.customAllergies]);
}

/** 영문 카드용 알레르기 목록: 표준은 nameEn, 커스텀은 입력 원문(번역하지 않음). */
function allergyNamesEn(profile: Profile, master: readonly Allergy[]): string[] {
  const byId = new Map(master.map((a) => [a.allergyId, a]));
  const standard = profile.allergyIds
    .map((id) => byId.get(id)?.nameEn)
    .filter((n): n is string => Boolean(n));
  return dedupe([...standard, ...profile.customAllergies]);
}

function dedupe(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

/**
 * 질문 카드 문구를 만든다.
 *
 * 서버가 `menu.questionCard` 를 내려주기 시작하면 그 값을 그대로 쓴다
 * (§4.3 무중단 마이그레이션). 없으면 여기서 조립한다.
 */
export function buildQuestionCard(
  menu: MenuResult,
  profile: Profile | null,
  master: readonly Allergy[],
): QuestionCardText {
  if (menu.questionCard?.ko && menu.questionCard?.en) {
    return menu.questionCard;
  }

  const nameKo = cleanMenuName(menu.originalNameKo);
  const nameEn = cleanMenuName(menu.translatedNameEn) || nameKo;

  const ko = profile ? allergyNamesKo(profile, master) : [];
  const en = profile ? allergyNamesEn(profile, master) : [];

  // 알레르기를 하나도 선택하지 않아도 버튼을 숨기지 않는다 (§4.2).
  // 대신 "재료를 확인해 달라"는 문구로 대체해 확인 경로를 남긴다.
  if (ko.length === 0) {
    return {
      ko:
        `저는 알레르기 때문에 재료를 확인해야 합니다.\n` +
        `이 ${nameKo}${OBJECT_PARTICLE_KO} 먹어도 되나요?\n` +
        `조리할 때 어떤 재료가 들어가는지 확인해 주세요.`,
      en:
        `I need to check the ingredients because of a food allergy.\n` +
        `Can I eat this ${nameEn}?\n` +
        `Please tell me which ingredients are used in cooking.`,
    };
  }

  return {
    ko:
      `저는 ${ko.join(', ')} 알레르기가 있습니다.\n` +
      `이 ${nameKo}${OBJECT_PARTICLE_KO} 먹어도 되나요?\n` +
      `조리할 때 해당 재료가 들어가는지 확인해 주세요.`,
    en:
      `I have allergies to ${en.join(', ')}.\n` +
      `Can I eat this ${nameEn}?\n` +
      `Please check whether these ingredients are used in cooking.`,
  };
}
