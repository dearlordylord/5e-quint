import type { DamageType } from "@dnd/surface/surface/types";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
} from "../battle-action-options.ts";
import type {
  CharacterBattleCreatureState,
  OngoingFeatureSourceKey,
} from "../battle-reducer.ts";
import type { SupportedUnitFeatureProfile } from "../unit-feature-support.ts";

const RAGE_RESISTANCE_DAMAGE_TYPES = [
  "bludgeoning",
  "piercing",
  "slashing",
] as const satisfies ReadonlyArray<DamageType>;

type OngoingFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
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
    const profile = attacker.origin.ongoingFeatureProfiles.get(key);
    return (
      profile?.kind === "ongoingFeature" &&
      ongoingFeatureProfileIsRageForFrenzy(profile)
    );
  });
}

export function activeRageDamageBonusForFrenzy(
  attacker: CharacterBattleCreatureState,
  attack: CharacterWeaponAttackActionOption | CharacterUnarmedStrikeActionOption,
): ActiveRageDamageBonusForFrenzy | null {
  const bonuses = activeRageSourceKeysForFrenzy(attacker).flatMap(
    (key): readonly ActiveRageDamageBonusForFrenzy[] => {
      const profile = attacker.origin.ongoingFeatureProfiles.get(key);
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
  attack: CharacterWeaponAttackActionOption | CharacterUnarmedStrikeActionOption,
  modifier: OngoingFeatureProfile["damageModifiers"][number],
): boolean {
  const attackAbility =
    attack.kind === "weapon" ? attack.ability : attack.attackAbility;
  const abilityMatches =
    modifier.abilityFilter === undefined ||
    (attackAbility !== "spellcasting" &&
      modifier.abilityFilter.includes(attackAbility));
  return (
    abilityMatches &&
    (modifier.weaponUsageFilter === undefined ||
      (attack.kind === "weapon" &&
        modifier.weaponUsageFilter === attack.weapon.usage))
  );
}
