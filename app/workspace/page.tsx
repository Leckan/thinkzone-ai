import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getActiveUser } from "@/lib/auth/session";
import { isGoogleOAuthConfigured } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const requestHeaders = await headers();
  const user = await getActiveUser(new Request("http://localhost/workspace", { headers: new Headers(requestHeaders) }));

  if (!user) redirect("/sign-in");
  return <Workspace googleOAuthEnabled={isGoogleOAuthConfigured()} />;
}
