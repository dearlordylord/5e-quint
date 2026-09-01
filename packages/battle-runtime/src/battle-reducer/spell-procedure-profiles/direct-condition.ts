import { spellInvocationResourceForCastOption } from "./profile.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
//
// The directCondition Spell Procedure Profile: a prepared Magic Action spell
// that applies a spell-owned condition to touched creature targets, with
// Concentration duration and target-action early end.

import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { CombatantId } from "../../identity.ts";
import { applyDirectConditionSpellEffects } from "../direct-condition-lifecycle.ts";

import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import {
  maybeOpenConfiguredSpellCastReactionWindow,
  spendConfiguredSpellCastResources,
} from "../spell-active-effect-resolution.ts";
import {
  attachmentValueHasOnlyKeys,
  sameStringSet,
  targetSelectionHasOnlyKeys,
  targetSelectionFromAttachment,
} from "../spells-execution-facts.ts";
import { spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellDurationValueTicks,
  spellNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  PositiveInteger,
  spellSlotLevel,
  type PositiveInteger as PositiveIntegerType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type DirectConditionResolveInput =
  SpellProcedureProfileResolveInput<DirectConditionInvocation>;

type DirectConditionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directCondition" }
>;
type DirectConditionTargetSelection = Exclude<
  ReturnType<typeof targetSelectionFromAttachment>,
  null
>;
type DirectConditionSupportedSelection = {
  readonly mode: "choose_up_to";
  readonly count: DirectConditionSupportedCount;
};
type DirectConditionSupportedCount =
  | PositiveIntegerType
  | {
      readonly kind: "linear";
      readonly base: PositiveIntegerType;
      readonly perSlotAboveBase: PositiveIntegerType;
      readonly baseLevel: SpellSlotLevel;
    };
type DirectConditionRange = Extract<
  SpellDefinitionRuleFacts["range"],
  { readonly kind: "touch" }
>;
type DirectConditionDuration = Omit<
  Extract<
    SpellDefinitionRuleFacts["duration"],
    { readonly kind: "concentration" }
  >,
  "upTo"
> & {
  readonly upTo: Omit<
    Extract<
      SpellDefinitionRuleFacts["duration"],
      { readonly kind: "concentration" }
    >["upTo"],
    "unit" | "amount"
  > & { readonly unit: "hour"; readonly amount: 1 };
};
type DirectConditionAppliedCondition = Extract<
  DirectConditionInvocation["activeEffect"],
  { readonly kind: "targetActionEndedSpellCondition" }
>["condition"];
type DirectConditionMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: DirectConditionRange;
  readonly duration: DirectConditionDuration;
  readonly selection: DirectConditionSupportedSelection;
  readonly condition: DirectConditionAppliedCondition;
};

const DIRECT_CONDITION_SUPPORTED_SELECTION_KEYS = [
  "mode",
  "count",
  "targetKinds",
] as const;
const DIRECT_CONDITION_TARGET_ATTACHMENT_KEYS = ["kind", "selection"] as const;
const DIRECT_CONDITION_MAX_TOLERATED_REPRESENTATION_MISMATCHES = 1;

function directConditionTargetSelection(
  selection: DirectConditionTargetSelection | null,
): DirectConditionSupportedSelection | null {
  const count =
    selection?.mode === "choose_up_to" ? selection.count : undefined;
  if (
    selection === null ||
    selection.mode !== "choose_up_to" ||
    count === undefined ||
    (typeof count !== "number" && count.kind !== "linear") ||
    !targetSelectionHasOnlyKeys(
      selection,
      DIRECT_CONDITION_SUPPORTED_SELECTION_KEYS,
    ) ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"])
  ) {
    return null;
  }
  const supportedCount: DirectConditionSupportedCount =
    typeof count === "number"
      ? PositiveInteger(count)
      : {
          ...count,
          base: PositiveInteger(count.base),
          perSlotAboveBase: PositiveInteger(count.perSlotAboveBase),
          baseLevel: spellSlotLevel(count.baseLevel),
        };
  return { mode: "choose_up_to", count: supportedCount };
}

