import { notFound } from "next/navigation";
import { LoadError } from "@/components/LoadError";
import { NetworkView } from "@/components/NetworkView";
import { resolvePeriod } from "@/lib/dates";
import { networkBySlug } from "@/lib/networks";
import { serverReport } from "@/lib/server-report";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ network: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function NetworkPage({ params, searchParams }: Props) {
  const { network } = await params;
  const net = networkBySlug(network);
  if (!net) notFound();
  const q = await searchParams;
  let report;
  try {
    report = await serverReport(net.slug, resolvePeriod(q.from, q.to));
  } catch (e) {
    return <LoadError message={e instanceof Error ? e.message : "Неизвестная ошибка"} />;
  }
  if (!report) {
    return (
      <LoadError
        title={`${net.label} не подключён`}
        message={`В Livedune нет аккаунта ${net.label}. Добавьте его в дашборд Livedune и нажмите «Попробовать ещё раз».`}
      />
    );
  }
  return <NetworkView report={report} />;
}
