import { randomUUID } from "node:crypto";
import { WalletLedger, type LedgerEntry } from "@/lib/credits/accounting";

export interface DemoUsageRecord {
  requestId: string;
  modelId: string;
  promptPreview: string;
  inputTokens: number;
  outputTokens: number;
  providerCostNanoUsd: bigint;
  customerChargeAtoms: bigint;
  status: "simulated";
  createdAt: number;
}

export class DemoStore {
  readonly wallet = new WalletLedger([
    { id: "local-demo-subscription", source: "subscription", remainingAtoms: 4_800_000n, expiresAt: null },
  ]);
  private readonly idempotency = new Map<string, { requestId: string; status: "reserved" | "settled" | "released" }>();
  private readonly records: DemoUsageRecord[] = [];

  reserve(idempotencyKey: string, atoms: bigint): { requestId: string; duplicate: boolean } {
    const previous = this.idempotency.get(idempotencyKey);
    if (previous) return { requestId: previous.requestId, duplicate: true };
    const requestId = randomUUID();
    this.wallet.reserve(requestId, idempotencyKey, atoms);
    this.idempotency.set(idempotencyKey, { requestId, status: "reserved" });
    return { requestId, duplicate: false };
  }

  settle(record: DemoUsageRecord): void {
    const reservation = this.wallet.getReservation(record.requestId);
    if (!reservation) throw new Error("Cannot settle an unknown demo request.");
    this.wallet.settle(record.requestId, record.customerChargeAtoms);
    const current = this.idempotency.get(reservation.idempotencyKey);
    if (current) current.status = "settled";
    this.records.unshift(record);
  }

  release(requestId: string): void {
    const reservation = this.wallet.getReservation(requestId);
    if (!reservation || reservation.status !== "reserved") return;
    this.wallet.release(requestId);
    const current = this.idempotency.get(reservation.idempotencyKey);
    if (current) current.status = "released";
  }

  snapshot() {
    const entries: LedgerEntry[] = this.wallet.getEntries();
    return {
      mode: "development-mock" as const,
      wallet: {
        availableAtoms: this.wallet.getAvailableAtoms().toString(),
        reservedAtoms: this.wallet.getReservedAtoms().toString(),
        lots: this.wallet.getLots().map((lot) => ({ id: lot.id, source: lot.source, remainingAtoms: lot.remainingAtoms.toString(), reservedAtoms: lot.reservedAtoms.toString() })),
      },
      usage: this.records.slice(0, 12).map((record) => ({
        requestId: record.requestId,
        modelId: record.modelId,
        promptPreview: record.promptPreview,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        providerCostNanoUsd: record.providerCostNanoUsd.toString(),
        customerChargeAtoms: record.customerChargeAtoms.toString(),
        status: record.status,
        createdAt: record.createdAt,
      })),
      ledger: entries.filter((entry) => entry.kind === "charge" || entry.kind === "grant").slice(0, 12).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        atomsDelta: entry.atomsDelta.toString(),
        source: entry.source,
        referenceId: entry.referenceId,
        createdAt: entry.createdAt,
      })),
    };
  }
}

declare global {
  var __thinkZoneDemoStore: DemoStore | undefined;
}

export function getDemoStore(): DemoStore | null {
  if (process.env.NODE_ENV === "production" || process.env.AI_PROVIDER_MODE !== "mock") return null;
  globalThis.__thinkZoneDemoStore ??= new DemoStore();
  return globalThis.__thinkZoneDemoStore;
}
