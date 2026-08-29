// Standalone ram-movable persistent area state machine used by the focused MBT parity driver.

import { Match } from "effect";

import { expendActionSpellSlot } from "./action-spell-slot-expenditure.ts";
import { applyDamageToPositiveHitPoints } from "./focused-spell-hazard-damage.ts";
import {
  ramMovablePersistentAreaDamageAfterSave,
  ramMovablePersistentAreaMoveDistanceAccepted,
} from "./collision-reposition-area-hazard.ts";

const byTag = Match.discriminator("tag");

export const RAM_MOVABLE_PERSISTENT_AREA_HAZARD_RAM_ENTRYPOINTS = [
  "endWithinFiveFeet",
  "ram",
] as const;
export type RamMovablePersistentAreaHazardRamEntrypoint =
  (typeof RAM_MOVABLE_PERSISTENT_AREA_HAZARD_RAM_ENTRYPOINTS)[number];

const RAM_MOVABLE_PERSISTENT_AREA_DURATION_TICKS = 10;
const RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET = 30;
const RAM_MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL = 2;
const RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;

export type RamMovablePersistentAreaHazardRamState = {
  readonly actionAvailable: boolean;
  readonly casterHasBonusAction: boolean;
  readonly sphere:
    | { readonly tag: "absent" }
    | {
        readonly tag: "active";
        readonly damageDice: number;
        readonly durationTicks: number;
        readonly ramMaxMoveFeet: number;
      };
  readonly slotLedger: {
    readonly slotLevel: number;
    readonly slotsRemaining: number;
  };
  readonly slotSpellCastThisTurn: boolean;
  readonly targetVitals: {
    readonly kind: "monsterCreature";
    readonly hitPoints: number;
    readonly hitPointMaximum: number;
    readonly temporaryHitPoints: number;
    readonly dead: boolean;
    readonly unconscious: boolean;
  };
};

export type RamMovablePersistentAreaHazardRamFills = {
  readonly savingThrowSucceeded: boolean;
  readonly rolledDamage: number;
  readonly moveFeet: number;
};

function ramMovablePersistentAreaDamageDice(slotLevel: number): number {
  return (
    RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE +
    Math.floor(slotLevel) -
    RAM_MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL
  );
}

function ramMovablePersistentAreaDamageRollAccepted(input: {
  readonly rolledDamage: number;
  readonly damageDice: number;
}): boolean {
  return (
    Number.isInteger(input.rolledDamage) &&
    input.rolledDamage >= input.damageDice &&
    input.rolledDamage <= input.damageDice * 6
  );
}

export function resolveRamMovablePersistentAreaCast(
  state: RamMovablePersistentAreaHazardRamState,
  slotLevel: number,
): RamMovablePersistentAreaHazardRamState {
  const slotExpenditure = expendActionSpellSlot(
    state,
    slotLevel,
    RAM_MOVABLE_PERSISTENT_AREA_MINIMUM_SLOT_LEVEL,
  );
  if (slotExpenditure === undefined) return state;
  return {
    ...state,
    actionAvailable: false,
    sphere: {
      tag: "active",
      damageDice: ramMovablePersistentAreaDamageDice(slotLevel),
      durationTicks: RAM_MOVABLE_PERSISTENT_AREA_DURATION_TICKS,
      ramMaxMoveFeet: RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET,
    },
    ...slotExpenditure,
  };
}

export function applyRamMovablePersistentAreaHazardDamage(
  state: RamMovablePersistentAreaHazardRamState,
  damageDice: number,
  fills: Pick<
    RamMovablePersistentAreaHazardRamFills,
    "savingThrowSucceeded" | "rolledDamage"
  >,
): RamMovablePersistentAreaHazardRamState {
  if (
    !ramMovablePersistentAreaDamageRollAccepted({
      rolledDamage: fills.rolledDamage,
      damageDice,
    })
  ) {
    return state;
  }
  return {
    ...state,
    targetVitals: applyDamageToPositiveHitPoints(
      state.targetVitals,
      ramMovablePersistentAreaDamageAfterSave(fills),
    ),
  };
}

export function resolveRamMovablePersistentAreaHazardRam(
  state: RamMovablePersistentAreaHazardRamState,
  entrypoint: RamMovablePersistentAreaHazardRamEntrypoint,
  fills: RamMovablePersistentAreaHazardRamFills,
): RamMovablePersistentAreaHazardRamState {
  return Match.value(state.sphere).pipe(
    byTag("absent", () => state),
    byTag("active", (sphere) =>
      Match.value(entrypoint).pipe(
        Match.when("endWithinFiveFeet", () =>
          applyRamMovablePersistentAreaHazardDamage(
            state,
            sphere.damageDice,
            fills,
          ),
        ),
        Match.when("ram", () => {
          if (
            !state.casterHasBonusAction ||
            !ramMovablePersistentAreaMoveDistanceAccepted({
              moveFeet: fills.moveFeet,
              maxMoveFeet: sphere.ramMaxMoveFeet,
            })
          ) {
            return state;
          }
          return {
            ...applyRamMovablePersistentAreaHazardDamage(
              state,
              sphere.damageDice,
              fills,
            ),
            casterHasBonusAction: false,
          };
        }),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}
