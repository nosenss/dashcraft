import { Inter, Manrope } from "next/font/google";
import { Suspense } from "react";
import type { AccountTab } from "@/lib/accounts";
import { Header } from "./Header";
import { LoadingProvider, StaleBanner } from "./Loading";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope" });

export const DESCRIPTION = "SMM-дашборд по данным Livedune: воронка, динамика и посты по шести соцсетям";

// Общий каркас страницы: и для сервера с Livedune, и для статического демо на GitHub Pages
export function Shell({
  brand,
  demo,
  repo,
  canRefresh,
  tabs,
  children,
}: {
  brand: string;
  demo: boolean;
  repo?: string;
  canRefresh: boolean;
  tabs: AccountTab[] | null;
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <Suspense>
          <LoadingProvider>
            {demo && (
              <div className="bg-ink px-4 py-2 text-center text-[12px] text-white/85">
                Демо Дашкрафта: кофейня «Зерно» и все цифры вымышленные.{" "}
                {repo ? (
                  <a href={repo} className="font-semibold text-white underline underline-offset-2">
                    Код и подключение своих данных — на GitHub
                  </a>
                ) : (
                  "Чтобы увидеть свои данные, добавьте LIVEDUNE_TOKEN в .env.local"
                )}
              </div>
            )}
            <Header brand={brand} canRefresh={canRefresh} tabs={tabs} />
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
