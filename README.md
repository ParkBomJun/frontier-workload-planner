# Frontier Workload Planner

여러 작업 설명을 구조화된 워크로드 등급으로 바꾸고, 고정 규칙으로 모델·가격·예산에 매핑하는 도구입니다.

`main`은 공개 배포와 실제 GPT-5.6 검증을 마친 안정된 MVP입니다. 현재
`feature/best-fit-offerings` 브랜치는 체크포인트 7에서 승인된 Best-fit 입력·결과·복원 시계
기준 위에 체크포인트 8의 source-only LocalStorage v6와 route/resource 내보내기를 추가하며,
아직 production에 배포된 상태가 아닙니다.

- 공개 데모: <https://frontier-workload-planner.vercel.app>
- GitHub: <https://github.com/ParkBomJun/frontier-workload-planner>

> 작업 최대 8개 입력 → Mock 또는 서버 측 GPT-5.6 구조화 분석 → 공급자별 고정 비용 계산 → 예산 기반 모델 배분 → 저장·복원·내보내기

이 제품은 수학적 최적화를 주장하지 않으며 **Budget-aware recommended plan**이라는 표현을 사용합니다.

## 현재 feature 브랜치 기능

- 작업 1~8개 추가·삭제, High / Medium / Low 우선순위, 선택 날짜 기한, 실패 영향, 샘플 3개 불러오기
- 한국어·English·日本語 UI 선택과 별도 브라우저 언어 설정 저장
- 전체 예산, 1~90일 참고 기한, 비용 절감·균형·상위 tier 우선 전략
- 기본값이 Mock인 명시적 Mock/Live 모드
- `POST /api/analyze`의 서버 입력·본문 크기 제한
- OpenAI Responses API와 Zod Structured Outputs
- `best-fit-analysis-v2` 계약의 work mode, 최소 품질, 필수 기능, 상향 조건, 실패 가능성
- 기존 API 전용 예산을 자동 재해석하지 않는 명시적 총 증분 현금 예산 확인
- LocalStorage v6 raw source로 저장·복원하는 Available AI resources: ChatGPT-like, Copilot-like, GLM-like, Custom subscription
- 검증된 3×3 API 카탈로그 항목의 planning tier·표준 텍스트 가격만 수정하고, source를 저장하며, 삭제로 즉시 기본값 복원
- API 사용료, 구독 사용량, 신규 구독 약정액, 유료 초과 사용료를 분리한 Best-fit route 결과
- 예산·전략·우선순위·작업 기한·실패 영향·자원·override 변경 시 GPT 재호출 없는 즉시 재계산
- `gpt-5.6` 기본 모델, `low` reasoning, 출력 최대 3,000토큰
- 네트워크·SDK·스키마 실패를 합쳐 자동 재시도 최대 1회
- 고정 `xs / s / m / l / xl` 토큰 구간과 공급자별 공개 표준 텍스트 가격 기반 Low / Expected / High 계산
- OpenAI·Anthropic·Google 제품군의 가격 계획 비교와 선택 즉시 로컬 재계산
- 동일한 GPT tier를 공급자별 모델에 매핑하는 예산 휴리스틱이며 객관적 품질 순위나 “최고 모델”을 주장하지 않음
- 사용자 우선순위를 첫 기준으로 하는 등급 하향, 저예산 작업 보류, High 초과 경고
- 모델별 공식 입력·출력·컨텍스트 한도 검사, 호환 tier 재배정과 별도 실행 불가 상태
- 작업별 배분 카드, 가격·계산 가정, Expected 비용 막대그래프
- 최근 성공 시나리오 1개의 source-only v6 자동 저장·재해석 복원과 저장 기록 삭제
- 기존 API-only JSON v3·workload JSON v4와 별도인 Best-fit route/resource JSON v5 및 병렬 Markdown
- 로딩, 입력 오류, Live 설정 오류, API 오류, 성공 상태
- 손상된 LocalStorage와 클립보드·파일 생성 실패의 비차단 처리
- 반응형 단일 페이지

