"use client";

// Статическое демо для GitHub Pages: сервера нет, поэтому отчёт собирается прямо в браузере
// тем же кодом, что и на сервере, только источник — генератор демо-данных.
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { resolvePeriod } from "@/lib/dates";
import * as demo from "@/lib/demo";
import { buildOverview, buildReport, type NetworkReport, type Source } from "@/lib/report";
import { NetworkView } from "./NetworkView";
import { Overview } from "./Overview";

const source: Source = demo;

function usePeriod() {
  const search = useSearchParams();
  return { ...resolvePeriod(search.get("from"), search.get("to")), project: search.get("project") };
}

export function DemoOverview() {
  const period = usePeriod();
  const [data, setData] = useState<Awaited<ReturnType<typeof buildOverview>> | null>(null);
  useEffect(() => {
    let live = true;
    buildOverview(source, period, period.project).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [period.from, period.to, period.project]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  return <Overview reports={data.reports} failed={data.failed} period={period} />;
}

export function DemoNetwork({ slug, accountId = null }: { slug: string; accountId?: number | null }) {
  const period = usePeriod();
  const [report, setReport] = useState<NetworkReport | null>(null);
  useEffect(() => {
    let live = true;
    buildReport(source, slug, period, accountId, period.project).then((r) => live && setReport(r));
    return () => {
      live = false;
    };
  }, [slug, accountId, period.from, period.to, period.project]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!report) return null;
  return <NetworkView report={report} />;
}
