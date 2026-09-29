import { DemoNetwork } from "@/components/DemoPages";
import { NETWORKS, type Slug } from "@/lib/networks";

export const dynamicParams = false;

export function generateStaticParams() {
  return NETWORKS.map((n) => ({ network: n.slug }));
}

export default async function NetworkPage({ params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  return <DemoNetwork slug={network as Slug} />;
}
