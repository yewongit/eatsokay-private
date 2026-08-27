# K-Food Lens Backend API 명세

메뉴판 이미지 기반 알레르기 위험도 판별 서비스 API 명세입니다.

- Base URL: `http://localhost:{PORT}` (기본 `PORT=3000`)
- API Prefix: `/api/v1`
- Swagger UI: `http://localhost:{PORT}/api-docs`
- 인증: 없음 (비로그인 서비스)
- CORS: `CORS_ORIGIN` 환경변수 (기본 `http://localhost:3001`)만 허용
- 모든 요청 바디는 `class-validator` 기반 `ValidationPipe(transform: true, whitelist: true)`로 검증/정규화되며, DTO에 정의되지 않은 필드는 자동 제거됩니다.

## 공통 응답 포맷

모든 API는 성공/실패 여부와 관계없이 아래 두 형태 중 하나로 응답합니다.

### 성공 응답

```json
{
  "success": true,
  "data": { ... }
}
```

### 실패 응답

모든 예외는 전역 예외 필터(`HttpExceptionFilter`)에 의해 아래 형태로 통일됩니다.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE_OR_NOT_MENU",
    "message": "메뉴판을 인식할 수 없습니다. 빛 반사나 흔들림을 피하여 사각형 가이드에 맞게 다시 촬영해 주세요.",
    "reason": "BLURRY_OR_NO_TEXT"
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `code` | string | 에러 식별자. 커스텀 예외가 아니면 HTTP 상태명(예: `BAD_REQUEST`)이 들어감 |
| `message` | string | 사용자에게 보여줄 안내 문구 |
| `reason` | string \| undefined | 내부 원인(디버깅/분기용, 없을 수 있음) |

---

## 1. 메뉴 API (`/api/v1/menus`)

### 1.1 POST `/api/v1/menus/analyze` — 메뉴판 이미지 분석 및 알레르기 위험도 판별

메뉴판 이미지를 Vision AI로 분석해 메뉴명을 추출하고, 등록된 알레르기와 교차 검증하여 각 메뉴의 `DANGER` / `NEEDS_CHECK` 상태를 반환합니다.

**Request**

