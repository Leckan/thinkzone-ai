import { NextResponse } from "next/server";
import { getDemoStore } from "@/lib/server/demo-store";
import { getActiveUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in with Google to view your workspace." }, { status: 401 });

  const demo = getDemoStore();
  if (!demo) {
    return NextResponse.json({ error: "The local demo wallet is disabled. Configure production authentication and a database before exposing account data." }, { status: 503 });
  }
  return NextResponse.json(demo.snapshot(), { headers: { "Cache-Control": "no-store" } });
}
