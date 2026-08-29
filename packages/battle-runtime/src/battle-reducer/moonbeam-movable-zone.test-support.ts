// Standalone MovablePersistentArea state machine used by the focused MBT parity driver.

import { Match } from "effect";

import {
  projectShapeShiftRuntimeReversion,
  trueFormRuntimeState,
  type BattleShapeShiftedRuntimeState,
} from "./shape-shifting.ts";
import { expendActionSpellSlot } from "./action-spell-slot-expenditure.ts";
import { applyDamageToPositiveHitPoints } from "./focused-spell-hazard-damage.ts";
import {
  movablePersistentAreaDamageAfterSave,
  movablePersistentAreaMoveDistanceAccepted,
} from "./moonbeam-movable-zone.ts";

const byTag = Match.discriminator("tag");

export type MovablePersistentAreaSaveTrigger =
  | "appearsInArea"
  | "areaMovesIntoSpace"
  | "entersArea"
  | "endsTurnInArea";

const MOVABLE_PERSISTENT_AREA_DURATION_TICKS = 10;
const MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET = 60;
const MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL = 2;
const MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;
const MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 10;

export type MovablePersistentAreaMovableZoneCreatureVitals = {
  readonly kind: "monsterCreature";
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly temporaryHitPoints: number;
  readonly dead: boolean;
  readonly unconscious: boolean;
};

export type MovablePersistentAreaMovableZone =
  | { readonly tag: "absent" }
  | {
      readonly tag: "active";
      readonly damageDice: number;
      readonly durationTicks: number;
      readonly repositionMaxMoveFeet: number;
      readonly savedThisTurn: boolean;
    };

export type MovablePersistentAreaTargetShapeShiftState =
  | {
      readonly tag: "unsuppressed";
      readonly shapeShift: BattleShapeShiftedRuntimeState;
    }
  | { readonly tag: "suppressedTrueForm" };

export type MovablePersistentAreaMovableZoneState = {
  readonly actionAvailable: boolean;
  readonly zone: MovablePersistentAreaMovableZone;
  readonly slotLedger: {
    readonly slotLevel: number;
    readonly slotsRemaining: number;
  };
  readonly slotSpellCastThisTurn: boolean;
  readonly targetVitals: MovablePersistentAreaMovableZoneCreatureVitals;
  readonly targetShapeShift: MovablePersistentAreaTargetShapeShiftState;
};

const MOVABLE_PERSISTENT_AREA_TARGET_TRUE_FORM = {
  tag: "unsuppressed",
  shapeShift: trueFormRuntimeState(),
} as const satisfies MovablePersistentAreaTargetShapeShiftState;
const MOVABLE_PERSISTENT_AREA_TARGET_SUPPRESSED_TRUE_FORM = {
  tag: "suppressedTrueForm",
} as const satisfies MovablePersistentAreaTargetShapeShiftState;

type MovablePersistentAreaMovableZoneFills = {
  readonly savingThrowSucceeded: boolean;
  readonly rolledDamage: number;
  readonly moveFeet: number;
};

function movablePersistentAreaDamageDice(slotLevel: number): number {
  return (
    MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE +
    Math.floor(slotLevel) -
    MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL
  );
}

function movablePersistentAreaDamageRollAccepted(input: {
  readonly rolledDamage: number;
  readonly damageDice: number;
}): boolean {
  return (
    Number.isInteger(input.rolledDamage) &&
    input.rolledDamage >= input.damageDice &&
    input.rolledDamage <=
      input.damageDice * MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE
  );
}

export function resolveMovablePersistentAreaCast(
  state: MovablePersistentAreaMovableZoneState,
  slotLevel: number,
): MovablePersistentAreaMovableZoneState {
  const slotExpenditure = expendActionSpellSlot(
    state,
    slotLevel,
    MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL,
  );
  if (slotExpenditure === undefined) return state;
  return {
    ...state,
    actionAvailable: false,
    zone: {
      tag: "active",
      damageDice: movablePersistentAreaDamageDice(slotLevel),
      durationTicks: MOVABLE_PERSISTENT_AREA_DURATION_TICKS,
      repositionMaxMoveFeet: MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET,
      savedThisTurn: false,
    },
    ...slotExpenditure,
  };
}

