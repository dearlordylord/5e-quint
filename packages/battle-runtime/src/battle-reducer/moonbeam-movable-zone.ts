// Moonbeam movable Cylinder composite transition.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE

import { damageAmount, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  spellSaveGateBranch,
  spellSaveGateDamageAmount,
  spellSaveGateDamageResult,
} from "@dnd/shared-algebras/spell-save-gate-algebra";
import {
  applySpellSlotExpenditure,
  spellSlotExpenditureAccepted,
  spellSlotExpenditureRequired,
  spellSlotExpenditureResultState,
} from "@dnd/shared-algebras/spell-slot-expenditure-algebra";
import { Match } from "effect";

const byTag = Match.discriminator("tag");

const MOONBEAM_SAVE_TRIGGERS = [
  "appearsInArea",
  "areaMovesIntoSpace",
  "entersArea",
  "endsTurnInArea",
] as const;
export type MoonbeamSaveTrigger = (typeof MOONBEAM_SAVE_TRIGGERS)[number];

const MOONBEAM_SHAPE_SHIFT_STATES = [
  "trueForm",
  "supportedShapeShifted",
  "unsupportedSpellShapeShifted",
  "unsupportedStatBlockShapechanger",
  "shapeShiftSuppressedTrueForm",
] as const;
export type MoonbeamShapeShiftState =
  (typeof MOONBEAM_SHAPE_SHIFT_STATES)[number];

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

export type MoonbeamMovableZoneState = {
  readonly actionAvailable: boolean;
  readonly zone: MoonbeamMovableZone;
  readonly slotLedger: MoonbeamMovableZoneSlotLedger;
  readonly slotSpellCastThisTurn: boolean;
  readonly targetVitals: MoonbeamMovableZoneCreatureVitals;
  readonly targetShapeShift: MoonbeamShapeShiftState;
};

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
  const branch = spellSaveGateBranch(input.savingThrowSucceeded);
  const saveDamageResult = spellSaveGateDamageResult({
    branch,
    damageOnSuccess: "halfDamage",
  });
  return Number(
    spellSaveGateDamageAmount(
      damageAmount(input.rolledDamage),
      saveDamageResult,
    ),
  );
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
  if (
    !state.actionAvailable ||
    !Number.isInteger(slotLevel) ||
    slotLevel < MOONBEAM_MINIMUM_SLOT_LEVEL ||
    slotLevel > 9 ||
    !Number.isInteger(state.slotLedger.slotLevel) ||
    state.slotLedger.slotLevel < 1 ||
    state.slotLedger.slotLevel > 9 ||
    !Number.isInteger(state.slotLedger.slotsRemaining) ||
    state.slotLedger.slotsRemaining < 0
  ) {
    return state;
  }
  const requestedSlotLevel = spellSlotLevel(slotLevel);
  const slotState = {
    slotLedger: {
      slotLevel: spellSlotLevel(state.slotLedger.slotLevel),
      slotsRemaining: resourceCount(state.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: state.slotSpellCastThisTurn,
  };
  const slotResult = applySpellSlotExpenditure(
    slotState,
    spellSlotExpenditureRequired(requestedSlotLevel),
  );
  if (!spellSlotExpenditureAccepted(slotResult)) {
    return state;
  }
  const nextSlotState = spellSlotExpenditureResultState(
    slotState,
    slotResult,
  );
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
    slotLedger: {
      slotLevel: Number(nextSlotState.slotLedger.slotLevel),
      slotsRemaining: Number(nextSlotState.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
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
        targetVitals: applyResolvedDamageToPositiveHitPoints(
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
  return state.targetShapeShift === "shapeShiftSuppressedTrueForm"
    ? { ...state, targetShapeShift: "trueForm" }
    : state;
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
    Match.when("trueForm", () => state),
    Match.when("supportedShapeShifted", () => {
      const targetShapeShift: MoonbeamShapeShiftState =
        "shapeShiftSuppressedTrueForm";
      return {
        ...state,
        targetShapeShift,
      };
    }),
    Match.when("unsupportedSpellShapeShifted", () => state),
    Match.when("unsupportedStatBlockShapechanger", () => state),
    Match.when("shapeShiftSuppressedTrueForm", () => state),
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

function applyResolvedDamageToPositiveHitPoints(
  vitals: MoonbeamMovableZoneCreatureVitals,
  rawDamage: number,
): MoonbeamMovableZoneCreatureVitals {
  if (vitals.dead) return vitals;
  const resolvedDamage = Math.max(0, Math.floor(rawDamage));
  const absorbedByTemporaryHitPoints = Math.min(
    vitals.temporaryHitPoints,
    resolvedDamage,
  );
  const damageToHitPoints = resolvedDamage - absorbedByTemporaryHitPoints;
  const nextHitPoints = Math.max(0, vitals.hitPoints - damageToHitPoints);
  return {
    ...vitals,
    hitPoints: nextHitPoints,
    temporaryHitPoints:
      vitals.temporaryHitPoints - absorbedByTemporaryHitPoints,
    dead: nextHitPoints === 0,
  };
}
