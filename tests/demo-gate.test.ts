import { afterEach, describe, expect, it } from "vitest";
import { getDemoStore } from "@/lib/server/demo-store";

const originalNodeEnv = process.env.NODE_ENV;
const originalProviderMode = process.env.AI_PROVIDER_MODE;
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalProviderMode === undefined) delete mutableEnv.AI_PROVIDER_MODE;
  else mutableEnv.AI_PROVIDER_MODE = originalProviderMode;
});

describe("development mock gate", () => {
  it("never exposes the demo store in production, even when mock mode is selected", () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.AI_PROVIDER_MODE = "mock";
    expect(getDemoStore()).toBeNull();
  });

  it("requires an explicit mock selection outside production", () => {
    mutableEnv.NODE_ENV = "development";
    delete mutableEnv.AI_PROVIDER_MODE;
    expect(getDemoStore()).toBeNull();
    mutableEnv.AI_PROVIDER_MODE = "mock";
    expect(getDemoStore()).not.toBeNull();
  });
});
