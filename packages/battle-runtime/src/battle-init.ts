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
        | "invalidLegendaryActionUses"
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
  invalidLegendaryActionUses:
    "Druid Wild Shape battle forms require positive integer Legendary Action uses.",
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
}): Either.Either<
  readonly BattleDruidWildShapeKnownForm[],
  BattleDruidWildShapeKnownFormsIssue
> {
  const issues = duplicateWildShapeKnownFormIssues(input.forms);
  const parsed: BattleDruidWildShapeKnownForm[] = [];
  for (const form of input.forms) {
    const disposition = admitDruidWildShapeKnownForm(form, input.profile);
    Match.value(disposition).pipe(
      Match.when({ kind: "skip" }, () => undefined),
      Match.when({ kind: "issue" }, ({ issue }) => issues.push(issue)),
      Match.when({ kind: "admitted" }, ({ form: admittedForm }) =>
        parsed.push(admittedForm),
      ),
      Match.exhaustive,
    );
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Either.right(parsed)
    : Either.left({
        tag: "battleDruidWildShapeKnownFormsIssue",
        issues: [firstIssue, ...remainingIssues],
      });
}

function duplicateWildShapeKnownFormIssues(
  forms: readonly StatBlockRecord[],
): BattleDruidWildShapeKnownFormIssue[] {
  const seenIds = new Set<StatBlockId>();
  const duplicateIssues: BattleDruidWildShapeKnownFormIssue[] = [];
  const duplicateIds = new Set<StatBlockId>();
  for (const form of forms) {
    if (seenIds.has(form.id) && !duplicateIds.has(form.id)) {
      duplicateIds.add(form.id);
      duplicateIssues.push({
        tag: "battleDruidWildShapeKnownFormIssue",
        statBlockId: form.id,
        reason: "duplicateFormIdentity",
      });
    }
    seenIds.add(form.id);
  }
  return duplicateIssues;
}

function admitDruidWildShapeKnownForm(
  form: StatBlockRecord,
  profile: BattleDruidWildShapeKnownFormSupportProfile,
): DruidWildShapeKnownFormDisposition {
  const eligibilityIssue = wildShapeKnownFormEligibilityIssue({
    form,
    profile,
  });
  if (eligibilityIssue !== undefined) {
    return {
      kind: "issue",
      issue: {
        tag: "battleDruidWildShapeKnownFormIssue",
        statBlockId: form.id,
        reason: "ineligible",
        eligibilityIssue: eligibilityIssue.code,
      },
    };
  }
  if (!statBlockTraitsAreSupported(form.statBlock.traits)) {
    return { kind: "skip" };
  }
  const projected = projectAuthoredStatBlock(form);
  if (Either.isLeft(projected)) {
    return wildShapeProjectionDisposition(form.id, projected.left);
  }
  const formProjection = battleDruidWildShapeFormProjectionStatBlock(
    projected.right,
  );
  if (Either.isLeft(formProjection)) {
    return { kind: "issue", issue: formProjection.left };
  }
  const resourceGraph = admitStatBlockResourceGraph(formProjection.right);
  if (Either.isLeft(resourceGraph)) {
    return {
      kind: "issue",
      issue: {
        tag: "battleDruidWildShapeKnownFormIssue",
        statBlockId: form.id,
        reason: "resourceGraph",
        issues: resourceGraph.left,
      },
    };
  }
  return {
    kind: "admitted",
    form: battleDruidWildShapeKnownForm(resourceGraph.right),
  };
}

function wildShapeProjectionDisposition(
  statBlockId: StatBlockId,
  failure: BattleStatBlockProjectionFailure,
): DruidWildShapeKnownFormDisposition {
  return Match.value(failure).pipe(
    Match.when({ reason: "unsupportedProcedureBinding" }, () => ({
      kind: "skip" as const,
    })),
    Match.when({ reason: "nonLiteralSize" }, ({ reason }) => ({
      kind: "issue" as const,
      issue: {
        tag: "battleDruidWildShapeKnownFormIssue" as const,
        statBlockId,
        reason,
      },
    })),
    Match.when({ reason: "invalidLegendaryActionUses" }, ({ reason }) => ({
      kind: "issue" as const,
      issue: {
        tag: "battleDruidWildShapeKnownFormIssue" as const,
        statBlockId,
        reason,
      },
    })),
    Match.when(
      { reason: "invalidResourceLimit" },
      ({ issues: resourceIssues }) => ({
        kind: "issue" as const,
        issue: {
          tag: "battleDruidWildShapeKnownFormIssue" as const,
          statBlockId,
          reason: "invalidResourceLimit" as const,
          issues: resourceIssues,
        },
      }),
    ),
    Match.exhaustive,
  );
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
          { reason: "invalidLegendaryActionUses" },
          () =>
            WILD_SHAPE_KNOWN_FORM_PROJECTION_FAILURE_MESSAGES.invalidLegendaryActionUses,
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
  projection: AuthoredStatBlockProjection,
): Either.Either<
  BattleDruidWildShapeKnownFormProjection,
  BattleDruidWildShapeKnownFormIssue
> {
  const speeds = battleDruidWildShapeFormProjectionSpeeds(
    projection.runtime.statBlock.speeds,
  );
  if (Either.isLeft(speeds)) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      statBlockId: projection.runtime.id,
      reason: "missingWalkSpeed",
    });
  }
  return Either.right({
    ...projection.runtime,
    presentation: projection.presentation,
    statBlock: {
      ...projection.runtime.statBlock,
      speeds: speeds.right,
    },
  });
}

function battleDruidWildShapeFormProjectionSpeeds(
  speeds: AuthoredStatBlockProjection["runtime"]["statBlock"]["speeds"],
): Either.Either<BattleDruidWildShapeFormSpeeds, "missingWalkSpeed"> {
  const literalSpeeds: LiteralStatBlockSpeed[] = speeds.map((speed) => ({
    kind: speed.kind,
    feet: speed.feet,
  }));
  const walkSpeed = literalSpeeds.find(
    (speed): speed is LiteralWalkStatBlockSpeed => speed.kind === "walk",
  );
  if (walkSpeed === undefined) {
    return Either.left("missingWalkSpeed");
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
  input: AuthoredStatBlockBattleInitInput,
): Either.Either<
  StatBlockBattleCombatantInit,
  AuthoredStatBlockBattleInitIssue
> {
  const projected = projectAuthoredStatBlock(input.statBlock);
  if (Either.isLeft(projected)) {
    return Either.left({
      tag: "statBlockProjectionFailure",
      failure: projected.left,
    });
  }
  const source = battleStatBlockCombatantSource(projected.right.runtime);
  if (Either.isLeft(source)) return Either.left(source.left);
  return battleCreatureInitFromRuntimeStatBlock({
    ...input,
    statBlock: source.right,
    presentation: projected.right.presentation,
  });
}

function battleCreatureInitFromRuntimeStatBlock(
  input: RuntimeStatBlockBattleInitInput,
): Either.Either<StatBlockBattleCombatantInit, StatBlockBattleInitIssue> {
  const initialConditionImmunityIssue = statBlockInitialConditionImmunityIssue(
    input.statBlock,
    input.conditions,
  );
  if (initialConditionImmunityIssue !== null) {
    return Either.left(initialConditionImmunityIssue);
  }
  const maxHp = toHp(input.statBlock.statBlock.hp.value);
  return Either.right({
    combatantId: input.combatantId,
    initiative: input.initiative,
    creatureInit: {
      kind: "statBlock",
      source: input.statBlock,
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
