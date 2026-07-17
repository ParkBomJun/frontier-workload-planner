# Frontier Workload Planner

여러 작업 설명을 구조화된 워크로드 등급으로 바꾸고, 고정 규칙으로 모델·가격·예산에 매핑하는 도구입니다.

`main`은 공개 배포와 실제 GPT-5.6 검증을 마친 안정된 MVP입니다. 현재
`feature/provider-comparison` 브랜치는 같은 GPT 분석 결과를 세 공급자의 공개 가격표에
투영하는 제한적 비교 기능을 준비하며, 아직 production에 배포된 상태가 아닙니다.

- 공개 데모: <https://frontier-workload-planner.vercel.app>
- GitHub: <https://github.com/ParkBomJun/frontier-workload-planner>

> 작업 최대 8개 입력 → Mock 또는 서버 측 GPT-5.6 구조화 분석 → 공급자별 고정 비용 계산 → 예산 기반 모델 배분 → 저장·복원·내보내기

이 제품은 수학적 최적화를 주장하지 않으며 **Budget-aware recommended plan**이라는 표현을 사용합니다.

## 현재 feature 브랜치 기능

- 작업 1~8개 추가·삭제, High / Medium / Low 우선순위, 샘플 3개 불러오기
- 한국어·English·日本語 UI 선택과 별도 브라우저 언어 설정 저장
- 전체 예산, 1~90일 참고 기한, 비용 절감·균형·상위 tier 우선 전략
- 기본값이 Mock인 명시적 Mock/Live 모드
- `POST /api/analyze`의 서버 입력·본문 크기 제한
- OpenAI Responses API와 Zod Structured Outputs
- `gpt-5.6` 기본 모델, `low` reasoning, 출력 최대 3,000토큰
- 네트워크·SDK·스키마 실패를 합쳐 자동 재시도 최대 1회
- 고정 `xs / s / m / l / xl` 토큰 구간과 공급자별 공개 표준 텍스트 가격 기반 Low / Expected / High 계산
- OpenAI·Anthropic·Google 제품군의 가격 계획 비교와 선택 즉시 로컬 재계산
- 동일한 GPT tier를 공급자별 모델에 매핑하는 예산 휴리스틱이며 객관적 품질 순위나 “최고 모델”을 주장하지 않음
- 사용자 우선순위를 첫 기준으로 하는 등급 하향, 저예산 작업 보류, High 초과 경고
- 작업별 배분 카드, 가격·계산 가정, Expected 비용 막대그래프
- 최근 성공 시나리오 1개 자동 저장·복원과 저장 기록 삭제
- 선택 공급자, 3개 공급자 요약, 우선순위와 실행/보류 상태를 포함한 Markdown 복사와 버전 3 JSON 내보내기
- 로딩, 입력 오류, Live 설정 오류, API 오류, 성공 상태
- 손상된 LocalStorage와 클립보드·파일 생성 실패의 비차단 처리
- 반응형 단일 페이지

## 공급자 비교 범위

GPT-5.6은 계속 유일한 작업 분석 엔진입니다. Claude나 Gemini API는 호출하지 않습니다.
프로그램은 GPT가 반환한 작업 크기, 반복 횟수, 불확실성, 추천 tier를 그대로 두고 아래
모델·가격에 결정론적으로 투영합니다. 따라서 tier 대응은 예산 계획용 휴리스틱일 뿐 모델의
실제 품질, 성능, 지연시간 또는 적합성에 대한 객관적 순위가 아닙니다.

| 공급자 | Economy | Balanced | Frontier |
| --- | --- | --- | --- |
| OpenAI | GPT-5.6 Luna `$1 / $6` | GPT-5.6 Terra `$2.50 / $15` | GPT-5.6 Sol `$5 / $30` |
| Anthropic | Claude Haiku 4.5 `$1 / $5` | Claude Sonnet 5 `$2 / $10`¹ | Claude Fable 5 `$10 / $50` |
| Google | Gemini 3.1 Flash-Lite `$0.25 / $1.50`² | Gemini 3 Flash `$0.50 / $3`² | Gemini 3.1 Pro `$2 / $12`²³ |

가격은 입력/출력 USD per 1M tokens이며 2026-07-17에 공식 문서로 확인했습니다.

1. Claude Sonnet 5 도입 가격은 2026-08-31까지이며 2026-09-01부터 `$3 / $15`입니다.
2. Gemini 3 제품군은 현재 preview입니다.
3. Gemini 3.1 Pro 가격은 prompt가 200K tokens 이하일 때만 적용됩니다. 200K 초과 공식
   `$4 / $18` 구간은 이 비교 계산에서 제외합니다.

모든 비교는 **standard uncached text** 가격만 사용합니다. 캐시 쓰기·할인, Batch/Flex 등
비표준 처리, 도구 호출 비용과 장문 구간 할증은 계산하지 않습니다. 결과는 실제 청구액이나
견적이 아니며, 각 공급자 API를 직접 실행해 측정한 결과도 아닙니다.

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

