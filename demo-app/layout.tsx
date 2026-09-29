import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import { listAccounts } from "@/lib/demo";
import "./globals.css"; // копируется из app/ при сборке

export const metadata: Metadata = { title: "Демо · Дашкрафт", description: DESCRIPTION };

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const accounts = (await listAccounts()).map(({ id, type, name, project }) => ({ id, type, name, project }));
  return (
    <Shell demo repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh={false} accounts={accounts}>
      {children}
    </Shell>
  );
}
