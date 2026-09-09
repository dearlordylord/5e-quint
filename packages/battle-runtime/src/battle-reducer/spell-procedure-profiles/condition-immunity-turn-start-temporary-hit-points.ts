import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-immunity-turn-start-temporary-hit-points
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
//
// The conditionImmunityAndTurnStartTemporaryHitPoints Spell Procedure Profile:
// a prepared Magic Action spell that gives willing touched creatures Frightened
// immunity and Temporary Hit Points at the start of each of their turns.

import {
  movementFeet,
  PositiveInteger,
  type AbilityModifier,
  type MovementFeet as MovementFeetType,
} from "@dnd/shared/types";
import type {
  Components,
  DiceAmount as SurfaceDiceAmount,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  type BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import { allocateBattleEffectOccurrencesForCreature } from "../../effect-execution-ref.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "../spell-condition-effects-helpers.ts";
import {
  saveGateTargetCountFactsFromSelection,
  saveGatedConditionTargetingFromFacts,
  type SaveGateTargetCountFacts,
} from "./_save-gate-helpers.ts";
import { spellTargetHole, spellTargetListHole } from "../spells-holes-fills.ts";
import { spellTargetListHoleId } from "../spells-targeting.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  spellTargetListSelection,
  type SpellTargetListSelection,
} from "../spells-resolve-target-selection.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellMechanicsObjectHasOnlyKeys,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellAttachmentRejection,
  type SpellMechanicsAdmissionSource,
  type SpellOngoingOperationOccurrence,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type ConditionImmunityTemporaryHitPointsInvocation = Extract<
  ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
>;
type ConditionImmunityTemporaryHitPointsMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type ConditionImmunityTemporaryHitPointsDuration = Extract<
  ConditionImmunityTemporaryHitPointsMechanics["duration"],
  { readonly kind: "concentration" }
>;
type ConditionImmunityTemporaryHitPointsMechanicsFacts =
  SpellProcedureMechanicsFacts & {
    readonly rangeFeet: MovementFeetType;
    readonly targetCount: SaveGateTargetCountFacts;
    readonly requiredTargetDisposition: "willing";
    readonly condition: "frightened";
    readonly temporaryHitPointsAmount: "spellcastingAbilityModifier";
  };