## 공급자 비교 범위

GPT-5.6은 계속 유일한 작업 분석 엔진입니다. Claude나 Gemini API는 호출하지 않습니다.
프로그램은 GPT가 반환한 작업 크기, 반복 횟수, 불확실성, 추천 tier를 그대로 두고 아래
모델·가격에 결정론적으로 투영합니다. 따라서 tier 대응은 예산 계획용 휴리스틱일 뿐 모델의
실제 품질, 성능, 지연시간 또는 적합성에 대한 객관적 순위가 아닙니다.

현재 feature 브랜치의 `Active`·적합 상태는 표준 API 가격, v2 최소 품질 tier,
Low / Expected / High 단일 호출 한도와 입력 예산만 적용한 비용 계획입니다. 카탈로그의
공급자 capability 정보는 아직 `unknown`이므로 `workMode`와 `requiredCapabilities` 지원은
검증하지 않으며, `Active`는 확인된 Offering 적격성을 뜻하지 않습니다. 기존
`api-analysis-v1` 계획에는 최소 품질 floor도 적용하지 않고 호출 한도만 검사합니다.

| 공급자 | Economy | Balanced | Frontier |
| --- | --- | --- | --- |
| OpenAI | GPT-5.6 Luna `$1 / $6` | GPT-5.6 Terra `$2.50 / $15` | GPT-5.6 Sol `$5 / $30` |
| Anthropic | Claude Haiku 4.5 `$1 / $5` | Claude Sonnet 5 `$2 / $10`¹ | Claude Fable 5 `$10 / $50` |
| Google | Gemini 3.1 Flash-Lite `$0.25 / $1.50` | Gemini 3 Flash `$0.50 / $3`² | Gemini 3.1 Pro `$2 / $12`²³ |

가격은 입력/출력 USD per 1M tokens이며 2026-07-17에 공식 문서로 확인했습니다.

1. Claude Sonnet 5 도입 가격은 2026-08-31까지이며 2026-09-01부터 `$3 / $15`입니다.
2. Gemini 3.1 Flash-Lite는 Stable이며 Gemini 3 Flash와 Gemini 3.1 Pro만 Preview입니다.
3. Gemini 3.1 Pro 가격은 prompt가 200K tokens 이하일 때만 적용됩니다. 200K 초과 공식
   `$4 / $18` 구간은 이 비교 계산에서 제외합니다.

모든 비교는 **standard uncached text** 가격만 사용합니다. 캐시 쓰기·할인, Batch/Flex 등
비표준 처리, 도구 호출 비용과 장문 구간 할증은 계산하지 않습니다. 결과는 실제 청구액이나
견적이 아니며, 각 공급자 API를 직접 실행해 측정한 결과도 아닙니다.

각 모델에는 2026-07-17에 공식 문서로 확인한 호출 한도를 별도로 기록합니다. OpenAI
GPT-5.6 3종은 1,050,000-token context와 128,000 max output, Claude Haiku 4.5는 200,000
context와 64,000 max output, Claude Sonnet 5·Fable 5는 1,000,000 context와 128,000 max
output을 사용합니다. Google 3종은 1,048,576 max input과 65,536 max output을 사용합니다.
제공자가 공개한 의미에 맞춰 input, output, combined limit를 구분하며 하나의 공통 context
필드로 추정하지 않습니다.

### 체크포인트 4 개발 경계

현재 화면의 공급자 비교는 검토된 호환성 기준으로 유지됩니다. 별도의 generalized API
계산 seam은 명시적인 `pricingAsOf`를 받아 Sonnet 5의 기간별 가격과 Gemini Pro의 200K
표준가격 조건을 먼저 확인합니다. 조건이 적용되지 않으면 제외된 장문 가격이나 오래된
가격으로 대체하지 않고 비용 없는 `conditional` 결과를 반환합니다. 공식 호출 한도 초과는
별도의 `ineligible` 결과입니다.

