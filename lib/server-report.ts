import "server-only";
import { splitList } from "./accounts";
import type { Period } from "./dates";
import { stampOf } from "./livedune/cache";
import type { Slug } from "./networks";
import { buildAccountList, buildOverview, buildReport, type Source } from "./report";
import { getHistory, getPosts, isDemo, listAccounts } from "./source";

const source = (): Source => ({
  listAccounts,
  getHistory,
  getPosts,
  // В демо фильтры из .env не применяем: там свои вымышленные проекты
  scope: isDemo()
    ? { projects: [], ids: [] }
    : { projects: splitList(process.env.LIVEDUNE_PROJECT), ids: splitList(process.env.LIVEDUNE_ACCOUNTS).map(Number).filter(Number.isInteger) },
  stampOf,
});

export const serverReport = (slug: Slug, period: Period, accountId?: number | null, project?: string | null) =>
  buildReport(source(), slug, period, accountId, project);
export const serverOverview = (period: Period, project?: string | null) => buildOverview(source(), period, project);
export const serverAccounts = () => buildAccountList(source());
