import { LoadError } from "@/components/LoadError";
import { Overview } from "@/components/Overview";
import { resolvePeriod } from "@/lib/dates";
import { serverOverview } from "@/lib/server-report";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const q = await searchParams;
  const period = resolvePeriod(q.from, q.to);
  let data;
  try {
    data = await serverOverview(period);
  } catch (e) {
    return <LoadError message={e instanceof Error ? e.message : "Неизвестная ошибка"} />;
  }
  const { reports, failed } = data;
  if (!reports.length && failed.length) return <LoadError message={failed[0].error} />;
  return <Overview reports={reports} failed={failed} period={period} />;
}
