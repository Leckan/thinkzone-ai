export const ATOMS_PER_TZC = 1_000n;
export const NANO_USD_PER_ATOM = 1_000n;
const BASIS_POINTS = 10_000n;

export type CreditSource = "promotional" | "subscription" | "purchased";
export type LedgerKind = "grant" | "reserve" | "charge" | "release";

export interface CreditLot {
  id: string;
  source: CreditSource;
  remainingAtoms: bigint;
  reservedAtoms: bigint;
  expiresAt: number | null;
}

export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  atomsDelta: bigint;
  source: CreditSource | "mixed";
  referenceId: string;
  createdAt: number;
}

interface ReservationPart {
  lotId: string;
  source: CreditSource;
  atoms: bigint;
}

export interface Reservation {
  id: string;
  idempotencyKey: string;
  reservedAtoms: bigint;
  parts: ReservationPart[];
  status: "reserved" | "settled" | "released";
  chargedAtoms?: bigint;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient available credits.");
    this.name = "InsufficientCreditsError";
  }
}

export class InvalidReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReservationError";
  }
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) throw new RangeError("Expected non-negative numerator and positive denominator.");
  return numerator === 0n ? 0n : (numerator + denominator - 1n) / denominator;
}

export interface TokenRateCard {
  inputNanoUsdPerMillionTokens: bigint;
  outputNanoUsdPerMillionTokens: bigint;
}

export function providerCostNanoUsd(
  inputTokens: bigint,
  outputTokens: bigint,
  rateCard: TokenRateCard,
): bigint {
  if (inputTokens < 0n || outputTokens < 0n) throw new RangeError("Usage quantities cannot be negative.");
  const perMillion = 1_000_000n;
  return ceilDiv(inputTokens * rateCard.inputNanoUsdPerMillionTokens, perMillion)
    + ceilDiv(outputTokens * rateCard.outputNanoUsdPerMillionTokens, perMillion);
}

export function customerChargeAtoms(providerCostNano: bigint, targetMarginBps: number): bigint {
  if (providerCostNano < 0n) throw new RangeError("Provider cost cannot be negative.");
  if (!Number.isInteger(targetMarginBps) || targetMarginBps < 0 || targetMarginBps >= 10_000) {
    throw new RangeError("Target gross margin must be between 0 and 9,999 basis points.");
  }
  const margin = BigInt(targetMarginBps);
  const customerChargeNano = ceilDiv(providerCostNano * BASIS_POINTS, BASIS_POINTS - margin);
  return ceilDiv(customerChargeNano, NANO_USD_PER_ATOM);
}

export function maximumChargeAtoms(
  inputTokenLimit: bigint,
  outputTokenLimit: bigint,
  rateCard: TokenRateCard,
  targetMarginBps: number,
): bigint {
  return customerChargeAtoms(providerCostNanoUsd(inputTokenLimit, outputTokenLimit, rateCard), targetMarginBps);
}

