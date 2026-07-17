import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";
import { LanguageSelector } from "@/components/language-selector";

import "./globals.css";

export const metadata: Metadata = {
  title: "Frontier Workload Planner",
  description: "Turn a task description into a structured, budget-aware model tier recommendation.",
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
          <LanguageSelector />
        </LanguageProvider>
      </body>
    </html>
  );
}
