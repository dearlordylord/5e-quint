// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.weapon-mastery-graze
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleFill,
  BattleCreatureState,
  BattleUnitFeatureDecisionHole,
} from "../battle-state-execution.ts";
import { selectedWeaponMasteryProperty } from "./attack-roll.ts";
import { WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE } from "../unit-feature-execution-constants.ts";
import type { DamageAmountByTypeEntry } from "./damage-helpers.ts";
import { selectedWeaponDamage } from "./statblock-attacks.ts";

/**
 * What Graze does after one attack roll against a creature.
 *
 * - `notApplicable`: the attack hit or the weapon's mastery isn't an unlocked
 *   Graze.
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
 * modifier of 0 or less deals 0 damage and still offers Use or Decline.
 * No damage bonus, rider or extra die adds to the amount;
 * the target's Resistance and Vulnerability still apply (ASSUMPTIONS.md A54).
 */
export function resolveWeaponMasteryGraze(input: {
  readonly attacker: BattleCreatureState;
  readonly decisionHole: Pick<
    BattleUnitFeatureDecisionHole,
    "holeId" | "holeInstanceKey"
  >;
  readonly attack: SupportedAttackActionOption;
  readonly hit: boolean;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
}): WeaponMasteryGrazeOutcome {
  const damageByType = input.hit
    ? null
    : weaponMasteryGrazeDamageByType(input.attacker, input.attack);
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
    return {
      tag: "needsDecision",
      hole: {
        ...input.decisionHole,
        kind: "unitFeatureDecision",
        label: "Use Graze",
        choices: ["use", "decline"],
      },
    };
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
  attacker: BattleCreatureState,
  attack: SupportedAttackActionOption,
): readonly [DamageAmountByTypeEntry] | null {
  const selection = selectedWeaponMasteryProperty({
    attacker,
    attack,
    supportProfile: WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE,
  });
  if (selection === null) {
    return null;
  }
  return [
    {
      damageType: selectedWeaponDamage(selection.attack.weapon).damageType,
      amount: Math.max(0, Number(selection.attack.abilityModifier)),
    },
  ];
}
