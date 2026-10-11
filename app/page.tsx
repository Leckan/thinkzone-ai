import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const googleOAuthEnabled = Boolean(
    process.env.DATABASE_URL
    && process.env.AUTH_SECRET
    && process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET,
  );

  return <Workspace googleOAuthEnabled={googleOAuthEnabled} />;
}
