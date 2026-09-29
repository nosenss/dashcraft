import { Inter, Manrope } from "next/font/google";
import { Suspense } from "react";
import type { AccountBrief } from "@/lib/accounts";
import { Header } from "./Header";
import { LoadingProvider, StaleBanner } from "./Loading";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });

export const DESCRIPTION = "SMM-дашборд по данным Livedune: воронка, динамика и посты по всем вашим соцсетям";

// Общий каркас страницы: и для сервера с Livedune, и для статического демо на GitHub Pages
export function Shell({
  title,
  demo,
  repo,
  canRefresh,
  accounts,
  children,
}: {
  title?: string;
  demo: boolean;
  repo?: string;
  canRefresh: boolean;
  accounts: AccountBrief[] | null;
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <Suspense>
          <LoadingProvider>
            {demo && (
              <div className="bg-ink px-4 py-2 text-center text-[12px] text-white/85">
                Демо Дашкрафта: проекты, аккаунты и все цифры вымышленные.{" "}
                {repo ? (
                  <a href={repo} className="font-semibold text-white underline underline-offset-2">
                    Код и подключение своих данных — на GitHub
                  </a>
                ) : (
                  "Чтобы увидеть свои данные, добавьте LIVEDUNE_TOKEN в .env.local"
                )}
              </div>
            )}
            <Header title={title} canRefresh={canRefresh} accounts={accounts} />
            <main className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6">
              <StaleBanner />
              {children}
            </main>
          </LoadingProvider>
        </Suspense>
      </body>
    </html>
  );
}