동일 seam은 기존 검증 카탈로그 항목의 planning tier와 표준 텍스트 입력·출력 가격에만
적용할 수 있는 `user-supplied` override 원본과 삭제 기반 기본값 복원을 제공합니다.
체크포인트 7의 편집 UI는 유지하면서 체크포인트 8에서 override source를 LocalStorage v6와
Best-fit JSON v5/Markdown에 별도로 기록합니다. 공식 기본값·출처·근거는 덮어쓰지 않으며
현재 JSON v3/v4 의미도 바뀌지 않습니다.

### 체크포인트 5 내부 엔진 경계

이 브랜치에는 구독 자원의 원본 계약과 계산 엔진이 내부 모듈로 추가되었습니다. 보유/신규
구독, 요청·크레딧·관측 잔여율·불투명 한도, reset, 누적 paid overage, 기존 비용 `$0`과
신규 plan-period fee 1회 계산을 서로 분리합니다. quota는 6자리 고정소수 microunit로
예약하며 저장된 잔여량을 직접 변경하지 않습니다. 같은 입력과 `planningAsOf`는 같은 결과를
내고, reset 경계를 넘으면 원본을 다시 resolve해야 합니다.

관측값·보정값·불투명 한도와 검증되지 않은 preset/connector는 확정 실행 경로가 아닙니다.
조건부 제안에는 work surface·최소 품질·capability·호출 한도를 모두 확인한 API fallback이
필요하며, 가격만 존재한다고 호환된 것으로 처리하지 않습니다. 현재 카탈로그에는 구독의
공식 consumption/initial-capacity/overage claim과 완전한 API access/capability claim이 없고
인증된 connector evidence issuer도 없으므로, 테스트를 위해 확정 경로를 꾸며내지 않습니다.

ChatGPT-like, GitHub Copilot-like, GLM-like, Custom subscription preset은 숫자·가격·공식
증거를 포함하지 않는 입력 힌트뿐입니다. 웹페이지에서 source draft로 입력하고 조건부 근거
상태를 볼 수 있으며, 체크포인트 8은 이 raw source와 독립된 관측 시각을 LocalStorage v6와
route/resource export에 포함합니다. 저장되었다는 사실은 권위를 부여하지 않습니다.
전체 Best-fit route 선택, 신규 구독 활성화 비교, incremental-cash budget의
active/held/infeasible 판정은 체크포인트 6 엔진을 사용합니다. 현재 실제 preset과 catalog에는
확정 subscription 경로를 만들 공식 claim이 없으므로 production 계산은 이를 조건부·제외로
유지합니다. 공개 production URL은 여전히 기존 안정된 `main`의 API 비교 흐름입니다.

### 체크포인트 7 UI 경계

새 Best-fit 결과는 확인된 이용 경로를 모델명보다 먼저 표시하고 Expected 총 증분 현금,
API 지출, 신규 구독 약정, 유료 초과 사용, 구독 native-unit 사용량을 분리합니다. 현재 공식
카탈로그에는 완전한 API access/capability claim이 없고 사용자 구독 입력도 공식 증거가
아니므로, 화면은 실행 경로를 꾸며내지 않고 조건부·제외·실행 불가 상태를 그대로 보여줍니다.
기존 3개 공급자 가격·호출 한도 결과는 별도의 `API 가격 호환성 보기`로 유지됩니다.
이 호환성 보기는 검증된 기본 가격만 사용하며, 저장된 사용자 수정값은 Best-fit 계산에만
적용된다는 범위를 화면에 명시합니다. 자원 표시 이름을 바꿔도 quota/reset 관측 시각은
갱신하지 않고, 가용성·요금·quota·reset·사용 환경의 근거 시각을 각각 유지합니다.
미래 발효 override는 적용 중으로 저장하지 않고 거부하며, 전역 참고 기한만 바꿔서는
Best-fit 계산 시각이 이동하지 않습니다. 구독 작업 카드의 현금 범위는 예약 순서에 따른
한계 귀속값이고 계획 전체 현금 ledger가 최종 권위값임을 별도로 표시합니다.

