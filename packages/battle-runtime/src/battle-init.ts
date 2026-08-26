// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hunters-prey
import { optionalProperty } from "./optional-property.ts";
import type { ArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type {
  AbilityModifier,
  AttackBonus,
  Condition,
  Hp,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { Hp as toHp } from "@dnd/shared/types";
import type { Language } from "@dnd/shared/game-facts";
import type {
  Ability,
  Size,
  StatBlockRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import type {
  AttackDamageAbilityModifierChoice,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackAbilityChoice,
  CharacterWeaponAttackDamageTypeChoices,
  CharacterWeaponAttackExecutionWeapon,
} from "./battle-action-options.ts";
import type {
  CharacterBattleFeatureInit,
  CharacterBattleMetamagicInit,
  CharacterBattleResourceInit,
  CharacterBattleSpellcastingInit,
} from "./character-battle-resources.ts";
import type { CharacterBattleClassLevelInits } from "./character-class-level.ts";
import type { CharacterId, CombatantId, InitiativeScore } from "./identity.ts";
import type {
  BattleDruidWildShapeKnownFormSupportProfile,
  BattleUnitSupportSource,
  BattleUnitSupportProfile,
} from "./unit-feature-support.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import {
  projectAuthoredStatBlock,
  type BattleStatBlockProjectionFailure,
} from "./stat-block-authored-projection.ts";
import type {
  BattleDruidWildShapeKnownForm,
  BattleDruidWildShapeKnownFormProjection,
} from "./druid-wild-shape-known-form-execution.ts";
import type {
  BattleDruidWildShapeFormSpeeds,
  LiteralStatBlockSpeed,
  LiteralWalkStatBlockSpeed,
} from "./druid-wild-shape-known-form-runtime.ts";
export type { BattleDruidWildShapeKnownForm } from "./druid-wild-shape-known-form-execution.ts";
import type {
  BattleAmmunitionStock,
  BattleStateInitIssue,
  CharacterBattleUnarmoredArmorClassBases,
} from "./battle-state-execution.ts";
import {
  battleStatBlockCombatantSource,
  statBlockInitialConditionImmunityIssue,
  type BattleStatBlockCombatantSource,
} from "./stat-block-combatant-admission.ts";
import type { CharacterZeroHpLifecycleInit } from "./zero-hp-lifecycle.ts";
import {
  runtimeStatBlockActionSurfaceIsSupported,
  statBlockTraitsAreSupported,
} from "./statblock-action-support.ts";
import {
  wildShapeKnownFormEligibilityIssue,
  type WildShapeKnownFormEligibilityIssueCode,
} from "./druid-wild-shape-form-eligibility.ts";

export type BattleUnitRef = {
  readonly unit: BattleUnitSupportSource;
  readonly supportProfiles: readonly BattleUnitSupportProfile[];
};

// Init-time weapon attack facts omit the execution references and derived
// mastery flag; those are computed from the selected loadout and mastery
// selections so the init contract cannot carry mismatched derived state.
export type CharacterBattleCreatureInitWeaponAttack = {
  readonly kind: "weapon";
  readonly weapon: CharacterWeaponAttackExecutionWeapon;
  readonly ability: Ability;
  readonly abilityModifier: AbilityModifier;
  readonly attackBonus?: AttackBonus;
  readonly damageAbilityModifier?: AbilityModifier;
  readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoice;
  readonly damageBonus?: number;
  readonly damageTypeChoices?: CharacterWeaponAttackDamageTypeChoices;
  readonly alternateAbilityChoices?: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>;
};

export function characterBattleCreatureInitWeaponAttack(
  fields: CharacterBattleCreatureInitWeaponAttack,
): CharacterBattleCreatureInitWeaponAttack {
  return {
    kind: fields.kind,
    weapon: fields.weapon,
    ability: fields.ability,
    abilityModifier: fields.abilityModifier,
    ...optionalProperty("attackBonus", fields.attackBonus),
    ...optionalProperty("damageAbilityModifier", fields.damageAbilityModifier),
    ...(fields.attackDamageAbilityModifierChoice === undefined
      ? {}
      : {
          attackDamageAbilityModifierChoice:
            fields.attackDamageAbilityModifierChoice,
        }),
    ...optionalProperty("damageBonus", fields.damageBonus),
    ...optionalProperty("damageTypeChoices", fields.damageTypeChoices),
    ...optionalProperty(
      "alternateAbilityChoices",
      fields.alternateAbilityChoices,
    ),
  };
}

import type {
  BattleWalkSpeed,
  CharacterBattleD20Statistics,
  CharacterBattleInvocationFeature,
  CharacterBattleLoadoutRef,
  CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";
export type {
  BattleWalkSpeed,
  CharacterBattleD20Statistics,
  CharacterBattleInvocationFeature,
  CharacterBattleLoadoutRef,
  CharacterBattleWeaponMasterySelection,
} from "./character-creature-execution-facts.ts";

export type BattleDruidWildShapeKnownFormIssue = {
  readonly tag: "battleDruidWildShapeKnownFormIssue";
  readonly message: string;
};

const WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES = {
  creatureType:
    "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
  challengeRating:
    "Druid Wild Shape battle forms cannot exceed the Druid's maximum Challenge Rating.",
  flySpeed:
    "Druid Wild Shape battle forms cannot have a Fly Speed at this Druid level.",
} as const satisfies Record<WildShapeKnownFormEligibilityIssueCode, string>;

export function battleAvailableDruidWildShapeKnownForms(input: {
  readonly forms: readonly StatBlockRecord[];
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): Either.Either<
  readonly BattleDruidWildShapeKnownForm[],
  BattleDruidWildShapeKnownFormIssue
> {
  if (new Set(input.forms.map((form) => form.id)).size !== input.forms.length) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message:
        "Druid Wild Shape battle initialization requires distinct available known forms.",
    });
  }
  const parsed: BattleDruidWildShapeKnownForm[] = [];
  for (const form of input.forms) {
    const eligibilityIssue = wildShapeKnownFormEligibilityIssue({
      form,
      profile: input.profile,
    });
    if (eligibilityIssue !== undefined) {
      return Either.left({
        tag: "battleDruidWildShapeKnownFormIssue",
        message:
          WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES[eligibilityIssue.code],
      });
    }
    if (!statBlockTraitsAreSupported(form.statBlock.traits)) {
      continue;
    }
    const projected = battleDruidWildShapeFormProjectionStatBlock(form);
    if (Either.isLeft(projected)) return Either.left(projected.left);
    if (!runtimeStatBlockActionSurfaceIsSupported(projected.right)) {
      continue;
    }
    parsed.push(battleDruidWildShapeKnownForm(projected.right));
  }
  return Either.right(parsed);
}

function battleDruidWildShapeKnownForm(
  form: BattleDruidWildShapeKnownFormProjection,
): BattleDruidWildShapeKnownForm {
  // Brands are erased at runtime; the parser applies this brand only after
  // proving roster eligibility, projection facts, and supported actions.
  return form as BattleDruidWildShapeKnownForm;
}

function battleDruidWildShapeFormProjectionStatBlock(
  form: StatBlockRecord,
): Either.Either<
  BattleDruidWildShapeKnownFormProjection,
  BattleDruidWildShapeKnownFormIssue
> {
  const projected = projectAuthoredStatBlock(form);
  if (Either.isLeft(projected)) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: projected.left.reason,
    });
  }
  const armorClass = projected.right.runtime.statBlock.ac;
  if (armorClass.kind !== "literal") {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Armor Class.",
    });
  }
  const creatureSize = projected.right.runtime.statBlock.size;
  if (typeof creatureSize !== "string") {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Size.",
    });
  }
  const speeds = battleDruidWildShapeFormProjectionSpeeds(
    projected.right.runtime,
  );
  if (Either.isLeft(speeds)) return Either.left(speeds.left);
  return Either.right({
    ...projected.right.runtime,
    presentation: projected.right.presentation,
    statBlock: {
      ...projected.right.runtime.statBlock,
      ac: armorClass,
      size: creatureSize,
      speeds: speeds.right,
    },
  });
}