const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_LEVEL = 1 as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_MINUTES = 1 as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_SELECTION_FIELDS = [
  "mode",
  "count",
  "targetKinds",
  "disposition",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<
  keyof ConditionImmunityTemporaryHitPointsMechanics
>;
type ConditionImmunityTemporaryHitPointsComponentKeySpace = Pick<
  Components,
  "v" | "s" | "m"
> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<
  keyof ConditionImmunityTemporaryHitPointsComponentKeySpace
>;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_RANGE_FIELDS = ["kind"] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_CASTING_TIME_FIELDS = [
  "kind",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof ConditionImmunityTemporaryHitPointsDuration["upTo"]
>;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_OPERATION_FIELDS = [
  "trigger",
  "effect",
  "predicate",
  "targetLimit",
  "usageLimit",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_TRIGGER_FIELDS = [
  "kind",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_IMMUNITY_EFFECT_FIELDS = [
  "kind",
  "condition",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_TEMP_HP_EFFECT_FIELDS = [
  "kind",
  "amount",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_AMOUNT_FIELDS = [
  "kind",
  "expr",
] as const;
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_AMOUNT_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for ConditionImmunityTemporaryHitPointsFailedFact.
const CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "attachmentKind",
  "attachmentShape",
  "selection",
  "selectionMode",
  "selectionTargetKinds",
  "selectionDisposition",
  "targetCount",
  "rangeOrigin",
  "typeFilter",
  "stateFilter",
  "visibility",
  "creatureSizeFilter",
  "relativePosition",
  "objectFilter",
  "creatureDisposition",
  "objectOrLocationMaxDimensionFeet",
  "repeatsAllowed",
  "castingRequirement",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operation",
  "operationTrigger",
  "operationPredicate",
  "operationTargetLimit",
  "operationUsageLimit",
  "immunityOperation",
  "immunityEffect",
  "immunityCondition",
  "temporaryHitPointsOperation",
  "temporaryHitPointsEffect",
  "temporaryHitPointsAmount",
] as const;
type ConditionImmunityTemporaryHitPointsFailedFact =
  (typeof CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_FAILED_FACTS)[number];
type ConditionImmunityTemporaryHitPointsAdmissionIssue =
  SpellProcedureAdmissionIssue<
    "conditionImmunityAndTurnStartTemporaryHitPoints",
    ConditionImmunityTemporaryHitPointsFailedFact,
    UnitMechanicsPath
  >;
type ConditionImmunityTemporaryHitPointsIssueFact = {
  readonly failedFact: ConditionImmunityTemporaryHitPointsFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

function conditionImmunityTemporaryHitPointsIssue(
  failedFact: ConditionImmunityTemporaryHitPointsFailedFact,
  mechanicsPath: UnitMechanicsPath,
): ConditionImmunityTemporaryHitPointsAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
    failedFact,
    mechanicsPath,
    message: `Unsupported conditionImmunityAndTurnStartTemporaryHitPoints mechanics fact: ${failedFact}.`,
  };
}

function isConditionImmunityTemporaryHitPointsRepresentation(
  mechanics: SpellMechanics,
): mechanics is ConditionImmunityTemporaryHitPointsMechanics {
  return Match.value(mechanics).pipe(
    Match.when(
      { family: "ongoing_effect" },
      conditionImmunityTemporaryHitPointsHasRepresentationWitnesses,
    ),
    Match.whenOr(
      { family: "modal_ongoing_effect" },
      { family: "activation" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsHasRepresentationWitnesses(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present: conditionImmunityTemporaryHitPointsHasHeaderWitness(mechanics),
      },
      {
        name: "touchComponents",
        present:
          conditionImmunityTemporaryHitPointsHasTouchComponentsWitness(
            mechanics,
          ),
      },
      {
        name: "duration",
        present:
          conditionImmunityTemporaryHitPointsHasDurationWitness(mechanics),
      },
      {
        name: "willingTarget",
        present:
          conditionImmunityTemporaryHitPointsHasWillingTargetWitness(mechanics),
      },
      {
        name: "effects",
        present:
          conditionImmunityTemporaryHitPointsHasOperationWitnesses(mechanics),
      },
    ],
  });
}

function conditionImmunityTemporaryHitPointsHasHeaderWitness(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  return (
    mechanics.level === CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_LEVEL &&
    mechanics.school === "enchantment" &&
    mechanics.castingTime.kind === "action"
  );
}

function conditionImmunityTemporaryHitPointsHasTouchComponentsWitness(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  return (
    mechanics.range.kind === "touch" &&
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false
  );
}

function conditionImmunityTemporaryHitPointsHasDurationWitness(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  return (
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount ===
      CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_MINUTES
  );
}

function conditionImmunityTemporaryHitPointsHasWillingTargetWitness(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  if (
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "target"
  ) {
    return false;
  }
  const selection = mechanics.attachment.value.selection;
  return (
    selection.targetKinds?.includes("creature") === true &&
    "disposition" in selection &&
    selection.disposition === "willing"
  );
}

function conditionImmunityTemporaryHitPointsHasOperationWitnesses(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): boolean {
  return (
    mechanics.operations.some(
      (operation) => operation.effect.kind === "grant_condition_immunity",
    ) &&
    mechanics.operations.some(
      (operation) => operation.effect.kind === "grant_temp_hp",
    )
  );
}

function conditionImmunityTemporaryHitPointsAttachmentFailedFact(
  rejection: SpellAttachmentRejection,
  attachment: ConditionImmunityTemporaryHitPointsMechanics["attachment"],
): ConditionImmunityTemporaryHitPointsFailedFact {
  if (rejection.failedFact === "attachment")
    return rejection.coordinate.kind === "wrapper" &&
      rejection.coordinate.field === "kind" &&
      attachment.kind !== "hole"
      ? "attachmentKind"
      : "attachmentShape";
  return Match.value(rejection.failedFact).pipe(
    Match.when("selection", () => "selection" as const),
    Match.when("mode", () => "selectionMode" as const),
    Match.when("targetKinds", () => "selectionTargetKinds" as const),
    Match.when("disposition", () => "selectionDisposition" as const),
    Match.when("count", () => "targetCount" as const),
    Match.whenOr(
      "rangeOrigin",
      "typeFilter",
      "stateFilter",
      "visibility",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "objectOrLocationMaxDimensionFeet",
      "repeatsAllowed",
      "castingRequirement",
      (fact) => fact,
    ),
    Match.whenOr(
      "shape",
      "origin",
      "occupantDispositionFilter",
      "occupantPerceptionFilter",
      "excludedAreas",
      () => "attachmentShape" as const,
    ),
    Match.exhaustive,
  );
}

function hasConditionImmunityTemporaryHitPointsTemporaryHitPointsAmount(
  amount: SurfaceDiceAmount,
): boolean {
  return (
    amount.kind === "fixed" &&
    spellMechanicsObjectHasOnlyKeys(
      amount,
      CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_AMOUNT_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      amount.expr,
      CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_AMOUNT_EXPR_FIELDS,
    ) &&
    amount.expr.dice === 0 &&
    amount.expr.dieSize === 1 &&
    amount.expr.flat === 0 &&
    amount.expr.spellcastingMod === true &&
    amount.expr.abilityModifier === undefined
  );
}

type ConditionImmunityTemporaryHitPointsInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        ConditionImmunityTemporaryHitPointsIssueFact,
        ...ConditionImmunityTemporaryHitPointsIssueFact[],
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: ConditionImmunityTemporaryHitPointsMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type ConditionImmunityTemporaryHitPointsScoredOccurrence = {
  readonly occurrence: SpellOngoingOperationOccurrence;
  readonly immunityEffectWitness: boolean;
  readonly temporaryHitPointsEffectWitness: boolean;
  readonly immunityScore: number;
  readonly temporaryHitPointsScore: number;
};

type ConditionImmunityTemporaryHitPointsDurationEvaluation =
  | {
      readonly tag: "supported";
      readonly issues: readonly ConditionImmunityTemporaryHitPointsIssueFact[];
    }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly ConditionImmunityTemporaryHitPointsIssueFact[];
    };

type ConditionImmunityTemporaryHitPointsTargetingFacts =
  | {
      readonly tag: "supported";
      readonly targetCount: SaveGateTargetCountFacts;
      readonly requiredTargetDisposition: "willing";
    }
  | { readonly tag: "unsupported" };

type ConditionImmunityTemporaryHitPointsTargetingEvaluation = {
  readonly facts: ConditionImmunityTemporaryHitPointsTargetingFacts;
  readonly issues: readonly ConditionImmunityTemporaryHitPointsIssueFact[];
};

type ConditionImmunityTemporaryHitPointsOperationRoles =
  | {
      readonly tag: "distinct";
      readonly immunity: SpellOngoingOperationOccurrence;
      readonly temporaryHitPoints: SpellOngoingOperationOccurrence;
    }
  | { readonly tag: "neither" }
  | {
      readonly tag: "immunityOnly";
      readonly immunity: SpellOngoingOperationOccurrence;
    }
  | {
      readonly tag: "temporaryHitPointsOnly";
      readonly temporaryHitPoints: SpellOngoingOperationOccurrence;
    };

type ConditionImmunityTemporaryHitPointsOperationEvaluation = {
  readonly occurrences: readonly SpellOngoingOperationOccurrence[];
  readonly roles: ConditionImmunityTemporaryHitPointsOperationRoles;
  readonly issues: readonly ConditionImmunityTemporaryHitPointsIssueFact[];
};

type ConditionImmunityTemporaryHitPointsReadiness =
  | { readonly tag: "unsupported" }
  | {
      readonly tag: "ready";
      readonly targetCount: SaveGateTargetCountFacts;
      readonly requiredTargetDisposition: "willing";
      readonly immunity: SpellOngoingOperationOccurrence;
      readonly temporaryHitPoints: SpellOngoingOperationOccurrence;
    };

type ConditionImmunityTemporaryHitPointsRoleCandidates = {
  readonly immunity: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[];
  readonly temporaryHitPoints: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[];
};

type ConditionImmunityTemporaryHitPointsRoleAssignment = {
  readonly immunity: ConditionImmunityTemporaryHitPointsScoredOccurrence;
  readonly temporaryHitPoints: ConditionImmunityTemporaryHitPointsScoredOccurrence;
  readonly score: number;
};

type ConditionImmunityTemporaryHitPointsSelection = Extract<
  Extract<
    ConditionImmunityTemporaryHitPointsMechanics["attachment"],
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "target" }
>["selection"];

function conditionImmunityTemporaryHitPointsIssueFact(
  failedFact: ConditionImmunityTemporaryHitPointsFailedFact,
  mechanicsPath: UnitMechanicsPath,
): ConditionImmunityTemporaryHitPointsIssueFact {
  return { failedFact, mechanicsPath };
}

function conditionImmunityTemporaryHitPointsIssuesUnless(
  factIsSupported: boolean,
  failedFact: ConditionImmunityTemporaryHitPointsFailedFact,
  mechanicsPath: UnitMechanicsPath,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return factIsSupported
    ? []
    : [conditionImmunityTemporaryHitPointsIssueFact(failedFact, mechanicsPath)];
}

function conditionImmunityTemporaryHitPointsHeaderIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      spellMechanicsObjectHasOnlyKeys(
        mechanics,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_ROOT_FIELDS,
      ),
      "mechanics",
      spellMechanicsRootPath(),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      mechanics.level === CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_LEVEL,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      mechanics.school === "enchantment",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...conditionImmunityTemporaryHitPointsRangeIssues(mechanics),
    ...conditionImmunityTemporaryHitPointsComponentIssues(mechanics),
    ...spellConsumedMaterialEvidencePaths(mechanics.components).map((path) =>
      conditionImmunityTemporaryHitPointsIssueFact("components", path),
    ),
    ...conditionImmunityTemporaryHitPointsCastingTimeIssues(mechanics),
  ];
}

