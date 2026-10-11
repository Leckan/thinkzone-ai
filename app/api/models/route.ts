import { NextResponse } from "next/server";
import { listConfiguredModels } from "@/lib/ai/providers";
import { modelCatalog } from "@/lib/ai/catalog";
import { getActiveUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getActiveUser(request);
  if (!user) return NextResponse.json({ error: "Sign in with Google to use the model catalog." }, { status: 401 });

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "The local provider catalog is disabled in production." }, { status: 503 });
  }

  if (process.env.AI_PROVIDER_MODE === "mock") {
    return NextResponse.json({
      mode: "development-mock",
      models: modelCatalog.map(({ id, name, provider, description, contextTokens, accent, speed, capability }) => ({ id, name, provider, description, contextTokens, accent, speed, capability })),
      unavailableProviders: [],
    });
  }

  if (process.env.AI_PROVIDER_MODE === "provider-dev") {
    const result = await listConfiguredModels();
    return NextResponse.json({ mode: "direct-provider-development", ...result });
  }

  return NextResponse.json({ error: "Set AI_PROVIDER_MODE=mock or provider-dev for local development." }, { status: 503 });
}
