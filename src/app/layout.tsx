import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Frontier Workload Planner",
  description:
    "Use GPT-5.6 workload analysis and deterministic rules to compare subscription and API access routes within an incremental-cash budget.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f5f0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
