# Frontier Workload Planner

작업 설명을 구조화된 워크로드 등급으로 바꾸고, 이후의 결정론적 계산 엔진이 모델·가격·예산에 매핑할 수 있게 만드는 도구입니다.

현재 구현은 P0 최소 수직 흐름입니다.

> 작업 1개 입력 → 서버 Route Handler → Mock 또는 GPT-5.6 Structured Output → 결과 표시

비용 계산, 그래프, LocalStorage, 내보내기, 완성형 대시보드는 아직 구현하지 않았습니다. 이 제품은 수학적 최적화를 주장하지 않으며 최종 표현은 **Budget-aware recommended plan**을 사용합니다.

## 현재 기능

- 작업명과 설명 입력, 샘플 불러오기
- 기본값이 Mock인 명시적 Mock/Live 모드
- `POST /api/analyze`의 서버 입력·본문 크기 제한
- OpenAI Responses API와 Zod Structured Outputs
- `gpt-5.6` 기본 모델, `low` reasoning, 출력 최대 3,000토큰
- 네트워크·SDK·스키마 실패를 합쳐 자동 재시도 최대 1회
- 로딩, 입력 오류, Live 설정 오류, API 오류, 성공 상태
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

## 검증 명령

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## API 계약

요청은 1~8개 작업을 받을 수 있지만 P0 UI는 한 작업만 전송합니다.

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

## 배포

Vercel에 저장소를 연결한 뒤 위 세 환경 변수를 서버 환경에 설정합니다. 공개 배포에서 Live 비용을 허용하기 전까지 `ENABLE_LIVE_ANALYSIS=false`를 유지하는 것이 기본 정책입니다.

## 문서

- [SPEC.md](./SPEC.md): 범위, 계약, 책임 경계, 한계
- [TASKS.md](./TASKS.md): P0 체크리스트와 후속 작업
- [DECISIONS.md](./DECISIONS.md): 첫 구현 결정 기록
- [OpenAI GPT-5.6 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API 마이그레이션 가이드](https://developers.openai.com/api/docs/guides/migrate-to-responses)

## 라이선스

[MIT](./LICENSE)