function conditionImmunityTemporaryHitPointsRangeIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return conditionImmunityTemporaryHitPointsIssuesUnless(
    mechanics.range.kind === "touch" &&
      spellMechanicsObjectHasOnlyKeys(
        mechanics.range,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_RANGE_FIELDS,
      ),
    "range",
    spellMechanicsHeaderPath("range"),
  );
}

function conditionImmunityTemporaryHitPointsComponentIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return conditionImmunityTemporaryHitPointsIssuesUnless(
    mechanics.components.v === true &&
      mechanics.components.s === true &&
      mechanics.components.m === false &&
      spellMechanicsObjectHasOnlyKeys<ConditionImmunityTemporaryHitPointsComponentKeySpace>(
        mechanics.components,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_COMPONENT_FIELDS,
      ),
    "components",
    spellMechanicsHeaderPath("components"),
  );
}

function conditionImmunityTemporaryHitPointsCastingTimeIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return conditionImmunityTemporaryHitPointsIssuesUnless(
    mechanics.castingTime.kind === "action" &&
      spellMechanicsObjectHasOnlyKeys(
        mechanics.castingTime,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_CASTING_TIME_FIELDS,
      ),
    "castingTime",
    spellMechanicsHeaderPath("castingTime"),
  );
}

function conditionImmunityTemporaryHitPointsDurationEvaluation(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): ConditionImmunityTemporaryHitPointsDurationEvaluation {
  const duration =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const valueIsSupported =
    conditionImmunityTemporaryHitPointsDurationValueIsSupported(duration);
  const issues = [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      duration !== undefined &&
        spellMechanicsObjectHasOnlyKeys(
          duration,
          CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_FIELDS,
        ),
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      valueIsSupported,
      "durationValue",
      spellDurationValuePath(),
    ),
    ...spellDurationChildCoordinates(mechanics.duration).map((child) =>
      conditionImmunityTemporaryHitPointsIssueFact(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      ),
    ),
  ];
  return valueIsSupported
    ? { tag: "supported", issues }
    : { tag: "unsupported", issues };
}

function conditionImmunityTemporaryHitPointsDurationValueIsSupported(
  duration: ConditionImmunityTemporaryHitPointsDuration | undefined,
): boolean {
  return (
    duration !== undefined &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount ===
      CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_MINUTES &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_DURATION_VALUE_FIELDS,
    )
  );
}

function conditionImmunityTemporaryHitPointsFallbackSelection(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): ConditionImmunityTemporaryHitPointsSelection | undefined {
  return mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target"
    ? mechanics.attachment.value.selection
    : undefined;
}

function conditionImmunityTemporaryHitPointsTargetingEvaluation(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): ConditionImmunityTemporaryHitPointsTargetingEvaluation {
  const attachmentAdmission = admitSpellTargetAttachment(
    mechanics.attachment,
    CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_SELECTION_FIELDS,
  );
  const selection = Match.value(attachmentAdmission).pipe(
    Match.when(
      { tag: "admitted" },
      ({ attachment }) => attachment.value.selection,
    ),
    Match.when({ tag: "rejected" }, () =>
      conditionImmunityTemporaryHitPointsFallbackSelection(mechanics),
    ),
    Match.exhaustive,
  );
  const targetCount =
    selection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          selection,
          CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_LEVEL,
        );
  const requiredTargetDisposition =
    conditionImmunityTemporaryHitPointsRequiredDisposition(selection);
  const issues = [
    ...Match.value(attachmentAdmission).pipe(
      Match.when({ tag: "admitted" }, () => []),
      Match.when({ tag: "rejected" }, ({ rejections }) =>
        conditionImmunityTemporaryHitPointsAttachmentRejectionIssues(
          mechanics,
          rejections,
        ),
      ),
      Match.exhaustive,
    ),
    ...conditionImmunityTemporaryHitPointsSelectionIssues(
      selection,
      requiredTargetDisposition,
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      selection === undefined || targetCount !== null,
      "targetCount",
      spellOngoingAttachmentPath(),
    ),
  ];
  return targetCount !== null && requiredTargetDisposition !== undefined
    ? {
        facts: {
          tag: "supported",
          targetCount,
          requiredTargetDisposition,
        },
        issues,
      }
    : { facts: { tag: "unsupported" }, issues };
}

