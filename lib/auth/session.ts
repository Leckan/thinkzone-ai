import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getDb } from "@/lib/db/client";

export async function getActiveUser(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return null;

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const [user] = await getDb()
    .select({ id: users.id, email: users.email, name: users.name, status: users.status })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.status !== "active") return null;
  return { id: user.id, email: user.email, name: user.name };
}
