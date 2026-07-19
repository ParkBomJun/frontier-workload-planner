# Nothing More production QA 보고서

- 검증일: 2026-07-19 (KST)
- 공개 URL: <https://frontier-workload-planner.vercel.app>
- 결함을 발견한 기준 production 커밋: `235732bafd53c40fe9f4eaa7989cb64ef757a8ef`
- 기준 병합: [PR #2](https://github.com/ParkBomJun/frontier-workload-planner/pull/2)
- 최종 수정 릴리스: 이 보고서가 포함된 `main` 커밋을 Vercel `sourceCommitSha`와 대조

이 문서는 위 기준 배포본을 실제 사용자 흐름으로 점검하고, 발견된 위험을 이 보고서가 포함된
최종 릴리스에서 어떻게 처리했는지 기록합니다. 비밀값, 개인 작업 내용, 계정 식별자, 로컬
경로는 기록하지 않았습니다.

## 결론

- P0: 0건
- 처리한 P1: 3건
  - 일본어 320px 화면의 오른쪽 잘림
  - 실제 배포가 끝난 뒤에도 남아 있던 “아직 미배포” 문서 문구
  - 최종 배포 SHA를 호스팅 메타데이터로 입증하지 못하던 증거 공백
- 처리한 P2: 1건
  - 넓은 Node.js 버전 범위 때문에 Vercel 런타임이 자동으로 다음 메이저로 상승하던 재현성 위험
- 제출 차단 기능 오류: 없음
- 사용자에게 남은 작업: 보호된 GPT-5.6 Live 1회 검증, 영상, Devpost와 자격·신원 확인

## 공개 데스크톱 흐름

깨끗한 Chromium 컨텍스트와 영어 1440×1000 화면에서 다음을 순서대로 확인했습니다.

| 단계 | 결과 |
| --- | --- |
| 초기 화면과 언어 전환 | 제품명·영문 설명·Live 비활성화 안내 정상 |
| 샘플 3개 불러오기 | 작업명과 설명 3개 정상 입력 |
| 예산 의미 확인 | 확인 상태 표시, 분석 전 시나리오 저장 없음 |
| 샘플 계획 만들기 | 3개 작업 모두 계획됨, 대기·미일치 0건 |
| 자동·수동 복원 | 작업과 결과 복원, 저장 문자열 불필요한 재작성 없음 |
| Markdown 복사 | 세 작업 포함, 네트워크 요청 없음 |
| JSON 내보내기 | schema 6, `best-fit-route-plan`, 세 작업 포함 |
| 저장본 삭제 | 최근 시나리오 키 삭제, 새로고침 뒤 빈 결과 화면 |

전체 흐름에서 console error, page error, 실패한 요청, HTTP 4xx/5xx, 가로 overflow는
각각 0건이었습니다. 샘플 실행은 `/api/analyze`를 호출하지 않았고 외부 도메인 요청도
발생하지 않았습니다.

내보낸 JSON은 `Nothing More`, 입력 작업 3개, 분석과 계산의 분리된 구조를 포함했습니다.
API 키 패턴, 환경 변수명에 연결된 값, 로컬 경로, `file://` 주소는 발견되지 않았습니다.
검사용 임시 JSON은 구조 확인 직후 삭제했습니다.

## 모바일·다국어 흐름

### 수정 전 공개 production 실측

결함을 발견한 기준 production에서 샘플 3개 전체 흐름을 다음 화면으로 실행했습니다.

| 환경 | 결과 | 오류 |
| --- | --- | ---: |
| English 390×844 | 정상, 가로 잘림 없음 | 0 |
| 한국어 320×720 | 정상, 가로 잘림 없음 | 0 |
| 日本語 320×720 | 결과는 생성됐으나 입력 폼 오른쪽 약 102px가 숨겨지는 P1 발견 | 0 |

일본어에서는 3단계 안전 안내문의 `break-keep`이 360px짜리 최소 콘텐츠 폭을 만들고,
카드의 좌우 여백과 테두리가 더해져 암시적 `auto` grid 열을 402px까지 밀었습니다. 상위
`main`은 `overflow-x:hidden`이므로 삭제 버튼과 입력란 일부를 스크롤해서 볼 수도 없었습니다.

### 수정 후 local production build

처리 내용:

- 일본어의 긴 문구가 min-content 계산에도 안전하게 줄바꿈되도록
  `overflow-wrap:anywhere`를 적용했습니다.
- 바깥 계획 폼과 3단계 내부 grid의 기본 열을 `minmax(0,1fr)`로 고정했습니다.
- 3단계의 두 grid item에 `min-width:0`을 적용하고 안전 안내문에서 `break-keep`을 제거했습니다.
- 위 두 레이아웃 계약을 고정하는 회귀 테스트를 추가했습니다.
- 실제 Chromium 320px에서 초기 화면, 샘플 3개 입력, 결과 화면을 다시 측정했습니다.
  세 단계 모두 `main=320px`, `form=280px`, console error 0건으로 통과했습니다.

모달은 320px 화면 안에 들어왔고 닫은 뒤 예산 확인 버튼으로 초점이 돌아왔습니다. 완료
토스트도 세 언어에서 잘리지 않았으며 `role=status`, `aria-live=polite`, 접근 가능한 닫기
이름을 유지했습니다.

이 보고서가 포함된 최종 배포에서도 일본어 320px 샘플·결과 흐름과 공개 URL geometry를
다시 확인하며, 이 검사가 통과하지 않으면 릴리스 완료로 간주하지 않습니다.

## 공개 Live·개인정보·보안 경계

- production의 `ENABLE_LIVE_ANALYSIS`는 정확히 `false`입니다.
- production에 `OPENAI_API_KEY`는 존재하지 않습니다. 값은 조회하거나 기록하지 않았습니다.
- Git에서 제외된 로컬 환경 파일의 설정값은 값 자체를 출력하지 않는 sentinel 검사로
  확인했으며, Git 추적 파일과 `.next/static`·`.next/server` production 빌드에서 일치 항목 0건이었습니다.
- 유효한 비민감 Live 요청은 HTTP 403, `LIVE_ANALYSIS_DISABLED`, `Cache-Control: no-store`로
  종료됐습니다.
- 공개 샘플은 브라우저 내 결정론적 fixture만 사용하며 사이트 서버나 외부 AI로 작업문을
  보내지 않았습니다.
- 브라우저 저장은 언어와 사용자가 만든 최근 source 시나리오로 제한됐고, 삭제 뒤 복원되지
  않았습니다.
- 응답 헤더에는 HSTS, `nosniff`, `DENY`, Referrer Policy, Permissions Policy와 제한된 CSP가
  적용됐고 `X-Powered-By`는 없었습니다.
- 공개 저장소는 PUBLIC이며 MIT License를 포함합니다.
- production 의존성 감사 결과 알려진 취약점은 0건입니다.

현재 CSP는 `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
`frame-ancestors 'none'`, `form-action 'self'`를 적용합니다. 외부 요청이 실제로 없고 문서도 이
범위를 과장하지 않습니다. nonce/hash를 포함한 더 강한 `script-src` 정책은 Next.js hydration과
함께 별도 회귀 검증이 필요한 방어 심화 작업이므로 제출 직전의 안전한 최소 수정 범위에는
포함하지 않았습니다.

## 릴리스 재현성과 배포 증거

`package.json`의 Node 범위가 `>=20.9.0`일 때 Vercel은 현재 최신 메이저인 Node 24를
선택했습니다. 로컬 검증 환경과 배포 환경을 맞추기 위해 다음처럼 변경했습니다.

- `package.json`과 lockfile의 root engine을 `22.x`로 고정
- README 요구사항을 Node.js 22.x로 일치
- 전체 테스트, lint, typecheck, production build 재실행

이는 [Vercel의 Node.js 버전 선택 규칙](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)에
따른 조치입니다.

최종 production 배포에는 `sourceCommitSha=<full SHA>`와 `sourceBranch=main` 메타데이터를
명시합니다. 배포 후 GitHub `main`, 로컬 clean `main`, Vercel의 `sourceCommitSha`가 모두 같은
값인지 다시 읽어 확인하며, 공개 URL의 샘플 흐름과 disabled-Live 응답을 한 번 더 검사합니다.

## 최종 자동 검증

- `npm test`: 54개 파일, 534/534 통과
- `npm run lint`: 통과
- `npm run typecheck`: 통과
- `ENABLE_LIVE_ANALYSIS=false npm run build`: 통과
- `git diff --check`: 통과
- `npm audit --omit=dev`: 알려진 production 취약점 0건

## 자동 완료하지 않은 사용자 소유 게이트

다음 항목은 코드나 에이전트가 대신 완료했다고 표시하지 않았습니다.

- OpenAI Build Week 등록·자격과 제출 트랙 확인
- 주 작업 Codex 세션의 `/feedback` 및 Session ID 입력
- 실제 서버 전용 키를 사용한 보호된 GPT-5.6 Live 요청 1회
- 영상 녹화·영문 음성·자막·길이·저작권과 공개 YouTube 재생 확인
- Devpost 최종 렌더링, 필수 필드, 링크, 제출 버튼
- 심사 기간 동안 공개 데모 유지 확인

`LIVE_VALIDATION.md`는 실제 호출 전까지 Pending으로 유지합니다. Mock 테스트나 공개 403은
실제 GPT-5.6 호출을 대신하지 않습니다.

## 에이전트 결과를 다룬 방법

각 에이전트는 production을 읽기 전용으로 검사했고 저장소 파일은 수정하지 않았습니다. 최종
판정은 에이전트 문장을 그대로 옮기지 않고 다음을 다시 대조했습니다.

- 코드·응답 헤더·브라우저 geometry와 보고 내용의 일치
- API 키, 환경 변수 값, 계정 식별자, 비공개 URL, 로컬 경로의 답변 포함 여부
- 점검 중 production 데이터 변경 여부
- selector 오탐과 실제 제품 결함의 구분

보고서에는 공개 URL, 공개 GitHub 정보, 존재 여부와 불리언 상태만 남겼으며 비밀값은 포함하지
않았습니다.
