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
  isSpellCanonicalDurationValue,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasCompleteSignature,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationExtensionPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
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
type DirectConditionActivationMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type DirectConditionCastingTime = Extract<
  DirectConditionActivationMechanics["castingTime"],
  { readonly kind: "action" }
>;
type DirectConditionConcentrationDuration = Extract<
  SpellDefinitionRuleFacts["duration"],
  { readonly kind: "concentration" }
>;
type DirectConditionDuration = DirectConditionConcentrationDuration & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly unit: "hour";
    readonly amount: 1;
  };
};
type DirectConditionDurationEnding = NonNullable<
  DirectConditionDuration["earlyEnd"]
>[number];
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
const DIRECT_CONDITION_ROOT_KEYS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof DirectConditionActivationMechanics>;
const DIRECT_CONDITION_CASTING_TIME_KEYS = [
  "kind",
] as const satisfies ReadonlyArray<keyof DirectConditionCastingTime>;
const DIRECT_CONDITION_RANGE_KEYS = ["kind"] as const satisfies ReadonlyArray<
  keyof DirectConditionRange
>;
const DIRECT_CONDITION_COMPONENT_KEYS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const DIRECT_CONDITION_DURATION_KEYS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const satisfies ReadonlyArray<keyof DirectConditionDuration>;
const DIRECT_CONDITION_DURATION_VALUE_KEYS = [
  "amount",
  "unit",
  "upcastTiers",
] as const satisfies ReadonlyArray<keyof DirectConditionDuration["upTo"]>;
const DIRECT_CONDITION_DURATION_END_KEYS = [
  "kind",
] as const satisfies ReadonlyArray<keyof DirectConditionDurationEnding>;

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

function directConditionRootIsClosed(
  mechanics: DirectConditionActivationMechanics,
): boolean {
  return spellMechanicsObjectHasOnlyKeys(mechanics, DIRECT_CONDITION_ROOT_KEYS);
}

function directConditionCastingTimeIsSupported(
  castingTime: DirectConditionActivationMechanics["castingTime"],
): castingTime is DirectConditionCastingTime {
  return (
    castingTime.kind === "action" &&
    spellMechanicsObjectHasOnlyKeys(
      castingTime,
      DIRECT_CONDITION_CASTING_TIME_KEYS,
    )
  );
}

function directConditionRangeIsSupported(
  range: SpellMechanics["range"],
): range is DirectConditionRange {
  return (
    range.kind === "touch" &&
    spellMechanicsObjectHasOnlyKeys(range, DIRECT_CONDITION_RANGE_KEYS)
  );
}

function directConditionComponentsAreSupported(
  components: SpellMechanics["components"],
): boolean {
  return (
    components.v === true &&
    components.s === true &&
    typeof components.m === "string" &&
    spellMechanicsObjectHasOnlyKeys(components, DIRECT_CONDITION_COMPONENT_KEYS)
  );
}

type DirectConditionEndingsInspection =
  | { readonly tag: "supported" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly DirectConditionMechanicsIssue[];
    };

function inspectDirectConditionEndings(
  duration: DirectConditionConcentrationDuration,
): DirectConditionEndingsInspection {
  const endings = duration.earlyEnd ?? [];
  const seenEndKinds = new Set<string>();
  const issues: DirectConditionMechanicsIssue[] = [];
  for (const [index, ending] of endings.entries()) {
    const expectedKind = DIRECT_CONDITION_EARLY_END_KINDS.some(
      (candidate) => candidate === ending.kind,
    );
    const duplicateKind = seenEndKinds.has(ending.kind);
    if (expectedKind && !duplicateKind) seenEndKinds.add(ending.kind);
    if (
      !expectedKind ||
      duplicateKind ||
      !spellMechanicsObjectHasOnlyKeys(
        ending,
        DIRECT_CONDITION_DURATION_END_KEYS,
      )
    ) {
      issues.push({
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(index + 1)),
      });
    }
  }
  if (
    DIRECT_CONDITION_EARLY_END_KINDS.some(
      (expectedKind) => !seenEndKinds.has(expectedKind),
    )
  ) {
    issues.push({
      failedFact: "durationEnding",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    });
  }
  if (duration.permanentIfMaintainedFull === true) {
    issues.push({
      failedFact: "durationEnding",
      mechanicsPath: spellDurationEndingPath(
        PositiveInteger(endings.length + 1),
      ),
    });
  }
  return issues.length === 0
    ? { tag: "supported" }
    : { tag: "unsupported", issues };
}

function directConditionDurationIsSupported(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is DirectConditionDuration {
  if (duration.kind !== "concentration") return false;
  return (
    duration.upTo.unit === "hour" &&
    duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    spellMechanicsObjectHasOnlyKeys(duration, DIRECT_CONDITION_DURATION_KEYS) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      DIRECT_CONDITION_DURATION_VALUE_KEYS,
    ) &&
    inspectDirectConditionEndings(duration).tag === "supported" &&
    duration.upTo.upcastTiers === undefined
  );
}

