import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type ProviderId = "openai" | "anthropic" | "google" | "openrouter" | "deepseek" | "groq" | "grok";

export type AvailableProviderModel = {
  id: string;
  modelId: string;
  providerId: ProviderId;
  providerName: string;
  name: string;
  contextTokens?: number;
};

type ProviderConfig = {
  id: ProviderId;
  name: string;
  env: string;
  modelsUrl: string;
  baseURL?: string;
  headers?: (apiKey: string) => Record<string, string>;
};

const providers: ProviderConfig[] = [
  { id: "openai", name: "OpenAI", env: "OPENAI_API_KEY", modelsUrl: "https://api.openai.com/v1/models" },
  {
    id: "anthropic",
    name: "Anthropic",
    env: "ANTHROPIC_API_KEY",
    modelsUrl: "https://api.anthropic.com/v1/models",
    headers: (apiKey) => ({ "x-api-key": apiKey, "anthropic-version": "2023-06-01" }),
  },
  {
    id: "google",
    name: "Google Gemini",
    env: "GOOGLE_GEMINI_API_KEY",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    headers: (apiKey) => ({ "x-goog-api-key": apiKey }),
  },
  { id: "openrouter", name: "OpenRouter", env: "OPENROUTER_API_KEY", modelsUrl: "https://openrouter.ai/api/v1/models?output_modalities=text", baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek", name: "DeepSeek", env: "DEEPSEEK_API_KEY", modelsUrl: "https://api.deepseek.com/models", baseURL: "https://api.deepseek.com" },
  { id: "groq", name: "Groq", env: "GROQ_API_KEY", modelsUrl: "https://api.groq.com/openai/v1/models", baseURL: "https://api.groq.com/openai/v1" },
  { id: "grok", name: "xAI Grok", env: "GROK_API_KEY", modelsUrl: "https://api.x.ai/v1/models", baseURL: "https://api.x.ai/v1" },
];

const modelCache = new Map<ProviderId, { expiresAt: number; models: AvailableProviderModel[] }>();
const cacheDurationMs = 60_000;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asRecord).filter((record): record is JsonRecord => record !== null) : [];
}

function recordString(record: JsonRecord, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] as string : undefined;
}

function recordNumber(record: JsonRecord, key: string): number | undefined {
  return typeof record[key] === "number" && Number.isFinite(record[key]) ? record[key] as number : undefined;
}

function providerModelId(providerId: ProviderId, record: JsonRecord): string | undefined {
  const raw = providerId === "google" ? recordString(record, "name") : recordString(record, "id");
  if (!raw) return undefined;
  return providerId === "google" ? raw.replace(/^models\//, "") : raw;
}

function isTextGenerationModel(providerId: ProviderId, record: JsonRecord, id: string): boolean {
  if (providerId === "google") {
    const methods = record.supportedGenerationMethods;
    return Array.isArray(methods) && methods.includes("generateContent") && id.startsWith("gemini-");
  }
  if (providerId === "openrouter") {
    const architecture = asRecord(record.architecture);
    const outputs = architecture?.output_modalities;
    return !Array.isArray(outputs) || outputs.includes("text");
  }
  if (providerId === "anthropic") return id.startsWith("claude-");
  if (providerId === "openai") return /^(gpt-|o[134](?:-|$)|chatgpt-|codex-|gpt-oss)/i.test(id) && !/(embedding|audio|transcri|tts|moderation|image)/i.test(id);
  if (providerId === "grok") return id.startsWith("grok-");
  if (providerId === "groq") return !/(whisper|audio|transcri|tts|guard|embedding|embed)/i.test(id);
  return !/(embedding|embed)/i.test(id);
}

function toModel(config: ProviderConfig, record: JsonRecord): AvailableProviderModel | undefined {
  const modelId = providerModelId(config.id, record);
  if (!modelId || !/^[A-Za-z0-9._:/-]{1,180}$/.test(modelId) || !isTextGenerationModel(config.id, record, modelId)) return undefined;
  const architecture = asRecord(record.architecture);
  const contextTokens = recordNumber(record, "context_length") ?? recordNumber(record, "contextLength") ?? recordNumber(architecture ?? {}, "context_length");
  const name = recordString(record, "name") ?? recordString(record, "displayName") ?? modelId;
  return { id: `${config.id}:${modelId}`, modelId, providerId: config.id, providerName: config.name, name, ...(contextTokens ? { contextTokens } : {}) };
}

async function loadProviderModels(config: ProviderConfig): Promise<AvailableProviderModel[]> {
  const cached = modelCache.get(config.id);
  if (cached && cached.expiresAt > Date.now()) return cached.models;
  const apiKey = process.env[config.env];
  if (!apiKey) return [];

  const response = await fetch(config.modelsUrl, {
    headers: { Authorization: `Bearer ${apiKey}`, ...config.headers?.(apiKey) },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body: unknown = await response.json();
  const root = asRecord(body);
  const records = asRecords(root?.data ?? root?.models);
  const models = records.flatMap((record) => {
    const model = toModel(config, record);
    return model ? [model] : [];
  }).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100);
  modelCache.set(config.id, { expiresAt: Date.now() + cacheDurationMs, models });
  return models;
}

export function configuredProviderNames(): string[] {
  return providers.filter((provider) => Boolean(process.env[provider.env])).map((provider) => provider.name);
}

export async function listConfiguredModels(): Promise<{ models: AvailableProviderModel[]; unavailableProviders: string[] }> {
  const results = await Promise.all(providers.map(async (provider) => {
    if (!process.env[provider.env]) return { models: [], unavailableReason: "" };
    try {
      const models = await loadProviderModels(provider);
      return { models, unavailableReason: models.length ? "" : "no chat models returned" };
    } catch (error) {
      const reason = error instanceof Error && /^HTTP \d{3}$/.test(error.message) ? error.message : "catalog request failed";
      return { models: [], unavailableReason: reason };
    }
  }));
  return {
    models: results.flatMap((result) => result.models),
    unavailableProviders: results.flatMap((result, index) => result.unavailableReason ? [`${providers[index].name} (${result.unavailableReason})`] : []),
  };
}

export async function resolveProviderModel(id: string) {
  const separator = id.indexOf(":");
  if (separator < 1) return undefined;
  const providerId = id.slice(0, separator) as ProviderId;
  const modelId = id.slice(separator + 1);
  const config = providers.find((provider) => provider.id === providerId);
  if (!config || !process.env[config.env] || !/^[A-Za-z0-9._:/-]{1,180}$/.test(modelId)) return undefined;
  const catalog = await loadProviderModels(config).catch(() => []);
  if (!catalog.some((model) => model.modelId === modelId)) return undefined;
  const apiKey = process.env[config.env]!;

  switch (providerId) {
    case "openai": return { model: createOpenAI({ apiKey }).chat(modelId), provider: config.name, modelId };
    case "anthropic": return { model: createAnthropic({ apiKey })(modelId), provider: config.name, modelId };
    case "google": return { model: createGoogle({ apiKey })(modelId), provider: config.name, modelId };
    case "openrouter":
    case "deepseek":
    case "groq":
    case "grok": {
      const compatible = createOpenAICompatible({ name: providerId, apiKey, baseURL: config.baseURL!, includeUsage: true });
      return { model: compatible(modelId), provider: config.name, modelId };
    }
  }
}
