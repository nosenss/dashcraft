import { NextRequest, NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/dates";
import { networkBySlug } from "@/lib/networks";
import { serverReport } from "@/lib/server-report";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const net = networkBySlug(slug);
  if (!net) return NextResponse.json({ error: "Нет такой сети" }, { status: 404 });
  const q = req.nextUrl.searchParams;
  const account = q.get("account");
  const report = await serverReport(net.slug, resolvePeriod(q.get("from"), q.get("to")), account ? Number(account) : null);
  if (!report) return NextResponse.json({ error: "Аккаунт не найден в проекте" }, { status: 404 });
  return NextResponse.json(report);
}