이 입력·결과·복원 시계 동작은 체크포인트 7의 승인 기준입니다. 당시 자원과 override를
LocalStorage v5 및 export에서 제외했던 경계는 체크포인트 8이 source-only v6와 별도
route/resource JSON v5/Markdown을 함께 도입하면서 확장합니다. 파생 경로와 ledger는 여전히
저장하지 않습니다.

### 체크포인트 8 저장·내보내기 경계

LocalStorage v6은 `best-fit-source-state-v1` 아래에 버전된 resource draft source, 가용성·약정·
quota·reset·Offering surface별 관측 시각, 사용자 catalog override source를 저장합니다. v1~v5는 각
버전의 고정 parser를 거쳐 순차 migration하며, 모든 v1~v5 기록에는 빈 Best-fit source 상태를
추가합니다. legacy analysis snapshot과 명시적 예산 확인은 그대로 보존합니다.

복원은 source reference와 user observation만 받아 현재 `planningAsOf`에서 authority를 다시
해석하고 모든 route, quota, commitment, paid-overage, Premium baseline ledger를 다시 계산합니다.
`savedAt`은 계산 시각이 아니며, 복원 시각·분석 시각·예산 확인 시각·관측/override 시각의 최신값을
사용합니다. 알 수 없는 과거 reference는 source를 보존하되 dependent fact와 경로를
unknown/conditional로 만듭니다. 미해결 override는 계산에 적용하지 않고 UI에서
`미해결 · 적용되지 않음`으로 표시하며, 현재 기본값 복원과 구분된 source 삭제로 제거할 수
있습니다. 복원은 `/api/analyze`를 호출하지 않습니다.

Best-fit JSON v5와 병렬 Markdown은 task route와 fallback, 활성화 resource, API cash, native-unit
subscription usage, commitment, paid overage, 두 as-of, Premium baseline, 부호 있는 현금 차이,
source state를 allowlist로 내보냅니다. 해결된 Offering/resource/catalog 증거는
`purpose: audit-only`, `importAuthority: false`인 감사 snapshot일 뿐이며 저장 또는 import 권위로
되돌릴 수 없습니다. 공식 default와 provider evidence는 immutable audit 값으로, 사용자
override는 별도 source로 표시합니다.

릴리스 데모는 다음 여섯 항목을 같은 진실성 경계로 확인합니다.

| 데모 | 증명할 동작 | 공개 claim 경계 |
| --- | --- | --- |
| Chat subscription | test-only normalized allocator fixture가 native quota를 먼저 사용하는 분기 | UI에 불러온 계정처럼 보이지 않게 분리하며 실제 preset은 conditional 상태를 유지 |
| Coding route | coding-agent surface와 canonical fallback route | preset 이름만으로 tool/access 기능을 확정하지 않음 |
| Batch API | `batch` work surface의 API 경로 | 할인된 provider Batch 가격을 사용한다는 뜻이 아님 |
| Selective Premium | 닫힌 trigger가 있는 작업만 Premium 검토 | 전 작업 최고 tier 또는 품질 순위가 아님 |
| Held work | Expected 증분 현금 예산에 따른 보류 | infeasible과 구분 |
| Avoided spend | 호환 가능한 Premium API counterfactual과 부호 있는 차이 | 실현 절감액이나 성능 우위 주장이 아님 |

## 로컬 실행

Node.js 20.9 이상이 필요합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. Mock 모드는 환경 변수 없이 작동합니다.

Live 모드를 시험할 때만 `.env.local`에 직접 값을 넣습니다. 키를 채팅, 클라이언트 코드, 커밋에 붙여넣지 마세요.

```dotenv
OPENAI_API_KEY=your_server_only_key
OPENAI_ANALYSIS_MODEL=gpt-5.6
ENABLE_LIVE_ANALYSIS=true
```

