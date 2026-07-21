import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/language-provider";
import { DEFAULT_UI_LOCALE, UI_LOCALE_META } from "@/lib/i18n/ui-copy";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://frontier-workload-planner.vercel.app"),
  title: "Nothing More — AI Subscription & API Planner",
  description:
    "Plan AI-assisted work across subscriptions and APIs with explainable budget estimates.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nothing More",
    title: "Nothing More — AI Subscription & API Planner",
    description:
      "Plan AI-assisted work across subscriptions and APIs with explainable budget estimates.",
    images: [
      {
        url: "/frontier-workload-planner-preview.png",
        width: 1200,
        height: 630,
        alt: "Nothing More sample planning screen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nothing More — AI Subscription & API Planner",
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
    <html lang={UI_LOCALE_META[DEFAULT_UI_LOCALE].htmlLang}>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
