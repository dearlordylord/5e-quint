import { Match } from "effect";

import type { Condition } from "@dnd/shared/types";

export type ConditionFlag = Exclude<Condition, "incapacitated">;

export type ConditionState = Readonly<Record<ConditionFlag, boolean>> & {
  readonly directIncapacitated: boolean;
};

export const EMPTY_CONDITION_STATE: ConditionState = Object.freeze({
  blinded: false,
  charmed: false,
  deafened: false,
  frightened: false,
  grappled: false,
  invisible: false,
  paralyzed: false,
  petrified: false,
  poisoned: false,
  prone: false,
  restrained: false,
  stunned: false,
  unconscious: false,
  directIncapacitated: false,
});

export const isIncapacitated = (state: ConditionState): boolean =>
  state.directIncapacitated ||
  state.paralyzed ||
  state.petrified ||
  state.stunned ||
  state.unconscious;

export const hasCondition = (
  state: ConditionState,
  condition: Condition,
): boolean =>
  Match.value(condition).pipe(
    Match.when("incapacitated", () => isIncapacitated(state)),
    Match.when("prone", () => state.prone || state.unconscious),
    Match.when("blinded", () => state.blinded),
    Match.when("charmed", () => state.charmed),
    Match.when("deafened", () => state.deafened),
    Match.when("frightened", () => state.frightened),
    Match.when("grappled", () => state.grappled),
    Match.when("invisible", () => state.invisible),
    Match.when("paralyzed", () => state.paralyzed),
    Match.when("petrified", () => state.petrified),
    Match.when("poisoned", () => state.poisoned),
    Match.when("restrained", () => state.restrained),
    Match.when("stunned", () => state.stunned),
    Match.when("unconscious", () => state.unconscious),
    Match.exhaustive,
  );

export const applyCondition = (
  state: ConditionState,
  condition: Condition,
): ConditionState =>
  Match.value(condition).pipe(
    Match.when("incapacitated", () => ({
      ...state,
      directIncapacitated: true,
    })),
    Match.when("unconscious", () => ({
      ...state,
      unconscious: true,
      prone: true,
    })),
    Match.when("blinded", () => ({ ...state, blinded: true })),
    Match.when("charmed", () => ({ ...state, charmed: true })),
    Match.when("deafened", () => ({ ...state, deafened: true })),
    Match.when("frightened", () => ({ ...state, frightened: true })),
    Match.when("grappled", () => ({ ...state, grappled: true })),
    Match.when("invisible", () => ({ ...state, invisible: true })),
    Match.when("paralyzed", () => ({ ...state, paralyzed: true })),
    Match.when("petrified", () => ({ ...state, petrified: true })),
    Match.when("poisoned", () => ({ ...state, poisoned: true })),
    Match.when("prone", () => ({ ...state, prone: true })),
    Match.when("restrained", () => ({ ...state, restrained: true })),
    Match.when("stunned", () => ({ ...state, stunned: true })),
    Match.exhaustive,
  );

export const removeCondition = (
  state: ConditionState,
  condition: Condition,
): ConditionState =>
  Match.value(condition).pipe(
    Match.when("incapacitated", () => ({
      ...state,
      directIncapacitated: false,
    })),
    // RAW: when Unconscious ends, the creature remains Prone.
    Match.when("unconscious", () => ({ ...state, unconscious: false })),
    Match.when("blinded", () => ({ ...state, blinded: false })),
    Match.when("charmed", () => ({ ...state, charmed: false })),
    Match.when("deafened", () => ({ ...state, deafened: false })),
    Match.when("frightened", () => ({ ...state, frightened: false })),
    Match.when("grappled", () => ({ ...state, grappled: false })),
    Match.when("invisible", () => ({ ...state, invisible: false })),
    Match.when("paralyzed", () => ({ ...state, paralyzed: false })),
    Match.when("petrified", () => ({ ...state, petrified: false })),
    Match.when("poisoned", () => ({ ...state, poisoned: false })),
    Match.when("prone", () =>
      state.unconscious ? state : { ...state, prone: false },
    ),
    Match.when("restrained", () => ({ ...state, restrained: false })),
    Match.when("stunned", () => ({ ...state, stunned: false })),
    Match.exhaustive,
  );