`OPENAI_API_KEY`에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. Live 모드는 UI 버튼을 눌렀을 때만 호출되며, 서버 설정이 꺼져 있거나 키가 없어도 Mock 모드는 계속 사용할 수 있습니다.

## 최근 시나리오와 내보내기

성공한 최신 계획 하나만 현재 브라우저의 LocalStorage에 평문으로 자동 저장하며, 이 사실을 첫 제출 전에 화면에 표시합니다. 새로고침하면 API를 다시 호출하지 않고 작업·설정·선택 공급자·버전된 분석 snapshot과 raw Best-fit source를 검증해 복원한 뒤 현재 resolver와 catalog로 계획을 다시 계산합니다. 저장 형식 v6은 `legacy-api-only`와 `best-fit-analysis-v2`를 구분하고 기존 예산을 `legacy-api-only-unconfirmed`로 보존하며, resource source와 override source를 각각 버전합니다. 사용자가 명시적으로 확인해야만 같은 금액이 총 증분 현금 예산이 됩니다. 독립된 고정 parser로 확인한 v1→v2→v3→v4→v5→v6 순차 migration만 수행하며, v1~v5에는 빈 Best-fit source 상태를 추가하고 기존 GPT 필드를 만들거나 바꾸지 않습니다. 유효한 과거 기록의 변환·검증·rewrite가 실패하면 원본 bytes를 보존하고, 알 수 없는 미래 버전도 그대로 둡니다.

분석이 끝난 뒤 예산·전략·우선순위·자원·override를 바꾸면 저장된 GPT 분류를 그대로 사용해 브라우저에서 즉시 다시 배분하고 source를 갱신합니다. 예산을 늘리면 보류 작업도 API 재호출 없이 다시 실행 대상으로 검토됩니다. 자원·override를 복원해도 과거 파생 route나 resolved evidence를 신뢰하지 않고 현재 계산 시각에서 다시 해석합니다.

작업명·설명, resource draft와 사용자 observation/override source는 브라우저 저장소에 평문으로 남습니다. 결과 안내에서 저장 기록을 직접 삭제할 수 있으며, 삭제 뒤에는 새 분석을 성공시키기 전까지 설정·공급자 변경만으로 기록이 다시 생기지 않습니다. API 키, 서버 환경 변수, 원본 provider 오류, 숨겨진 프롬프트, resolver-issued authority, connector receipt는 저장하지 않습니다.

Markdown 복사와 JSON 내보내기는 현재 화면의 설정과 재계산 결과를 사용합니다. Markdown의 설명 문구는 선택한 UI 언어를 따르며 JSON machine key와 enum은 번역하지 않습니다. 기존 `api-analysis-v1` JSON v3와 workload JSON v4 의미는 그대로 유지하고, Best-fit route/resource 결과는 JSON v5와 병렬 Markdown으로 내보냅니다. v5의 `input.sourceState`만 복원 가능한 source이며 `audit`의 resolved snapshot은 감사 전용입니다. 모든 형식은 작업 설명을 포함하고 v5는 자원·override source도 포함하므로 클립보드나 파일을 공유하기 전에 내용을 확인하세요.

UI 언어는 시나리오와 분리된 `frontier-workload-planner:locale` 키에 저장됩니다. 언어를 바꾸면 화면과 사람용 Markdown은 즉시 바뀌지만 분석 API를 다시 호출하거나 사용자가 입력한 문장, 기존 GPT rationale·riskFactors를 자동 번역하지는 않습니다. 모델명, API, JSON, USD, tier, Low / Expected / High처럼 원어가 정확한 기술 용어는 유지합니다.

## 검증 명령

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## API 계약

UI와 API 모두 한 요청에 1~8개 작업을 전송합니다.

```json
{
  "mode": "mock",
  "tasks": [
    {
      "id": "task-1",
      "name": "API 오류 처리 구현",
      "description": "입력 검증과 사용자 오류 상태를 구현한다.",
      "priority": "high",
      "deadlineDate": "2026-07-21",
      "failureImpact": "high"
    }
  ]
}
```