export function resolveMovablePersistentAreaSave(
  state: MovablePersistentAreaMovableZoneState,
  _trigger: MovablePersistentAreaSaveTrigger,
  fills: MovablePersistentAreaMovableZoneFills,
): MovablePersistentAreaMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", (zone) => {
      if (
        zone.savedThisTurn ||
        !movablePersistentAreaDamageRollAccepted({
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
          movablePersistentAreaDamageAfterSave(fills),
        ),
      };
      const shifted = applyMovablePersistentAreaShapeShiftRider(
        damaged,
        fills.savingThrowSucceeded,
      );
      return {
        ...shifted,
        zone: movablePersistentAreaZoneWithSavedThisTurn(shifted.zone, true),
      };
    }),
    Match.exhaustive,
  );
}

export function resolveMovablePersistentAreaReposition(
  state: MovablePersistentAreaMovableZoneState,
  moveFeet: number,
): MovablePersistentAreaMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", (zone) =>
      !state.actionAvailable ||
      !movablePersistentAreaMoveDistanceAccepted({
        moveFeet,
        maxMoveFeet: zone.repositionMaxMoveFeet,
      })
        ? state
        : { ...state, actionAvailable: false },
    ),
    Match.exhaustive,
  );
}

export function resetMovablePersistentAreaSavedThisTurn(
  state: MovablePersistentAreaMovableZoneState,
): MovablePersistentAreaMovableZoneState {
  return {
    ...state,
    zone: movablePersistentAreaZoneWithSavedThisTurn(state.zone, false),
  };
}

export function beginMovablePersistentAreaLaterTurn(
  state: MovablePersistentAreaMovableZoneState,
): MovablePersistentAreaMovableZoneState {
  return Match.value(state.zone).pipe(
    byTag("absent", () => state),
    byTag("active", () => ({
      ...resetMovablePersistentAreaSavedThisTurn(state),
      actionAvailable: true,
      slotSpellCastThisTurn: false,
    })),
    Match.exhaustive,
  );
}

export function resolveMovablePersistentAreaCylinderExit(
  state: MovablePersistentAreaMovableZoneState,
): MovablePersistentAreaMovableZoneState {
  return Match.value(state.targetShapeShift).pipe(
    byTag("unsuppressed", () => state),
    byTag("suppressedTrueForm", () => ({
      ...state,
      targetShapeShift: MOVABLE_PERSISTENT_AREA_TARGET_TRUE_FORM,
    })),
    Match.exhaustive,
  );
}

export function resolveMovablePersistentAreaSpellCleanup(
  state: MovablePersistentAreaMovableZoneState,
): MovablePersistentAreaMovableZoneState {
  return {
    ...resolveMovablePersistentAreaCylinderExit(state),
    zone: { tag: "absent" },
  };
}

function applyMovablePersistentAreaShapeShiftRider(
  state: MovablePersistentAreaMovableZoneState,
  savingThrowSucceeded: boolean,
): MovablePersistentAreaMovableZoneState {
  if (savingThrowSucceeded) return state;
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
          targetShapeShift: MOVABLE_PERSISTENT_AREA_TARGET_SUPPRESSED_TRUE_FORM,
        })),
        Match.exhaustive,
      );
    }),
    Match.exhaustive,
  );
}

function movablePersistentAreaZoneWithSavedThisTurn(
  zone: MovablePersistentAreaMovableZone,
  savedThisTurn: boolean,
): MovablePersistentAreaMovableZone {
  return Match.value(zone).pipe(
    byTag("absent", () => zone),
    byTag("active", (active) => ({ ...active, savedThisTurn })),
    Match.exhaustive,
  );
}
