import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-reduction
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
//
// The damageReduction Spell Procedure Profile: a cantrip-access spell (today
// Resistance) that, on touch, grants an ongoing reduction of one damage roll
// against the target by 1d4. All damageReduction-specific behavior lives
// here:
//
//   - admit()              — was supportedCantripDamageReductionSpellProfile
//                            in spells-profiles-support.ts
//   - damageReductionShape — was damageReductionSpellProjection in
//                            spells-profiles-support.ts
//   - discoverCastAct()    — was the damageReduction branch in
//                            spells-discovery.ts:discoverBattleActs
//   - castSummary()        — was the damageReduction branch in
//                            spells-discovery.ts:spellInvocationCastSummary
//   - resolve()            — was resolveDamageReductionSpellAct in
//                            spells-resolve-support-effects.ts
//   - applyEffect()        — was applyDamageReductionSpellEffect in
//                            spells-active-effects.ts (kept as a file-local
//                            helper; not exported from the profile)
//
import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type {
  DamageType,
  DamageTypeRef,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { Result, Schema } from "effect";

import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTargetAndDamageType } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  admitSpellTargetAttachment,
  combineSpellProcedureValidations,
  spellMechanicsObjectHasOnlyKeys,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureHasCompleteSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  type SpellMechanicsAdmissionSource,
  type SpellAttachmentRejection,
  type SpellOngoingOperationOccurrence,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
  type SpellProcedureValidation,
} from "./spell-mechanics-admission.ts";
import { Match } from "effect";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

type DamageReductionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "damageReduction" }
>;
type DamageReductionMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type DamageReductionProfileShape = {
  readonly damageTypeChoices: ReadonlyNonEmptyArray<DamageType>;
  readonly amount: DamageReductionAmount;
  readonly targeting: DamageReductionTargetingProjection;
  readonly rangeFeet: ReturnType<typeof spellTouchRangeFeet>;
  readonly range: Extract<
    SpellProcedureMechanicsFacts["range"],
    { readonly kind: "touch" }
  >;
  readonly duration: Extract<
    SpellProcedureMechanicsFacts["duration"],
    { readonly kind: "concentration" }
  >;
};
type DamageReductionMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "range" | "duration"
> &
  DamageReductionProfileShape;
type DamageReductionFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "initialPhase"
  | "authoredConditionalMechanics"
  | "attachment"
  | "rangeOrigin"
  | "typeFilter"
  | "stateFilter"
  | "visibility"
  | "predicate"
  | "targetLimit"
  | "usageLimit"
  | "passiveOperation"
  | "damage"
  | "spellcastingMod"
  | "abilityModifier"
  | "operationCount";
type DamageReductionAdmissionIssue = SpellProcedureAdmissionIssue<
  "damageReduction",
  DamageReductionFailedFact,
  UnitMechanicsPath
>;
type DamageReductionIssueCoordinate = {
  readonly failedFact: DamageReductionFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};
type DamageReductionValidation<Value> = SpellProcedureValidation<
  Value,
  DamageReductionIssueCoordinate
>;

const DAMAGE_REDUCTION_LEVEL = 0;
const DAMAGE_REDUCTION_OPERATION_COUNT = 1;
const DAMAGE_REDUCTION_DICE_COUNT = 1;
const DAMAGE_REDUCTION_DIE_SIZE = 4;
const DAMAGE_REDUCTION_TARGET_COUNT = 1;
const DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
] as const;
const DAMAGE_REDUCTION_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "operations",
] as const;
const DAMAGE_REDUCTION_TARGET_ATTACHMENT_WRAPPER_FIELDS = [
  "kind",
  "holeId",
  "value",
  "label",
] as const;
const DAMAGE_REDUCTION_TARGET_ATTACHMENT_VALUE_FIELDS = [
  "kind",
  "selection",
] as const;
const DAMAGE_REDUCTION_DURATION_FIELDS = ["kind", "upTo"] as const;
const DAMAGE_REDUCTION_DURATION_VALUE_FIELDS = ["amount", "unit"] as const;

function spellMechanicsObjectHasExactKeys(
  value: unknown,
  expectedFields: readonly PropertyKey[],
): boolean {
  if (typeof value !== "object" || value === null) return false;
  const actualFields = Reflect.ownKeys(value);
  return (
    actualFields.length === expectedFields.length &&
    actualFields.every((field) => expectedFields.includes(field))
  );
}