export function formatTzc(atoms: bigint, maximumFractionDigits = 3): string {
  const negative = atoms < 0n;
  const absolute = negative ? -atoms : atoms;
  const whole = absolute / ATOMS_PER_TZC;
  const fraction = (absolute % ATOMS_PER_TZC).toString().padStart(3, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return `${negative ? "−" : ""}${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""}`;
}

const sourcePriority: Record<CreditSource, number> = {
  promotional: 0,
  subscription: 1,
  purchased: 2,
};

export class WalletLedger {
  private readonly lots = new Map<string, CreditLot>();
  private readonly reservations = new Map<string, Reservation>();
  private readonly idempotency = new Map<string, string>();
  private readonly entries: LedgerEntry[] = [];
  private sequence = 0;

  constructor(seedLots: Array<Omit<CreditLot, "reservedAtoms"> & { reservedAtoms?: bigint }> = []) {
    for (const lot of seedLots) {
      if (lot.remainingAtoms <= 0n) throw new RangeError("Credit lots must contain a positive amount.");
      if (this.lots.has(lot.id)) throw new Error(`Duplicate credit lot: ${lot.id}`);
      this.lots.set(lot.id, { ...lot, reservedAtoms: lot.reservedAtoms ?? 0n });
      this.entries.push({
        id: this.nextId("ledger"), kind: "grant", atomsDelta: lot.remainingAtoms, source: lot.source,
        referenceId: lot.id, createdAt: Date.now(),
      });
    }
  }

  getAvailableAtoms(now = Date.now()): bigint {
    let total = 0n;
    for (const lot of this.lots.values()) {
      if (lot.expiresAt !== null && lot.expiresAt <= now) continue;
      total += lot.remainingAtoms - lot.reservedAtoms;
    }
    return total;
  }

  getReservedAtoms(): bigint {
    let total = 0n;
    for (const reservation of this.reservations.values()) {
      if (reservation.status === "reserved") total += reservation.reservedAtoms;
    }
    return total;
  }

  getLots(now = Date.now()): CreditLot[] {
    return [...this.lots.values()].map((lot) => ({ ...lot })).filter((lot) => lot.expiresAt === null || lot.expiresAt > now);
  }

  getEntries(): LedgerEntry[] {
    return this.entries.map((entry) => ({ ...entry })).reverse();
  }

  getReservation(id: string): Reservation | undefined {
    const reservation = this.reservations.get(id);
    return reservation ? { ...reservation, parts: reservation.parts.map((part) => ({ ...part })) } : undefined;
  }

  reserve(id: string, idempotencyKey: string, atoms: bigint, now = Date.now()): Reservation {
    if (atoms <= 0n) throw new RangeError("Reservation amount must be positive.");
    const previousId = this.idempotency.get(idempotencyKey);
    if (previousId) {
      const previous = this.reservations.get(previousId)!;
      if (previous.status !== "reserved") throw new InvalidReservationError("This idempotency key already completed.");
      return this.getReservation(previousId)!;
    }
    if (this.reservations.has(id)) throw new Error("Reservation identifier already exists.");

    const eligible = [...this.lots.values()]
      .filter((lot) => lot.expiresAt === null || lot.expiresAt > now)
      .sort((a, b) => sourcePriority[a.source] - sourcePriority[b.source] || (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
    if (this.getAvailableAtoms(now) < atoms) throw new InsufficientCreditsError();

    let left = atoms;
    const parts: ReservationPart[] = [];
    for (const lot of eligible) {
      const available = lot.remainingAtoms - lot.reservedAtoms;
      const allocated = available < left ? available : left;
      if (allocated <= 0n) continue;
      lot.reservedAtoms += allocated;
      parts.push({ lotId: lot.id, source: lot.source, atoms: allocated });
      left -= allocated;
      if (left === 0n) break;
    }
    if (left !== 0n) throw new InsufficientCreditsError();

    const reservation: Reservation = { id, idempotencyKey, reservedAtoms: atoms, parts, status: "reserved" };
    this.reservations.set(id, reservation);
    this.idempotency.set(idempotencyKey, id);
    this.entries.push({ id: this.nextId("ledger"), kind: "reserve", atomsDelta: 0n, source: this.oneSource(parts), referenceId: id, createdAt: Date.now() });
    return this.getReservation(id)!;
  }

  settle(id: string, chargedAtoms: bigint): Reservation {
    const reservation = this.reservations.get(id);
    if (!reservation) throw new InvalidReservationError("Reservation was not found.");
    if (chargedAtoms < 0n) throw new RangeError("Charge cannot be negative.");
    if (reservation.status === "settled") {
      if (reservation.chargedAtoms === chargedAtoms) return this.getReservation(id)!;
      throw new InvalidReservationError("Reservation was already settled with a different amount.");
    }
    if (reservation.status !== "reserved") throw new InvalidReservationError("Only a live reservation can be settled.");
    if (chargedAtoms > reservation.reservedAtoms) throw new InvalidReservationError("Final charge exceeds the reserved amount.");

    let left = chargedAtoms;
    const chargedBySource = new Map<CreditSource, bigint>();
    for (const part of reservation.parts) {
      const lot = this.lots.get(part.lotId)!;
      const consumed = part.atoms < left ? part.atoms : left;
      lot.reservedAtoms -= part.atoms;
      lot.remainingAtoms -= consumed;
      if (consumed > 0n) chargedBySource.set(part.source, (chargedBySource.get(part.source) ?? 0n) + consumed);
      left -= consumed;
    }
    if (left !== 0n) throw new InvalidReservationError("Reserved allocations did not cover the charge.");

    for (const [source, atoms] of chargedBySource) {
      this.entries.push({ id: this.nextId("ledger"), kind: "charge", atomsDelta: -atoms, source, referenceId: id, createdAt: Date.now() });
    }
    reservation.status = "settled";
    reservation.chargedAtoms = chargedAtoms;
    this.entries.push({ id: this.nextId("ledger"), kind: "release", atomsDelta: 0n, source: this.oneSource(reservation.parts), referenceId: id, createdAt: Date.now() });
    return this.getReservation(id)!;
  }

  release(id: string): Reservation {
    const reservation = this.reservations.get(id);
    if (!reservation) throw new InvalidReservationError("Reservation was not found.");
    if (reservation.status === "released") return this.getReservation(id)!;
    if (reservation.status !== "reserved") throw new InvalidReservationError("Only a live reservation can be released.");
    for (const part of reservation.parts) this.lots.get(part.lotId)!.reservedAtoms -= part.atoms;
    reservation.status = "released";
    this.entries.push({ id: this.nextId("ledger"), kind: "release", atomsDelta: 0n, source: this.oneSource(reservation.parts), referenceId: id, createdAt: Date.now() });
    return this.getReservation(id)!;
  }

  private oneSource(parts: ReservationPart[]): CreditSource | "mixed" {
    const unique = new Set(parts.map((part) => part.source));
    return unique.size === 1 ? parts[0].source : "mixed";
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
