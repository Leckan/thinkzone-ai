import "server-only";

export function isGoogleOAuthConfigured() {
  return Boolean(
    process.env.DATABASE_URL
    && process.env.AUTH_SECRET
    && process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET,
  );
}