function conditionImmunityTemporaryHitPointsRequiredDisposition(
  selection: ConditionImmunityTemporaryHitPointsSelection | undefined,
): "willing" | undefined {
  return selection !== undefined &&
    "disposition" in selection &&
    selection.disposition === "willing"
    ? selection.disposition
    : undefined;
}

function conditionImmunityTemporaryHitPointsAttachmentRejectionIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
  rejections: readonly SpellAttachmentRejection[],
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return rejections.map((rejection) =>
    conditionImmunityTemporaryHitPointsIssueFact(
      conditionImmunityTemporaryHitPointsAttachmentFailedFact(
        rejection,
        mechanics.attachment,
      ),
      spellOngoingAttachmentPath(),
    ),
  );
}

function conditionImmunityTemporaryHitPointsSelectionIssues(
  selection: ConditionImmunityTemporaryHitPointsSelection | undefined,
  requiredTargetDisposition: "willing" | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  if (selection === undefined) return [];
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      selection.mode === "choose_up_to",
      "selectionMode",
      spellOngoingAttachmentPath(),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      selection.targetKinds?.length === 1 &&
        selection.targetKinds.includes("creature"),
      "selectionTargetKinds",
      spellOngoingAttachmentPath(),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      requiredTargetDisposition !== undefined,
      "selectionDisposition",
      spellOngoingAttachmentPath(),
    ),
  ];
}

function conditionImmunityTemporaryHitPointsScoredOccurrence(
  occurrence: SpellOngoingOperationOccurrence,
): ConditionImmunityTemporaryHitPointsScoredOccurrence {
  return {
    occurrence,
    immunityEffectWitness:
      conditionImmunityTemporaryHitPointsHasImmunityEffectWitness(occurrence),
    temporaryHitPointsEffectWitness:
      conditionImmunityTemporaryHitPointsHasTemporaryHitPointsEffectWitness(
        occurrence,
      ),
    immunityScore: conditionImmunityTemporaryHitPointsImmunityScore(occurrence),
    temporaryHitPointsScore:
      conditionImmunityTemporaryHitPointsTemporaryHitPointsScore(occurrence),
  };
}

function conditionImmunityTemporaryHitPointsHasImmunityEffectWitness(
  occurrence: SpellOngoingOperationOccurrence,
): boolean {
  return (
    occurrence.operation.effect.kind === "grant_condition_immunity" ||
    "condition" in occurrence.operation.effect
  );
}

function conditionImmunityTemporaryHitPointsHasTemporaryHitPointsEffectWitness(
  occurrence: SpellOngoingOperationOccurrence,
): boolean {
  return (
    occurrence.operation.effect.kind === "grant_temp_hp" ||
    "amount" in occurrence.operation.effect
  );
}

function conditionImmunityTemporaryHitPointsImmunityScore(
  occurrence: SpellOngoingOperationOccurrence,
): number {
  const { operation } = occurrence;
  return (
    (operation.effect.kind === "grant_condition_immunity" ? 2 : 0) +
    ("condition" in operation.effect &&
    operation.effect.condition === "frightened"
      ? 1
      : 0) +
    (operation.trigger.kind === "passive" ? 1 : 0)
  );
}

function conditionImmunityTemporaryHitPointsTemporaryHitPointsScore(
  occurrence: SpellOngoingOperationOccurrence,
): number {
  const { operation } = occurrence;
  return (
    (operation.effect.kind === "grant_temp_hp" ? 2 : 0) +
    (conditionImmunityTemporaryHitPointsHasValidAmount(occurrence) ? 1 : 0) +
    (operation.trigger.kind === "on_attached_turn_start" ? 1 : 0)
  );
}

function conditionImmunityTemporaryHitPointsHasValidAmount(
  occurrence: SpellOngoingOperationOccurrence,
): boolean {
  const { effect } = occurrence.operation;
  return (
    "amount" in effect &&
    typeof effect.amount === "object" &&
    effect.amount !== null &&
    hasConditionImmunityTemporaryHitPointsTemporaryHitPointsAmount(
      effect.amount,
    )
  );
}

function conditionImmunityTemporaryHitPointsOperationEvaluation(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): ConditionImmunityTemporaryHitPointsOperationEvaluation {
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const scoredOccurrences = occurrences.map(
    conditionImmunityTemporaryHitPointsScoredOccurrence,
  );
  const candidates =
    conditionImmunityTemporaryHitPointsRoleCandidates(scoredOccurrences);
  const roles = conditionImmunityTemporaryHitPointsOperationRoles(candidates);
  const immunity = conditionImmunityTemporaryHitPointsSelectedImmunity(roles);
  const temporaryHitPoints =
    conditionImmunityTemporaryHitPointsSelectedTemporaryHitPoints(roles);
  return {
    occurrences,
    roles,
    issues: [
      ...occurrences.flatMap((occurrence) =>
        conditionImmunityTemporaryHitPointsOperationIssues(
          occurrence,
          candidates,
        ),
      ),
      ...conditionImmunityTemporaryHitPointsRoleIssues(
        candidates,
        roles,
        immunity,
        temporaryHitPoints,
      ),
      ...scoredOccurrences
        .filter((occurrence) =>
          conditionImmunityTemporaryHitPointsShouldInspectImmunity(
            occurrence,
            immunity,
          ),
        )
        .flatMap(conditionImmunityTemporaryHitPointsImmunityIssues),
      ...scoredOccurrences
        .filter((occurrence) =>
          conditionImmunityTemporaryHitPointsShouldInspectTemporaryHitPoints(
            occurrence,
            temporaryHitPoints,
          ),
        )
        .flatMap(conditionImmunityTemporaryHitPointsTemporaryHitPointsIssues),
    ],
  };
}

