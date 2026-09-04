import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
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
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellAttachmentRejection,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type HeroismInvocation = Extract<
  ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation,
  { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
>;
type HeroismMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type HeroismDuration = Extract<
  HeroismMechanics["duration"],
  { readonly kind: "concentration" }
>;
type HeroismMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeetType;
  readonly targetCount: SaveGateTargetCountFacts;
  readonly condition: "frightened";
  readonly temporaryHitPointsAmount: "spellcastingAbilityModifier";
};

const HEROISM_LEVEL = 1 as const;
const HEROISM_DURATION_MINUTES = 1 as const;
const HEROISM_SELECTION_FIELDS = [
  "mode",
  "count",
  "targetKinds",
  "disposition",
] as const;
const HEROISM_ROOT_FIELDS = [
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
] as const satisfies ReadonlyArray<keyof HeroismMechanics>;
type HeroismComponentKeySpace = Pick<Components, "v" | "s" | "m"> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const HEROISM_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<keyof HeroismComponentKeySpace>;
const HEROISM_RANGE_FIELDS = ["kind"] as const;
const HEROISM_CASTING_TIME_FIELDS = ["kind"] as const;
const HEROISM_DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const;
const HEROISM_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<keyof HeroismDuration["upTo"]>;
const HEROISM_OPERATION_FIELDS = [
  "trigger",
  "effect",
  "predicate",
  "targetLimit",
  "usageLimit",
] as const;
const HEROISM_TRIGGER_FIELDS = ["kind"] as const;
const HEROISM_IMMUNITY_EFFECT_FIELDS = ["kind", "condition"] as const;
const HEROISM_TEMP_HP_EFFECT_FIELDS = ["kind", "amount"] as const;
const HEROISM_AMOUNT_FIELDS = ["kind", "expr"] as const;
const HEROISM_AMOUNT_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for HeroismFailedFact.
const HEROISM_FAILED_FACTS = [
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
type HeroismFailedFact = (typeof HEROISM_FAILED_FACTS)[number];
type HeroismAdmissionIssue = SpellProcedureAdmissionIssue<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  HeroismFailedFact,
  UnitMechanicsPath
>;
type HeroismIssueFact = {
  readonly failedFact: HeroismFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

function heroismIssue(
  failedFact: HeroismFailedFact,
  mechanicsPath: UnitMechanicsPath,
): HeroismAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
    failedFact,
    mechanicsPath,
    message: `Unsupported conditionImmunityAndTurnStartTemporaryHitPoints mechanics fact: ${failedFact}.`,
  };
}

function isHeroismRepresentation(
  mechanics: SpellMechanics,
): mechanics is HeroismMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const selection =
        ongoing.attachment.kind === "hole" &&
        ongoing.attachment.value.kind === "target"
          ? ongoing.attachment.value.selection
          : undefined;
      return spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              ongoing.level === HEROISM_LEVEL &&
              ongoing.school === "enchantment" &&
              ongoing.castingTime.kind === "action",
          },
          {
            name: "touchComponents",
            present:
              ongoing.range.kind === "touch" &&
              ongoing.components.v === true &&
              ongoing.components.s === true &&
              ongoing.components.m === false,
          },
          {
            name: "duration",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.unit === "minute" &&
              ongoing.duration.upTo.amount === HEROISM_DURATION_MINUTES,
          },
          {
            name: "willingTarget",
            present:
              selection?.targetKinds?.includes("creature") === true &&
              "disposition" in selection &&
              selection.disposition === "willing",
          },
          {
            name: "effects",
            present:
              ongoing.operations.some(
                (operation: HeroismMechanics["operations"][number]) =>
                  operation.effect.kind === "grant_condition_immunity",
              ) &&
              ongoing.operations.some(
                (operation: HeroismMechanics["operations"][number]) =>
                  operation.effect.kind === "grant_temp_hp",
              ),
          },
        ],
      });
    }),
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

