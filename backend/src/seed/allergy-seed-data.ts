/**
 * 알레르기 마스터 시드 데이터.
 * 식약처 지정 22종 알레르기 표준 코드와 한글/영문명을 정적으로 정의한다. run-seed.ts에서 DB에 적재할 때 사용.
 */
export const ALLERGY_SEED_DATA: Array<{ code: string; nameKo: string; nameEn: string }> = [
  { code: 'EGG', nameKo: '난류(가금류)', nameEn: 'Egg' },
  { code: 'MILK', nameKo: '우유', nameEn: 'Milk' },
  { code: 'BUCKWHEAT', nameKo: '메밀', nameEn: 'Buckwheat' },
  { code: 'PEANUT', nameKo: '땅콩', nameEn: 'Peanut' },
  { code: 'SOYBEAN', nameKo: '대두', nameEn: 'Soybean' },
  { code: 'WHEAT', nameKo: '밀', nameEn: 'Wheat' },
  { code: 'MACKEREL', nameKo: '고등어', nameEn: 'Mackerel' },
  { code: 'CRAB', nameKo: '게', nameEn: 'Crab' },
  { code: 'SHRIMP', nameKo: '새우', nameEn: 'Shrimp' },
  { code: 'PORK', nameKo: '돼지고기', nameEn: 'Pork' },
  { code: 'PEACH', nameKo: '복숭아', nameEn: 'Peach' },
  { code: 'TOMATO', nameKo: '토마토', nameEn: 'Tomato' },
  { code: 'SULFITES', nameKo: '아황산류', nameEn: 'Sulfites' },
  { code: 'WALNUT', nameKo: '호두', nameEn: 'Walnut' },
  { code: 'CHICKEN', nameKo: '닭고기', nameEn: 'Chicken' },
  { code: 'BEEF', nameKo: '쇠고기', nameEn: 'Beef' },
  { code: 'SQUID', nameKo: '오징어', nameEn: 'Squid' },
  { code: 'SHELLFISH', nameKo: '조개류(굴, 전복, 홍합 포함)', nameEn: 'Shellfish (oyster, abalone, mussel)' },
  { code: 'PINE_NUT', nameKo: '잣', nameEn: 'Pine nut' },
  { code: 'CHESTNUT', nameKo: '밤', nameEn: 'Chestnut' },
  { code: 'ALMOND', nameKo: '아몬드', nameEn: 'Almond' },
  { code: 'ETC', nameKo: '기타', nameEn: 'Other' },
];