function conditionImmunityTemporaryHitPointsRoleCandidates(
  occurrences: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[],
): ConditionImmunityTemporaryHitPointsRoleCandidates {
  return {
    immunity: occurrences.filter(({ immunityScore }) => immunityScore > 0),
    temporaryHitPoints: occurrences.filter(
      ({ temporaryHitPointsScore }) => temporaryHitPointsScore > 0,
    ),
  };
}

function conditionImmunityTemporaryHitPointsOperationRoles(
  candidates: ConditionImmunityTemporaryHitPointsRoleCandidates,
): ConditionImmunityTemporaryHitPointsOperationRoles {
  const assignments = candidates.immunity.flatMap((immunity) =>
    candidates.temporaryHitPoints.flatMap((temporaryHitPoints) =>
      conditionImmunityTemporaryHitPointsRoleAssignment(
        immunity,
        temporaryHitPoints,
      ),
    ),
  );
  const highestScore = Math.max(...assignments.map(({ score }) => score));
  const highestAssignments = assignments.filter(
    ({ score }) => score === highestScore,
  );
  const immunity = conditionImmunityTemporaryHitPointsUniqueRoleOccurrence(
    highestAssignments.map((assignment) => assignment.immunity),
  );
  const temporaryHitPoints =
    conditionImmunityTemporaryHitPointsUniqueRoleOccurrence(
      highestAssignments.map((assignment) => assignment.temporaryHitPoints),
    );
  return conditionImmunityTemporaryHitPointsRoleState(
    immunity,
    temporaryHitPoints,
  );
}

function conditionImmunityTemporaryHitPointsRoleAssignment(
  immunity: ConditionImmunityTemporaryHitPointsScoredOccurrence,
  temporaryHitPoints: ConditionImmunityTemporaryHitPointsScoredOccurrence,
): readonly ConditionImmunityTemporaryHitPointsRoleAssignment[] {
  return immunity.occurrence.ordinal === temporaryHitPoints.occurrence.ordinal
    ? []
    : [
        {
          immunity,
          temporaryHitPoints,
          score:
            immunity.immunityScore + temporaryHitPoints.temporaryHitPointsScore,
        },
      ];
}

function conditionImmunityTemporaryHitPointsUniqueRoleOccurrence(
  candidates: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[],
): SpellOngoingOperationOccurrence | undefined {
  const ordinals = new Set(
    candidates.map(({ occurrence }) => occurrence.ordinal),
  );
  return ordinals.size === 1 ? candidates[0]?.occurrence : undefined;
}

function conditionImmunityTemporaryHitPointsRoleState(
  immunity: SpellOngoingOperationOccurrence | undefined,
  temporaryHitPoints: SpellOngoingOperationOccurrence | undefined,
): ConditionImmunityTemporaryHitPointsOperationRoles {
  if (immunity === undefined) {
    if (temporaryHitPoints === undefined) return { tag: "neither" };
    return { tag: "temporaryHitPointsOnly", temporaryHitPoints };
  }
  if (temporaryHitPoints === undefined) {
    return { tag: "immunityOnly", immunity };
  }
  return { tag: "distinct", immunity, temporaryHitPoints };
}

