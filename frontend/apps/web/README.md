# K-Food Lens — Web Frontend

`FRONTEND_FLOW.md` 와 `API 명세.md` 를 그대로 구현한 Next.js 16 App Router 앱.

## 실행

```bash
npm install                      # 저장소 루트에서 (npm workspaces)
cp apps/web/.env.example apps/web/.env.local
npm run web:dev                  # http://localhost:3001
```

`NEXT_PUBLIC_API_BASE_URL` 은 백엔드 주소(기본 `http://localhost:3000`). 백엔드가 떠 있지
않으면 `/profile` 은 표준 알레르기 목록 로딩에 실패하지만 폼 자체는 뜬다 — 커스텀 키워드만으로도
프로필을 저장할 수 있어야 하기 때문이다.

| 스크립트 | 설명 |
| --- | --- |
| `npm run web:dev` | 개발 서버 (포트 3001) |
| `npm run web:check` | `tsc --noEmit` + ESLint |
| `npm run web:test` | Vitest (순수 로직만) |
| `npm run web:build` | 프로덕션 빌드 |

### 카메라 검증

`capture="environment"` 는 데스크톱 브라우저에서 파일 선택창으로 대체된다. 실제 검증은
**모바일 기기 또는 devtools 모바일 에뮬레이션 + 실제 카메라 권한**으로 해야 한다.
`getUserMedia` 는 쓰지 않지만 배포는 HTTPS(secure context)여야 한다.

## 구조

```
app/
  page.tsx          온보딩 + 동의 (/)
  profile/page.tsx  알레르기 프로필 (/profile)
  scan/page.tsx     촬영 → 분석 (/scan)
  result/page.tsx   메뉴별 결과 (/result)
  globals.css       디자인 시스템 전체 (커스텀 CSS, Tailwind 없음)
components/         프레젠테이션 컴포넌트
lib/
  api.ts            fetch 래퍼, 응답 봉투 해제, 알레르기 마스터 캐시
  client-storage.ts useSyncExternalStore 기반 브라우저 저장소 구독
  profile.ts        프로필 CRUD + 보관 기간 만료
  question-card.ts  질문 카드 문구 조립 (핵심 로직, 단위 테스트 대상)
  i18n.tsx          ko/en/ja/zh
locales/            번역 JSON (ko.json 이 키 스키마의 기준)
```

## 바꾸면 안 되는 것

`FRONTEND_FLOW.md` 의 제약이자 이 앱의 안전 요구사항이다.

- **촬영 이미지를 어디에도 저장하지 않는다.** 업로드 후 `File` 참조는 버린다.
- **프로필은 LocalStorage 에만 있다.** 서버는 분석 요청마다 `allergyIds` 를 받기만 한다.
- **`/scan` 에 갤러리 선택 진입점을 추가하지 않는다.** 입력 경로는 `CameraCapture` 의
  input 하나뿐이고, 모든 재시도 버튼은 그 input 을 다시 연다.
- **초록 계열 색상 금지.** 상태는 `DANGER`(빨강) / `NEEDS_CHECK`(노랑) 둘뿐이고
  "안전"을 표시하지 않는다.
- **`OFFICIAL` 은 "표준 레시피 기준"으로 표기한다.** "공식"은 매장 보증으로 오해된다.
- **음성 기능은 범위 밖이다.** `/api/v1/speech` 를 호출하지 않는다.
- **질문 카드**는 이모지·마크다운 없이 `\n` 3덩어리 구조를 유지하고, 매칭되지 않은 커스텀
  키워드도 포함하며, 버튼은 `NEEDS_CHECK` 와 알레르기 미선택 상태에서도 항상 보인다.

## API 경계에서 하는 정규화

`allergyId` 는 백엔드 DB 의 bigint 라 JSON 에서 **문자열**로 온다. `lib/api.ts` 의
`normalizeAllergy()` 가 `Number()` 로 바꾼다. 이걸 빼면 프로필의 숫자 ID 와 매칭되지 않아
질문 카드에서 표준 알레르기 이름이 조용히 사라진다.