function battleDruidWildShapeFormProjectionSpeeds(
  form: BattleStatBlockExecutionSource,
): Either.Either<
  BattleDruidWildShapeFormSpeeds,
  BattleDruidWildShapeKnownFormIssue
> {
  const literalSpeeds: LiteralStatBlockSpeed[] = [];
  for (const speed of form.statBlock.speeds) {
    if (speed.feet.kind !== "literal") {
      return Either.left({
        tag: "battleDruidWildShapeKnownFormIssue",
        message:
          "Druid Wild Shape battle forms require unconditional literal Speeds.",
      });
    }
    literalSpeeds.push({ kind: speed.kind, feet: speed.feet });
  }
  const walkSpeed = literalSpeeds.find(
    (speed): speed is LiteralWalkStatBlockSpeed => speed.kind === "walk",
  );
  if (walkSpeed === undefined) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Walk Speed.",
    });
  }
  return Either.right([
    walkSpeed,
    ...literalSpeeds.filter((speed) => speed !== walkSpeed),
  ]);
}

// SRD 5.2.1 "Knocking Out a Creature": a knocked-out creature is left at 1 HP
// with the Unconscious condition. That condition ends when the Short Rest
// started by Knock Out completes, when it regains HP, or after successful
// DC 10 Wisdom (Medicine) first aid. Battle runtime executes the HP-healing
// ending path; rest completion and first aid are carried for session workflows.
import type { BattlePositiveHpUnconscious } from "./positive-hp-unconscious.ts";
export {
  KNOCKED_OUT_UNCONSCIOUS,
  type BattlePositiveHpUnconscious,
} from "./positive-hp-unconscious.ts";

