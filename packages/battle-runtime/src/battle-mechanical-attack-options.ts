import { Match } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CharacterWeaponAttackAbilityChoice,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "./battle-action-options.ts";
import type { MechanicalSupportedAttackActionOption } from "./battle-reducer/codec-building-blocks.ts";
import type {
  CharacterWeaponAttackExecutionWeapon,
  CharacterWeaponAttackExecutionWeaponFacts,
} from "./character-weapon-execution-schema.ts";
import { optionalProperty } from "./optional-property.ts";

type MechanicalWeaponAttackActionOption = Extract<
  MechanicalSupportedAttackActionOption,
  { readonly kind: "weapon" }
>;
type MechanicalWeaponAttackAbilityChoice = NonNullable<
  MechanicalWeaponAttackActionOption["alternateAbilityChoices"]
>[number];
type MechanicalAttackDamageAbilityModifierChoice = NonNullable<
  MechanicalWeaponAttackActionOption["attackDamageAbilityModifierChoice"]
>;
type MechanicalStatBlockAttackActionOption = Extract<
  MechanicalSupportedAttackActionOption,
  { readonly kind: "statBlockAttack" }
>;

/**
 * Projects an admitted attack option into the execution-only shape exposed by
 * mechanical holes. Surface labels, choice-table records, and authored weapon
 * identity are deliberately reconstructed out of the result rather than
 * copied through from the admitted option.
 */
export function projectMechanicalAttackActionOption(
  attack: SupportedAttackActionOption,
): MechanicalSupportedAttackActionOption {
  return Match.value(attack).pipe(
    Match.discriminatorsExhaustive("kind")({
      weapon: projectMechanicalWeaponAttackActionOption,
      unarmedStrike: projectMechanicalUnarmedStrikeActionOption,
      statBlockAttack: projectMechanicalStatBlockAttackActionOption,
    }),
  );
}

function projectMechanicalWeaponAttackActionOption(
  attack: CharacterWeaponAttackActionOption,
): MechanicalWeaponAttackActionOption {
  return {
    kind: "weapon",
    weapon: projectMechanicalWeapon(attack.weapon),
    weaponObjectId: attack.weaponObjectId,
    ability: attack.ability,
    abilityModifier: attack.abilityModifier,
    ...optionalProperty("attackBonus", attack.attackBonus),
    ...optionalProperty("damageAbilityModifier", attack.damageAbilityModifier),
    ...optionalProperty(
      "attackDamageAbilityModifierChoice",
      attack.attackDamageAbilityModifierChoice === undefined
        ? undefined
        : projectMechanicalAttackDamageAbilityModifierChoice(
            attack.attackDamageAbilityModifierChoice,
          ),
    ),
    ...optionalProperty("damageBonus", attack.damageBonus),
    ...optionalProperty("damageTypeChoices", attack.damageTypeChoices),
    ...optionalProperty(
      "alternateAbilityChoices",
      attack.alternateAbilityChoices === undefined
        ? undefined
        : projectMechanicalAlternateAbilityChoices(
            attack.alternateAbilityChoices,
          ),
    ),
  };
}

function projectMechanicalWeapon(
  weapon: CharacterWeaponAttackExecutionWeapon,
): CharacterWeaponAttackExecutionWeaponFacts {
  const { weaponUnitId, ...facts } = weapon;
  void weaponUnitId;
  return facts;
}

function projectMechanicalAttackDamageAbilityModifierChoice(
  choice: NonNullable<
    CharacterWeaponAttackActionOption["attackDamageAbilityModifierChoice"]
  >,
): MechanicalAttackDamageAbilityModifierChoice {
  return {
    procedureRefs: choice.procedureRefs,
    appliedDamageAbilityModifier: choice.appliedDamageAbilityModifier,
    declinedDamageAbilityModifier: choice.declinedDamageAbilityModifier,
  };
}

function projectMechanicalAlternateAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
): ReadonlyNonEmptyArray<MechanicalWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    projectMechanicalAlternateAbilityChoice(first),
    ...rest.map(projectMechanicalAlternateAbilityChoice),
  ];
}

function projectMechanicalAlternateAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
): MechanicalWeaponAttackAbilityChoice {
  return {
    ability: choice.ability,
    abilityModifier: choice.abilityModifier,
    attackBonus: choice.attackBonus,
    damageAbilityModifier: choice.damageAbilityModifier,
    ...optionalProperty(
      "attackDamageAbilityModifierChoice",
      choice.attackDamageAbilityModifierChoice === undefined
        ? undefined
        : projectMechanicalAttackDamageAbilityModifierChoice(
            choice.attackDamageAbilityModifierChoice,
          ),
    ),
  };
}

function projectMechanicalUnarmedStrikeActionOption(
  attack: Extract<
    SupportedAttackActionOption,
    { readonly kind: "unarmedStrike" }
  >,
): Extract<
  MechanicalSupportedAttackActionOption,
  { readonly kind: "unarmedStrike" }
> {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: Match.value(attack.effect.damage).pipe(
        Match.discriminatorsExhaustive("kind")({
          base: (damage) => ({
            kind: "base" as const,
            damageType: damage.damageType,
            flat: damage.flat,
          }),
          mechanicalReplacement: (damage) => ({
            kind: "mechanicalReplacement" as const,
            dice: damage.dice,
            dieSize: damage.dieSize,
            damageType: damage.damageType,
          }),
          procedureReplacement: (damage) => ({
            kind: "procedureReplacement" as const,
            sourceProcedureRef: damage.sourceProcedureRef,
            dice: damage.dice,
            dieSize: damage.dieSize,
            damageType: damage.damageType,
          }),
        }),
      ),
    },
    attackAbility: attack.attackAbility,
    attackAbilityModifier: attack.attackAbilityModifier,
    attackBonus: attack.attackBonus,
    damageAbilityModifier: attack.damageAbilityModifier,
    ...optionalProperty("damageBonus", attack.damageBonus),
  };
}

function projectMechanicalStatBlockAttackActionOption(
  attack: Extract<
    SupportedAttackActionOption,
    { readonly kind: "statBlockAttack" }
  >,
): MechanicalStatBlockAttackActionOption {
  return attack;
}
