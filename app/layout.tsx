import type { Metadata } from "next";
import { DESCRIPTION, Shell } from "@/components/Shell";
import { brandName, isDemo } from "@/lib/source";
import "./globals.css";

export function generateMetadata(): Metadata {
  return { title: `${brandName()} · Дашкрафт`, description: DESCRIPTION };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell brand={brandName()} demo={isDemo()} repo={process.env.NEXT_PUBLIC_REPO_URL} canRefresh>
      {children}
    </Shell>
  );
}