function conditionImmunityTemporaryHitPointsSelectedImmunity(
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
): SpellOngoingOperationOccurrence | undefined {
  return Match.value(roles).pipe(
    Match.when({ tag: "distinct" }, ({ immunity }) => immunity),
    Match.when({ tag: "immunityOnly" }, ({ immunity }) => immunity),
    Match.when({ tag: "temporaryHitPointsOnly" }, () => undefined),
    Match.when({ tag: "neither" }, () => undefined),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsSelectedTemporaryHitPoints(
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
): SpellOngoingOperationOccurrence | undefined {
  return Match.value(roles).pipe(
    Match.when(
      { tag: "distinct" },
      ({ temporaryHitPoints }) => temporaryHitPoints,
    ),
    Match.when(
      { tag: "temporaryHitPointsOnly" },
      ({ temporaryHitPoints }) => temporaryHitPoints,
    ),
    Match.when({ tag: "immunityOnly" }, () => undefined),
    Match.when({ tag: "neither" }, () => undefined),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsOperationIssues(
  occurrence: SpellOngoingOperationOccurrence,
  candidates: ConditionImmunityTemporaryHitPointsRoleCandidates,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  const operationPath = spellOngoingOperationPath(occurrence.ordinal);
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      spellMechanicsObjectHasOnlyKeys(
        occurrence.operation,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_OPERATION_FIELDS,
      ),
      "operation",
      operationPath,
    ),
    ...spellOngoingOperationUnsupportedFacts(occurrence.operation).map(
      (failedFact) =>
        conditionImmunityTemporaryHitPointsIssueFact(
          conditionImmunityTemporaryHitPointsOperationFailedFact(failedFact),
          operationPath,
        ),
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      conditionImmunityTemporaryHitPointsIsRoleCandidate(
        occurrence,
        candidates,
      ),
      "operationCount",
      operationPath,
    ),
  ];
}

function conditionImmunityTemporaryHitPointsOperationFailedFact(
  failedFact: ReturnType<typeof spellOngoingOperationUnsupportedFacts>[number],
): ConditionImmunityTemporaryHitPointsFailedFact {
  return Match.value(failedFact).pipe(
    Match.when("predicate", () => "operationPredicate" as const),
    Match.when("targetLimit", () => "operationTargetLimit" as const),
    Match.when("usageLimit", () => "operationUsageLimit" as const),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsIsRoleCandidate(
  occurrence: SpellOngoingOperationOccurrence,
  candidates: ConditionImmunityTemporaryHitPointsRoleCandidates,
): boolean {
  return (
    candidates.immunity.some(
      (candidate) => candidate.occurrence.ordinal === occurrence.ordinal,
    ) ||
    candidates.temporaryHitPoints.some(
      (candidate) => candidate.occurrence.ordinal === occurrence.ordinal,
    )
  );
}

function conditionImmunityTemporaryHitPointsRoleIssues(
  candidates: ConditionImmunityTemporaryHitPointsRoleCandidates,
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
  immunity: SpellOngoingOperationOccurrence | undefined,
  temporaryHitPoints: SpellOngoingOperationOccurrence | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return [
    ...conditionImmunityTemporaryHitPointsMissingImmunityIssues(immunity),
    ...conditionImmunityTemporaryHitPointsDuplicateImmunityIssues(
      candidates.immunity,
      immunity,
    ),
    ...conditionImmunityTemporaryHitPointsMissingTemporaryHitPointsIssues(
      temporaryHitPoints,
    ),
    ...conditionImmunityTemporaryHitPointsDuplicateTemporaryHitPointsIssues(
      candidates.temporaryHitPoints,
      immunity,
      temporaryHitPoints,
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      roles.tag === "distinct",
      "operationCount",
      spellMechanicsRootPath(),
    ),
  ];
}

function conditionImmunityTemporaryHitPointsMissingImmunityIssues(
  immunity: SpellOngoingOperationOccurrence | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return conditionImmunityTemporaryHitPointsIssuesUnless(
    immunity !== undefined,
    "immunityOperation",
    spellMechanicsRootPath(),
  );
}

function conditionImmunityTemporaryHitPointsDuplicateImmunityIssues(
  candidates: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[],
  immunity: SpellOngoingOperationOccurrence | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return candidates
    .filter(({ occurrence }) => occurrence.ordinal !== immunity?.ordinal)
    .map(({ occurrence }) =>
      conditionImmunityTemporaryHitPointsIssueFact(
        "operationCount",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
}

function conditionImmunityTemporaryHitPointsMissingTemporaryHitPointsIssues(
  temporaryHitPoints: SpellOngoingOperationOccurrence | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return conditionImmunityTemporaryHitPointsIssuesUnless(
    temporaryHitPoints !== undefined,
    "temporaryHitPointsOperation",
    spellMechanicsRootPath(),
  );
}

function conditionImmunityTemporaryHitPointsDuplicateTemporaryHitPointsIssues(
  candidates: readonly ConditionImmunityTemporaryHitPointsScoredOccurrence[],
  immunity: SpellOngoingOperationOccurrence | undefined,
  temporaryHitPoints: SpellOngoingOperationOccurrence | undefined,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return candidates
    .filter(
      ({ occurrence }) =>
        occurrence.ordinal !== temporaryHitPoints?.ordinal &&
        occurrence.ordinal !== immunity?.ordinal,
    )
    .map(({ occurrence }) =>
      conditionImmunityTemporaryHitPointsIssueFact(
        "operationCount",
        spellOngoingOperationPath(occurrence.ordinal),
      ),
    );
}

function conditionImmunityTemporaryHitPointsShouldInspectImmunity(
  inspection: ConditionImmunityTemporaryHitPointsScoredOccurrence,
  immunity: SpellOngoingOperationOccurrence | undefined,
): boolean {
  return (
    inspection.immunityEffectWitness ||
    inspection.occurrence.operation.trigger.kind === "passive" ||
    inspection.occurrence.ordinal === immunity?.ordinal
  );
}

function conditionImmunityTemporaryHitPointsImmunityIssues(
  inspection: ConditionImmunityTemporaryHitPointsScoredOccurrence,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  const { occurrence } = inspection;
  const operationPath = spellOngoingOperationPath(occurrence.ordinal);
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      occurrence.operation.trigger.kind === "passive" &&
        spellMechanicsObjectHasOnlyKeys(
          occurrence.operation.trigger,
          CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_TRIGGER_FIELDS,
        ),
      "operationTrigger",
      operationPath,
    ),
    ...conditionImmunityTemporaryHitPointsImmunityEffectIssues(occurrence),
  ];
}

function conditionImmunityTemporaryHitPointsImmunityEffectIssues(
  occurrence: SpellOngoingOperationOccurrence,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  const effectPath = spellOngoingOperationEffectPath(occurrence.ordinal);
  if (occurrence.operation.effect.kind !== "grant_condition_immunity") {
    return [
      conditionImmunityTemporaryHitPointsIssueFact(
        "immunityEffect",
        effectPath,
      ),
    ];
  }
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      spellMechanicsObjectHasOnlyKeys(
        occurrence.operation.effect,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_IMMUNITY_EFFECT_FIELDS,
      ),
      "immunityEffect",
      effectPath,
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      occurrence.operation.effect.condition === "frightened",
      "immunityCondition",
      effectPath,
    ),
  ];
}

function conditionImmunityTemporaryHitPointsShouldInspectTemporaryHitPoints(
  inspection: ConditionImmunityTemporaryHitPointsScoredOccurrence,
  temporaryHitPoints: SpellOngoingOperationOccurrence | undefined,
): boolean {
  return (
    inspection.temporaryHitPointsEffectWitness ||
    inspection.occurrence.operation.trigger.kind === "on_attached_turn_start" ||
    inspection.occurrence.ordinal === temporaryHitPoints?.ordinal
  );
}

function conditionImmunityTemporaryHitPointsTemporaryHitPointsIssues(
  inspection: ConditionImmunityTemporaryHitPointsScoredOccurrence,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  const { occurrence } = inspection;
  const operationPath = spellOngoingOperationPath(occurrence.ordinal);
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      occurrence.operation.trigger.kind === "on_attached_turn_start" &&
        spellMechanicsObjectHasOnlyKeys(
          occurrence.operation.trigger,
          CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_TRIGGER_FIELDS,
        ),
      "operationTrigger",
      operationPath,
    ),
    ...conditionImmunityTemporaryHitPointsTemporaryHitPointsEffectIssues(
      occurrence,
    ),
  ];
}

