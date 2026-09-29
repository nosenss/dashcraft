import { NextRequest, NextResponse } from "next/server";
import { resolvePeriod } from "@/lib/dates";
import { serverOverview } from "@/lib/server-report";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return NextResponse.json(await serverOverview(resolvePeriod(q.get("from"), q.get("to"))));
}
