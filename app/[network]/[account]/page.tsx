import { NetworkPage } from "../network-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ network: string; account: string }>;
  searchParams: Promise<{ from?: string; to?: string; project?: string }>;
};

export default async function Page({ params, searchParams }: Props) {
  return <NetworkPage {...await params} {...await searchParams} />;
}
