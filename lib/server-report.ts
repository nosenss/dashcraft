import "server-only";
import type { Period } from "./dates";
import { stampOf } from "./livedune/cache";
import type { Slug } from "./networks";
import { buildOverview, buildReport, buildTabs, type Source } from "./report";
import { getHistory, getPosts, isDemo, listAccounts } from "./source";

const source = (): Source => ({
  listAccounts,
  getHistory,
  getPosts,
  project: isDemo() ? "" : process.env.LIVEDUNE_PROJECT?.trim() ?? "",
  stampOf,
});

export const serverReport = (slug: Slug, period: Period, accountId?: number | null) => buildReport(source(), slug, period, accountId);
export const serverTabs = () => buildTabs(source());
export const serverOverview = (period: Period) => buildOverview(source(), period);
