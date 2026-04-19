import { Match } from "effect";

import type { BattleCreatureState, CreatureId } from "#/battle-machine-types.ts";
import { type ProjectedPersistentRecord } from "#/projected-executable.ts";
import { armorClass, type Ability, type ArmorClass } from "#/types.ts";

const SHIELD_BONUS = 2;

export const PROJECTED_EARLY_END_TRIGGERS = [
  "PEETTargetDonsArmor",
] as const satisfies ReadonlyArray<string>;
export type ProjectedEarlyEndTrigger =
  (typeof PROJECTED_EARLY_END_TRIGGERS)[number];

export interface ActiveProjectedPersistent {
  readonly record: ProjectedPersistentRecord;
  readonly casterId: CreatureId;
  readonly targetId: CreatureId;
}

type BattleArmorState = Pick<
  BattleCreatureState,
  | "activeProjectedPersistents"
  | "baseArmorClass"
  | "dexMod"
  | "isWearingArmor"
  | "leftHandUse"
  | "rightHandUse"
>;

function creatureAbilityModifier(
  creature: BattleArmorState,
  ability: Ability,
): number {
  return Match.value(ability).pipe(
    Match.when("dex", () => creature.dexMod),
    Match.orElse(() => {
      throw new Error(`unsupported projected AC ability modifier: ${ability}`);
    }),
  );
}

function battleHasShieldEquipped(creature: BattleArmorState): boolean {
  return (
    creature.leftHandUse === "shield" || creature.rightHandUse === "shield"
  );
}

export function projectedPersistentEarlyEndTriggers(
  record: ProjectedPersistentRecord,
): ReadonlySet<ProjectedEarlyEndTrigger> {
  return Match.value(record).pipe(
    Match.when({ tag: "PPRSetBaseAc" }, ({ value }) =>
      new Set<ProjectedEarlyEndTrigger>(
        value.earlyEnds.map((earlyEnd) =>
          Match.value(earlyEnd).pipe(
            Match.when("PPEETargetDonsArmor", () => "PEETTargetDonsArmor" as const),
            Match.exhaustive,
          )
        ),
      )),
    Match.exhaustive,
  );
}

export function addActiveProjectedPersistent(
  active: ReadonlySet<ActiveProjectedPersistent>,
  next: ActiveProjectedPersistent,
): ReadonlySet<ActiveProjectedPersistent> {
  return new Set([...active, next]);
}

export function removeActiveProjectedPersistentsOnTrigger(
  active: ReadonlySet<ActiveProjectedPersistent>,
  trigger: ProjectedEarlyEndTrigger,
  targetId: CreatureId,
): ReadonlySet<ActiveProjectedPersistent> {
  return new Set(
    [...active].filter(
      (persistent) =>
        persistent.targetId !== targetId ||
        !projectedPersistentEarlyEndTriggers(persistent.record).has(trigger),
    ),
  );
}

export function canonicalizeActiveProjectedPersistents(params: {
  readonly active: ReadonlySet<ActiveProjectedPersistent>;
  readonly isWearingArmor: boolean;
}): ReadonlySet<ActiveProjectedPersistent> {
  if (!params.isWearingArmor) return params.active;
  return new Set(
    [...params.active].filter(
      (persistent) =>
        !projectedPersistentEarlyEndTriggers(persistent.record).has(
          "PEETTargetDonsArmor",
        ),
    ),
  );
}

export function applyProjectedDonArmor(
  creatureId: CreatureId,
  creature: BattleCreatureState,
  baseArmorClass: ArmorClass,
): BattleCreatureState {
  return {
    ...creature,
    // Once a worn-armor fact exists, the projected override ends and AC falls
    // back to the owned worn-armor base passed through the armor-don seam.
    baseArmorClass,
    isWearingArmor: true,
    activeProjectedPersistents: removeActiveProjectedPersistentsOnTrigger(
      creature.activeProjectedPersistents,
      "PEETTargetDonsArmor",
      creatureId,
    ),
  };
}

function projectedArmorClassOverride(
  creature: BattleArmorState,
): ArmorClass | null {
  if (creature.isWearingArmor) return null;
  // At most one active base-AC override should matter at a time on a target.
  // For the current surface this is Mage Armor, so the first matching record is
  // the only override we apply.
  for (const persistent of creature.activeProjectedPersistents) {
    const override = Match.value(persistent.record).pipe(
      Match.when({ tag: "PPRSetBaseAc" }, ({ value }) => {
        const shieldBonus = battleHasShieldEquipped(creature) ? SHIELD_BONUS : 0;
        return armorClass(
          value.baseArmorClass +
            creatureAbilityModifier(creature, value.abilityModifier) +
            shieldBonus,
        );
      }),
      Match.exhaustive,
    );
    return override;
  }
  return null;
}

export function battleCurrentArmorClass(
  creature: BattleArmorState,
): ArmorClass {
  return projectedArmorClassOverride(creature) ?? creature.baseArmorClass;
}
