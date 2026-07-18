import type { UiLocale } from "@/lib/i18n/ui-copy";
import type { TaskInput } from "@/types/domain";

export const SAMPLE_TASKS_BY_LOCALE: Record<UiLocale, TaskInput[]> = {
  ko: [
    {
      id: "task-1",
      name: "고객 지원 대시보드 API 설계",
      priority: "high",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "기존 Next.js 앱에 고객 문의를 조회하고 상태를 변경하는 서버 API를 설계한다. 인증 경계, 입력 검증, 오류 응답, 테스트 전략을 포함한 구현 계획이 필요하다.",
    },
    {
      id: "task-2",
      name: "시장 조사 메모 작성",
      priority: "medium",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "공개 자료를 바탕으로 AI 업무 자동화 시장의 주요 고객군, 경쟁 범주, 도입 위험을 비교한 간결한 조사 메모를 작성한다.",
    },
    {
      id: "task-3",
      name: "고객 문의 일괄 분류",
      priority: "low",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "CSV로 받은 고객 문의를 무인 배치로 처리해 주제와 긴급도를 분류하고, 각 행에 구조화된 JSON 결과를 기록한다.",
    },
  ],
  en: [
    {
      id: "task-1",
      name: "Design a customer support dashboard API",
      priority: "high",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "Design server APIs for an existing Next.js app to retrieve customer inquiries and update their status. Provide an implementation plan covering authentication boundaries, input validation, error responses, and testing strategy.",
    },
    {
      id: "task-2",
      name: "Write a market research memo",
      priority: "medium",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "Using public sources, write a concise research memo comparing the main customer groups, competitive categories, and adoption risks in the AI workflow automation market.",
    },
    {
      id: "task-3",
      name: "Classify customer inquiries in bulk",
      priority: "low",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "Process a CSV of customer inquiries as an unattended batch, classify topic and urgency, and write structured JSON output for every row.",
    },
  ],
  ja: [
    {
      id: "task-1",
      name: "カスタマーサポートダッシュボードAPIの設計",
      priority: "high",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "既存のNext.jsアプリで顧客からの問い合わせを取得し、ステータスを変更するサーバーAPIを設計する。認証境界、入力検証、エラーレスポンス、テスト戦略を含む実装計画が必要である。",
    },
    {
      id: "task-2",
      name: "市場調査メモの作成",
      priority: "medium",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "公開情報を基に、AI業務自動化市場の主な顧客層、競合カテゴリー、導入リスクを比較した簡潔な調査メモを作成する。",
    },
    {
      id: "task-3",
      name: "顧客問い合わせの一括分類",
      priority: "low",
      deadlineDate: null,
      failureImpact: "medium",
      description:
        "CSVの顧客問い合わせを無人バッチで処理し、トピックと緊急度を分類して、各行に構造化JSON結果を記録する。",
    },
  ],
};
