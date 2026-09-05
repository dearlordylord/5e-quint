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
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { Schema } from "effect";

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
  if (operations.length !== 1) return undefined;
  const [operation] = operations;
  if (
    operation === undefined ||
    !spellMechanicsObjectHasExactKeys(operation, ["trigger", "effect"]) ||
    !spellMechanicsObjectHasExactKeys(operation.trigger, ["kind"]) ||
    operation.trigger.kind !== "passive" ||
    !spellMechanicsObjectHasExactKeys(operation.effect, ["kind"]) ||
    operation.effect.kind !== "none"
  ) {
    return undefined;
  }
  return { inferredOperationOrdinal: PositiveInteger(1) };
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

type DamageReductionDamageTypeProjection =
  | {
      readonly tag: "supported";
      readonly choices: ReadonlyNonEmptyArray<DamageType>;
    }
  | { readonly tag: "unsupported" };

function damageReductionDamageTypeProjection(
  effect:
    | Extract<
        DamageReductionMechanics["operations"][number]["effect"],
        { readonly kind: "reduce_damage_taken" }
      >
    | undefined,
): DamageReductionDamageTypeProjection {
  const damageType = effect?.damageType;
  if (
    typeof damageType !== "object" ||
    damageType === null ||
    damageType.kind !== "hole" ||
    typeof damageType.value !== "object" ||
    damageType.value === null ||
    damageType.value.kind !== "choice"
  ) {
    return { tag: "unsupported" };
  }
  const choices = damageType.value.options.filter(
    (option): option is DamageType => Schema.is(DamageTypeSchema)(option),
  );
  const nonEmptyChoices = spellProcedureNonEmpty(choices);
  return nonEmptyChoices !== undefined &&
    choices.length === damageType.value.options.length
    ? { tag: "supported", choices: nonEmptyChoices }
    : { tag: "unsupported" };
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
    return spellProcedureHasRedundantSignature({
      kind: "oneWitnessMayBeMissing",
      witnesses: [
        { name: "targetAttachment", present: hasTargetAttachment },
        { name: "damageReductionEffect", present: hasDamageReductionEffect },
        { name: "touchRange", present: mechanics.range.kind === "touch" },
      ],
    });
  }
  const hasCanonicalTargetAttachment =
    damageReductionTargetAttachmentProjection(mechanics.attachment) !==
    undefined;
  const hasCanonicalRange =
    spellMechanicsObjectHasOnlyKeys(mechanics.range, ["kind"]) &&
    mechanics.range.kind === "touch";
  const hasCanonicalComponents =
    spellMechanicsObjectHasOnlyKeys(mechanics.components, ["v", "s", "m"]) &&
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false;
  const hasCanonicalCastingTime =
    spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, ["kind"]) &&
    mechanics.castingTime.kind === "action";
  const concentrationDuration = damageReductionConcentrationDurationProjection(
    mechanics.duration,
  );
  const hasCanonicalDuration =
    concentrationDuration !== undefined &&
    spellMechanicsObjectHasExactKeys(
      concentrationDuration,
      DAMAGE_REDUCTION_DURATION_FIELDS,
    ) &&
    spellMechanicsObjectHasExactKeys(
      concentrationDuration.upTo,
      DAMAGE_REDUCTION_DURATION_VALUE_FIELDS,
    ) &&
    concentrationDuration.upTo.unit === "minute" &&
    concentrationDuration.upTo.amount === 1;
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
  const rangeFacts =
    mechanics.range.kind === "touch" ? mechanics.range : undefined;
  const rangeFeet =
    rangeFacts === undefined ? undefined : spellTouchRangeFeet();
  const durationFacts = damageReductionConcentrationDurationProjection(
    mechanics.duration,
  );
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
  const issues: Array<{
    readonly failedFact: DamageReductionFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: DamageReductionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== DAMAGE_REDUCTION_LEVEL) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "touch") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    durationFacts === undefined ||
    durationFacts.upTo.unit !== "minute" ||
    durationFacts.upTo.amount !== 1
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  if (durationFacts !== undefined) {
    for (const mechanicsPath of persistentAreaDurationChildPaths(
      durationFacts,
    )) {
      pushIssue("duration", mechanicsPath);
    }
  }
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalMechanics !== undefined) {
    pushIssue("authoredConditionalMechanics", spellMechanicsRootPath());
  }
  for (const occurrence of occurrences) {
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }
  const targetAttachmentAdmission = admitSpellTargetAttachment(
    mechanics.attachment,
    DAMAGE_REDUCTION_TARGET_SELECTION_FIELDS,
  );
  const targeting =
    targetAttachmentAdmission.tag === "admitted"
      ? damageReductionTargetingProjection(
          targetAttachmentAdmission.attachment.value.selection,
        )
      : undefined;
  if (targetAttachmentAdmission.tag === "rejected") {
    for (const rejection of targetAttachmentAdmission.rejections) {
      pushIssue(
        damageReductionAttachmentFailedFact(rejection),
        spellOngoingAttachmentPath(),
      );
    }
  } else if (targeting === undefined) {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  if (expected === undefined || expected.operation.trigger.kind !== "passive") {
    pushIssue(
      "passiveOperation",
      damageReductionOperationEffectPath(expected, fallbackOperation),
    );
  }
  if (expected?.operation.effect.kind !== "reduce_damage_taken") {
    pushIssue(
      "damage",
      damageReductionOperationEffectPath(expected, fallbackOperation),
    );
  }
  const damageEffect =
    expected?.operation.effect.kind === "reduce_damage_taken"
      ? expected.operation.effect
      : undefined;
  const damageTypeProjection =
    damageReductionDamageTypeProjection(damageEffect);
  const damageExpr =
    damageEffect?.amount.kind === "fixed"
      ? damageEffect.amount.expr
      : undefined;
  const fixedDiceSupported =
    damageExpr !== undefined &&
    damageExpr.dice === DAMAGE_REDUCTION_DICE_COUNT &&
    damageExpr.dieSize === DAMAGE_REDUCTION_DIE_SIZE &&
    (damageExpr.flat ?? 0) === 0;
  const amount: DamageReductionAmount | undefined =
    fixedDiceSupported &&
    damageExpr.spellcastingMod !== true &&
    damageExpr.abilityModifier === undefined
      ? {
          dice: DAMAGE_REDUCTION_DICE_COUNT,
          dieSize: DAMAGE_REDUCTION_DIE_SIZE,
        }
      : undefined;
  if (damageExpr === undefined) {
    pushIssue(
      "damage",
      damageReductionOperationEffectPath(expected, fallbackOperation),
    );
  } else {
    if (!fixedDiceSupported) {
      pushIssue(
        "damage",
        damageReductionOperationEffectPath(expected, fallbackOperation),
      );
    }
    if (damageExpr.spellcastingMod === true) {
      pushIssue(
        "spellcastingMod",
        damageReductionOperationEffectPath(expected, fallbackOperation),
      );
    }
    if (damageExpr.abilityModifier !== undefined) {
      pushIssue(
        "abilityModifier",
        damageReductionOperationEffectPath(expected, fallbackOperation),
      );
    }
  }
  if (damageTypeProjection.tag === "unsupported") {
    pushIssue(
      "damage",
      damageReductionOperationEffectPath(expected, fallbackOperation),
    );
  }
  if (
    mechanics.operations.length !== DAMAGE_REDUCTION_OPERATION_COUNT &&
    extraOperations.length === 0
  ) {
    pushIssue(
      "operationCount",
      damageReductionOperationPath(undefined, fallbackOperation),
    );
  }
  for (const occurrence of extraOperations) {
    pushIssue("operationCount", spellOngoingOperationPath(occurrence.ordinal));
  }

  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          damageReductionIssue(failedFact, mechanicsPath),
      ),
    };
  }

  return damageTypeProjection.tag === "supported" &&
    amount !== undefined &&
    targeting !== undefined &&
    rangeFacts !== undefined &&
    rangeFeet !== undefined &&
    durationFacts !== undefined
    ? (() => {
        const facts = {
          ...source.spellDefinitionRuleFacts,
          range: rangeFacts,
          rangeFeet,
          duration: durationFacts,
          damageTypeChoices: damageTypeProjection.choices,
          amount,
          targeting,
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
              ],
              unowned: [] as const,
            },
            admit: (
              executionSource: BattleSpellExecutionSource,
              ctx: SpellAdmissionContext,
            ) => admitDamageReduction(executionSource, ctx, facts),
          },
        };
      })()
    : {
        tag: "unsupported",
        issues: [
          damageReductionIssue(
            damageTypeProjection.tag === "unsupported"
              ? "damage"
              : amount === undefined
                ? "damage"
                : targeting === undefined
                  ? "attachment"
                  : rangeFacts === undefined
                    ? "range"
                    : "duration",
            damageTypeProjection.tag === "unsupported"
              ? damageReductionOperationEffectPath(expected, fallbackOperation)
              : amount === undefined
                ? damageReductionOperationEffectPath(
                    expected,
                    fallbackOperation,
                  )
                : targeting === undefined
                  ? spellOngoingAttachmentPath()
                  : rangeFacts === undefined
                    ? spellMechanicsHeaderPath("range")
                    : spellDurationValuePath(),
          ),
        ],
      };
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