function directConditionTargetCount(
  selection: DirectConditionSupportedSelection,
  slotLevel: SpellSlotLevel,
): PositiveIntegerType {
  if (typeof selection.count === "number") return selection.count;
  return PositiveInteger(
    Number(selection.count.base) +
      Math.max(0, Number(slotLevel) - Number(selection.count.baseLevel)) *
        Number(selection.count.perSlotAboveBase),
  );
}

const DIRECT_CONDITION_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_deals_damage",
  "target_casts_spell",
] as const;

function admitDirectCondition(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DirectConditionMechanicsFacts,
): readonly DirectConditionInvocation[] {
  const durationTicks = spellDurationValueTicks(facts.duration.upTo);
  if (durationTicks === null) return [];
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DirectConditionInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const maxTargets = directConditionTargetCount(
        facts.selection,
        slot.spellLevel,
      );
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "directCondition",
          spell,
          actionCost: "magicAction",
          targeting: { kind: "targetList", minTargets: 1, maxTargets },
          activeEffect: {
            kind: "targetActionEndedSpellCondition",
            sourceCombatantId: ctx.actor.combatantId,
            condition: facts.condition,
            expiresAt: {
              kind: "concentration",
              combatantId: ctx.actor.combatantId,
              durationTicks,
            },
          },
          rangeFeet: spellTouchRangeFeet(),
        },
      ];
    },
  );
}

function directConditionDurationProjection(
  duration: SpellDefinitionRuleFacts["duration"],
): DirectConditionDuration | null {
  if (
    duration.kind !== "concentration" ||
    duration.upTo.unit !== "hour" ||
    duration.upTo.amount !== 1
  ) {
    return null;
  }
  return {
    ...duration,
    upTo: { ...duration.upTo, unit: "hour", amount: 1 },
  };
}

export const DIRECT_CONDITION_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationValue",
  "durationEnding",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "effects",
  "condition",
] as const;
type DirectConditionFailedFact = (typeof DIRECT_CONDITION_FAILED_FACTS)[number];

