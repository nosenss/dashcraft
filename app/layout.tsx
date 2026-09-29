import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import { serverTabs } from "@/lib/server-report";
import { brandName, isDemo } from "@/lib/source";
import "./globals.css";

export function generateMetadata(): Metadata {
  return { title: `${brandName()} · Дашкрафт`, description: DESCRIPTION };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Вкладки — по подключённым аккаунтам. Livedune не ответил — шапка покажет все сети, ошибку объяснит страница
  const tabs = await serverTabs().then((t) => t.tabs).catch(() => null);
  return (
    <Shell brand={brandName()} demo={isDemo()} repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh tabs={tabs}>
      {children}
    </Shell>
  );
}
