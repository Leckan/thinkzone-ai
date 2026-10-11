import { afterEach, describe, expect, it } from "vitest";
import { GET as getModels } from "@/app/api/models/route";
import { POST as postChat } from "@/app/api/chat/route";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = process.env.NODE_ENV;
const originalProviderMode = process.env.AI_PROVIDER_MODE;

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalProviderMode === undefined) delete mutableEnv.AI_PROVIDER_MODE;
  else mutableEnv.AI_PROVIDER_MODE = originalProviderMode;
});

describe("provider development mode", () => {
  it("returns the local mock catalog without provider credentials", async () => {
    mutableEnv.NODE_ENV = "test";
    mutableEnv.AI_PROVIDER_MODE = "mock";
    const response = await getModels();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("development-mock");
    expect(body.models).toHaveLength(2);
  });

  it("keeps the provider model catalog disabled in production", async () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.AI_PROVIDER_MODE = "provider-dev";

    const response = await getModels();

    expect(response.status).toBe(503);
  });

  it("keeps direct provider inference disabled in production", async () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.AI_PROVIDER_MODE = "provider-dev";
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello", modelId: "openai:gpt-test", idempotencyKey: "c2cc4436-803e-46cb-bdf5-cc33f0cc3ff6" }),
    });

    const response = await postChat(request);

    expect(response.status).toBe(503);
  });
});