type DamageReductionAmount = {
  readonly dice: typeof DAMAGE_REDUCTION_DICE_COUNT;
  readonly dieSize: typeof DAMAGE_REDUCTION_DIE_SIZE;
};
type DamageReductionTargetingProjection = {
  readonly kind: "targetList";
  readonly minTargets: typeof DAMAGE_REDUCTION_TARGET_COUNT;
  readonly maxTargets: typeof DAMAGE_REDUCTION_TARGET_COUNT;
  readonly requiredTargetDisposition: "willing";
};

function damageReductionTargetingProjection(
  targetSelection: TargetSelection,
): DamageReductionTargetingProjection | undefined {
  return targetSelection.mode === "one" &&
    targetSelection.targetKinds !== undefined &&
    targetSelection.targetKinds.length === 1 &&
    targetSelection.targetKinds[0] === "creature" &&
    "disposition" in targetSelection &&
    targetSelection.disposition === "willing"
    ? {
        kind: "targetList",
        minTargets: DAMAGE_REDUCTION_TARGET_COUNT,
        maxTargets: DAMAGE_REDUCTION_TARGET_COUNT,
        requiredTargetDisposition: "willing",
      }
    : undefined;
}

function damageReductionTargetAttachmentProjection(
  attachment: DamageReductionMechanics["attachment"],
): DamageReductionTargetingProjection | undefined {
  if (
    attachment.kind !== "hole" ||
    !spellMechanicsObjectHasExactKeys(
      attachment,
      DAMAGE_REDUCTION_TARGET_ATTACHMENT_WRAPPER_FIELDS,
    ) ||
    !spellMechanicsObjectHasExactKeys(
      attachment.value,
      DAMAGE_REDUCTION_TARGET_ATTACHMENT_VALUE_FIELDS,
    )
  ) {
    return undefined;
  }
  const admission = admitSpellTargetAttachment(
    attachment,
    DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS,
  );
  return admission.tag === "admitted"
    ? damageReductionTargetingProjection(admission.attachment.value.selection)
    : undefined;
}

type DamageReductionFallbackOperationProjection = {
  readonly inferredOperationOrdinal: PositiveInteger;
};

function damageReductionFallbackOperationProjection(
  operations: DamageReductionMechanics["operations"],
): DamageReductionFallbackOperationProjection | undefined {
  if (operations.length === 0) {
    return { inferredOperationOrdinal: PositiveInteger(1) };
  }
  const operation = operations.length === 1 ? operations[0] : undefined;
  return operation !== undefined && damageReductionIsEmptyOperation(operation)
    ? { inferredOperationOrdinal: PositiveInteger(1) }
    : undefined;
}

function damageReductionIsEmptyOperation(
  operation: DamageReductionMechanics["operations"][number],
): boolean {
  return (
    spellMechanicsObjectHasExactKeys(operation, ["trigger", "effect"]) &&
    damageReductionIsPassiveTrigger(operation.trigger) &&
    damageReductionIsNoEffect(operation.effect)
  );
}

function damageReductionIsPassiveTrigger(
  trigger: DamageReductionMechanics["operations"][number]["trigger"],
): boolean {
  return (
    trigger.kind === "passive" &&
    spellMechanicsObjectHasExactKeys(trigger, ["kind"])
  );
}

function damageReductionIsNoEffect(
  effect: DamageReductionMechanics["operations"][number]["effect"],
): boolean {
  return (
    effect.kind === "none" && spellMechanicsObjectHasExactKeys(effect, ["kind"])
  );
}

function damageReductionOperationEffectPath(
  occurrence: SpellOngoingOperationOccurrence | undefined,
  fallbackOperation?: DamageReductionFallbackOperationProjection,
): SpellMechanicsBranchPath {
  const ordinal =
    occurrence?.ordinal ??
    fallbackOperation?.inferredOperationOrdinal ??
    PositiveInteger(1);
  return spellOngoingOperationEffectPath(ordinal);
}

