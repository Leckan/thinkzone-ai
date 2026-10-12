import { chmodSync, writeFileSync } from "node:fs";

const required = [
  "APP_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "AI_PROVIDER_MODE",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "REDIS_URL",
  "OBJECT_STORAGE_ENDPOINT",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "DEEPSEEK_API_KEY",
  "GROQ_API_KEY",
  "GROK_API_KEY",
  "ANTHROPIC_API_KEY",
  "OBJECT_STORAGE_BUCKET",
  "OBJECT_STORAGE_ACCESS_KEY",
  "OBJECT_STORAGE_SECRET_KEY",
  "NODE_ENV"
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