export type CharacterBattleCreatureInit = {
  readonly kind: "character";
  readonly characterId: CharacterId;
  readonly characterUnitRefs: readonly BattleUnitRef[];
  readonly classLevels: CharacterBattleClassLevelInits;
  readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
  readonly d20Statistics: CharacterBattleD20Statistics;
  readonly druidWildShapeAvailableForms?: readonly BattleDruidWildShapeKnownForm[];
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly armorClass: ArmorClassState;
  /**
   * Omission has one precise meaning for synthetic/direct fixtures: use the
   * selected ability-sum base when already unarmored, otherwise use the default
   * 10 + Dexterity base for both Shield states.
   */
  readonly unarmoredArmorClassBases?: CharacterBattleUnarmoredArmorClassBases;
  readonly size: Size;
  readonly speed: BattleWalkSpeed;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly conditions?: readonly Condition[];
  readonly positiveHpUnconscious?: BattlePositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly selectedLoadout: CharacterBattleLoadoutRef;
  readonly weaponMasteries: readonly CharacterBattleWeaponMasterySelection[];
  readonly attack: CharacterBattleCreatureInitWeaponAttack | null;
  readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: CharacterBattleCreatureInitWeaponAttack | undefined;
  readonly unitFeatures?: readonly CharacterBattleFeatureInit[];
  readonly invocationFeatures?: readonly CharacterBattleInvocationFeature[];
  readonly resources?: readonly CharacterBattleResourceInit[];
  readonly metamagic?: CharacterBattleMetamagicInit;
  readonly spellcasting?: CharacterBattleSpellcastingInit;
};

export type StatBlockBattleInitInput = {
  readonly combatantId: CombatantId;
  readonly statBlock: BattleStatBlockExecutionSource;
  readonly initiative: InitiativeScore;
  // defaults to max
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly conditions: readonly StatBlockInitialCondition[];
  /** Authored presentation is admitted beside the runtime projection. */
  readonly presentation?: BattleStatBlockPresentationSource;
};

export type AuthoredStatBlockBattleInitInput = Omit<
  StatBlockBattleInitInput,
  "statBlock" | "presentation"
> & {
  readonly statBlock: StatBlockRecord;
};

export type AuthoredStatBlockBattleInitIssue =
  | StatBlockBattleInitIssue
  | {
      readonly tag: "statBlockProjectionFailure";
      readonly failure: BattleStatBlockProjectionFailure;
    };

export type StatBlockBattleInitIssue = Extract<
  BattleStateInitIssue,
  { readonly tag: "battleStateInitIssue" }
>;

export const STAT_BLOCK_INITIAL_CONDITIONS = ["prone"] as const;
export type StatBlockInitialCondition =
  (typeof STAT_BLOCK_INITIAL_CONDITIONS)[number];