function damageReductionOperationPath(
  occurrence: SpellOngoingOperationOccurrence | undefined,
  fallbackOperation?: DamageReductionFallbackOperationProjection,
): SpellMechanicsBranchPath {
  const ordinal =
    occurrence?.ordinal ??
    fallbackOperation?.inferredOperationOrdinal ??
    PositiveInteger(1);
  return spellOngoingOperationPath(ordinal);
}

function damageReductionConcentrationDurationProjection(
  duration: DamageReductionMechanics["duration"],
):
  | Extract<
      DamageReductionMechanics["duration"],
      { readonly kind: "concentration" }
    >
  | undefined {
  if (
    duration.kind !== "concentration" ||
    typeof duration.upTo !== "object" ||
    duration.upTo === null ||
    !("amount" in duration.upTo) ||
    !("unit" in duration.upTo)
  ) {
    return undefined;
  }
  return duration;
}

type DamageReductionDamageTypeProjection = DamageReductionValidation<{
  readonly damageTypeChoices: ReadonlyNonEmptyArray<DamageType>;
}>;
type DamageReductionDamageTypeChoice = Extract<
  Extract<DamageTypeRef, { readonly kind: "hole" }>["value"],
  { readonly kind: "choice" }
>;

function damageReductionDamageTypeChoice(
  damageType: DamageTypeRef | undefined,
): DamageReductionDamageTypeChoice | undefined {
  if (typeof damageType !== "object" || damageType === null) return undefined;
  return Match.value(damageType).pipe(
    Match.when({ kind: "hole" }, ({ value }) =>
      damageReductionChoiceValue(value),
    ),
    Match.whenOr(
      { kind: "all_damage_types" },
      { kind: "choice" },
      { kind: "same_choice_as" },
      { kind: "choice_table" },
      { kind: "same_table_choice_as" },
      () => undefined,
    ),
    Match.exhaustive,
  );
}

function damageReductionChoiceValue(
  value: Extract<DamageTypeRef, { readonly kind: "hole" }>["value"],
): DamageReductionDamageTypeChoice | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return Match.value(value).pipe(
    Match.when({ kind: "choice" }, (choice) => choice),
    Match.whenOr(
      { kind: "all_damage_types" },
      { kind: "same_choice_as" },
      { kind: "choice_table" },
      { kind: "same_table_choice_as" },
      () => undefined,
    ),
    Match.exhaustive,
  );
}

function damageReductionDamageTypeProjection(
  effect:
    | Extract<
        DamageReductionMechanics["operations"][number]["effect"],
        { readonly kind: "reduce_damage_taken" }
      >
    | undefined,
  effectPath: UnitMechanicsPath,
): DamageReductionDamageTypeProjection {
  const choice = damageReductionDamageTypeChoice(effect?.damageType);
  if (choice === undefined)
    return Result.fail([damageReductionIssueCoordinate("damage", effectPath)]);
  const choices = choice.options.filter((option): option is DamageType =>
    Schema.is(DamageTypeSchema)(option),
  );
  const nonEmptyChoices = spellProcedureNonEmpty(choices);
  return nonEmptyChoices !== undefined &&
    choices.length === choice.options.length
    ? Result.succeed({ damageTypeChoices: nonEmptyChoices })
    : Result.fail([damageReductionIssueCoordinate("damage", effectPath)]);
}

function damageReductionAttachmentFailedFact(
  rejection: SpellAttachmentRejection,
): Extract<
  DamageReductionFailedFact,
  "attachment" | "rangeOrigin" | "typeFilter" | "stateFilter" | "visibility"
> {
  return Match.value(rejection.failedFact).pipe(
    Match.whenOr(
      "attachment",
      "rangeOrigin",
      "typeFilter",
      "stateFilter",
      "visibility",
      (fact) => fact,
    ),
    Match.whenOr(
      "selection",
      "mode",
      "targetKinds",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "objectOrLocationMaxDimensionFeet",
      "count",
      "repeatsAllowed",
      "castingRequirement",
      "disposition",
      "shape",
      "origin",
      "occupantDispositionFilter",
      "occupantPerceptionFilter",
      "excludedAreas",
      () => "attachment" as const,
    ),
    Match.exhaustive,
  );
}

