import "server-only";
import type { Period } from "./dates";
import { stampOf } from "./livedune/cache";
import type { Slug } from "./networks";
import { buildOverview, buildReport, type Source } from "./report";
import { getHistory, getPosts, isDemo, listAccounts } from "./source";

const source = (): Source => ({
  listAccounts,
  getHistory,
  getPosts,
  project: isDemo() ? "" : process.env.LIVEDUNE_PROJECT?.trim() ?? "",
  stampOf,
});

export const serverReport = (slug: Slug, period: Period) => buildReport(source(), slug, period);
export const serverOverview = (period: Period) => buildOverview(source(), period);
