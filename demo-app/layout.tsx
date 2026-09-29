import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import { listTabs } from "@/lib/accounts";
import { listAccounts } from "@/lib/demo";
import "./globals.css"; // копируется из app/ при сборке

export const metadata: Metadata = { title: "Демо · Дашкрафт", description: DESCRIPTION };

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const { tabs } = listTabs(await listAccounts());
  return (
    <Shell brand="Кофейня «Зерно»" demo repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh={false} tabs={tabs}>
      {children}
    </Shell>
  );
}
