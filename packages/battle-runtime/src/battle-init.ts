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
  StatBlockId,
  StatBlockRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import { Result } from "effect";
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
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import {
  battleStatBlockProjectionFailureMessage,
  projectAuthoredStatBlock,
  type AuthoredStatBlockProjection,
  type BattleStatBlockInvalidResourceDeclaration,
  type BattleStatBlockProjectionFailure,
} from "./stat-block-authored-projection.ts";
import {
  admitStatBlockResourceGraph,
  type StatBlockResourceGraphAdmissionFailure,
} from "./stat-block-execution-state.ts";
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
  BattleStateInitLeafIssue,
  CharacterBattleUnarmoredArmorClassBases,
} from "./battle-state-execution.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleStatBlockCombatantSource,
  statBlockInitialConditionImmunityIssue,
  type BattleStatBlockCombatantSource,
  type StatBlockResourceGraphCombatantAdmissionIssue,
} from "./stat-block-combatant-admission.ts";
import type { CharacterZeroHpLifecycleInit } from "./zero-hp-lifecycle.ts";
import { statBlockTraitsAreSupported } from "./statblock-action-support.ts";
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

export type BattleDruidWildShapeKnownFormIssue =
  | {
      readonly tag: "battleDruidWildShapeKnownFormIssue";
      readonly statBlockId: StatBlockId;
      readonly reason: "duplicateFormIdentity";
    }
  | {
      readonly tag: "battleDruidWildShapeKnownFormIssue";
      readonly statBlockId: StatBlockId;
      readonly reason: "ineligible";
      readonly eligibilityIssue: WildShapeKnownFormEligibilityIssueCode;
    }
  | {
      readonly tag: "battleDruidWildShapeKnownFormIssue";
      readonly statBlockId: StatBlockId;
      readonly reason:
        | "nonLiteralSize"
        | "unresolvedGmSpeedChoice"
        | "unsupportedFormRestrictedSpeed"
        | "unsupportedQualifiedConditionImmunity"
        | "unsupportedLairConditionalLegendaryActionUses"
        | "missingWalkSpeed";
    }
  | {
      readonly tag: "battleDruidWildShapeKnownFormIssue";
      readonly statBlockId: StatBlockId;
      readonly reason: "invalidResourceLimit";
      readonly issues: ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>;
    }
  | {
      readonly tag: "battleDruidWildShapeKnownFormIssue";
      readonly statBlockId: StatBlockId;
      readonly reason: "resourceGraph";
      readonly issues: ReadonlyNonEmptyArray<StatBlockResourceGraphAdmissionFailure>;
    };

export type BattleDruidWildShapeKnownFormsIssue = {
  readonly tag: "battleDruidWildShapeKnownFormsIssue";
  readonly issues: ReadonlyNonEmptyArray<BattleDruidWildShapeKnownFormIssue>;
};

const WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES = {
  creatureType:
    "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
  challengeRating:
    "Druid Wild Shape battle forms cannot exceed the Druid's maximum Challenge Rating.",
  flySpeed:
    "Druid Wild Shape battle forms cannot have a Fly Speed at this Druid level.",
} as const satisfies Record<WildShapeKnownFormEligibilityIssueCode, string>;

type WildShapeKnownFormScalarProjectionFailureReason = Exclude<
  BattleStatBlockProjectionFailure["reason"],
  "unsupportedProcedureBinding"
>;

const WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES = {
  nonLiteralSize: "Druid Wild Shape battle forms require literal Size.",
  unsupportedLairConditionalLegendaryActionUses:
    "Druid Wild Shape battle forms cannot select lair-conditional Legendary Action uses without lair context.",
  unsupportedFormRestrictedSpeed:
    "Druid Wild Shape battle forms require an active form before selecting form-restricted Speeds.",
  unresolvedGmSpeedChoice:
    "Druid Wild Shape battle forms require the GM's Table Decision selecting one authored Speed alternative.",
  unsupportedQualifiedConditionImmunity:
    "Druid Wild Shape battle forms cannot apply a qualified condition Immunity without its qualifying state.",
  invalidResourceLimit:
    "Druid Wild Shape battle forms require valid Stat Block resource limits.",
} as const satisfies Record<
  WildShapeKnownFormScalarProjectionFailureReason,
  string
>;

