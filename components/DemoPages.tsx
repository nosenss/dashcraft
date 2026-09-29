"use client";

// Статическое демо для GitHub Pages: сервера нет, поэтому отчёт собирается прямо в браузере
// тем же кодом, что и на сервере, только источник — генератор демо-данных.
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { resolvePeriod } from "@/lib/dates";
import * as demo from "@/lib/demo";
import type { Slug } from "@/lib/networks";
import { buildOverview, buildReport, type NetworkReport, type Source } from "@/lib/report";
import { NetworkView } from "./NetworkView";
import { Overview } from "./Overview";

const source: Source = demo;

function usePeriod() {
  const search = useSearchParams();
  return resolvePeriod(search.get("from"), search.get("to"));
}

export function DemoOverview() {
  const period = usePeriod();
  const [data, setData] = useState<Awaited<ReturnType<typeof buildOverview>> | null>(null);
  useEffect(() => {
    let live = true;
    buildOverview(source, period).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  return <Overview reports={data.reports} failed={data.failed} period={period} />;
}

export function DemoNetwork({ slug }: { slug: Slug }) {
  const period = usePeriod();
  const [report, setReport] = useState<NetworkReport | null>(null);
  useEffect(() => {
    let live = true;
    buildReport(source, slug, period).then((r) => live && setReport(r));
    return () => {
      live = false;
    };
  }, [slug, period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!report) return null;
  return <NetworkView report={report} />;
}
