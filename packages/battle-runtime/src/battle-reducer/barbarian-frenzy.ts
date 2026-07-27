import type { DamageType } from "@dnd/surface/surface/types";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  StatBlockAttackActionOption,
} from "../battle-action-options.ts";
import { attackExecutionAbility } from "../battle-action-options.ts";
import type {
  CharacterBattleCreatureState,
  OngoingFeatureSourceKey,
} from "../battle-state-execution.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import { ongoingFeatureProfileForSourceKey } from "./creature-state-queries.ts";

const RAGE_RESISTANCE_DAMAGE_TYPES = [
  "bludgeoning",
  "piercing",
  "slashing",
] as const satisfies ReadonlyArray<DamageType>;

type OngoingFeatureProfile = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
>;

export type ActiveRageDamageBonusForFrenzy = {
  readonly sourceKey: OngoingFeatureSourceKey;
  readonly damageBonus: number;
};

export function ongoingFeatureProfileIsRageForFrenzy(
  profile: OngoingFeatureProfile,
): boolean {
  return (
    profile.concentrationEffect === "breakAndPrevent" &&
    profile.actionRestrictions.includes("spellcasting") &&
    RAGE_RESISTANCE_DAMAGE_TYPES.every((damageType) =>
      profile.resistances.includes(damageType),
    ) &&
    profile.damageModifiers.length > 0
  );
}

export function ongoingFeatureProfileIsRecklessAttackForFrenzy(
  profile: OngoingFeatureProfile,
): boolean {
  return (
    profile.activationTrigger === "firstAttackRoll" &&
    profile.rollModifiers.some(
      (modifier) =>
        modifier.affects === "selfRoll" &&
        modifier.mode === "advantage" &&
        modifier.on === "attackRoll" &&
        modifier.abilityFilter?.includes("str") === true,
    )
  );
}

export function activeRageSourceKeysForFrenzy(
  attacker: CharacterBattleCreatureState,
): readonly OngoingFeatureSourceKey[] {
  return [...attacker.activeOngoingFeatureOccurrences.keys()].filter((key) => {
    const profile = ongoingFeatureProfileForSourceKey(attacker, key);
    return (
      profile?.kind === "ongoingFeature" &&
      ongoingFeatureProfileIsRageForFrenzy(profile)
    );
  });
}

export function activeRageDamageBonusForFrenzy(
  attacker: CharacterBattleCreatureState,
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption
    | StatBlockAttackActionOption,
): ActiveRageDamageBonusForFrenzy | null {
  const bonuses = activeRageSourceKeysForFrenzy(attacker).flatMap(
    (key): readonly ActiveRageDamageBonusForFrenzy[] => {
      const profile = ongoingFeatureProfileForSourceKey(attacker, key);
      if (
        profile?.kind !== "ongoingFeature" ||
        !ongoingFeatureProfileIsRageForFrenzy(profile)
      ) {
        return [];
      }
      return profile.damageModifiers.flatMap((modifier) =>
        attackAbilityMatchesDamageModifier(attack, modifier)
          ? [{ sourceKey: key, damageBonus: modifier.amount }]
          : [],
      );
    },
  );
  return bonuses.length === 1 ? (bonuses[0] ?? null) : null;
}

function attackAbilityMatchesDamageModifier(
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption
    | StatBlockAttackActionOption,
  modifier: OngoingFeatureProfile["damageModifiers"][number],
): boolean {
  const attackAbility = attackExecutionAbility(attack);
  const abilityMatches =
    modifier.abilityFilter === undefined ||
    (attackAbility !== undefined &&
      attackAbility !== "spellcasting" &&
      modifier.abilityFilter.includes(attackAbility));
  return (
    abilityMatches &&
    (modifier.weaponUsageFilter === undefined ||
      (attack.kind === "weapon" &&
        modifier.weaponUsageFilter === attack.weapon.usage))
  );
}
