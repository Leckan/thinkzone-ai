import type { TokenRateCard } from "@/lib/credits/accounting";

export interface ModelDefinition {
  id: string;
  name: string;
  provider: string;
  description: string;
  accent: "violet" | "blue" | "amber";
  speed: string;
  capability: string;
  contextTokens: number;
  rateCard: TokenRateCard;
  availability: "development-mock";
  commercialStatus: "not-approved";
}

export const modelCatalog: ModelDefinition[] = [
  {
    id: "tz-mock-balanced",
    name: "Think Zone Balanced",
    provider: "Think Zone · simulated",
    description: "A general-purpose local demo model for everyday questions.",
    accent: "violet",
    speed: "Fast",
    capability: "Writing · analysis",
    contextTokens: 8_000,
    rateCard: { inputNanoUsdPerMillionTokens: 150_000_000n, outputNanoUsdPerMillionTokens: 600_000_000n },
    availability: "development-mock",
    commercialStatus: "not-approved",
  },
  {
    id: "tz-mock-reasoning",
    name: "Think Zone Reasoning",
    provider: "Think Zone · simulated",
    description: "A local demonstration profile with a higher sample rate card.",
    accent: "blue",
    speed: "Balanced",
    capability: "Reasoning · coding",
    contextTokens: 8_000,
    rateCard: { inputNanoUsdPerMillionTokens: 1_000_000_000n, outputNanoUsdPerMillionTokens: 5_000_000_000n },
    availability: "development-mock",
    commercialStatus: "not-approved",
  },
];

export function getModel(modelId: string): ModelDefinition | undefined {
  return modelCatalog.find((model) => model.id === modelId);
}

export function buildMockResponse(prompt: string, model: ModelDefinition): string {
  const excerpt = prompt.trim().replace(/\s+/g, " ").slice(0, 180);
  return `Simulated response · ${model.name}\n\nThis workspace is running in local demo mode, so no external AI provider received your prompt.\n\nI received: “${excerpt}${prompt.trim().length > 180 ? "…" : ""}”\n\nTo turn this into a real answer, connect a provider whose commercial terms have been reviewed, add its server-side credentials, and implement its verified usage reporting. The current demo only shows how the chat and credit-metering flow fit together.`;
}

export function estimateMockTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
