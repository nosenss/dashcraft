"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  // reset() сам по себе не перезапрашивает данные с сервера — нужен router.refresh()
  const retry = () => {
    setRetrying(true);
    startTransition(() => {
      router.refresh();
      reset();
    });
  };
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
      <div className="font-display text-[18px] font-bold">Не получилось загрузить данные</div>
      <p className="mt-2 text-[13px] text-ink-2">{error.message || "Неизвестная ошибка"}</p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={retry}
          disabled={retrying}
          className="rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {retrying ? "Пробуем…" : "Попробовать ещё раз"}
        </button>
        <Link href="/" className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-line hover:text-ink">
          На главную
        </Link>
      </div>
    </div>
  );
}