export type StatBlockBattleCreatureInit = {
  readonly kind: "statBlock";
  readonly source: BattleStatBlockCombatantSource;
  readonly currentHp: Hp;
  readonly tempHp: Hp;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly conditions: readonly StatBlockInitialCondition[];
  readonly presentation?: BattleStatBlockPresentationSource;
};

export type BattleCreatureInit = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  // The creature init kind is the zero-HP lifecycle authority:
  // characters use death saves; stat block creatures die at 0 HP.
  readonly creatureInit:
    | CharacterBattleCreatureInit
    | StatBlockBattleCreatureInit;
};

export function battleCreatureInitFromStatBlock(
  input: StatBlockBattleInitInput,
): Either.Either<BattleCreatureInit, StatBlockBattleInitIssue> {
  const source = battleStatBlockCombatantSource(input.statBlock);
  if (Either.isLeft(source)) return Either.left(source.left);
  const initialConditionImmunityIssue = statBlockInitialConditionImmunityIssue(
    source.right,
    input.conditions,
  );
  if (initialConditionImmunityIssue !== null) {
    return Either.left(initialConditionImmunityIssue);
  }
  const maxHp = toHp(source.right.statBlock.hp.value);
  return Either.right({
    combatantId: input.combatantId,
    displayName: input.presentation?.displayName ?? input.statBlock.id,
    initiative: input.initiative,
    creatureInit: {
      kind: "statBlock",
      source: source.right,
      currentHp: input.currentHp ?? maxHp,
      tempHp: input.tempHp ?? toHp(0),
      ammunitionStocks: input.ammunitionStocks,
      conditions: input.conditions,
      ...(input.presentation === undefined
        ? {}
        : { presentation: input.presentation }),
    },
  });
}

/** Admit an authored catalog record through projection and battle init once. */
export function battleCreatureInitFromAuthoredStatBlock(
  input: AuthoredStatBlockBattleInitInput,
): Either.Either<BattleCreatureInit, AuthoredStatBlockBattleInitIssue> {
  const projected = projectAuthoredStatBlockBattleInitInput(input);
  if (Either.isLeft(projected)) {
    return Either.left({
      tag: "statBlockProjectionFailure",
      failure: projected.left,
    });
  }
  return battleCreatureInitFromStatBlock(projected.right);
}

export function projectAuthoredStatBlockBattleInitInput(
  input: AuthoredStatBlockBattleInitInput,
): Either.Either<StatBlockBattleInitInput, BattleStatBlockProjectionFailure> {
  const projected = projectAuthoredStatBlock(input.statBlock);
  if (Either.isLeft(projected)) return Either.left(projected.left);
  return Either.right({
    ...input,
    statBlock: projected.right.runtime,
    presentation: projected.right.presentation,
  });
}

export function authoredStatBlockBattleInitIssueMessage(
  issue: AuthoredStatBlockBattleInitIssue,
): string {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssue" }, ({ message }) => message),
    Match.when({ tag: "statBlockProjectionFailure" }, ({ failure }) => {
      const location =
        failure.section === undefined
          ? ""
          : ` in ${failure.section} procedure ${String(failure.procedureOrdinal ?? "unknown")}`;
      return `Stat Block authored projection failed${location}: ${statBlockProjectionFailureMessage(failure)}.`;
    }),
    Match.exhaustive,
  );
}

function statBlockProjectionFailureMessage(
  failure: BattleStatBlockProjectionFailure,
): string {
  return Match.value(failure.reason).pipe(
    Match.when(
      "nonLiteralSize",
      () => "battle initialization requires a concrete Size",
    ),
    Match.when(
      "nonLiteralArmorClass",
      () => "battle initialization requires literal Armor Class",
    ),
    Match.when(
      "nonLiteralHitPoints",
      () => "battle initialization requires literal maximum Hit Points",
    ),
    Match.when(
      "nonLiteralSpeed",
      () => "battle initialization requires unconditional literal Speeds",
    ),
    Match.when(
      "unsupportedProcedureBinding",
      () => "the procedure binding is not supported by battle execution",
    ),
    Match.exhaustive,
  );
}
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
