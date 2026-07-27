// Flaming Sphere hazard and ram composite transition.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE

import { Match } from "effect";
import { expendActionSpellSlot } from "./action-spell-slot-expenditure.ts";
import {
  applyDamageToPositiveHitPoints,
  halfDamageAfterSuccessfulSave,
} from "./focused-spell-hazard-damage.ts";

const byTag = Match.discriminator("tag");

export const FLAMING_SPHERE_HAZARD_RAM_ENTRYPOINTS = [
  "endWithinFiveFeet",
  "ram",
] as const;
export type FlamingSphereHazardRamEntrypoint =
  (typeof FLAMING_SPHERE_HAZARD_RAM_ENTRYPOINTS)[number];

export const FLAMING_SPHERE_DURATION_TICKS = 10;
export const FLAMING_SPHERE_RAM_MAX_MOVE_FEET = 30;
export const FLAMING_SPHERE_MINIMUM_SLOT_LEVEL = 2;
export const FLAMING_SPHERE_BASE_DAMAGE_DICE = 2;

export type FlamingSphereHazardRamCreatureKind = "monsterCreature";

export type FlamingSphereHazardRamCreatureVitals = {
  readonly kind: FlamingSphereHazardRamCreatureKind;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly temporaryHitPoints: number;
  readonly dead: boolean;
  readonly unconscious: boolean;
};

export type FlamingSphereHazardRamSphere =
  | { readonly tag: "absent" }
  | {
      readonly tag: "active";
      readonly damageDice: number;
      readonly durationTicks: number;
      readonly ramMaxMoveFeet: number;
    };

export type FlamingSphereHazardRamSlotLedger = {
  readonly slotLevel: number;
  readonly slotsRemaining: number;
};

export type FlamingSphereHazardRamState = {
  readonly actionAvailable: boolean;
  readonly casterHasBonusAction: boolean;
  readonly sphere: FlamingSphereHazardRamSphere;
  readonly slotLedger: FlamingSphereHazardRamSlotLedger;
  readonly slotSpellCastThisTurn: boolean;
  readonly targetVitals: FlamingSphereHazardRamCreatureVitals;
};

export type FlamingSphereHazardRamFills = {
  readonly savingThrowSucceeded: boolean;
  readonly rolledDamage: number;
  readonly moveFeet: number;
};

export function flamingSphereDamageDice(slotLevel: number): number {
  return (
    FLAMING_SPHERE_BASE_DAMAGE_DICE +
    Math.floor(slotLevel) -
    FLAMING_SPHERE_MINIMUM_SLOT_LEVEL
  );
}

export function flamingSphereDamageAfterSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return halfDamageAfterSuccessfulSave(input);
}

export function flamingSphereMoveDistanceAccepted(input: {
  readonly moveFeet: number;
  readonly maxMoveFeet: number;
}): boolean {
  return (
    Number.isInteger(input.moveFeet) &&
    input.moveFeet > 0 &&
    input.moveFeet <= input.maxMoveFeet
  );
}

export function flamingSphereDamageRollAccepted(input: {
  readonly rolledDamage: number;
  readonly damageDice: number;
}): boolean {
  return (
    Number.isInteger(input.rolledDamage) &&
    input.rolledDamage >= input.damageDice &&
    input.rolledDamage <= input.damageDice * 6
  );
}

export function resolveFlamingSphereCast(
  state: FlamingSphereHazardRamState,
  slotLevel: number,
): FlamingSphereHazardRamState {
  const slotExpenditure = expendActionSpellSlot(
    state,
    slotLevel,
    FLAMING_SPHERE_MINIMUM_SLOT_LEVEL,
  );
  if (slotExpenditure === undefined) {
    return state;
  }
  return {
    ...state,
    actionAvailable: false,
    sphere: {
      tag: "active",
      damageDice: flamingSphereDamageDice(slotLevel),
      durationTicks: FLAMING_SPHERE_DURATION_TICKS,
      ramMaxMoveFeet: FLAMING_SPHERE_RAM_MAX_MOVE_FEET,
    },
    ...slotExpenditure,
  };
}

export function applyFlamingSphereHazardDamage(
  state: FlamingSphereHazardRamState,
  damageDice: number,
  fills: Pick<
    FlamingSphereHazardRamFills,
    "savingThrowSucceeded" | "rolledDamage"
  >,
): FlamingSphereHazardRamState {
  if (
    !flamingSphereDamageRollAccepted({
      rolledDamage: fills.rolledDamage,
      damageDice,
    })
  ) {
    return state;
  }
  const damage = flamingSphereDamageAfterSave(fills);
  return {
    ...state,
    targetVitals: applyDamageToPositiveHitPoints(state.targetVitals, damage),
  };
}

export function resolveFlamingSphereHazardRam(
  state: FlamingSphereHazardRamState,
  entrypoint: FlamingSphereHazardRamEntrypoint,
  fills: FlamingSphereHazardRamFills,
): FlamingSphereHazardRamState {
  return Match.value(state.sphere).pipe(
    byTag("absent", () => state),
    byTag("active", (sphere) =>
      Match.value(entrypoint).pipe(
        Match.when("endWithinFiveFeet", () =>
          applyFlamingSphereHazardDamage(state, sphere.damageDice, fills),
        ),
        Match.when("ram", () => {
          if (
            !state.casterHasBonusAction ||
            !flamingSphereMoveDistanceAccepted({
              moveFeet: fills.moveFeet,
              maxMoveFeet: sphere.ramMaxMoveFeet,
            })
          ) {
            return state;
          }
          const damaged = applyFlamingSphereHazardDamage(
            state,
            sphere.damageDice,
            fills,
          );
          return { ...damaged, casterHasBonusAction: false };
        }),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}
