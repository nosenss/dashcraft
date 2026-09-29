import { notFound } from "next/navigation";
import { LoadError } from "@/components/LoadError";
import { NetworkView } from "@/components/NetworkView";
import { resolvePeriod } from "@/lib/dates";
import { networkBySlug } from "@/lib/networks";
import { serverReport } from "@/lib/server-report";

type Props = { network: string; account?: string; from?: string; to?: string; project?: string };

// Общая страница аккаунта: /telegram — первый канал сети, /telegram/<id> — конкретный
export async function NetworkPage({ network, account, from, to, project }: Props) {
  const accountId = account == null ? null : Number(account);
  if (!/^[a-z0-9-]+$/.test(network) || (accountId != null && !Number.isInteger(accountId))) notFound();
  const label = networkBySlug(network)?.label ?? network;
  let report;
  try {
    report = await serverReport(network, resolvePeriod(from, to), accountId, project);
  } catch (e) {
    return <LoadError message={e instanceof Error ? e.message : "Неизвестная ошибка"} />;
  }
  if (!report) {
    return accountId == null ? (
      <LoadError
        title={`${label} не подключён`}
        message={`В Livedune${project ? ` в проекте «${project}»` : ""} нет аккаунта ${label}. Добавьте его в дашборд Livedune и нажмите «Попробовать ещё раз».`}
      />
    ) : (
      <LoadError title="Аккаунт не найден" message={`В Livedune нет аккаунта ${label} с номером ${accountId}. Возможно, его отключили.`} />
    );
  }
  return <NetworkView report={report} />;
}