type DirectConditionMechanicsIssue = {
  readonly failedFact: DirectConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function directConditionIssueResult(issue: DirectConditionMechanicsIssue): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "directCondition";
  readonly failedFact: DirectConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "directCondition",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported directCondition mechanics fact: ${issue.failedFact}.`,
  };
}

function directConditionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseOrdinal: PositiveInteger,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitDirectConditionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "directCondition",
  DirectConditionMechanicsFacts,
  DirectConditionInvocation,
  ReturnType<typeof directConditionIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const representationWitnesses = [
    mechanics.level === 2,
    mechanics.castingTime.kind === "action",
    mechanics.range.kind === "touch",
    mechanics.duration.kind === "concentration" &&
      mechanics.duration.upTo.unit === "hour" &&
      mechanics.duration.upTo.amount === 1,
  ];
  const representationWitnessCount =
    representationWitnesses.filter(Boolean).length;
  const representationMismatchCount =
    representationWitnesses.length - representationWitnessCount;
  const hasToleratedRepresentationMismatches =
    representationMismatchCount <=
    DIRECT_CONDITION_MAX_TOLERATED_REPRESENTATION_MISMATCHES;
  const range = mechanics.range.kind === "touch" ? mechanics.range : null;
  const duration = directConditionDurationProjection(mechanics.duration);
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      (targetSelectionFromAttachment(phase.attachment) !== null ||
        (phase.effects ?? []).some(
          (effect) => effect.kind === "apply_condition",
        )),
  );
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  if (phase?.kind !== "direct" || !hasToleratedRepresentationMismatches) {
    return { tag: "notRepresented" };
  }
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const issues: DirectConditionMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: DirectConditionFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.level !== 2) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "touch") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      pushIssue("duration", path);
    }
  } else {
    if (
      mechanics.duration.upTo.unit !== "hour" ||
      mechanics.duration.upTo.amount !== 1
    ) {
      pushIssue("durationValue", spellDurationValuePath());
    }
    const ends = mechanics.duration.earlyEnd ?? [];
    const expectedEndKinds = DIRECT_CONDITION_EARLY_END_KINDS;
    const seenEndKinds = new Set<string>();
    for (const [index, end] of ends.entries()) {
      if (
        !expectedEndKinds.some((expectedKind) => expectedKind === end.kind) ||
        seenEndKinds.has(end.kind)
      ) {
        pushIssue(
          "durationEnding",
          spellDurationEndingPath(PositiveInteger(index + 1)),
        );
      } else {
        seenEndKinds.add(end.kind);
      }
    }
    if (
      expectedEndKinds.some((expectedKind) => !seenEndKinds.has(expectedKind))
    ) {
      pushIssue("durationEnding", spellMechanicsHeaderPath("duration"));
    }
    for (const [index] of ends.entries()) {
      if (index >= expectedEndKinds.length) {
        pushIssue(
          "durationEnding",
          spellDurationEndingPath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.duration.permanentIfMaintainedFull === true) {
      pushIssue(
        "durationEnding",
        spellDurationEndingPath(PositiveInteger(ends.length + 1)),
      );
    }
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
  }
  if (phaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  const selection = targetSelectionFromAttachment(phase.attachment);
  const representedSelection = attachmentValueHasOnlyKeys(
    phase.attachment,
    DIRECT_CONDITION_TARGET_ATTACHMENT_KEYS,
  )
    ? directConditionTargetSelection(selection)
    : null;
  if (representedSelection === null) {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const effects = phase.effects ?? [];
  const canonicalConditionIndex = effects.findIndex(
    (candidate) =>
      candidate.kind === "apply_condition" &&
      candidate.condition === "invisible",
  );
  const conditionIndex =
    canonicalConditionIndex >= 0
      ? canonicalConditionIndex
      : effects.findIndex((candidate) => candidate.kind === "apply_condition");
  if (effects.length !== 1) {
    if (effects.length === 0) {
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
    for (const [index] of effects.entries()) {
      if (index === conditionIndex) continue;
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
  }
  const effect = conditionIndex < 0 ? undefined : effects[conditionIndex];
  const condition =
    effect?.kind === "apply_condition" && effect.condition === "invisible"
      ? effect.condition
      : null;
  if (condition === null) {
    pushIssue(
      "condition",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(conditionIndex < 0 ? 1 : conditionIndex + 1),
      ),
    );
  }
  const nonEmptyIssues = spellNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(directConditionIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    representedSelection === null ||
    condition === null ||
    range === null ||
    duration === null
  ) {
    return {
      tag: "unsupported",
      issues: [
        directConditionIssueResult({
          failedFact:
            representedSelection === null
              ? "attachment"
              : condition === null
                ? "condition"
                : "durationValue",
          mechanicsPath:
            representedSelection === null
              ? spellActivationAttachmentPath(phaseOrdinal)
              : condition === null
                ? spellActivationEffectPath(
                    phaseOrdinal,
                    PositiveInteger(
                      conditionIndex < 0 ? 1 : conditionIndex + 1,
                    ),
                  )
                : spellDurationValuePath(),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range,
    duration,
    selection: representedSelection,
    condition,
  } satisfies DirectConditionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "directCondition",
      facts,
      evidence: directConditionMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitDirectCondition(executionSource, ctx, facts),
    },
  };
}

function discoverDirectConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectConditionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveDirectCondition(
  input: DirectConditionResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    invalidFillMessage: "Direct condition spells use a target-list fill only.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const { targetIds } = targetSelection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (input.storedGlyphRelease !== undefined) {
    const effected = applyDirectConditionSpellEffects(
      input.input.state,
      input.actorId,
      targetIds,
      input.invocation,
    );
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
  }
  const resourced = spendConfiguredSpellCastResources({
    resolution: input,
    state: input.input.state,
    ...(input.storedGlyphRelease === undefined
      ? {}
      : { startConcentration: false }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyDirectConditionSpellEffects(
    resourced.state,
    input.actorId,
    targetIds,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

const DirectConditionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    activeEffect: Schema.Struct({
      ...BattleEffectOccurrenceTemplateSchemaFields,
      kind: Schema.Literal("targetActionEndedSpellCondition"),
      sourceCombatantId: CombatantId,
      condition: Schema.Literal("invisible"),
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
    }),
    rangeFeet: MovementFeet,
  }),
);
export const directConditionProfile: SpellProcedureDeclaration<
  "directCondition",
  DirectConditionInvocation
> = {
  procedure: "directCondition",
  executionSchema: DirectConditionInvocationSchema,
  admitMechanics: admitDirectConditionMechanics,
  discoverCastAct: discoverDirectConditionCastAct,
  resolve: resolveDirectCondition,
};
