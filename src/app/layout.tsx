import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://frontier-workload-planner.vercel.app"),
  title: "Frontier Workload Planner",
  description:
    "Plan AI-assisted work across subscriptions and APIs with explainable budget estimates.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Frontier Workload Planner",
    title: "Frontier Workload Planner",
    description:
      "Plan AI-assisted work across subscriptions and APIs with explainable budget estimates.",
    images: [
      {
        url: "/frontier-workload-planner-preview.png",
        width: 1200,
        height: 630,
        alt: "Frontier Workload Planner sample planning screen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frontier Workload Planner",
    description:
      "Plan AI-assisted work across subscriptions and APIs with explainable budget estimates.",
    images: ["/frontier-workload-planner-preview.png"],
  },
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
