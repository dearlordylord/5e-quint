import { Match } from "effect";

import {
  resourceCount,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";

const byTag = Match.discriminator("tag");

export type SpellSlotLedger = {
  readonly slotLevel: SpellSlotLevel;
  readonly slotsRemaining: ResourceCount;
};

export type SpellSlotExpenditureState = {
  readonly slotLedger: SpellSlotLedger;
  readonly slotSpellCastThisTurn: boolean;
};

export type SpellSlotExpenditureRequest =
  | { readonly tag: "spellSlotExpenditureNotRequired" }
  | {
      readonly tag: "spellSlotExpenditureRequired";
      readonly slotLevel: SpellSlotLevel;
    };

export type SpellSlotExpenditureResult =
  | { readonly tag: "spellSlotExpenditureRejected" }
  | { readonly tag: "spellSlotExpenditureAcceptedSlotless" }
  | {
      readonly tag: "spellSlotExpended";
      readonly state: SpellSlotExpenditureState;
    };

export type SpellSlotCapacity = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export const spellSlotExpenditureNotRequired: SpellSlotExpenditureRequest = {
  tag: "spellSlotExpenditureNotRequired",
};

export function spellSlotExpenditureRequired(
  slotLevel: SpellSlotLevel,
): SpellSlotExpenditureRequest {
  return { tag: "spellSlotExpenditureRequired", slotLevel };
}

export function legalSpellSlotLedger(ledger: SpellSlotLedger): boolean {
  return (
    Number(ledger.slotLevel) >= 1 &&
    Number(ledger.slotLevel) <= 9 &&
    Number(ledger.slotsRemaining) >= 0 &&
    Number(ledger.slotsRemaining) <= 6
  );
}

export function legalSpellSlotExpenditureState(
  state: SpellSlotExpenditureState,
): boolean {
  return legalSpellSlotLedger(state.slotLedger);
}

export function canExpendSpellSlot(
  state: SpellSlotExpenditureState,
  request: SpellSlotExpenditureRequest,
): boolean {
  if (!legalSpellSlotExpenditureState(state)) {
    return false;
  }
  return Match.value(request).pipe(
    byTag("spellSlotExpenditureNotRequired", () => true),
    byTag(
      "spellSlotExpenditureRequired",
      ({ slotLevel }) =>
        !state.slotSpellCastThisTurn &&
        slotLevel === state.slotLedger.slotLevel &&
        Number(state.slotLedger.slotsRemaining) > 0,
    ),
    Match.exhaustive,
  );
}

export function applySpellSlotExpenditure(
  state: SpellSlotExpenditureState,
  request: SpellSlotExpenditureRequest,
): SpellSlotExpenditureResult {
  if (!canExpendSpellSlot(state, request)) {
    return { tag: "spellSlotExpenditureRejected" };
  }
  return Match.value(request).pipe(
    byTag("spellSlotExpenditureNotRequired", () => ({
      tag: "spellSlotExpenditureAcceptedSlotless" as const,
    })),
    byTag("spellSlotExpenditureRequired", () => ({
      tag: "spellSlotExpended" as const,
      state: {
        slotLedger: {
          ...state.slotLedger,
          slotsRemaining: resourceCount(
            Number(state.slotLedger.slotsRemaining) - 1,
          ),
        },
        slotSpellCastThisTurn: true,
      },
    })),
    Match.exhaustive,
  );
}

export function spellSlotExpenditureResultState(
  priorState: SpellSlotExpenditureState,
  result: SpellSlotExpenditureResult,
): SpellSlotExpenditureState {
  return Match.value(result).pipe(
    byTag("spellSlotExpenditureRejected", () => priorState),
    byTag("spellSlotExpenditureAcceptedSlotless", () => priorState),
    byTag("spellSlotExpended", ({ state }) => state),
    Match.exhaustive,
  );
}

export function spellSlotExpenditureAccepted(
  result: SpellSlotExpenditureResult,
): boolean {
  return result.tag !== "spellSlotExpenditureRejected";
}

export function spellSlotWasExpended(
  result: SpellSlotExpenditureResult,
): boolean {
  return result.tag === "spellSlotExpended";
}

export function spellSlotCapacitySlotsRemaining(
  capacity: SpellSlotCapacity,
): ResourceCount {
  return resourceCount(Number(capacity.count) - Number(capacity.expended));
}

export function canExpendSpellSlotCapacity(
  capacity: SpellSlotCapacity,
  slotLevel: SpellSlotLevel,
): boolean {
  return (
    capacity.spellLevel === slotLevel &&
    canExpendSpellSlot(
      {
        slotLedger: {
          slotLevel: capacity.spellLevel,
          slotsRemaining: spellSlotCapacitySlotsRemaining(capacity),
        },
        slotSpellCastThisTurn: false,
      },
      spellSlotExpenditureRequired(slotLevel),
    )
  );
}

export function expendSpellSlotInCapacities(
  capacities: readonly SpellSlotCapacity[],
  slotLevel: SpellSlotLevel,
): readonly SpellSlotCapacity[] {
  let slotSpent = false;
  return capacities.map((capacity) => {
    if (slotSpent || !canExpendSpellSlotCapacity(capacity, slotLevel)) {
      return capacity;
    }

    slotSpent = true;
    return {
      ...capacity,
      expended: resourceCount(Number(capacity.expended) + 1),
    };
  });
}
