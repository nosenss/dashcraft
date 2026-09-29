import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import { serverAccounts } from "@/lib/server-report";
import { isDemo } from "@/lib/source";
import "./globals.css";

const TITLE = process.env.DASHBOARD_TITLE?.trim() || undefined;

export function generateMetadata(): Metadata {
  return { title: TITLE ? `${TITLE} · Дашкрафт` : "Дашкрафт", description: DESCRIPTION };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Вкладки строятся из подключённых аккаунтов. Livedune не ответил — шапка покажет основные сети, ошибку объяснит страница
  const accounts = await serverAccounts().catch(() => null);
  return (
    <Shell title={TITLE} demo={isDemo()} repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh accounts={accounts}>
      {children}
    </Shell>
  );
}