function directConditionCharacteristicPhaseIndex(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): number {
  return mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      (phase.effects ?? []).some(
        (effect) =>
          effect.kind === "apply_condition" && effect.condition === "invisible",
      ),
  );
}

function directConditionIndependentEnvelopePhaseIndex(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): number {
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return -1;
  return spellProcedureHasCompleteSignature([
    { name: "singlePhase", present: mechanics.phases.length === 1 },
    { name: "level", present: mechanics.level === 2 },
    { name: "school", present: mechanics.school === "illusion" },
    { name: "root", present: directConditionRootIsClosed(mechanics) },
    {
      name: "castingTime",
      present: directConditionCastingTimeIsSupported(mechanics.castingTime),
    },
    {
      name: "range",
      present: directConditionRangeIsSupported(mechanics.range),
    },
    {
      name: "components",
      present: directConditionComponentsAreSupported(mechanics.components),
    },
    {
      name: "duration",
      present: directConditionDurationIsSupported(mechanics.duration),
    },
  ])
    ? 0
    : -1;
}

function admitDirectCondition(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DirectConditionMechanicsFacts,
): readonly DirectConditionInvocation[] {
  const durationTicks = spellDurationTicksFromCanonicalValue(
    facts.duration.upTo,
  );
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

export const DIRECT_CONDITION_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "components",
  "castingTime",
  "range",
  "duration",
  "durationValue",
  "durationExtension",
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
  readonly mechanicsPath: UnitMechanicsPath;
};

function directConditionIssueResult(issue: DirectConditionMechanicsIssue): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "directCondition";
  readonly failedFact: DirectConditionFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
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
    directConditionRootIsClosed(mechanics),
    mechanics.level === 2,
    mechanics.school === "illusion",
    directConditionComponentsAreSupported(mechanics.components),
    directConditionCastingTimeIsSupported(mechanics.castingTime),
    directConditionRangeIsSupported(mechanics.range),
    directConditionDurationIsSupported(mechanics.duration),
  ];
  const representationWitnessCount =
    representationWitnesses.filter(Boolean).length;
  const representationMismatchCount =
    representationWitnesses.length - representationWitnessCount;
  const hasToleratedRepresentationMismatches =
    representationMismatchCount <=
    DIRECT_CONDITION_MAX_TOLERATED_REPRESENTATION_MISMATCHES;
  const range = directConditionRangeIsSupported(mechanics.range)
    ? mechanics.range
    : null;
  const duration = directConditionDurationIsSupported(mechanics.duration)
    ? mechanics.duration
    : null;
  const characteristicPhaseIndex =
    directConditionCharacteristicPhaseIndex(mechanics);
  const phaseIndex =
    characteristicPhaseIndex >= 0
      ? characteristicPhaseIndex
      : directConditionIndependentEnvelopePhaseIndex(mechanics);
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  if (
    phase?.kind !== "direct" ||
    (characteristicPhaseIndex >= 0 && !hasToleratedRepresentationMismatches)
  ) {
    return { tag: "notRepresented" };
  }
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const issues: DirectConditionMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: DirectConditionFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (!directConditionRootIsClosed(mechanics)) {
    pushIssue("mechanics", spellMechanicsRootPath());
  }
  if (mechanics.level !== 2) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "illusion") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!directConditionComponentsAreSupported(mechanics.components)) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
  }
  if (!directConditionCastingTimeIsSupported(mechanics.castingTime)) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (!directConditionRangeIsSupported(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      pushIssue("duration", path);
    }
  } else {
    if (
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.duration,
        DIRECT_CONDITION_DURATION_KEYS,
      )
    ) {
      pushIssue("duration", spellMechanicsHeaderPath("duration"));
    }
    if (
      mechanics.duration.upTo.unit !== "hour" ||
      mechanics.duration.upTo.amount !== 1 ||
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.duration.upTo,
        DIRECT_CONDITION_DURATION_VALUE_KEYS,
      )
    ) {
      pushIssue("durationValue", spellDurationValuePath());
    }
    for (const [index] of (
      mechanics.duration.upTo.upcastTiers ?? []
    ).entries()) {
      pushIssue(
        "durationExtension",
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      );
    }
    const endingsInspection = inspectDirectConditionEndings(mechanics.duration);
    if (endingsInspection.tag === "unsupported") {
      for (const issue of endingsInspection.issues) {
        pushIssue(issue.failedFact, issue.mechanicsPath);
      }
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
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
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
  DirectConditionInvocation,
  DirectConditionMechanicsFacts
> = {
  procedure: "directCondition",
  executionSchema: DirectConditionInvocationSchema,
  admitMechanics: admitDirectConditionMechanics,
  discoverCastAct: discoverDirectConditionCastAct,
  resolve: resolveDirectCondition,
};
