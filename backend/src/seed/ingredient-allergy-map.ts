/**
 * 재료명 → 알레르기 코드 매핑 규칙(하드코딩 사전).
 * import-recipes.ts가 CSV의 재료 목록을 임포트하는 시점에, 여기 있는 재료는 ingredient_allergy 테이블에
 * OFFICIAL/검증됨 상태로 직접 반영한다. 이 사전에 없는 재료가 나중에 등장하면 IngredientResolverService가
 * AI에게 딱 1회 물어봐서 같은 ingredient_allergy 테이블에 AI_GENERATED/미검증 상태로 채워 넣는다.
 */
export const INGREDIENT_ALLERGY_MAP: Record<string, string[]> = {
  계란: ['EGG'],
  계란후라이: ['EGG'],
  계란흰자: ['EGG'],
  마요네즈: ['EGG'],

  우유: ['MILK'],
  버터: ['MILK'],
  모짜렐라치즈: ['MILK'],
  슬라이스치즈: ['MILK'],

  된장: ['SOYBEAN'],
  두부: ['SOYBEAN'],
  순두부: ['SOYBEAN'],
  쌈장: ['SOYBEAN'],
  간장: ['SOYBEAN'],
  국간장: ['SOYBEAN'],
  진간장: ['SOYBEAN'],
  콩나물: ['SOYBEAN'],
  '[쇠고기양념] 간장': ['SOYBEAN'],

  밀가루: ['WHEAT'],
  국수: ['WHEAT'],
  냉면: ['WHEAT'],
  식빵: ['WHEAT'],
  꽃빵: ['WHEAT'],

  새우: ['SHRIMP'],
  새우젓: ['SHRIMP'],
  가재새우: ['SHRIMP'],
  중새우살: ['SHRIMP'],

  돼지고기: ['PORK'],
  돼지갈비: ['PORK'],
  비엔나소시지: ['PORK'],

  토마토: ['TOMATO'],
  토마토케첩: ['TOMATO'],

  닭: ['CHICKEN'],
  닭가슴살: ['CHICKEN'],
  닭고기: ['CHICKEN'],

  쇠고기: ['BEEF'],
  쇠고기육수: ['BEEF'],
  갈비: ['BEEF'],
  양지머리: ['BEEF'],
  안심: ['BEEF'],
  육회: ['BEEF'],
  채썬쇠고기: ['BEEF'],

  오징어: ['SQUID'],
  갑오징어: ['SQUID'],

  굴: ['SHELLFISH'],
  굴소스: ['SHELLFISH'],
  홍합: ['SHELLFISH'],
  검은껍질홍합: ['SHELLFISH'],
  조개살: ['SHELLFISH'],
  조갯살: ['SHELLFISH'],
  모시조개: ['SHELLFISH'],
  바지락: ['SHELLFISH'],
  가리비: ['SHELLFISH'],
  참소라살: ['SHELLFISH'],

  잣: ['PINE_NUT'],
  밤: ['CHESTNUT'],
};
