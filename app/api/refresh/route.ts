import { NextResponse } from "next/server";
import { bustCache } from "@/lib/livedune/cache";

export async function POST() {
  return NextResponse.json({ ok: true, at: await bustCache() });
}