성공한 최신 계획 하나만 현재 브라우저의 LocalStorage에 평문으로 자동 저장하며, 이 사실을 첫 제출 전에 화면에 표시합니다. 새로고침하면 API를 다시 호출하지 않고 작업·우선순위·설정·선택 공급자·분석을 검증해 복원한 뒤, 현재 카탈로그로 세 공급자 계획을 다시 계산합니다. 저장 형식 v3은 선택 공급자를 추가합니다. 유효한 v1은 모든 작업에 Medium 우선순위를, v1과 v2는 선택 공급자에 OpenAI를 지정해 v3으로 마이그레이션합니다. 손상된 현재 버전은 무시하며 알 수 없는 미래 버전은 보존합니다.

분석이 끝난 뒤 예산·전략·우선순위를 바꾸면 저장된 GPT 분류를 그대로 사용해 브라우저에서 즉시 다시 배분합니다. 예산을 늘리면 보류 작업도 API 재호출 없이 다시 실행 대상으로 검토됩니다.

작업명과 설명은 브라우저 저장소에 평문으로 남습니다. 결과 안내에서 저장 기록을 직접 삭제할 수 있으며, 삭제 뒤에는 새 분석을 성공시키기 전까지 설정·공급자 변경만으로 기록이 다시 생기지 않습니다. API 키, 서버 환경 변수, 원본 provider 오류와 숨겨진 프롬프트는 저장하지 않습니다.

Markdown 복사와 JSON 내보내기는 현재 화면의 설정과 재계산 결과를 사용합니다. Markdown의 설명 문구는 선택한 UI 언어를 따르며 JSON v3의 machine key와 enum은 번역하지 않습니다. 두 형식 모두 작업 설명을 포함하므로 클립보드나 파일을 공유하기 전에 내용을 확인하세요.

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
      "priority": "high"
    }
  ]
}
```

성공 응답은 각 작업에 `taskType`, `complexity`, `reasoningDepth`, `expectedIterations`, 입력·출력 크기 구간, `uncertainty`, `recommendedModelTier`, 최대 3개 `riskFactors`, 짧은 `rationale`을 반환합니다. GPT는 비용이나 최종 토큰 숫자를 반환하지 않습니다.

크기 구간은 반복 1회당 전체 billable input/output을 뜻합니다. 프로그램이 같은 GPT 분류의 구간과 반복 수를 토큰 합계로 변환한 뒤 선택 공급자의 standard uncached text 가격을 적용합니다. 캐시, Batch, 도구 호출비와 장문 할증은 제외합니다. 예산 비교는 Expected 비용 기준입니다. 등급 하향과 작업 보류는 사용자 우선순위를 첫 기준으로 하며, 보류 작업은 비용 합계에서 제외됩니다. High는 실행 작업의 초과 위험만 알립니다. 자세한 카탈로그, 밴드, 수식과 배분 순서는 [SPEC.md](./SPEC.md)에 고정되어 있습니다.

API Route Handler는 `Content-Length`만 신뢰하지 않고 실제 본문 스트림을 읽으면서 96KiB를 넘는 즉시 취소합니다. 초과 본문은 `413 REQUEST_TOO_LARGE`, 읽기 실패와 잘못된 JSON은 원시 오류를 노출하지 않는 `400 INVALID_JSON` 계약으로 처리합니다.

## 배포

공개 production <https://frontier-workload-planner.vercel.app>은 안정된 `main` 버전입니다. 이 문서의 공급자 비교 기능은 `feature/provider-comparison` 브랜치 범위이며 검증·병합·재배포 전까지 공개 URL에서 제공된다고 간주하지 않습니다. 인증이나 호출별 rate limit이 없는 현재 MVP에서 OpenAI 비용이 노출되지 않도록 Vercel에는 API 키를 등록하지 않았고 `ENABLE_LIVE_ANALYSIS=false`를 유지합니다. 공개 Mock 전체 흐름은 정상 작동하며 Live 요청은 `403 LIVE_ANALYSIS_DISABLED`로 차단됩니다.

실제 GPT-5.6 Structured Output은 서버 전용 키를 사용해 로컬에서 한 번 검증했으며 `gpt-5.6-sol` 응답과 스키마 검증을 확인한 뒤 로컬 Live 설정도 다시 비활성화했습니다. 현재 production 배포는 Vercel CLI로 만들었고, GitHub push 기반 자동 배포 연결은 Vercel 계정의 GitHub Login Connection을 추가한 뒤 설정할 수 있습니다.

## 문서

- [SPEC.md](./SPEC.md): 범위, 계약, 책임 경계, 한계
- [TASKS.md](./TASKS.md): 체크포인트별 작업과 후속 작업
- [DECISIONS.md](./DECISIONS.md): 구현 결정 기록
- [DEVPOST.md](./DEVPOST.md): 제목·문제·해결책 제출 초안
- [OpenAI GPT-5.6 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API 마이그레이션 가이드](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Anthropic 가격](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic 모델 목록](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Gemini API 가격](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 3 개발자 가이드](https://ai.google.dev/gemini-api/docs/gemini-3)

## 라이선스

[MIT](./LICENSE)