function isDamageReductionRepresentation(
  mechanics: SpellMechanics,
): mechanics is DamageReductionMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasTargetAttachment =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target";
  const hasDamageReductionEffect = mechanics.operations.some(
    ({ effect }) => effect.kind === "reduce_damage_taken",
  );
  if (hasDamageReductionEffect) {
    return damageReductionHasRedundantSignature(mechanics, {
      hasTargetAttachment,
      hasDamageReductionEffect,
    });
  }
  return damageReductionHasCompleteFallbackSignature(mechanics);
}

function damageReductionHasRedundantSignature(
  mechanics: DamageReductionMechanics,
  witnesses: {
    readonly hasTargetAttachment: boolean;
    readonly hasDamageReductionEffect: boolean;
  },
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      { name: "targetAttachment", present: witnesses.hasTargetAttachment },
      {
        name: "damageReductionEffect",
        present: witnesses.hasDamageReductionEffect,
      },
      { name: "touchRange", present: mechanics.range.kind === "touch" },
    ],
  });
}

function damageReductionHasCompleteFallbackSignature(
  mechanics: DamageReductionMechanics,
): boolean {
  const hasCanonicalTargetAttachment =
    damageReductionTargetAttachmentProjection(mechanics.attachment) !==
    undefined;
  const hasCanonicalRange = damageReductionHasCanonicalRange(mechanics);
  const hasCanonicalComponents =
    damageReductionHasCanonicalComponents(mechanics);
  const hasCanonicalCastingTime =
    damageReductionHasCanonicalCastingTime(mechanics);
  const concentrationDuration = damageReductionConcentrationDurationProjection(
    mechanics.duration,
  );
  const hasCanonicalDuration =
    concentrationDuration !== undefined &&
    damageReductionHasCanonicalDuration(concentrationDuration);
  return spellProcedureHasCompleteSignature([
    {
      name: "root",
      present: spellMechanicsObjectHasExactKeys(
        mechanics,
        DAMAGE_REDUCTION_ROOT_FIELDS,
      ),
    },
    {
      name: "targetAttachment",
      present: hasCanonicalTargetAttachment,
    },
    {
      name: "operationShell",
      present:
        damageReductionFallbackOperationProjection(mechanics.operations) !==
        undefined,
    },
    { name: "touchRange", present: hasCanonicalRange },
    { name: "school", present: mechanics.school === "abjuration" },
    { name: "castingTime", present: hasCanonicalCastingTime },
    {
      name: "components",
      present: hasCanonicalComponents,
    },
    { name: "concentrationDuration", present: hasCanonicalDuration },
    { name: "cantripLevel", present: mechanics.level === 0 },
  ]);
}

function damageReductionHasCanonicalRange(
  mechanics: DamageReductionMechanics,
): boolean {
  return (
    mechanics.range.kind === "touch" &&
    spellMechanicsObjectHasOnlyKeys(mechanics.range, ["kind"])
  );
}

function damageReductionHasCanonicalComponents(
  mechanics: DamageReductionMechanics,
): boolean {
  return (
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false &&
    spellMechanicsObjectHasOnlyKeys(mechanics.components, ["v", "s", "m"])
  );
}

function damageReductionHasCanonicalCastingTime(
  mechanics: DamageReductionMechanics,
): boolean {
  return (
    mechanics.castingTime.kind === "action" &&
    spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, ["kind"])
  );
}

function damageReductionHasCanonicalDuration(
  duration: Extract<
    DamageReductionMechanics["duration"],
    { readonly kind: "concentration" }
  >,
): boolean {
  return (
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1 &&
    spellMechanicsObjectHasExactKeys(
      duration,
      DAMAGE_REDUCTION_DURATION_FIELDS,
    ) &&
    spellMechanicsObjectHasExactKeys(
      duration.upTo,
      DAMAGE_REDUCTION_DURATION_VALUE_FIELDS,
    )
  );
}

function damageReductionIssue(
  failedFact: DamageReductionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): DamageReductionAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "damageReduction",
    failedFact,
    mechanicsPath,
    message: `Unsupported damageReduction mechanics fact: ${failedFact}.`,
  };
}

function damageReductionIssueCoordinate(
  failedFact: DamageReductionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): DamageReductionIssueCoordinate {
  return { failedFact, mechanicsPath };
}