성공 응답의 analysis document는 `contractVersion: best-fit-analysis-v2`를 포함합니다. 각 작업은 기존 분류 필드와 함께 `workMode`, 별도 hard floor인 `requiredQualityTier`, 닫힌 `requiredCapabilities`, `upgradeConditions`, `failureRisk`를 반환합니다. GPT는 비용, quota, 공급자, Offering, 최종 route 또는 최종 토큰 숫자를 반환하지 않습니다.

크기 구간은 반복 1회당 전체 billable input/output을 뜻합니다. 프로그램은 먼저 Low / Expected / High 각각의 1회 호출이 모델의 입력·출력·통합 한도를 모두 만족하는지 검사합니다. 토큰을 자르거나 작업을 자동 분할하지 않으며, 세 시나리오를 모두 지원하는 모델만 후보가 됩니다. 호환 상위 tier가 있으면 재배정하고, 어느 tier도 호환되지 않으면 예산 보류와 구분된 `infeasible` 상태로 표시합니다. 그 뒤 같은 GPT 분류의 구간과 반복 수를 토큰 합계로 변환하고 선택 공급자의 standard uncached text 가격을 적용합니다. 캐시, Batch, 도구 호출비와 장문 할증은 제외합니다. 예산 비교는 Expected 비용 기준입니다. 등급 하향과 작업 보류는 사용자 우선순위를 첫 기준으로 하며, 보류 및 실행 불가 작업은 비용 합계에서 제외됩니다. High는 실행 작업의 초과 위험만 알립니다. 자세한 카탈로그, 밴드, 수식과 배분 순서는 [SPEC.md](./SPEC.md)에 고정되어 있습니다.

API Route Handler는 `Content-Length`만 신뢰하지 않고 실제 본문 스트림을 읽으면서 96KiB를 넘는 즉시 취소합니다. 초과 본문은 `413 REQUEST_TOO_LARGE`, 읽기 실패와 잘못된 JSON은 원시 오류를 노출하지 않는 `400 INVALID_JSON` 계약으로 처리합니다.

## 배포

공개 production <https://frontier-workload-planner.vercel.app>은 안정된 `main` 버전입니다. 이 문서의 Ver3 변경은 `feature/best-fit-offerings` 브랜치 범위이며 검증·병합·재배포 전까지 공개 URL에서 제공된다고 간주하지 않습니다. 인증이나 호출별 rate limit이 없는 현재 MVP에서 OpenAI 비용이 노출되지 않도록 Vercel에는 API 키를 등록하지 않았고 `ENABLE_LIVE_ANALYSIS=false`를 유지합니다. 공개 Mock 전체 흐름은 정상 작동하며 Live 요청은 `403 LIVE_ANALYSIS_DISABLED`로 차단됩니다.

기존 API 분석 계약은 서버 전용 키를 사용해 로컬에서 한 번 실제 검증했으며 `gpt-5.6-sol` 응답을 확인했습니다. 이번 `best-fit-analysis-v2` Structured Output은 Mock·스키마·build 검증 뒤 별도의 실제 Live 1회 재검증이 필요합니다. 공개 환경의 Live는 계속 비활성화합니다.

## 문서

- [SPEC.md](./SPEC.md): 범위, 계약, 책임 경계, 한계
- [TASKS.md](./TASKS.md): 체크포인트별 작업과 후속 작업
- [DECISIONS.md](./DECISIONS.md): 구현 결정 기록
- [DEVPOST.md](./DEVPOST.md): 제목·문제·해결책 제출 초안
- [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md): 진실성 경계를 포함한 체크포인트 8 데모 영상 스크립트
- [OpenAI GPT-5.6 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API 마이그레이션 가이드](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Anthropic 가격](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic 모델 목록](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Gemini API 가격](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 모델 상태와 한도](https://ai.google.dev/gemini-api/docs/models)

## 라이선스

[MIT](./LICENSE)
