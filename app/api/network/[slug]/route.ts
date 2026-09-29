import { NextRequest, NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/dates";
import { serverReport } from "@/lib/server-report";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = req.nextUrl.searchParams;
  const account = q.get("account");
  const report = await serverReport(slug, resolvePeriod(q.get("from"), q.get("to")), account ? Number(account) : null, q.get("project"));
  if (!report) return NextResponse.json({ error: "Аккаунт не найден" }, { status: 404 });
  return NextResponse.json(report);
}
