import { notFound } from "next/navigation";
import { LoadError } from "@/components/LoadError";
import { NetworkView } from "@/components/NetworkView";
import { resolvePeriod } from "@/lib/dates";
import { networkBySlug } from "@/lib/networks";
import { serverReport } from "@/lib/server-report";

// Общая страница аккаунта: /telegram — первый канал сети, /telegram/<id> — конкретный
export async function NetworkPage({ network, account, from, to }: { network: string; account?: string; from?: string; to?: string }) {
  const net = networkBySlug(network);
  const accountId = account == null ? null : Number(account);
  if (!net || (accountId != null && !Number.isInteger(accountId))) notFound();
  let report;
  try {
    report = await serverReport(net.slug, resolvePeriod(from, to), accountId);
  } catch (e) {
    return <LoadError message={e instanceof Error ? e.message : "Неизвестная ошибка"} />;
  }
  if (!report) {
    return accountId == null ? (
      <LoadError
        title={`${net.label} не подключён`}
        message={`В Livedune нет аккаунта ${net.label}. Добавьте его в дашборд Livedune и нажмите «Попробовать ещё раз».`}
      />
    ) : (
      <LoadError title="Аккаунт не найден" message={`В Livedune нет аккаунта ${net.label} с номером ${accountId}. Возможно, его отключили.`} />
    );
  }
  return <NetworkView report={report} />;
}
