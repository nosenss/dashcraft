import { DemoNetwork } from "@/components/DemoPages";
import { listAccounts } from "@/lib/demo";
import { networkForType } from "@/lib/networks";

export const dynamicParams = false;

// /сеть/<id> для каждого аккаунта: какой из них «первый», зависит от выбранного проекта
export async function generateStaticParams() {
  return (await listAccounts()).map((a) => ({ network: networkForType(a.type).slug, account: String(a.id) }));
}

export default async function Page({ params }: { params: Promise<{ network: string; account: string }> }) {
  const { network, account } = await params;
  return <DemoNetwork slug={network} accountId={Number(account)} />;
}