function damageReductionIssueValidation(
  issues: readonly DamageReductionIssueCoordinate[],
): DamageReductionValidation<Record<never, never>> {
  const nonEmpty = spellProcedureNonEmpty(issues);
  return nonEmpty === undefined ? Result.succeed({}) : Result.fail(nonEmpty);
}

function damageReductionHeaderIssues(
  mechanics: DamageReductionMechanics,
): readonly DamageReductionIssueCoordinate[] {
  return [
    ...(mechanics.level === DAMAGE_REDUCTION_LEVEL
      ? []
      : [
          damageReductionIssueCoordinate(
            "level",
            spellMechanicsHeaderPath("level"),
          ),
        ]),
    ...(mechanics.castingTime.kind === "action"
      ? []
      : [
          damageReductionIssueCoordinate(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
  ];
}

function damageReductionRangeValidation(
  mechanics: DamageReductionMechanics,
): DamageReductionValidation<{
  readonly range: DamageReductionProfileShape["range"];
  readonly rangeFeet: DamageReductionProfileShape["rangeFeet"];
}> {
  return Match.value(mechanics.range).pipe(
    Match.when({ kind: "touch" }, (range) =>
      Result.succeed({ range, rangeFeet: spellTouchRangeFeet() }),
    ),
    Match.whenOr(
      { kind: "self" },
      { kind: "unlimited" },
      { kind: "point" },
      () =>
        Result.fail([
          damageReductionIssueCoordinate(
            "range",
            spellMechanicsHeaderPath("range"),
          ),
        ] as const),
    ),
    Match.exhaustive,
  );
}

function damageReductionDurationValidation(
  mechanics: DamageReductionMechanics,
): DamageReductionValidation<{
  readonly duration: DamageReductionProfileShape["duration"];
}> {
  const projected = damageReductionConcentrationDurationProjection(
    mechanics.duration,
  );
  if (projected === undefined) {
    return Result.fail([
      damageReductionIssueCoordinate("duration", spellDurationValuePath()),
    ]);
  }
  const valueIssue =
    projected.upTo.unit === "minute" && projected.upTo.amount === 1
      ? []
      : [damageReductionIssueCoordinate("duration", spellDurationValuePath())];
  const childIssues = persistentAreaDurationChildPaths(projected).map(
    (mechanicsPath) =>
      damageReductionIssueCoordinate("duration", mechanicsPath),
  );
  const issues = spellProcedureNonEmpty([...valueIssue, ...childIssues]);
  return issues === undefined
    ? Result.succeed({ duration: projected })
    : Result.fail(issues);
}

function damageReductionOptionalBranchIssues(
  mechanics: DamageReductionMechanics,
): readonly DamageReductionIssueCoordinate[] {
  return [
    ...(mechanics.initialPhase === undefined
      ? []
      : [
          damageReductionIssueCoordinate(
            "initialPhase",
            spellOngoingInitialPhasePath(),
          ),
        ]),
    ...(mechanics.authoredConditionalMechanics === undefined
      ? []
      : [
          damageReductionIssueCoordinate(
            "authoredConditionalMechanics",
            spellMechanicsRootPath(),
          ),
        ]),
  ];
}

function damageReductionOperationShellIssues(
  occurrences: readonly SpellOngoingOperationOccurrence[],
): readonly DamageReductionIssueCoordinate[] {
  return occurrences.flatMap((occurrence) =>
    spellOngoingOperationUnsupportedFacts(occurrence.operation).map(
      (failedFact) =>
        damageReductionIssueCoordinate(
          failedFact,
          spellOngoingOperationPath(occurrence.ordinal),
        ),
    ),
  );
}

type DamageReductionTargetingInspection = DamageReductionValidation<{
  readonly targeting: DamageReductionTargetingProjection;
}>;

function inspectDamageReductionTargeting(
  attachment: DamageReductionMechanics["attachment"],
): DamageReductionTargetingInspection {
  const admission = admitSpellTargetAttachment(
    attachment,
    DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS,
  );
  return Match.value(admission).pipe(
    Match.when({ tag: "rejected" }, ({ rejections }) =>
      Result.fail(
        spellProcedureMapNonEmpty(rejections, (rejection) =>
          damageReductionIssueCoordinate(
            damageReductionAttachmentFailedFact(rejection),
            spellOngoingAttachmentPath(),
          ),
        ),
      ),
    ),
    Match.when({ tag: "admitted" }, ({ attachment: admitted }) =>
      inspectAdmittedDamageReductionTargeting(admitted.value.selection),
    ),
    Match.exhaustive,
  );
}

function inspectAdmittedDamageReductionTargeting(
  selection: TargetSelection,
): DamageReductionTargetingInspection {
  const targeting = damageReductionTargetingProjection(selection);
  return targeting === undefined
    ? Result.fail([
        damageReductionIssueCoordinate(
          "attachment",
          spellOngoingAttachmentPath(),
        ),
      ])
    : Result.succeed({ targeting });
}

type DamageReductionAmountInspection = DamageReductionValidation<{
  readonly amount: DamageReductionAmount;
}>;

function damageReductionFixedDiceIsSupported(
  damageExpr: Extract<
    Extract<
      DamageReductionMechanics["operations"][number]["effect"],
      { readonly kind: "reduce_damage_taken" }
    >["amount"],
    { readonly kind: "fixed" }
  >["expr"],
): boolean {
  return (
    damageExpr.dice === DAMAGE_REDUCTION_DICE_COUNT &&
    damageExpr.dieSize === DAMAGE_REDUCTION_DIE_SIZE &&
    (damageExpr.flat ?? 0) === 0
  );
}

function damageReductionAmountExpressionIssues(
  damageExpr: Parameters<typeof damageReductionFixedDiceIsSupported>[0],
  effectPath: UnitMechanicsPath,
): readonly DamageReductionIssueCoordinate[] {
  return [
    ...(damageReductionFixedDiceIsSupported(damageExpr)
      ? []
      : [damageReductionIssueCoordinate("damage", effectPath)]),
    ...(damageExpr.spellcastingMod === true
      ? [damageReductionIssueCoordinate("spellcastingMod", effectPath)]
      : []),
    ...(damageExpr.abilityModifier === undefined
      ? []
      : [damageReductionIssueCoordinate("abilityModifier", effectPath)]),
  ];
}

function inspectDamageReductionAmount(
  effect:
    | Extract<
        DamageReductionMechanics["operations"][number]["effect"],
        { readonly kind: "reduce_damage_taken" }
      >
    | undefined,
  effectPath: UnitMechanicsPath,
): DamageReductionAmountInspection {
  const damageExpr = damageReductionFixedAmountExpression(effect);
  if (damageExpr === undefined) {
    return Result.fail([damageReductionIssueCoordinate("damage", effectPath)]);
  }
  const issues = damageReductionAmountExpressionIssues(damageExpr, effectPath);
  const nonEmpty = spellProcedureNonEmpty(issues);
  return nonEmpty === undefined
    ? Result.succeed({
        amount: {
          dice: DAMAGE_REDUCTION_DICE_COUNT,
          dieSize: DAMAGE_REDUCTION_DIE_SIZE,
        },
      })
    : Result.fail(nonEmpty);
}

function damageReductionFixedAmountExpression(
  effect:
    | Extract<
        DamageReductionMechanics["operations"][number]["effect"],
        { readonly kind: "reduce_damage_taken" }
      >
    | undefined,
): Parameters<typeof damageReductionFixedDiceIsSupported>[0] | undefined {
  if (effect === undefined) return undefined;
  return Match.value(effect.amount).pipe(
    Match.when({ kind: "fixed" }, ({ expr }) => expr),
    Match.whenOr(
      { kind: "threshold_tiers" },
      { kind: "linear_per_level" },
      { kind: "threshold_tiers_exploding_max_die" },
      { kind: "resource_spent" },
      { kind: "proficiency_bonus" },
      { kind: "resource_spent_linear" },
      { kind: "linked" },
      () => undefined,
    ),
    Match.exhaustive,
  );
}

function damageReductionSelectedOperationIssues(
  expected: SpellOngoingOperationOccurrence | undefined,
  fallbackOperation: DamageReductionFallbackOperationProjection | undefined,
): readonly DamageReductionIssueCoordinate[] {
  const effectPath = damageReductionOperationEffectPath(
    expected,
    fallbackOperation,
  );
  return [
    ...(expected?.operation.trigger.kind === "passive"
      ? []
      : [damageReductionIssueCoordinate("passiveOperation", effectPath)]),
    ...(expected?.operation.effect.kind === "reduce_damage_taken"
      ? []
      : [damageReductionIssueCoordinate("damage", effectPath)]),
  ];
}

function damageReductionOperationCountIssues(
  operationCount: number,
  extraOperations: readonly SpellOngoingOperationOccurrence[],
  fallbackOperation: DamageReductionFallbackOperationProjection | undefined,
): readonly DamageReductionIssueCoordinate[] {
  const missingCountIssue =
    operationCount !== DAMAGE_REDUCTION_OPERATION_COUNT &&
    extraOperations.length === 0
      ? [
          damageReductionIssueCoordinate(
            "operationCount",
            damageReductionOperationPath(undefined, fallbackOperation),
          ),
        ]
      : [];
  return [
    ...missingCountIssue,
    ...extraOperations.map((occurrence) =>
      damageReductionIssueCoordinate(
        "operationCount",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    ),
  ];
}

function damageReductionAdmissionProjection(input: {
  readonly header: DamageReductionValidation<Record<never, never>>;
  readonly range: DamageReductionValidation<{
    readonly range: DamageReductionProfileShape["range"];
    readonly rangeFeet: DamageReductionProfileShape["rangeFeet"];
  }>;
  readonly duration: DamageReductionValidation<{
    readonly duration: DamageReductionProfileShape["duration"];
  }>;
  readonly optionalBranches: DamageReductionValidation<Record<never, never>>;
  readonly operationShells: DamageReductionValidation<Record<never, never>>;
  readonly targeting: DamageReductionTargetingInspection;
  readonly selectedOperation: DamageReductionValidation<Record<never, never>>;
  readonly amount: DamageReductionAmountInspection;
  readonly damageType: DamageReductionDamageTypeProjection;
  readonly operationCount: DamageReductionValidation<Record<never, never>>;
}): DamageReductionValidation<DamageReductionProfileShape> {
  const throughDuration = combineSpellProcedureValidations(
    combineSpellProcedureValidations(input.header, input.range),
    input.duration,
  );
  const throughOperationShells = combineSpellProcedureValidations(
    combineSpellProcedureValidations(throughDuration, input.optionalBranches),
    input.operationShells,
  );
  const throughSelectedOperation = combineSpellProcedureValidations(
    combineSpellProcedureValidations(throughOperationShells, input.targeting),
    input.selectedOperation,
  );
  const throughDamageType = combineSpellProcedureValidations(
    combineSpellProcedureValidations(throughSelectedOperation, input.amount),
    input.damageType,
  );
  return combineSpellProcedureValidations(
    throughDamageType,
    input.operationCount,
  );
}

function damageReductionMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "damageReduction",
  DamageReductionMechanicsFacts,
  DamageReductionSpellInvocation,
  DamageReductionAdmissionIssue
> {
  if (!isDamageReductionRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const fallbackOperation = damageReductionFallbackOperationProjection(
    mechanics.operations,
  );
  const expected = occurrences.find(
    ({ operation }) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "reduce_damage_taken",
  );
  const selectedOrdinal = expected?.ordinal;
  const extraOperations = occurrences.filter(
    ({ ordinal }) => ordinal !== selectedOrdinal,
  );
  const targeting = inspectDamageReductionTargeting(mechanics.attachment);
  const damageEffect =
    expected?.operation.effect.kind === "reduce_damage_taken"
      ? expected.operation.effect
      : undefined;
  const effectPath = damageReductionOperationEffectPath(
    expected,
    fallbackOperation,
  );
  const amount = inspectDamageReductionAmount(damageEffect, effectPath);
  const projection = damageReductionAdmissionProjection({
    header: damageReductionIssueValidation(
      damageReductionHeaderIssues(mechanics),
    ),
    range: damageReductionRangeValidation(mechanics),
    duration: damageReductionDurationValidation(mechanics),
    optionalBranches: damageReductionIssueValidation(
      damageReductionOptionalBranchIssues(mechanics),
    ),
    operationShells: damageReductionIssueValidation(
      damageReductionOperationShellIssues(occurrences),
    ),
    targeting,
    selectedOperation: damageReductionIssueValidation(
      damageReductionSelectedOperationIssues(expected, fallbackOperation),
    ),
    amount,
    damageType: damageReductionDamageTypeProjection(damageEffect, effectPath),
    operationCount: damageReductionIssueValidation(
      damageReductionOperationCountIssues(
        mechanics.operations.length,
        extraOperations,
        fallbackOperation,
      ),
    ),
  });
  return Result.match(projection, {
    onFailure: (issues) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          damageReductionIssue(failedFact, mechanicsPath),
      ),
    }),
    onSuccess: (value) => {
      const facts = {
        ...source.spellDefinitionRuleFacts,
        ...value,
      } satisfies DamageReductionMechanicsFacts;
      return {
        tag: "supported" as const,
        admitted: {
          binding: "ready" as const,
          procedure: "damageReduction" as const,
          facts,
          evidence: {
            consumed: [
              spellMechanicsHeaderPath("level"),
              spellMechanicsHeaderPath("school"),
              spellMechanicsHeaderPath("range"),
              spellMechanicsHeaderPath("components"),
              spellMechanicsHeaderPath("duration"),
              spellMechanicsHeaderPath("castingTime"),
              spellMechanicsHeaderPath("family"),
              spellDurationValuePath(),
              spellOngoingAttachmentPath(),
              spellOngoingOperationPath(PositiveInteger(1)),
              spellOngoingOperationEffectPath(PositiveInteger(1)),
              ...spellConsumedMaterialEvidencePaths(mechanics.components),
            ] satisfies ReadonlyNonEmptyArray<SpellMechanicsBranchPath>,
            unowned: [] as const,
          },
          admit: (
            executionSource: BattleSpellExecutionSource,
            ctx: SpellAdmissionContext,
          ) => admitDamageReduction(executionSource, ctx, facts),
        },
      };
    },
  });
}

function applyDamageReductionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  damageType: DamageType,
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): BattleState {
  const nextEffect = {
    kind: "spellDamageReduction" as const,
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
    damageType,
    amount: invocation.amount,
    usedThisTurn: false,
    expiresAt: invocation.expiresAt,
  };
  return replaceTargetActiveEffect(
    state,
    targetId,
    (effect) =>
      effect.kind === "spellDamageReduction" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef,
    nextEffect,
  );
}

function admitDamageReduction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DamageReductionMechanicsFacts,
): readonly DamageReductionSpellInvocation[] {
  return [
    {
      access: cantripSpellAccessFor(spell.castingSource),
      resource: { tag: "none" },
      procedure: "damageReduction",
      spell,
      actionCost: "magicAction",
      targeting: facts.targeting,
      damageTypeChoices: facts.damageTypeChoices,
      amount: facts.amount,
      expiresAt: {
        kind: "concentration",
        combatantId: ctx.actor.combatantId,
      },
      rangeFeet: facts.rangeFeet,
    },
  ];
}

function discoverDamageReductionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DamageReductionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveDamageReduction(
  input: SpellProcedureProfileResolveInput<DamageReductionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellDamageTypeChoiceHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const selection = selectSingleSpellTargetAndDamageType({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    damageType: input.fillSet.damageTypeChoice?.value,
    invalidTargetMessage:
      "Spell target must be a combatant within the selected spell's supported range.",
    invalidDamageTypeMessage:
      "Damage-reduction spell damage type must be one of the selected spell's choices.",
  });
  if (selection.tag !== "selected") {
    return selection;
  }

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [selection.targetId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyDamageReductionEffect(
        state,
        input.actorId,
        selection.targetId,
        selection.damageType,
        input.invocation,
      ),
  });
}

export const DamageReductionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("damageReduction"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    amount: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(4),
    }),
    expiresAt: BattleActiveEffectExpirationSchema,
    rangeFeet: MovementFeet,
  }),
);
export const damageReductionProfile: SpellProcedureDeclaration<
  "damageReduction",
  DamageReductionSpellInvocation,
  DamageReductionMechanicsFacts,
  DamageReductionAdmissionIssue
> = {
  procedure: "damageReduction",
  admitMechanics: damageReductionMechanicsAdmission,
  discoverCastAct: discoverDamageReductionCastAct,
  executionSchema: DamageReductionInvocationSchema,
  resolve: resolveDamageReduction,
};
