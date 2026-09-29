import { DemoNetwork } from "@/components/DemoPages";
import { listTabs } from "@/lib/accounts";
import { listAccounts } from "@/lib/demo";
import type { Slug } from "@/lib/networks";

export const dynamicParams = false;

// Вторые и следующие аккаунты сети: /telegram/<id>
export async function generateStaticParams() {
  const { tabs } = listTabs(await listAccounts());
  return tabs.filter((t) => t.href !== `/${t.slug}`).map((t) => ({ network: t.slug, account: String(t.id) }));
}

export default async function Page({ params }: { params: Promise<{ network: string; account: string }> }) {
  const { network, account } = await params;
  return <DemoNetwork slug={network as Slug} accountId={Number(account)} />;
}
