import type { TaskInput } from "@/types/domain";

export const SAMPLE_TASKS: TaskInput[] = [
  {
    id: "task-1",
    name: "고객 지원 대시보드 API 설계",
    priority: "high",
    description:
      "기존 Next.js 앱에 고객 문의를 조회하고 상태를 변경하는 서버 API를 설계한다. 인증 경계, 입력 검증, 오류 응답, 테스트 전략을 포함한 구현 계획이 필요하다.",
  },
  {
    id: "task-2",
    name: "시장 조사 메모 작성",
    priority: "medium",
    description:
      "공개 자료를 바탕으로 AI 업무 자동화 시장의 주요 고객군, 경쟁 범주, 도입 위험을 비교한 간결한 조사 메모를 작성한다.",
  },
  {
    id: "task-3",
    name: "출시 안내문 초안",
    priority: "low",
    description:
      "새 예산 계획 기능을 처음 사용하는 팀을 위한 500자 내외의 출시 안내문과 핵심 사용 예시를 작성한다.",
  },
];