- Content-Type: `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file (binary) | ✅ | 메뉴판 이미지 파일 |
| `allergyIds` | string | ❌ | 사용자가 선택한 알레르기 ID 목록. 쉼표로 구분된 문자열 (예: `"1,5,10"`). 서버에서 `number[]`로 변환됨. 생략 시 빈 배열로 처리 |

**처리 순서**

1. `image`가 없으면 즉시 `400 INVALID_IMAGE_OR_NOT_MENU` (`NO_IMAGE_PROVIDED`) 반환
2. Vision AI로 이미지에서 메뉴 항목 추출 → 메뉴판이 아니거나 텍스트 인식 불가 시 `400 INVALID_IMAGE_OR_NOT_MENU` 반환
3. 인식된 각 메뉴명을 DB 표준 메뉴(`StandardMenu`)와 매칭 (매칭 실패 시 AI가 신규 추정 생성 — `isAiFallback`)
4. 메뉴의 알레르기 유발 재료와 사용자가 선택한 `allergyIds`를 교차 검증
5. 알레르기 유발 재료가 1개라도 검출되면 `DANGER`, 그 외에는 전부 `NEEDS_CHECK`
6. 메뉴판 1회 호출의 모든 결과를 하나의 `sessionId`(UUID)로 묶어 DB에 저장

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "sessionId": "3f1a9c2e-64b1-4e2f-9c3a-1a2b3c4d5e6f",
    "menuCount": 3,
    "resultList": [
      {
        "menuId": 101,
        "originalNameKo": "김치찌개",
        "translatedNameEn": "Kimchi Stew",
        "status": "DANGER"
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `data.sessionId` | string (UUID) | 상세 조회(1.2)에 사용할 세션 ID |
| `data.menuCount` | number | 인식된 메뉴 개수 |
| `data.resultList[].menuId` | number | 세션 내 해당 분석 결과를 가리키는 ID (상세 조회 시 사용) |
| `data.resultList[].originalNameKo` | string | 인식된 메뉴 원문(한국어) |
| `data.resultList[].translatedNameEn` | string | 메뉴명 영문 번역 |
| `data.resultList[].status` | `"DANGER"` \| `"NEEDS_CHECK"` | 알레르기 위험도 판정 |

**Error Responses**

| 상태 코드 | code | 설명 |
|---|---|---|
| `400` | `INVALID_IMAGE_OR_NOT_MENU` | 이미지가 없거나(`reason: NO_IMAGE_PROVIDED`), 메뉴판이 아니거나 인식 불가한 이미지(`reason: BLURRY_OR_NO_TEXT` 등) |

---

### 1.2 GET `/api/v1/menus/analyze/:sessionId/:menuId` — 메뉴 상세 분석 결과 조회

세션ID와 메뉴ID로, `POST /analyze` 때 저장된 메뉴 1건의 상세 분석 결과(충돌 알레르기, 재료 근거, 안내 문구 등)를 조회합니다. `sessionId`와 `menuId`를 함께 검사하므로, 다른 세션의 결과를 `menuId`만 추측해 조회할 수 없습니다.

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `sessionId` | string | `POST /analyze` 응답의 `sessionId` |
| `menuId` | number | `POST /analyze` 응답의 `resultList[].menuId` (정수, `ParseIntPipe` 검증) |

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "originalNameKo": "김치찌개",
    "translatedNameEn": "Kimchi Stew",
    "status": "DANGER",
    "conflictAllergies": ["돼지고기 (Pork)", "대두 (Soybean)"],
    "conflictDetails": [
      {
        "allergyLabel": "대두 (Soybean)",
        "ingredientNames": ["두부"]
      }
    ],
    "dataSource": "OFFICIAL",
    "noticeMessages": [
      "AI가 추정한 퓨전/신규 메뉴입니다. 매장에 원재료를 한 번 더 확인하세요.",
      "재료에 대한 알러지 정보를 AI로부터 가져왔습니다."
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `data.originalNameKo` | string | 메뉴 원문(한국어) |
| `data.translatedNameEn` | string | 메뉴명 영문 번역 |
| `data.status` | `"DANGER"` \| `"NEEDS_CHECK"` | 알레르기 위험도 판정 |
| `data.conflictAllergies` | string[] | 충돌한 알레르기 목록 (예: `"대두 (Soybean)"`, AI 추정 메뉴는 `" - AI 추정"` 접미 추가) |
| `data.conflictDetails` | `ConflictDetailDto[]` | 각 충돌 알레르기가 어떤 재료 때문인지 구조화한 목록 |
| `data.conflictDetails[].allergyLabel` | string | 알레르기 표시명 (예: `"대두 (Soybean)"`) |
| `data.conflictDetails[].ingredientNames` | string[] | 해당 알레르기를 유발한 재료명 목록 (예: `["두부"]`) |
| `data.dataSource` | `"OFFICIAL"` \| `"OWNER_VERIFIED"` \| `"AI_GENERATED"` | 메뉴 데이터 출처 |
| `data.noticeMessages` | string[] \| undefined | 사용자 안내 문구 (AI 추정 메뉴/재료 알레르기 AI 출처인 경우에만 포함, 배타적이지 않고 둘 다 붙을 수 있음) |

**Error Responses**

| 상태 코드 | code | 설명 |
|---|---|---|
| `404` | `ANALYSIS_RESULT_NOT_FOUND` | 세션ID/메뉴ID에 해당하는 분석 결과가 없는 경우 (`reason: "sessionId=..., menuId=..."`) |

---

## 2. 알레르기 API (`/api/v1/allergies`)

### 2.1 GET `/api/v1/allergies` — 식약처 22종 알레르기 표준 마스터 목록 조회

**Request**: 파라미터 없음

**Response `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "allergyId": 5,
      "code": "SOYBEAN",
      "nameKo": "대두",
      "nameEn": "Soybean"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `data[].allergyId` | number | 알레르기 ID (요청 시 `allergyIds`에 사용) |
| `data[].code` | string | 알레르기 코드 (예: `SOYBEAN`) |
| `data[].nameKo` | string | 알레르기명 (한국어) |
| `data[].nameEn` | string | 알레르기명 (영어) |

---

## 3. 데이터 모델 참고

### DataSource (표준 메뉴 데이터 출처)

| 값 | 설명 |
|---|---|
| `OFFICIAL` | 공식 레시피 데이터로 생성됨 |
| `OWNER_VERIFIED` | 매장 점주가 검증함 |
| `AI_GENERATED` | DB 매칭 실패 시 AI가 추정해 생성함 |

### MenuStatus (메뉴 알레르기 위험도 판정)

| 값 | 설명 |
|---|---|
| `DANGER` | 알레르기 유발 재료가 1개 이상 검출됨 |
| `NEEDS_CHECK` | 그 외 모든 경우 (확인 필요) |

---

## 4. 처리 파이프라인 개요 (POST /analyze 내부 흐름)

```
이미지 업로드
  → VisionAiService.analyzeMenuImage()      # 이미지 → 메뉴명(한/영) 추출, 메뉴판 여부 판별
  → MenuMatchingService.match()             # 메뉴명 → DB 표준 메뉴 매칭 (실패 시 AI로 신규 생성)
  → AllergyFilterService.filter()           # 메뉴 재료의 알레르기와 사용자 선택 알레르기 교차 검증
  → 상태 판정 (deriveMenuStatus)             # 충돌 있으면 DANGER, 없으면 NEEDS_CHECK
  → MenuAnalysisResult 테이블에 세션 단위로 저장
```
