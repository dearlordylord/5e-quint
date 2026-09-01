import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The directConditionRemoval Spell Procedure Profile: a prepared Bonus Action
// spell that touches one creature and ends one chosen condition on it.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";

import {
  needsHolesResult,
  spellSelectionResolution,
} from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  battleCreatureAfterConditionRemoval,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  concentrationSpellEffectSourcesDirectlyApplyingCondition,
} from "../spell-condition-effects-helpers.ts";
import { DIRECT_CONDITION_REMOVAL_CONDITIONS } from "../domain-constants.ts";
import {
  attachmentValueHasOnlyKeys,
  sameStringSet,
  targetSelectionHasOnlyKeys,
  targetSelectionFromAttachment,
} from "../spells-execution-facts.ts";
import {
  spellConditionChoiceHole,
  spellTargetHole,
} from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import { spellConditionChoiceHoleId } from "../spells-damage-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import type {
  ActivationPhase,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { PositiveInteger } from "@dnd/shared/types";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type DirectConditionRemovalInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directConditionRemoval" }
>;
type DirectConditionRemovalCondition =
  DirectConditionRemovalInvocation["conditionChoices"][number];
type DirectConditionRemovalRange = Extract<
  SpellDefinitionRuleFacts["range"],
  { readonly kind: "touch" }
>;
type DirectConditionRemovalDuration = Extract<
  SpellDefinitionRuleFacts["duration"],
  { readonly kind: "instantaneous" }
>;
type DirectConditionRemovalMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: DirectConditionRemovalRange;
  readonly duration: DirectConditionRemovalDuration;
  readonly conditionChoices: DirectConditionRemovalInvocation["conditionChoices"];
};

const DIRECT_CONDITION_REMOVAL_TARGET_SELECTION_KEYS = [
  "mode",
  "targetKinds",
] as const;
const DIRECT_CONDITION_REMOVAL_TARGET_ATTACHMENT_KEYS = [
  "kind",
  "selection",
] as const;
const DIRECT_CONDITION_REMOVAL_MAX_TOLERATED_REPRESENTATION_MISMATCHES = 1;
const DIRECT_CONDITION_REMOVAL_CANONICAL_EFFECT_MISMATCH_CREDIT = 1;

function isCanonicalDirectConditionRemovalEffect(
  effect: NonNullable<
    Extract<ActivationPhase, { readonly kind: "direct" }>["effects"]
  >[number],
): boolean {
  if (
    effect.kind !== "remove_condition" ||
    typeof effect.condition !== "object" ||
    Array.isArray(effect.condition) ||
    !("kind" in effect.condition) ||
    effect.condition.kind !== "choose"
  ) {
    return false;
  }
  return sameStringSet(
    effect.condition.from,
    DIRECT_CONDITION_REMOVAL_CONDITIONS,
  );
}

type DirectConditionRemovalActivationMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function directConditionRemovalStablePhase(
  mechanics: DirectConditionRemovalActivationMechanics,
  phase: Extract<
    DirectConditionRemovalActivationMechanics["phases"][number],
    { readonly kind: "direct" }
  >,
): boolean {
  const representationWitnesses = [
    mechanics.school === "abjuration",
    mechanics.level === 2,
    mechanics.castingTime.kind === "bonus_action",
    mechanics.range.kind === "touch",
    mechanics.duration.kind === "instantaneous",
    targetSelectionFromAttachment(phase.attachment) !== null,
  ];
  const representationWitnessCount =
    representationWitnesses.filter(Boolean).length;
  const canonicalRemoval = (phase.effects ?? []).some(
    isCanonicalDirectConditionRemovalEffect,
  );
  const allRepresentationWitnesses = [
    ...representationWitnesses,
    canonicalRemoval,
  ];
  const allRepresentationWitnessCount =
    allRepresentationWitnesses.filter(Boolean).length;
  const allRepresentationMismatchCount =
    allRepresentationWitnesses.length - allRepresentationWitnessCount;
  const representationMismatchCount =
    representationWitnesses.length - representationWitnessCount;
  const maximumHeaderMismatchesWithCanonicalEffect =
    DIRECT_CONDITION_REMOVAL_MAX_TOLERATED_REPRESENTATION_MISMATCHES +
    DIRECT_CONDITION_REMOVAL_CANONICAL_EFFECT_MISMATCH_CREDIT;
  return (
    allRepresentationMismatchCount <=
      DIRECT_CONDITION_REMOVAL_MAX_TOLERATED_REPRESENTATION_MISMATCHES ||
    (canonicalRemoval &&
      representationMismatchCount <= maximumHeaderMismatchesWithCanonicalEffect)
  );
}

function admitDirectConditionRemoval(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DirectConditionRemovalMechanicsFacts,
): readonly DirectConditionRemovalInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DirectConditionRemovalInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "directConditionRemoval",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              conditionChoices: facts.conditionChoices,
              rangeFeet: spellTouchRangeFeet(),
            },
          ],
  );
}

export const DIRECT_CONDITION_REMOVAL_FAILED_FACTS = [
  "level",
  "school",
  "castingTime",
  "range",
  "duration",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "effects",
  "condition",
] as const;
type DirectConditionRemovalFailedFact =
  (typeof DIRECT_CONDITION_REMOVAL_FAILED_FACTS)[number];

