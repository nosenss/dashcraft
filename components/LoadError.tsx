"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useLoading, useReportInfo } from "./Loading";

// Ошибка загрузки с текстом причины. Ловим её в странице сами:
// в продакшене Next.js прячет текст серверных ошибок от браузера.
export function LoadError({ title = "Не получилось загрузить данные", message }: { title?: string; message: string }) {
  useReportInfo(null, false);
  const router = useRouter();
  const { start, stop } = useLoading();
  const [pending, startTransition] = useTransition();
  const tried = useRef(false);
  // Повтор закончился (успехом или снова ошибкой) — убираем индикатор
  useEffect(() => {
    if (tried.current && !pending) {
      tried.current = false;
      stop();
    }
  }, [pending, stop]);
  // Повтор удался — этот блок исчез, а индикатор надо погасить
  useEffect(() => () => {
    if (tried.current) stop();
  }, [stop]);
  const retry = () => {
    tried.current = true;
    start("Пробуем ещё раз", "Запрашиваем данные в Livedune");
    startTransition(() => router.refresh());
  };
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
      <div className="font-display text-[18px] font-bold">{title}</div>
      <p className="mt-2 text-[13px] text-ink-2">{message}</p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={retry}
          disabled={pending}
          className="rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Пробуем…" : "Попробовать ещё раз"}
        </button>
        <Link href="/" className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-line hover:text-ink">
          На главную
        </Link>
      </div>
    </div>
  );
}
