import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import "./globals.css"; // копируется из app/ при сборке

export const metadata: Metadata = { title: "Демо · Дашкрафт", description: DESCRIPTION };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell brand="Кофейня «Зерно»" demo repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh={false}>
      {children}
    </Shell>
  );
}
