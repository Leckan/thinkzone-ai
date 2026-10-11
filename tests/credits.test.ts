import { describe, expect, it } from "vitest";
import {
  customerChargeAtoms,
  formatTzc,
  InsufficientCreditsError,
  maximumChargeAtoms,
  providerCostNanoUsd,
  WalletLedger,
} from "@/lib/credits/accounting";

describe("credit pricing", () => {
  it("applies target gross margin and rounds up to whole credit atoms", () => {
    // $0.025 provider cost at 40% margin -> $0.041666667, or 41,667 atoms.
    expect(customerChargeAtoms(25_000_000n, 4_000)).toBe(41_667n);
    expect(formatTzc(41_667n)).toBe("41.667");
  });

  it("calculates provider costs from token usage and rate card values", () => {
    const rate = { inputNanoUsdPerMillionTokens: 150_000_000n, outputNanoUsdPerMillionTokens: 600_000_000n };
    expect(providerCostNanoUsd(1_000_000n, 500_000n, rate)).toBe(450_000_000n);
    expect(maximumChargeAtoms(1_000n, 200n, rate, 4_000)).toBeGreaterThan(0n);
  });

  it("rejects negative usage and invalid margins", () => {
    expect(() => providerCostNanoUsd(-1n, 0n, { inputNanoUsdPerMillionTokens: 1n, outputNanoUsdPerMillionTokens: 1n })).toThrow(RangeError);
    expect(() => customerChargeAtoms(100n, 10_000)).toThrow(RangeError);
  });
});

describe("wallet ledger", () => {
  it("consumes promotional, subscription, then purchased credits and releases the unused reservation", () => {
    const wallet = new WalletLedger([
      { id: "purchased", source: "purchased", remainingAtoms: 4_000n, expiresAt: null },
      { id: "subscription", source: "subscription", remainingAtoms: 2_000n, expiresAt: null },
      { id: "promo", source: "promotional", remainingAtoms: 1_000n, expiresAt: null },
    ]);

    const reservation = wallet.reserve("request-1", "idem-1", 2_500n);
    expect(reservation.parts.map((part) => [part.source, part.atoms])).toEqual([
      ["promotional", 1_000n], ["subscription", 1_500n],
    ]);
    expect(wallet.getAvailableAtoms()).toBe(4_500n);
    expect(wallet.getReservedAtoms()).toBe(2_500n);

    wallet.settle("request-1", 1_800n);
    expect(wallet.getAvailableAtoms()).toBe(5_200n);
    expect(wallet.getReservedAtoms()).toBe(0n);
    expect(wallet.getLots().find((lot) => lot.id === "promo")?.remainingAtoms).toBe(0n);
    expect(wallet.getLots().find((lot) => lot.id === "subscription")?.remainingAtoms).toBe(1_200n);
    expect(wallet.getEntries().filter((entry) => entry.kind === "charge").reduce((sum, entry) => sum - entry.atomsDelta, 0n)).toBe(1_800n);
  });

  it("prevents concurrent reservations from spending the same available credits", () => {
    const wallet = new WalletLedger([{ id: "only-lot", source: "subscription", remainingAtoms: 1_000n, expiresAt: null }]);
    wallet.reserve("request-a", "idem-a", 700n);
    expect(() => wallet.reserve("request-b", "idem-b", 400n)).toThrow(InsufficientCreditsError);
    expect(wallet.getAvailableAtoms()).toBe(300n);
  });

  it("makes active reservations idempotent and settles the same final charge only once", () => {
    const wallet = new WalletLedger([{ id: "lot", source: "subscription", remainingAtoms: 5_000n, expiresAt: null }]);
    const first = wallet.reserve("request-a", "same-key", 1_000n);
    const retry = wallet.reserve("request-b", "same-key", 1_000n);
    expect(retry.id).toBe(first.id);
    wallet.settle("request-a", 500n);
    wallet.settle("request-a", 500n);
    expect(wallet.getAvailableAtoms()).toBe(4_500n);
    expect(() => wallet.settle("request-a", 600n)).toThrow(/different amount/);
  });

  it("leaves the reservation intact when a final charge exceeds its maximum", () => {
    const wallet = new WalletLedger([{ id: "lot", source: "subscription", remainingAtoms: 5_000n, expiresAt: null }]);
    wallet.reserve("request-a", "idem", 1_000n);
    expect(() => wallet.settle("request-a", 1_001n)).toThrow(/exceeds the reserved amount/);
    expect(wallet.getAvailableAtoms()).toBe(4_000n);
    expect(wallet.getReservedAtoms()).toBe(1_000n);
  });

  it("releases reservations after cancellation without adding a charge", () => {
    const wallet = new WalletLedger([{ id: "lot", source: "subscription", remainingAtoms: 5_000n, expiresAt: null }]);
    wallet.reserve("request-a", "idem", 1_000n);
    wallet.release("request-a");
    expect(wallet.getAvailableAtoms()).toBe(5_000n);
    expect(wallet.getReservedAtoms()).toBe(0n);
    expect(wallet.getEntries().filter((entry) => entry.kind === "charge")).toHaveLength(0);
  });
});
