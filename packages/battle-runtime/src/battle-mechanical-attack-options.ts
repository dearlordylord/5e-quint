import { Match } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CharacterWeaponAttackAbilityChoice,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
  SupportedCreatureAttackRollMechanics,
  SupportedStaticDamageCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import type { MechanicalSupportedAttackActionOption } from "./battle-reducer/codec-building-blocks.ts";
import type {
  CharacterWeaponAttackExecutionWeapon,
  CharacterWeaponAttackExecutionWeaponFacts,
} from "./character-weapon-execution-schema.ts";
import { optionalProperty } from "./optional-property.ts";

type MechanicalStatBlockDamageNotation = "rolled" | "static";

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
type MechanicalRolledStatBlockAttackActionOption = Extract<
  MechanicalStatBlockAttackActionOption,
  { readonly damageNotation: "rolled" }
>;
type MechanicalStaticStatBlockAttackActionOption = Extract<
  MechanicalStatBlockAttackActionOption,
  { readonly damageNotation: "static" }
>;
type MechanicalRolledStatBlockAttackRollMechanics =
  MechanicalRolledStatBlockAttackActionOption["attack"];
type MechanicalStaticStatBlockAttackRollMechanics =
  MechanicalStaticStatBlockAttackActionOption["attack"];
type MechanicalRolledStatBlockAttackEffect =
  MechanicalRolledStatBlockAttackRollMechanics["onHit"][number];
type MechanicalStaticStatBlockAttackEffect =
  MechanicalStaticStatBlockAttackRollMechanics["onHit"][number];
type MechanicalRolledStatBlockDamageAmount = Extract<
  MechanicalRolledStatBlockAttackEffect,
  { readonly kind: "damage" }
>["amount"];
type MechanicalStaticStatBlockDamageAmount = Extract<
  MechanicalStaticStatBlockAttackEffect,
  { readonly kind: "damage" }
>["amount"];

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
    hasWeaponMastery: attack.hasWeaponMastery,
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
  if (first === undefined) {
    throw new Error("Admitted alternate attack abilities must be nonempty.");
  }
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
  return Match.value(attack).pipe(
    Match.discriminatorsExhaustive("damageNotation")({
      rolled: (value) => ({
        kind: "statBlockAttack" as const,
        procedureRef: value.procedureRef,
        attack: projectMechanicalStatBlockAttack(value.attack, "rolled"),
        damageNotation: "rolled" as const,
        ...optionalProperty("traitAttackRollModes", value.traitAttackRollModes),
      }),
      static: (value) => ({
        kind: "statBlockAttack" as const,
        procedureRef: value.procedureRef,
        attack: projectMechanicalStatBlockAttack(value.attack, "static"),
        damageNotation: "static" as const,
        ...optionalProperty("traitAttackRollModes", value.traitAttackRollModes),
      }),
    }),
  );
}

function projectMechanicalStatBlockAttack(
  attack: SupportedStaticDamageCreatureAttackRollMechanics,
  damageNotation: "static",
): MechanicalStaticStatBlockAttackRollMechanics;
function projectMechanicalStatBlockAttack(
  attack: SupportedCreatureAttackRollMechanics,
  damageNotation: "rolled",
): MechanicalRolledStatBlockAttackRollMechanics;
function projectMechanicalStatBlockAttack(
  attack: SupportedCreatureAttackRollMechanics,
  damageNotation: MechanicalStatBlockDamageNotation,
):
  | MechanicalRolledStatBlockAttackRollMechanics
  | MechanicalStaticStatBlockAttackRollMechanics {
  return Match.value(attack).pipe(
    Match.discriminatorsExhaustive("attackType")({
      melee: (value) => ({
        attackAbility: value.attackAbility,
        attackBonus: {
          kind: "literal" as const,
          value: value.attackBonus.value,
        },
        attackType: "melee" as const,
        reachFeet: value.reachFeet,
        onHit: projectMechanicalStatBlockAttackEffects(
          value.onHit,
          damageNotation,
        ),
      }),
      ranged: (value) => ({
        attackAbility: value.attackAbility,
        attackBonus: {
          kind: "literal" as const,
          value: value.attackBonus.value,
        },
        attackType: "ranged" as const,
        rangeFeet: value.rangeFeet,
        ...optionalProperty("ammunition", value.ammunition),
        onHit: projectMechanicalStatBlockAttackEffects(
          value.onHit,
          damageNotation,
        ),
      }),
    }),
  );
}

function projectMechanicalStatBlockAttackEffects(
  effects: SupportedCreatureAttackRollMechanics["onHit"],
  damageNotation: MechanicalStatBlockDamageNotation,
): ReadonlyNonEmptyArray<
  MechanicalRolledStatBlockAttackEffect | MechanicalStaticStatBlockAttackEffect
> {
  const [first, ...rest] = effects;
  if (first === undefined) {
    throw new Error("Admitted Stat Block attack effects must be nonempty.");
  }
  return [
    projectMechanicalStatBlockAttackEffect(first, damageNotation),
    ...rest.map((effect) =>
      projectMechanicalStatBlockAttackEffect(effect, damageNotation),
    ),
  ];
}

function projectMechanicalStatBlockAttackEffect(
  effect: SupportedCreatureAttackRollMechanics["onHit"][number],
  damageNotation: MechanicalStatBlockDamageNotation,
):
  | MechanicalRolledStatBlockAttackEffect
  | MechanicalStaticStatBlockAttackEffect {
  return Match.value(effect).pipe(
    Match.discriminatorsExhaustive("kind")({
      damage: (value) => ({
        kind: "damage" as const,
        damageType: value.damageType,
        amount: projectMechanicalStatBlockDamageAmount(
          value.amount,
          damageNotation,
        ),
        ...optionalProperty("timing", value.timing),
      }),
      conditional_bonus_damage: (value) => ({
        kind: "conditional_bonus_damage" as const,
        when: { kind: "attack_roll_had_advantage" as const },
        damageType: value.damageType,
        amount: projectMechanicalStatBlockDamageAmount(
          value.amount,
          damageNotation,
        ),
      }),
      apply_condition_if_target_size_at_most: (value) => ({
        kind: "apply_condition_if_target_size_at_most" as const,
        condition: "prone" as const,
        maxCreatureSize: value.maxCreatureSize,
      }),
    }),
  );
}

function projectMechanicalStatBlockDamageAmount(
  amount: Extract<
    SupportedCreatureAttackRollMechanics["onHit"][number],
    { readonly kind: "damage" | "conditional_bonus_damage" }
  >["amount"],
  damageNotation: MechanicalStatBlockDamageNotation,
):
  | MechanicalRolledStatBlockDamageAmount
  | MechanicalStaticStatBlockDamageAmount {
  return Match.value(damageNotation).pipe(
    Match.when("static", () => {
      if (amount.static === undefined) {
        throw new Error(
          "Static Stat Block damage must include a static amount.",
        );
      }
      return {
        kind: "fixed" as const,
        expr: amount.expr,
        static: amount.static,
      };
    }),
    Match.when("rolled", () => ({
      kind: "fixed" as const,
      expr: amount.expr,
      ...optionalProperty("static", amount.static),
    })),
    Match.exhaustive,
  );
}