function conditionImmunityTemporaryHitPointsTemporaryHitPointsEffectIssues(
  occurrence: SpellOngoingOperationOccurrence,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  const effectPath = spellOngoingOperationEffectPath(occurrence.ordinal);
  if (occurrence.operation.effect.kind !== "grant_temp_hp") {
    return [
      conditionImmunityTemporaryHitPointsIssueFact(
        "temporaryHitPointsEffect",
        effectPath,
      ),
    ];
  }
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      spellMechanicsObjectHasOnlyKeys(
        occurrence.operation.effect,
        CONDITION_IMMUNITY_TEMPORARY_HIT_POINTS_TEMP_HP_EFFECT_FIELDS,
      ),
      "temporaryHitPointsEffect",
      effectPath,
    ),
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      hasConditionImmunityTemporaryHitPointsTemporaryHitPointsAmount(
        occurrence.operation.effect.amount,
      ),
      "temporaryHitPointsAmount",
      effectPath,
    ),
  ];
}

function conditionImmunityTemporaryHitPointsPhaseIssues(
  mechanics: ConditionImmunityTemporaryHitPointsMechanics,
): readonly ConditionImmunityTemporaryHitPointsIssueFact[] {
  return [
    ...conditionImmunityTemporaryHitPointsIssuesUnless(
      mechanics.initialPhase === undefined,
      "initialPhase",
      spellOngoingInitialPhasePath(),
    ),
    ...(mechanics.authoredConditionalMechanics ?? []).map((_mechanic, index) =>
      conditionImmunityTemporaryHitPointsIssueFact(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
      ),
    ),
  ];
}

function conditionImmunityTemporaryHitPointsReadiness(
  duration: ConditionImmunityTemporaryHitPointsDurationEvaluation,
  targeting: ConditionImmunityTemporaryHitPointsTargetingFacts,
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
): ConditionImmunityTemporaryHitPointsReadiness {
  return Match.value(duration).pipe(
    Match.when({ tag: "unsupported" }, () => ({ tag: "unsupported" as const })),
    Match.when({ tag: "supported" }, () =>
      conditionImmunityTemporaryHitPointsTargetingReadiness(targeting, roles),
    ),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsTargetingReadiness(
  targeting: ConditionImmunityTemporaryHitPointsTargetingFacts,
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
): ConditionImmunityTemporaryHitPointsReadiness {
  return Match.value(targeting).pipe(
    Match.when({ tag: "unsupported" }, () => ({ tag: "unsupported" as const })),
    Match.when({ tag: "supported" }, (facts) =>
      conditionImmunityTemporaryHitPointsOperationReadiness(facts, roles),
    ),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsOperationReadiness(
  targeting: Extract<
    ConditionImmunityTemporaryHitPointsTargetingFacts,
    { readonly tag: "supported" }
  >,
  roles: ConditionImmunityTemporaryHitPointsOperationRoles,
): ConditionImmunityTemporaryHitPointsReadiness {
  return Match.value(roles).pipe(
    Match.when({ tag: "distinct" }, ({ immunity, temporaryHitPoints }) => ({
      tag: "ready" as const,
      targetCount: targeting.targetCount,
      requiredTargetDisposition: targeting.requiredTargetDisposition,
      immunity,
      temporaryHitPoints,
    })),
    Match.whenOr(
      { tag: "neither" },
      { tag: "immunityOnly" },
      { tag: "temporaryHitPointsOnly" },
      () => ({ tag: "unsupported" as const }),
    ),
    Match.exhaustive,
  );
}

function conditionImmunityTemporaryHitPointsEvidence(
  operations: ConditionImmunityTemporaryHitPointsOperationEvaluation,
  readiness: Extract<
    ConditionImmunityTemporaryHitPointsReadiness,
    { readonly tag: "ready" }
  >,
): SpellProcedureMechanicsEvidence {
  return {
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
      ...operations.occurrences.map(({ ordinal }) =>
        spellOngoingOperationPath(ordinal),
      ),
      spellOngoingOperationEffectPath(readiness.immunity.ordinal),
      spellOngoingOperationEffectPath(readiness.temporaryHitPoints.ordinal),
    ],
    unowned: [],
  };
}

function conditionImmunityTemporaryHitPointsInspectionFromEvaluations(
  source: SpellMechanicsAdmissionSource,
  duration: ConditionImmunityTemporaryHitPointsDurationEvaluation,
  targeting: ConditionImmunityTemporaryHitPointsTargetingFacts,
  operations: ConditionImmunityTemporaryHitPointsOperationEvaluation,
): ConditionImmunityTemporaryHitPointsInspection {
  return Match.value(
    conditionImmunityTemporaryHitPointsReadiness(
      duration,
      targeting,
      operations.roles,
    ),
  ).pipe(
    Match.when({ tag: "unsupported" }, () => ({
      tag: "unsupported" as const,
      issues: [
        conditionImmunityTemporaryHitPointsIssueFact(
          "mechanics",
          spellMechanicsRootPath(),
        ),
      ] as const,
    })),
    Match.when({ tag: "ready" }, (readiness) => ({
      tag: "parsed" as const,
      facts: {
        ...source.spellDefinitionRuleFacts,
        rangeFeet: movementFeet(5),
        targetCount: readiness.targetCount,
        requiredTargetDisposition: readiness.requiredTargetDisposition,
        condition: "frightened" as const,
        temporaryHitPointsAmount: "spellcastingAbilityModifier" as const,
      },
      evidence: conditionImmunityTemporaryHitPointsEvidence(
        operations,
        readiness,
      ),
    })),
    Match.exhaustive,
  );
}

function inspectConditionImmunityTemporaryHitPointsMechanics(
  source: SpellMechanicsAdmissionSource,
): ConditionImmunityTemporaryHitPointsInspection {
  if (!isConditionImmunityTemporaryHitPointsRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const duration =
    conditionImmunityTemporaryHitPointsDurationEvaluation(mechanics);
  const targeting =
    conditionImmunityTemporaryHitPointsTargetingEvaluation(mechanics);
  const operations =
    conditionImmunityTemporaryHitPointsOperationEvaluation(mechanics);
  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues([
      ...conditionImmunityTemporaryHitPointsHeaderIssues(mechanics),
      ...duration.issues,
      ...targeting.issues,
      ...conditionImmunityTemporaryHitPointsPhaseIssues(mechanics),
      ...operations.issues,
    ]),
  );
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  return conditionImmunityTemporaryHitPointsInspectionFromEvaluations(
    source,
    duration,
    targeting.facts,
    operations,
  );
}

function admitConditionImmunityTemporaryHitPointsMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  ConditionImmunityTemporaryHitPointsMechanicsFacts,
  ConditionImmunityTemporaryHitPointsInvocation,
  ConditionImmunityTemporaryHitPointsAdmissionIssue
> {
  return Match.value(
    inspectConditionImmunityTemporaryHitPointsMechanics(source),
  ).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          conditionImmunityTemporaryHitPointsIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) =>
          admitConditionImmunityAndTurnStartTemporaryHitPoints(
            spell,
            ctx,
            facts,
          ),
      },
    })),
    Match.exhaustive,
  );
}