function heroismAttachmentFailedFact(
  rejection: SpellAttachmentRejection,
  attachment: HeroismMechanics["attachment"],
): HeroismFailedFact {
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

function hasHeroismTemporaryHitPointsAmount(
  amount: SurfaceDiceAmount,
): boolean {
  return (
    amount.kind === "fixed" &&
    spellMechanicsObjectHasOnlyKeys(amount, HEROISM_AMOUNT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(amount.expr, HEROISM_AMOUNT_EXPR_FIELDS) &&
    amount.expr.dice === 0 &&
    amount.expr.dieSize === 1 &&
    amount.expr.flat === 0 &&
    amount.expr.spellcastingMod === true &&
    amount.expr.abilityModifier === undefined
  );
}

type HeroismInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [HeroismIssueFact, ...HeroismIssueFact[]];
    }
  | {
      readonly tag: "parsed";
      readonly facts: HeroismMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

function inspectHeroismMechanics(
  source: SpellMechanicsAdmissionSource,
): HeroismInspection {
  if (!isHeroismRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: HeroismIssueFact[] = [];
  const push = (
    failedFact: HeroismFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, HEROISM_ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== HEROISM_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "enchantment")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "touch" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, HEROISM_RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys<HeroismComponentKeySpace>(
      mechanics.components,
      HEROISM_COMPONENT_FIELDS,
    )
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      HEROISM_CASTING_TIME_FIELDS,
    )
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const duration =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const durationValue = duration?.upTo;
  const durationTicks =
    durationValue !== undefined &&
    durationValue.unit === "minute" &&
    durationValue.amount === HEROISM_DURATION_MINUTES &&
    isSpellCanonicalDurationValue(durationValue) &&
    spellMechanicsObjectHasOnlyKeys(
      durationValue,
      HEROISM_DURATION_VALUE_FIELDS,
    )
      ? spellDurationTicksFromCanonicalValue(durationValue)
      : undefined;
  if (
    duration === undefined ||
    !spellMechanicsObjectHasOnlyKeys(duration, HEROISM_DURATION_FIELDS)
  )
    push("duration", spellMechanicsHeaderPath("duration"));
  if (durationTicks === undefined)
    push("durationValue", spellDurationValuePath());
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));

  const attachmentAdmission = admitSpellTargetAttachment(
    mechanics.attachment,
    HEROISM_SELECTION_FIELDS,
  );
  if (attachmentAdmission.tag === "rejected")
    for (const rejection of attachmentAdmission.rejections)
      push(
        heroismAttachmentFailedFact(rejection, mechanics.attachment),
        spellOngoingAttachmentPath(),
      );
  const selection =
    attachmentAdmission.tag === "admitted"
      ? attachmentAdmission.attachment.value.selection
      : mechanics.attachment.kind === "hole" &&
          mechanics.attachment.value.kind === "target"
        ? mechanics.attachment.value.selection
        : undefined;
  if (selection !== undefined) {
    if (selection.mode !== "choose_up_to")
      push("selectionMode", spellOngoingAttachmentPath());
    if (
      selection.targetKinds?.length !== 1 ||
      !selection.targetKinds.includes("creature")
    )
      push("selectionTargetKinds", spellOngoingAttachmentPath());
    if (!("disposition" in selection) || selection.disposition !== "willing")
      push("selectionDisposition", spellOngoingAttachmentPath());
  }
  const targetCount =
    selection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(selection, HEROISM_LEVEL);
  if (selection !== undefined && targetCount === null)
    push("targetCount", spellOngoingAttachmentPath());

  if (mechanics.initialPhase !== undefined)
    push("initialPhase", spellOngoingInitialPhasePath());
  for (const [index] of (
    mechanics.authoredConditionalMechanics ?? []
  ).entries())
    push(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    );

  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const immunityCandidates = occurrences.filter(
    ({ operation }) =>
      operation.trigger.kind === "passive" ||
      operation.effect.kind === "grant_condition_immunity" ||
      ("condition" in operation.effect &&
        operation.effect.condition === "frightened"),
  );
  const temporaryHitPointsCandidates = occurrences.filter(
    ({ operation }) =>
      operation.trigger.kind === "on_attached_turn_start" ||
      operation.effect.kind === "grant_temp_hp" ||
      ("amount" in operation.effect &&
        typeof operation.effect.amount === "object" &&
        operation.effect.amount !== null &&
        hasHeroismTemporaryHitPointsAmount(operation.effect.amount)),
  );
  const immunity =
    immunityCandidates.length === 1 ? immunityCandidates[0] : undefined;
  const temporaryHitPoints =
    temporaryHitPointsCandidates.length === 1
      ? temporaryHitPointsCandidates[0]
      : undefined;
  const rolesAreDistinct =
    immunity !== undefined &&
    temporaryHitPoints !== undefined &&
    immunity.ordinal !== temporaryHitPoints.ordinal;

  for (const occurrence of occurrences) {
    const operationPath = spellOngoingOperationPath(occurrence.ordinal);
    if (
      !spellMechanicsObjectHasOnlyKeys(
        occurrence.operation,
        HEROISM_OPERATION_FIELDS,
      )
    )
      push("operation", operationPath);
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    ))
      push(
        Match.value(failedFact).pipe(
          Match.when("predicate", () => "operationPredicate" as const),
          Match.when("targetLimit", () => "operationTargetLimit" as const),
          Match.when("usageLimit", () => "operationUsageLimit" as const),
          Match.exhaustive,
        ),
        operationPath,
      );
    if (
      !immunityCandidates.includes(occurrence) &&
      !temporaryHitPointsCandidates.includes(occurrence)
    )
      push("operationCount", operationPath);
  }
  if (immunity === undefined)
    push("immunityOperation", spellMechanicsRootPath());
  for (const duplicate of immunityCandidates.slice(1))
    push("operationCount", spellOngoingOperationPath(duplicate.ordinal));
  if (temporaryHitPoints === undefined)
    push("temporaryHitPointsOperation", spellMechanicsRootPath());
  for (const duplicate of temporaryHitPointsCandidates.slice(1))
    push("operationCount", spellOngoingOperationPath(duplicate.ordinal));
  if (!rolesAreDistinct) push("operationCount", spellMechanicsRootPath());

  if (immunity !== undefined) {
    const path = spellOngoingOperationPath(immunity.ordinal);
    const effectPath = spellOngoingOperationEffectPath(immunity.ordinal);
    if (
      immunity.operation.trigger.kind !== "passive" ||
      !spellMechanicsObjectHasOnlyKeys(
        immunity.operation.trigger,
        HEROISM_TRIGGER_FIELDS,
      )
    )
      push("operationTrigger", path);
    if (immunity.operation.effect.kind !== "grant_condition_immunity")
      push("immunityEffect", effectPath);
    else {
      if (
        !spellMechanicsObjectHasOnlyKeys(
          immunity.operation.effect,
          HEROISM_IMMUNITY_EFFECT_FIELDS,
        )
      )
        push("immunityEffect", effectPath);
      if (immunity.operation.effect.condition !== "frightened")
        push("immunityCondition", effectPath);
    }
  }
  if (temporaryHitPoints !== undefined) {
    const path = spellOngoingOperationPath(temporaryHitPoints.ordinal);
    const effectPath = spellOngoingOperationEffectPath(
      temporaryHitPoints.ordinal,
    );
    if (
      temporaryHitPoints.operation.trigger.kind !== "on_attached_turn_start" ||
      !spellMechanicsObjectHasOnlyKeys(
        temporaryHitPoints.operation.trigger,
        HEROISM_TRIGGER_FIELDS,
      )
    )
      push("operationTrigger", path);
    if (temporaryHitPoints.operation.effect.kind !== "grant_temp_hp")
      push("temporaryHitPointsEffect", effectPath);
    else {
      if (
        !spellMechanicsObjectHasOnlyKeys(
          temporaryHitPoints.operation.effect,
          HEROISM_TEMP_HP_EFFECT_FIELDS,
        )
      )
        push("temporaryHitPointsEffect", effectPath);
      if (
        !hasHeroismTemporaryHitPointsAmount(
          temporaryHitPoints.operation.effect.amount,
        )
      )
        push("temporaryHitPointsAmount", effectPath);
    }
  }

  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  if (
    durationTicks === undefined ||
    targetCount === null ||
    !rolesAreDistinct ||
    immunity === undefined ||
    temporaryHitPoints === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      ],
    };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      durationTicks,
      rangeFeet: movementFeet(5),
      targetCount,
      condition: "frightened",
      temporaryHitPointsAmount: "spellcastingAbilityModifier",
    },
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
        ...occurrences.map(({ ordinal }) => spellOngoingOperationPath(ordinal)),
        spellOngoingOperationEffectPath(immunity.ordinal),
        spellOngoingOperationEffectPath(temporaryHitPoints.ordinal),
      ],
      unowned: [],
    },
  };
}

function admitHeroismMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  HeroismMechanicsFacts,
  HeroismInvocation,
  HeroismAdmissionIssue
> {
  return Match.value(inspectHeroismMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          heroismIssue(failedFact, mechanicsPath),
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
  facts: HeroismMechanicsFacts,
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
              amount: heroismTemporaryHitPointsAmount(
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

function heroismTemporaryHitPointsAmount(
  amount: HeroismMechanicsFacts["temporaryHitPointsAmount"],
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
      }),
      activeEffects: Schema.Tuple([
        ConditionImmunityTemplateSchema,
        TurnStartTemporaryHitPointsTemplateSchema,
      ]),
      rangeFeet: MovementFeet,
    }),
  );
export const conditionImmunityAndTurnStartTemporaryHitPointsProfile = {
  procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
  executionSchema:
    ConditionImmunityAndTurnStartTemporaryHitPointsInvocationSchema,
  admitMechanics: admitHeroismMechanics,
  discoverCastAct:
    discoverConditionImmunityAndTurnStartTemporaryHitPointsCastAct,
  resolve: resolveConditionImmunityAndTurnStartTemporaryHitPoints,
} satisfies SpellProcedureDeclaration<
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  HeroismInvocation,
  HeroismMechanicsFacts,
  HeroismAdmissionIssue
>;
