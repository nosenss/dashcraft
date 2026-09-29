import { DemoNetwork } from "@/components/DemoPages";
import { listAccounts } from "@/lib/demo";
import { networkForType } from "@/lib/networks";

export const dynamicParams = false;

// Все сети, которые есть в демо
export async function generateStaticParams() {
  const slugs = new Set((await listAccounts()).map((a) => networkForType(a.type).slug));
  return [...slugs].map((network) => ({ network }));
}

export default async function Page({ params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  return <DemoNetwork slug={network} />;
}
