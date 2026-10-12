import { chmodSync, writeFileSync } from "node:fs";

const required = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing required Amplify production variables: ${missing.join(", ")}`);
  process.exit(1);
}

const names = [...required];
if (process.env.BETTER_AUTH_URL?.trim()) names.push("BETTER_AUTH_URL");

const contents = `${names.map((name) => `${name}=${JSON.stringify(process.env[name])}`).join("\n")}\n`;
writeFileSync(".env.production", contents, { mode: 0o600 });
chmodSync(".env.production", 0o600);
console.log("Prepared server-side auth configuration for the Amplify Next.js runtime.");
