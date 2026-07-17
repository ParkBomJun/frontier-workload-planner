# Frontier Workload Planner

여러 작업 설명을 구조화된 워크로드 등급으로 바꾸고, 고정 규칙으로 모델·가격·예산에 매핑하는 도구입니다.

현재 구현은 체크포인트 3 출시 후보입니다.

> 작업 최대 8개 입력 → Mock 또는 서버 측 GPT-5.6 구조화 분석 → 고정 비용 계산 → 예산 기반 모델 배분 → 저장·복원·내보내기

이 제품은 수학적 최적화를 주장하지 않으며 **Budget-aware recommended plan**이라는 표현을 사용합니다.

## 현재 기능

- 작업 1~8개 추가·삭제, 샘플 3개 불러오기
- 전체 예산, 1~90일 참고 기한, 비용 절감·균형·품질 우선 전략
- 기본값이 Mock인 명시적 Mock/Live 모드
- `POST /api/analyze`의 서버 입력·본문 크기 제한
- OpenAI Responses API와 Zod Structured Outputs
- `gpt-5.6` 기본 모델, `low` reasoning, 출력 최대 3,000토큰
- 네트워크·SDK·스키마 실패를 합쳐 자동 재시도 최대 1회
- 고정 `xs / s / m / l / xl` 토큰 구간과 공개 가격 기반 Low / Expected / High 계산
- Expected 예산에 맞춘 설명 가능한 등급 하향과 High 초과 경고
- 작업별 배분 카드, 가격·계산 가정, Expected 비용 막대그래프
- 최근 성공 시나리오 1개 자동 저장·복원과 저장 기록 삭제
- Markdown 클립보드 복사와 버전 1 JSON 내보내기
- 로딩, 입력 오류, Live 설정 오류, API 오류, 성공 상태
- 손상된 LocalStorage와 클립보드·파일 생성 실패의 비차단 처리
- 반응형 단일 페이지

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

성공한 최신 계획 하나만 현재 브라우저의 LocalStorage에 저장합니다. 새로고침하면 API를 다시 호출하지 않고 작업·설정·분석을 검증해 복원한 뒤, 현재 가격표로 비용 계획을 다시 계산합니다. 손상된 현재 버전은 무시하며 알 수 없는 미래 버전은 보존합니다.

작업명과 설명은 브라우저 저장소에 평문으로 남습니다. 결과 안내에서 저장 기록을 직접 삭제할 수 있으며, 삭제 뒤에는 새 분석을 성공시키기 전까지 설정 변경만으로 기록이 다시 생기지 않습니다. API 키, 서버 환경 변수, 원본 provider 오류와 숨겨진 프롬프트는 저장하지 않습니다.

Markdown 복사와 JSON 내보내기는 현재 화면의 설정과 재계산 결과를 사용합니다. 두 형식 모두 작업 설명을 포함하므로 클립보드나 파일을 공유하기 전에 내용을 확인하세요.

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
      "description": "입력 검증과 사용자 오류 상태를 구현한다."
    }
  ]
}
```

성공 응답은 각 작업에 `taskType`, `complexity`, `reasoningDepth`, `expectedIterations`, 입력·출력 크기 구간, `uncertainty`, `recommendedModelTier`, 최대 3개 `riskFactors`, 짧은 `rationale`을 반환합니다. GPT는 비용이나 최종 토큰 숫자를 반환하지 않습니다.

크기 구간은 반복 1회당 전체 billable input/output을 뜻합니다. 프로그램이 구간과 반복 수를 토큰 합계로 변환하고 [공식 표준 가격](https://developers.openai.com/api/docs/pricing)을 적용합니다. 예산 비교는 Expected 비용 기준이며 High는 초과 위험만 알립니다. 자세한 밴드, 수식, 배분 우선순위는 [SPEC.md](./SPEC.md)에 고정되어 있습니다.

## 배포

Vercel에 저장소를 연결한 뒤 위 세 환경 변수를 서버 환경에 설정합니다. 공개 배포에서 Live 비용을 허용하기 전까지 `ENABLE_LIVE_ANALYSIS=false`를 유지하는 것이 기본 정책입니다.

## 문서

- [SPEC.md](./SPEC.md): 범위, 계약, 책임 경계, 한계
- [TASKS.md](./TASKS.md): 체크포인트별 작업과 후속 작업
- [DECISIONS.md](./DECISIONS.md): 구현 결정 기록
- [OpenAI GPT-5.6 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API 마이그레이션 가이드](https://developers.openai.com/api/docs/guides/migrate-to-responses)

## 라이선스

[MIT](./LICENSE)