type DruidWildShapeKnownFormDisposition =
  | { readonly kind: "skip" }
  | {
      readonly kind: "issue";
      readonly issue: BattleDruidWildShapeKnownFormIssue;
    }
  | {
      readonly kind: "admitted";
      readonly form: BattleDruidWildShapeKnownForm;
    };

export function battleAvailableDruidWildShapeKnownForms(input: {
  readonly forms: readonly StatBlockRecord[];
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): Result.Result<
  readonly BattleDruidWildShapeKnownForm[],
  BattleDruidWildShapeKnownFormsIssue
> {
  if (new Set(input.forms.map((form) => form.id)).size !== input.forms.length) {
    return Result.fail({
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
      return Result.fail({
        tag: "battleDruidWildShapeKnownFormIssue",
        statBlockId: form.id,
        reason: "duplicateFormIdentity",
      });
    }
    const projected = battleDruidWildShapeFormProjectionStatBlock(form);
    if (Result.isFailure(projected)) return Result.fail(projected.failure);
    if (!statBlockActionSurfaceIsSupported(form.statBlock)) {
      continue;
    }
    parsed.push(battleDruidWildShapeKnownForm(projected.success));
  }
  return Result.succeed(parsed);
}

function battleDruidWildShapeKnownForm(
  form: BattleDruidWildShapeKnownFormProjection,
): BattleDruidWildShapeKnownForm {
  // Brands are erased at runtime; the parser applies this brand only after
  // proving roster eligibility, projection facts, supported actions, and the
  // closed procedure/resource graph.
  return form as BattleDruidWildShapeKnownForm;
}

export function wildShapeKnownFormsIssueMessage(
  issues: ReadonlyNonEmptyArray<BattleDruidWildShapeKnownFormIssue>,
): string {
  return issues
    .map((issue) =>
      Match.value(issue).pipe(
        Match.when(
          { reason: "duplicateFormIdentity" },
          () =>
            "Druid Wild Shape battle initialization requires distinct available known forms.",
        ),
        Match.when(
          { reason: "ineligible" },
          ({ eligibilityIssue }) =>
            WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES[eligibilityIssue],
        ),
        Match.when(
          { reason: "nonLiteralSize" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.nonLiteralSize,
        ),
        Match.when(
          { reason: "unsupportedLairConditionalLegendaryActionUses" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.unsupportedLairConditionalLegendaryActionUses,
        ),
        Match.when(
          { reason: "unsupportedFormRestrictedSpeed" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.unsupportedFormRestrictedSpeed,
        ),
        Match.when(
          { reason: "unresolvedGmSpeedChoice" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.unresolvedGmSpeedChoice,
        ),
        Match.when(
          { reason: "unsupportedQualifiedConditionImmunity" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.unsupportedQualifiedConditionImmunity,
        ),
        Match.when(
          { reason: "missingWalkSpeed" },
          () => "Druid Wild Shape battle forms require literal Walk Speed.",
        ),
        Match.when(
          { reason: "invalidResourceLimit" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.invalidResourceLimit,
        ),
        Match.when({ reason: "resourceGraph" }, ({ issues: resourceIssues }) =>
          resourceIssues
            .map((resourceIssue) =>
              Match.value(resourceIssue).pipe(
                Match.when(
                  { kind: "duplicateResourceOrdinal" },
                  ({ ordinal }) =>
                    `resource declaration ordinal ${String(ordinal)} is duplicated`,
                ),
                Match.when(
                  { kind: "missingResourceDeclaration" },
                  ({ ordinal }) =>
                    `resource reference ${String(ordinal)} is missing`,
                ),
                Match.exhaustive,
              ),
            )
            .join(", "),
        ),
        Match.exhaustive,
      ),
    )
    .join("; ");
}

function battleDruidWildShapeFormProjectionStatBlock(
  form: StatBlockRecord,
): Result.Result<
  BattleDruidWildShapeKnownFormProjection,
  BattleDruidWildShapeKnownFormIssue
> {
  const armorClass = form.statBlock.ac;
  if (armorClass.kind !== "literal") {
    return Result.fail({
      tag: "battleDruidWildShapeKnownFormIssue",
      statBlockId: projection.runtime.id,
      reason: "missingWalkSpeed",
    });
  }
  const creatureSize = form.statBlock.size;
  if (typeof creatureSize !== "string") {
    return Result.fail({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Size.",
    });
  }
  const speeds = battleDruidWildShapeFormProjectionSpeeds(form);
  if (Result.isFailure(speeds)) return Result.fail(speeds.failure);
  return Result.succeed({
    id: form.id,
    challengeRating: form.challengeRating,
    statBlock: {
      ...form.statBlock,
      ac: armorClass,
      size: creatureSize,
      speeds: speeds.success,
    },
  });
}

function battleDruidWildShapeFormProjectionSpeeds(
  form: StatBlockRecord,
): Result.Result<
  BattleDruidWildShapeFormSpeeds,
  BattleDruidWildShapeKnownFormIssue
> {
  const literalSpeeds: LiteralStatBlockSpeed[] = [];
  for (const speed of form.statBlock.speeds) {
    if (
      speed.feet.kind !== "literal" ||
      speed.requiresSlotLevel !== undefined
    ) {
      return Result.fail({
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
    return Result.fail({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Walk Speed.",
    });
  }
  return Result.succeed([
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

/** Authored Stat Block input accepted by the public battle initializer. */
export type AuthoredStatBlockBattleInitInput = {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: InitiativeScore;
  // defaults to max
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly conditions: readonly StatBlockInitialCondition[];
};

export type AuthoredStatBlockBattleInitIssue =
  | StatBlockBattleInitIssue
  | StatBlockResourceGraphCombatantAdmissionIssue
  | {
      readonly tag: "statBlockProjectionFailure";
      readonly failure: BattleStatBlockProjectionFailure;
    };

export type StatBlockBattleInitIssue = Extract<
  BattleStateInitLeafIssue,
  { readonly tag: "battleStateInitIssue" }
>;

type RuntimeStatBlockBattleInitInput = {
  readonly combatantId: CombatantId;
  readonly statBlock: BattleStatBlockCombatantSource;
  readonly initiative: InitiativeScore;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly conditions: readonly StatBlockInitialCondition[];
  readonly presentation: BattleStatBlockPresentationSource;
};

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
  readonly presentation: BattleStatBlockPresentationSource;
};

type BattleCreatureInitCommon = {
  readonly combatantId: CombatantId;
  readonly initiative: InitiativeScore;
};

export type CharacterBattleCombatantInit = BattleCreatureInitCommon & {
  // The creature init kind is the zero-HP lifecycle authority:
  // characters use death saves; stat block creatures die at 0 HP.
  readonly creatureInit: CharacterBattleCreatureInit;
  /** Character presentation is owned by the character combatant branch. */
  readonly displayName: string;
};

export type StatBlockBattleCombatantInit = BattleCreatureInitCommon & {
  // The creature init kind is the zero-HP lifecycle authority:
  // characters use death saves; stat block creatures die at 0 HP.
  readonly creatureInit: StatBlockBattleCreatureInit;
};

export type BattleCreatureInit =
  | CharacterBattleCombatantInit
  | StatBlockBattleCombatantInit;

export function battleCreatureInitFromStatBlock(
  input: StatBlockBattleInitInput,
): Result.Result<
  BattleStatBlockCreatureInitResult,
  BattleStatBlockInitializationIssue
> {
  const source = battleStatBlockCombatantSource(input.statBlock);
  if (Result.isFailure(source)) return Result.fail(source.failure);
  const initialConditionImmunityIssue = statBlockInitialConditionImmunityIssue(
    source.success,
    input.conditions,
    input.combatantId,
  );
  if (initialConditionImmunityIssue !== null) {
    return Result.fail(initialConditionImmunityIssue);
  }
  const maxHp = toHp(source.success.statBlock.hp.value);
  return Result.succeed({
    combatantId: input.combatantId,
    initiative: input.initiative,
    creatureInit: {
      kind: "statBlock",
      source: source.success,
      currentHp: input.currentHp ?? maxHp,
      tempHp: input.tempHp ?? toHp(0),
      ammunitionStocks: input.ammunitionStocks,
      conditions: input.conditions,
      presentation: input.presentation,
    },
  });
}

export function authoredStatBlockBattleInitIssueMessage(
  issue: AuthoredStatBlockBattleInitIssue,
): string {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleStateInitIssue" }, ({ message }) => message),
    Match.when({ tag: "statBlockResourceGraphIssue" }, (resourceGraphIssue) =>
      battleStateInitIssueMessage(resourceGraphIssue),
    ),
    Match.when({ tag: "statBlockProjectionFailure" }, ({ failure }) =>
      battleStatBlockProjectionFailureMessage(failure),
    ),
    Match.exhaustive,
  );
}
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
