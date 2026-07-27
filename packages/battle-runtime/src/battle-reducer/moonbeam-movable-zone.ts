// Moonbeam movable Cylinder composite transition.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE

import { Match } from "effect";
import { expendActionSpellSlot } from "./action-spell-slot-expenditure.ts";
import {
  applyDamageToPositiveHitPoints,
  halfDamageAfterSuccessfulSave,
} from "./focused-spell-hazard-damage.ts";
import {
  projectShapeShiftRuntimeReversion,
  trueFormRuntimeState,
  type BattleShapeShiftedRuntimeState,
} from "./shape-shifting.ts";

const byTag = Match.discriminator("tag");

export type MoonbeamSaveTrigger =
  | "appearsInArea"
  | "areaMovesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";

export const MOONBEAM_DURATION_TICKS = 10;
export const MOONBEAM_REPOSITION_MAX_MOVE_FEET = 60;
export const MOONBEAM_MINIMUM_SLOT_LEVEL = 2;
export const MOONBEAM_BASE_DAMAGE_DICE = 2;
export const MOONBEAM_DAMAGE_DIE_SIZE = 10;

export type MoonbeamMovableZoneCreatureKind = "monsterCreature";

export type MoonbeamMovableZoneCreatureVitals = {
  readonly kind: MoonbeamMovableZoneCreatureKind;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly temporaryHitPoints: number;
  readonly dead: boolean;
  readonly unconscious: boolean;
};

export type MoonbeamMovableZone =
  | { readonly tag: "absent" }
  | {
      readonly tag: "active";
      readonly damageDice: number;
      readonly durationTicks: number;
      readonly repositionMaxMoveFeet: number;
      readonly savedThisTurn: boolean;
    };

export type MoonbeamMovableZoneSlotLedger = {
  readonly slotLevel: number;
  readonly slotsRemaining: number;
};

export type MoonbeamTargetShapeShiftState =
  | {
      readonly tag: "unsuppressed";
      readonly shapeShift: BattleShapeShiftedRuntimeState;
    }
  | { readonly tag: "suppressedTrueForm" };

export type MoonbeamMovableZoneState = {
  readonly actionAvailable: boolean;
  readonly zone: MoonbeamMovableZone;
  readonly slotLedger: MoonbeamMovableZoneSlotLedger;
  readonly slotSpellCastThisTurn: boolean;
  readonly targetVitals: MoonbeamMovableZoneCreatureVitals;
  readonly targetShapeShift: MoonbeamTargetShapeShiftState;
};

const MOONBEAM_TARGET_TRUE_FORM = {
  tag: "unsuppressed",
  shapeShift: trueFormRuntimeState(),
} as const satisfies MoonbeamTargetShapeShiftState;
const MOONBEAM_TARGET_SUPPRESSED_TRUE_FORM = {
  tag: "suppressedTrueForm",
} as const satisfies MoonbeamTargetShapeShiftState;

export type MoonbeamMovableZoneFills = {
  readonly savingThrowSucceeded: boolean;
  readonly rolledDamage: number;
  readonly moveFeet: number;
};

export function moonbeamDamageDice(slotLevel: number): number {
  return (
    MOONBEAM_BASE_DAMAGE_DICE +
    Math.floor(slotLevel) -
    MOONBEAM_MINIMUM_SLOT_LEVEL
  );
}

export function moonbeamDamageAfterSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return halfDamageAfterSuccessfulSave(input);
}

export function moonbeamDamageRollAccepted(input: {
  readonly rolledDamage: number;
  readonly damageDice: number;
}): boolean {
  return (
    Number.isInteger(input.rolledDamage) &&
    input.rolledDamage >= input.damageDice &&
    input.rolledDamage <= input.damageDice * MOONBEAM_DAMAGE_DIE_SIZE
  );
}

export function moonbeamMoveDistanceAccepted(input: {
  readonly moveFeet: number;
  readonly maxMoveFeet: number;
}): boolean {
  return (
    Number.isInteger(input.moveFeet) &&
    input.moveFeet > 0 &&
    input.moveFeet <= input.maxMoveFeet
  );
}