function admitConditionImmunityAndTurnStartTemporaryHitPoints(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ConditionImmunityTemporaryHitPointsMechanicsFacts,
): readonly ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (
      slot,
    ): readonly ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      const maxTargets = saveGatedConditionTargetingFromFacts(
        { kind: "targetList", count: facts.targetCount },
        slot.spellLevel,
      ).maxTargets;
      const expiresAt = {
        kind: "concentration" as const,
        combatantId: ctx.actor.combatantId,
      };
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
          spell,
          actionCost: "magicAction",
          targeting: {
            kind: "targetList",
            minTargets: 1,
            maxTargets,
            requiredTargetDisposition: facts.requiredTargetDisposition,
          },
          activeEffects: [
            {
              kind: "conditionImmunity",
              sourceCombatantId: ctx.actor.combatantId,
              condition: facts.condition,
              expiresAt,
            },
            {
              kind: "turnStartTemporaryHitPoints",
              sourceCombatantId: ctx.actor.combatantId,
              amount:
                conditionImmunityTemporaryHitPointsTemporaryHitPointsAmount(
                  facts.temporaryHitPointsAmount,
                  ctx.castingSource.abilityModifier,
                ),
              expiresAt,
            },
          ],
          rangeFeet: facts.rangeFeet,
        },
      ];
    },
  );
}

function conditionImmunityTemporaryHitPointsTemporaryHitPointsAmount(
  amount: ConditionImmunityTemporaryHitPointsMechanicsFacts["temporaryHitPointsAmount"],
  spellcastingAbilityModifier: AbilityModifier,
): number {
  return Match.value(amount).pipe(
    Match.when("spellcastingAbilityModifier", () =>
      Math.max(0, Number(spellcastingAbilityModifier)),
    ),
    Match.exhaustive,
  );
}

function discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveConditionImmunityAndTurnStartTemporaryHitPoints(
  input: SpellProcedureProfileResolveInput<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-immunity turn-start Temporary Hit Points spells use target fills only.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
  });
}

function conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellTargetListSelection {
  return spellTargetListSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    singleTargetListMessage:
      "Single-target condition-immunity turn-start Temporary Hit Points spells require one target choice.",
    invalidSingleTargetMessage:
      "Condition-immunity turn-start Temporary Hit Points spell target must be a combatant within the selected spell's supported range.",
    multiTargetChoiceMessage:
      "Multi-target condition-immunity turn-start Temporary Hit Points spells require a target list.",
  });
}

function applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation>,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const [conditionImmunity, turnStartTemporaryHitPoints] =
      invocation.activeEffects;
    const allocation = allocateBattleEffectOccurrencesForCreature({
      owner: target,
      effects: [
        {
          ...conditionImmunity,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          conditionHadNonSpellSource:
            conditionHadNonSpellSourceBeforeSpellEffect(
              target,
              conditionImmunity.condition,
            ),
        },
        {
          ...turnStartTemporaryHitPoints,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
        },
      ],
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionImmunity" ||
              effect.kind === "turnStartTemporaryHitPoints") &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef
          ),
      ),
      ...allocation.effects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
      ),
    };
  }, state);
}

export const ConditionImmunityTemplateSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("conditionImmunity"),
  sourceCombatantId: CombatantId,
  condition: Schema.Literal("frightened"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

export const TurnStartTemporaryHitPointsTemplateSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("turnStartTemporaryHitPoints"),
  sourceCombatantId: CombatantId,
  amount: Schema.Number,
  expiresAt: BattleActiveEffectExpirationSchema,
});

const ConditionImmunityAndTurnStartTemporaryHitPointsInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literals([
        "conditionImmunityAndTurnStartTemporaryHitPoints",
      ]),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      activeEffects: Schema.Tuple([
        ConditionImmunityTemplateSchema,
        TurnStartTemporaryHitPointsTemplateSchema,
      ]),
      rangeFeet: MovementFeet,
    }),
  );
export const conditionImmunityAndTurnStartTemporaryHitPointsProfile: SpellProcedureDeclaration<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  ConditionImmunityTemporaryHitPointsInvocation,
  ConditionImmunityTemporaryHitPointsMechanicsFacts,
  ConditionImmunityTemporaryHitPointsAdmissionIssue
> = {
  procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
  executionSchema:
    ConditionImmunityAndTurnStartTemporaryHitPointsInvocationSchema,
  admitMechanics: admitConditionImmunityTemporaryHitPointsMechanics,
  discoverCastAct:
    discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct,
  resolve: resolveConditionImmunityAndTurnStartTemporaryHitPoints,
};
