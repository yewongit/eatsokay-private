/**
 * 두 문자열 간의 편집 거리(Levenshtein Distance)를 동적 계획법(DP)으로 계산하는 유틸리티.
 * MenuMatchingService가 Vision AI가 인식한 메뉴명과 DB의 표준 메뉴명을 퍼지 매칭할 때 사용한다.
 */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  // 첫 행/열은 빈 문자열로 변환하는 데 필요한 삽입/삭제 횟수로 초기화
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  // matrix[i][j] = a의 앞 i글자를 b의 앞 j글자로 바꾸는 최소 편집 횟수(삽입/삭제/치환 중 최솟값)
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

// 편집 거리를 문자열 길이 대비 비율로 정규화해 0(전혀 다름)~1(완전 일치) 사이 유사도로 변환
export function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}
