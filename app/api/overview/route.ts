import { NextResponse } from "next/server";
import { getDemoStore } from "@/lib/server/demo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const demo = getDemoStore();
  if (!demo) {
    return NextResponse.json({ error: "The local demo wallet is disabled. Configure production authentication and a database before exposing account data." }, { status: 503 });
  }
  return NextResponse.json(demo.snapshot(), { headers: { "Cache-Control": "no-store" } });
}