type DirectConditionRemovalMechanicsIssue = {
  readonly failedFact: DirectConditionRemovalFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function directConditionRemovalIssueResult(
  issue: DirectConditionRemovalMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "directConditionRemoval";
  readonly failedFact: DirectConditionRemovalFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "directConditionRemoval",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported directConditionRemoval mechanics fact: ${issue.failedFact}.`,
  };
}

function directConditionRemovalMechanicsEvidence(
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

function admitDirectConditionRemovalMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "directConditionRemoval",
  DirectConditionRemovalMechanicsFacts,
  DirectConditionRemovalInvocation,
  ReturnType<typeof directConditionRemovalIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      directConditionRemovalStablePhase(mechanics, phase),
  );
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  if (phase?.kind !== "direct") {
    return { tag: "notRepresented" };
  }
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const range = mechanics.range.kind === "touch" ? mechanics.range : null;
  const duration =
    mechanics.duration.kind === "instantaneous" ? mechanics.duration : null;
  const issues: DirectConditionRemovalMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: DirectConditionRemovalFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.level !== 2) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "abjuration") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (mechanics.castingTime.kind !== "bonus_action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "touch") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "instantaneous") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      pushIssue("duration", path);
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
    if (mechanics.phases.length < 1) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (phaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  const attachment = phase.attachment;
  const selection = targetSelectionFromAttachment(attachment);
  if (
    selection === null ||
    !attachmentValueHasOnlyKeys(
      attachment,
      DIRECT_CONDITION_REMOVAL_TARGET_ATTACHMENT_KEYS,
    ) ||
    selection.mode !== "one" ||
    !targetSelectionHasOnlyKeys(
      selection,
      DIRECT_CONDITION_REMOVAL_TARGET_SELECTION_KEYS,
    ) ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"])
  ) {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const effects = phase.effects ?? [];
  const canonicalRemoveConditionIndex = effects.findIndex(
    isCanonicalDirectConditionRemovalEffect,
  );
  const removeConditionIndex =
    canonicalRemoveConditionIndex >= 0
      ? canonicalRemoveConditionIndex
      : effects.findIndex((effect) => effect.kind === "remove_condition");
  if (effects.length !== 1) {
    if (effects.length === 0) {
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
    for (const [index] of effects.entries()) {
      if (index === removeConditionIndex) continue;
      pushIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
  }
  const removeCondition =
    removeConditionIndex < 0 ? undefined : effects[removeConditionIndex];
  const condition =
    removeCondition?.kind === "remove_condition"
      ? removeCondition.condition
      : null;
  const conditionChoice =
    condition !== null &&
    typeof condition === "object" &&
    !Array.isArray(condition) &&
    "kind" in condition &&
    condition.kind === "choose"
      ? condition
      : null;
  if (
    conditionChoice === null ||
    !sameStringSet(conditionChoice.from, DIRECT_CONDITION_REMOVAL_CONDITIONS)
  ) {
    pushIssue(
      "condition",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(
          removeConditionIndex < 0 ? 1 : removeConditionIndex + 1,
        ),
      ),
    );
  }
  const nonEmptyIssues = spellNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      directConditionRemovalIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (conditionChoice === null || range === null || duration === null) {
    return {
      tag: "unsupported",
      issues: [
        directConditionRemovalIssueResult({
          failedFact: "condition",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(1),
          ),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range,
    duration,
    conditionChoices: DIRECT_CONDITION_REMOVAL_CONDITIONS,
  } satisfies DirectConditionRemovalMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "directConditionRemoval",
      facts,
      evidence: directConditionRemovalMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitDirectConditionRemoval(executionSource, ctx, facts),
    },
  };
}

function discoverDirectConditionRemovalCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectConditionRemovalInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellConditionChoiceHole(invocation)],
  );
}

function resolveDirectConditionRemoval(
  input: SpellProcedureProfileResolveInput<DirectConditionRemovalInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellConditionChoiceHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Direct condition-removal spells use one target fill and one condition choice.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    directConditionRemovalSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;
  const conditionChoice = input.fillSet.conditionChoice;
  if (conditionChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellConditionChoiceHole(input.invocation),
    ]);
  }
  const selectedCondition = input.invocation.conditionChoices.find(
    (choice) => choice === conditionChoice,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedCondition === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell condition choice is not available for this spell.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetSelection.targetIds,
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyDirectConditionRemovalSpellEffect(
    input.input.state,
    targetSelection.targetIds,
    selectedCondition,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

function directConditionRemovalSpellTargetSelection(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<DirectConditionRemovalInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage:
      "Direct condition-removal spells require one target choice.",
    invalidTargetMessage:
      "Direct condition-removal spell target must be a combatant within the selected spell's supported range.",
  });
}

function applyDirectConditionRemovalSpellEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  condition: DirectConditionRemovalCondition,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const concentrationSources =
      concentrationSpellEffectSourcesDirectlyApplyingCondition(
        target,
        condition,
      );
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const combatantsWithTarget: ReadonlyMap<CombatantId, BattleCreatureState> =
      new Map(nextState.combatants).set(targetId, cleansedTarget);
    return {
      ...nextState,
      combatants: concentrationSources.reduce<
        ReadonlyMap<CombatantId, BattleCreatureState>
      >(
        (nextCombatants, source) =>
          combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
            nextCombatants,
            source,
          ),
        combatantsWithTarget,
      ),
    };
  }, state);
}

const DirectConditionRemovalInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directConditionRemoval"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    conditionChoices: Schema.Tuple([
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[0]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[1]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[2]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[3]),
    ]),
    rangeFeet: MovementFeet,
  }),
);
export const directConditionRemovalProfile: SpellProcedureDeclaration<
  "directConditionRemoval",
  DirectConditionRemovalInvocation
> = {
  procedure: "directConditionRemoval",
  executionSchema: DirectConditionRemovalInvocationSchema,
  admitMechanics: admitDirectConditionRemovalMechanics,
  discoverCastAct: discoverDirectConditionRemovalCastAct,
  resolve: resolveDirectConditionRemoval,
};
