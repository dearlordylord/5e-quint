// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.weapon-mastery-graze
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleFill,
  BattleState,
  BattleUnitFeatureDecisionHole,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { weaponMasteryGrazeSelection } from "./attack-roll.ts";
import type { DamageAmountByTypeEntry } from "./damage-helpers.ts";
import {
  WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
  WEAPON_MASTERY_GRAZE_DECISION_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { selectedWeaponDamage } from "./statblock-attacks.ts";

/**
 * What Graze does after one attack roll against a creature.
 *
 * - `notApplicable`: the attack hit, the weapon's mastery isn't an unlocked
 *   Graze, or the attack's ability modifier is too low to deal any damage.
 * - `needsDecision`: Graze applies and the attacker hasn't chosen yet.
 * - `declined`: the attacker chose not to deal the damage.
 * - `damage`: the attacker chose to deal it; the one entry is the damage
 *   before the target's own adjustments.
 */
export type WeaponMasteryGrazeOutcome =
  | { readonly tag: "notApplicable" }
  | {
      readonly tag: "needsDecision";
      readonly hole: BattleUnitFeatureDecisionHole;
    }
  | { readonly tag: "declined" }
  | {
      readonly tag: "damage";
      readonly damageByType: readonly [DamageAmountByTypeEntry];
    }
  | { readonly tag: "invalid"; readonly message: string };

/**
 * Resolves Graze for one attack roll. SRD 5.2.1 equipment.md, Graze: "If your
 * attack roll with this weapon misses a creature, you can deal damage to that
 * creature equal to the ability modifier you used to make the attack roll.
 * This damage is the same type dealt by the weapon, and the damage can be
 * increased only by increasing the ability modifier."
 *
 * The amount is the attack option's `abilityModifier`, the modifier of the
 * ability the attack roll used, not its damage modifier: an attack whose damage
 * leaves out a positive modifier still grazes for the whole modifier. A
 * modifier of 0 or less deals no damage, so Graze isn't offered then. No damage
 * bonus, rider or extra die adds to the amount.
 */
export function resolveWeaponMasteryGraze(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly hit: boolean;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
}): WeaponMasteryGrazeOutcome {
  const damageByType = input.hit
    ? null
    : weaponMasteryGrazeDamageByType(
        input.state,
        input.attackerId,
        input.targetId,
        input.attack,
      );
  if (damageByType === null) {
    return input.decision === undefined
      ? { tag: "notApplicable" }
      : {
          tag: "invalid",
          message:
            "Weapon Mastery Graze decision is only valid after an eligible Graze weapon miss.",
        };
  }
  if (input.decision === undefined) {
    return { tag: "needsDecision", hole: weaponMasteryGrazeDecisionHole() };
  }
  if (input.decision.value === "decline") {
    return { tag: "declined" };
  }
  return input.decision.value === "use"
    ? { tag: "damage", damageByType }
    : {
        tag: "invalid",
        message: "Weapon Mastery Graze decision must be use or decline.",
      };
}

function weaponMasteryGrazeDamageByType(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly [DamageAmountByTypeEntry] | null {
  const selection = weaponMasteryGrazeSelection(
    state,
    attackerId,
    targetId,
    attack,
  );
  if (selection === null || Number(selection.attack.abilityModifier) <= 0) {
    return null;
  }
  return [
    {
      damageType: selectedWeaponDamage(selection.attack.weapon).damageType,
      amount: Number(selection.attack.abilityModifier),
    },
  ];
}

function weaponMasteryGrazeDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_GRAZE_DECISION_HOLE_INSTANCE,
    label: "Use Graze",
    choices: ["use", "decline"],
  };
}