export function resolveMoonbeamCast(
  state: MoonbeamMovableZoneState,
  slotLevel: number,
): MoonbeamMovableZoneState {
  const slotExpenditure = expendActionSpellSlot(
    state,
    slotLevel,
    MOONBEAM_MINIMUM_SLOT_LEVEL,
  );
  if (slotExpenditure === undefined) {
    return state;
  }
  return {
    ...state,
    actionAvailable: false,
    zone: {
      tag: "active",
      damageDice: moonbeamDamageDice(slotLevel),
      durationTicks: MOONBEAM_DURATION_TICKS,
      repositionMaxMoveFeet: MOONBEAM_REPOSITION_MAX_MOVE_FEET,
      savedThisTurn: false,
    },
    ...slotExpenditure,
  };
}

export function resolveMoonbeamSave(
  state: MoonbeamMovableZoneState,
  _trigger: MoonbeamSaveTrigger,
  fills: MoonbeamMovableZoneFills,
): MoonbeamMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", (zone) => {
      if (
        zone.savedThisTurn ||
        !moonbeamDamageRollAccepted({
          rolledDamage: fills.rolledDamage,
          damageDice: zone.damageDice,
        })
      ) {
        return state;
      }
      const damaged = {
        ...state,
        targetVitals: applyDamageToPositiveHitPoints(
          state.targetVitals,
          moonbeamDamageAfterSave(fills),
        ),
      };
      const shifted = applyMoonbeamShapeShiftRider(
        damaged,
        fills.savingThrowSucceeded,
      );
      return {
        ...shifted,
        zone: moonbeamZoneWithSavedThisTurn(shifted.zone, true),
      };
    }),
    Match.exhaustive,
  );
}

export function resolveMoonbeamReposition(
  state: MoonbeamMovableZoneState,
  moveFeet: number,
): MoonbeamMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", (zone) =>
      !state.actionAvailable ||
      !moonbeamMoveDistanceAccepted({
        moveFeet,
        maxMoveFeet: zone.repositionMaxMoveFeet,
      })
        ? state
        : { ...state, actionAvailable: false },
    ),
    Match.exhaustive,
  );
}

export function resetMoonbeamSavedThisTurn(
  state: MoonbeamMovableZoneState,
): MoonbeamMovableZoneState {
  return {
    ...state,
    zone: moonbeamZoneWithSavedThisTurn(state.zone, false),
  };
}

export function beginMoonbeamLaterTurn(
  state: MoonbeamMovableZoneState,
): MoonbeamMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", () => ({
      ...resetMoonbeamSavedThisTurn(state),
      actionAvailable: true,
      slotSpellCastThisTurn: false,
    })),
    Match.exhaustive,
  );
}

export function resolveMoonbeamCylinderExit(
  state: MoonbeamMovableZoneState,
): MoonbeamMovableZoneState {
  return Match.value(state.targetShapeShift).pipe(
    byTag("unsuppressed", () => state),
    byTag("suppressedTrueForm", () => ({
      ...state,
      targetShapeShift: MOONBEAM_TARGET_TRUE_FORM,
    })),
    Match.exhaustive,
  );
}

export function resolveMoonbeamSpellCleanup(
  state: MoonbeamMovableZoneState,
): MoonbeamMovableZoneState {
  return { ...resolveMoonbeamCylinderExit(state), zone: { tag: "absent" } };
}

function applyMoonbeamShapeShiftRider(
  state: MoonbeamMovableZoneState,
  savingThrowSucceeded: boolean,
): MoonbeamMovableZoneState {
  if (savingThrowSucceeded) {
    return state;
  }
  return Match.value(state.targetShapeShift).pipe(
    byTag("suppressedTrueForm", () => state),
    byTag("unsuppressed", (targetShapeShift) => {
      const projection = projectShapeShiftRuntimeReversion(
        targetShapeShift.shapeShift,
      );
      return Match.value(projection).pipe(
        byTag("alreadyTrueForm", () => state),
        byTag("revertedToTrueForm", () => ({
          ...state,
          targetShapeShift: MOONBEAM_TARGET_SUPPRESSED_TRUE_FORM,
        })),
        Match.exhaustive,
      );
    }),
    Match.exhaustive,
  );
}

function moonbeamZoneWithSavedThisTurn(
  zone: MoonbeamMovableZone,
  savedThisTurn: boolean,
): MoonbeamMovableZone {
  return Match.value(zone).pipe(
    byTag("absent", () => zone),
    byTag("active", (active) => ({ ...active, savedThisTurn })),
    Match.exhaustive,
  );
}
