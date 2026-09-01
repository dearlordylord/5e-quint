import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-make-stable
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAKE_STABLE_LIFECYCLE
//
// The makeStable Spell Procedure Profile: a cantrip-access spell (today Spare
// the Dying) that makes one zero-Hit-Point non-dead creature Stable.
//
// What lives here:
//   - admit()              - was supportedCantripMakeStableSpellProfile in
//                            spells-profiles.ts
//   - makeStableRangeFeet - was private to spells-profiles.ts
//   - discoverCastAct()    - was the generic single-target action-spell
//                            discovery path in spells-discovery.ts
//   - castSummary()        - was the makeStable branch in
//                            spells-discovery.ts:spellInvocationCastSummary
//                            spells-invocation-ref.ts
//   - resolve()            - was resolveMakeStableSpellAct in
//                            spells-resolve-support-effects.ts
//
// What stays in shared infrastructure:
//   - spellTargetIsLegal's zero-HP/non-dead target predicate remains in
//     spells-targeting.ts until target legality dispatch migrates to profiles.

import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import { movementFeet, MovementFeet, PositiveInteger } from "@dnd/shared/types";
import {
  isThresholdTierPointRange,
  type ActivationPhase,
  type CastingTime,
  type Components,
  type Duration,
  type EffectAtom,
  type Range,
  type SpellMechanics,
  type TargetSelection,
  type ThresholdTierPointRange,
} from "@dnd/surface/surface/types";
import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  cantripSpellAccessFor,
  spellAdmissionCharacterLevel,
} from "./profile.ts";
import { Schema } from "effect";
import {
  CantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type MakeStableInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "makeStable" }
>;
type MakeStableActivationPhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;
type MakeStableTargetSelection = Extract<
  TargetSelection,
  {
    readonly mode: "one";
    readonly stateFilter: readonly ["zero_hp_not_dead"];
  }
>;
type MakeStableRangeTier = ThresholdTierPointRange["feet"]["tiers"][number];
type MakeStableRangeFeet = ThresholdTierPointRange["feet"] & {
  readonly axis: "character";
};
type MakeStableComponents = Extract<Components, { readonly m: false }>;
type MakeStableDuration = Extract<Duration, { readonly kind: "instantaneous" }>;
type MakeStableCastingTime = Extract<CastingTime, { readonly kind: "action" }>;
type MakeStablePhase = Extract<ActivationPhase, { readonly kind: "direct" }>;
type MakeStableEffect = Extract<EffectAtom, { readonly kind: "make_stable" }>;

type MakeStableRange = Omit<ThresholdTierPointRange, "feet"> & {
  readonly feet: MakeStableRangeFeet;
};
type MakeStableMechanicsFacts = {
  readonly range: MakeStableRange;
};

export const MAKE_STABLE_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "phase",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "effects",
  "effect",
] as const;
type MakeStableFailedFact = (typeof MAKE_STABLE_FAILED_FACTS)[number];

type MakeStableMechanicsIssue = {
  readonly failedFact: MakeStableFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function makeStableRangeFeet(
  range: MakeStableRange,
  characterLevel: number,
): MovementFeet {
  return movementFeet(
    range.feet.tiers.reduce(
      (current, tier) =>
        characterLevel >= tier.atLevel ? tier.value : current,
      range.feet.base,
    ),
  );
}

function makeStableMechanicsIssueResult(issue: MakeStableMechanicsIssue): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "makeStable";
  readonly failedFact: MakeStableFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "makeStable",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported makeStable mechanics fact: ${issue.failedFact}.`,
  };
}

const MAKE_STABLE_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "stateFilter",
] as const satisfies ReadonlyArray<keyof MakeStableTargetSelection>;
const MAKE_STABLE_RANGE_FIELDS = [
  "kind",
  "feet",
] as const satisfies ReadonlyArray<keyof MakeStableRange>;
const MAKE_STABLE_RANGE_FEET_FIELDS = [
  "kind",
  "axis",
  "base",
  "tiers",
] as const satisfies ReadonlyArray<keyof MakeStableRangeFeet>;
const MAKE_STABLE_RANGE_TIER_FIELDS = [
  "atLevel",
  "value",
] as const satisfies ReadonlyArray<keyof MakeStableRangeTier>;
const MAKE_STABLE_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof MakeStableComponents>;
const MAKE_STABLE_DURATION_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof MakeStableDuration
>;
const MAKE_STABLE_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof MakeStableCastingTime>;
const MAKE_STABLE_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
] as const satisfies ReadonlyArray<keyof MakeStablePhase>;
const MAKE_STABLE_EFFECT_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof MakeStableEffect
>;

function isMakeStableRange(range: Range): range is MakeStableRange {
  return (
    isThresholdTierPointRange(range) &&
    spellMechanicsObjectHasOnlyKeys(range, MAKE_STABLE_RANGE_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      range.feet,
      MAKE_STABLE_RANGE_FEET_FIELDS,
    ) &&
    range.feet.axis === "character" &&
    range.feet.tiers.every((tier) =>
      spellMechanicsObjectHasOnlyKeys(tier, MAKE_STABLE_RANGE_TIER_FIELDS),
    )
  );
}

function makeStableSemanticPhase(phase: MakeStableActivationPhase): boolean {
  return (
    (phase.effects ?? []).some((effect) => effect.kind === "make_stable") ||
    (phase.attachment.kind === "hole" &&
      phase.attachment.value.kind === "target" &&
      "stateFilter" in phase.attachment.value.selection &&
      Array.isArray(phase.attachment.value.selection.stateFilter) &&
      sameStringSet(phase.attachment.value.selection.stateFilter, [
        "zero_hp_not_dead",
      ]))
  );
}

function makeStableSemanticCandidate(mechanics: SpellMechanics): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.phases.some(
      (phase) => phase.kind === "direct" && makeStableSemanticPhase(phase),
    )
  );
}

function makeStableDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.level === 0 &&
    mechanics.school === "necromancy" &&
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false &&
    mechanics.castingTime.kind === "action" &&
    mechanics.duration.kind === "instantaneous" &&
    isThresholdTierPointRange(mechanics.range) &&
    mechanics.range.feet.axis === "character"
  );
}

function makeStableMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
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

function admitMakeStableMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "makeStable",
  MakeStableMechanicsFacts,
  MakeStableInvocation,
  ReturnType<typeof makeStableMechanicsIssueResult>
> {
  if (
    !makeStableSemanticCandidate(source.mechanics) &&
    !makeStableDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }

  const mechanics = source.mechanics;
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "direct" && makeStableSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const issues: MakeStableMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: MakeStableFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 0) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "necromancy") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!isMakeStableRange(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      MAKE_STABLE_COMPONENT_FIELDS,
    ) ||
    "materialCostGp" in mechanics.components ||
    "materialConsumed" in mechanics.components
  ) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
    for (const branch of spellConsumedMaterialEvidencePaths(
      mechanics.components,
    )) {
      pushIssue("components", branch);
    }
  }
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      MAKE_STABLE_DURATION_FIELDS,
    )
  ) {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
      pushIssue("durationValue", path);
    }
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      pushIssue(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      );
    }
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      MAKE_STABLE_CASTING_TIME_FIELDS,
    )
  ) {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === directPhaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (directPhaseIndex < 0) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else if (directPhaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  if (phase === undefined) {
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
  } else {
    if (!spellMechanicsObjectHasOnlyKeys(phase, MAKE_STABLE_PHASE_FIELDS)) {
      pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
    }
    const targetAttachment = admitSpellTargetAttachment(
      phase.attachment,
      MAKE_STABLE_TARGET_SELECTION_FIELDS,
    );
    const selection =
      targetAttachment.tag === "admitted"
        ? targetAttachment.attachment.value.selection
        : undefined;
    const stateFilter =
      selection !== undefined &&
      "stateFilter" in selection &&
      Array.isArray(selection.stateFilter)
        ? selection.stateFilter
        : [];
    if (
      targetAttachment.tag === "rejected" ||
      selection?.mode !== "one" ||
      !sameStringSet(selection.targetKinds ?? [], ["creature"]) ||
      !sameStringSet(stateFilter, ["zero_hp_not_dead"])
    ) {
      pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
    }

    const effects = phase.effects ?? [];
    const makeStableIndex = effects.findIndex(
      (effect) => effect.kind === "make_stable",
    );
    if (effects.length !== 1) {
      if (effects.length === 0) {
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      }
      for (const [index] of effects.entries()) {
        if (index === makeStableIndex) continue;
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
      }
    }
    const makeStableEffect =
      makeStableIndex < 0 ? undefined : effects[makeStableIndex];
    if (
      makeStableEffect === undefined ||
      makeStableEffect.kind !== "make_stable" ||
      !spellMechanicsObjectHasOnlyKeys(
        makeStableEffect,
        MAKE_STABLE_EFFECT_FIELDS,
      )
    ) {
      pushIssue(
        "effect",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(makeStableIndex < 0 ? 1 : makeStableIndex + 1),
        ),
      );
    }
  }

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(makeStableMechanicsIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (phase === undefined || !isMakeStableRange(mechanics.range)) {
    return {
      tag: "unsupported",
      issues: [
        makeStableMechanicsIssueResult({
          failedFact: phase === undefined ? "phase" : "range",
          mechanicsPath:
            phase === undefined
              ? spellActivationPhasePath(phaseOrdinal)
              : spellMechanicsHeaderPath("range"),
        }),
      ],
    };
  }
  const facts = {
    range: mechanics.range,
  } satisfies MakeStableMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "makeStable",
      facts,
      evidence: makeStableMechanicsEvidence(mechanics, phaseOrdinal, phase),
      admit: (executionSource, ctx) =>
        admitMakeStable(executionSource, ctx, facts),
    },
  };
}

function admitMakeStable(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MakeStableMechanicsFacts,
): readonly MakeStableInvocation[] {
  return [
    {
      access: cantripSpellAccessFor(spell.castingSource),
      resource: { tag: "none" },
      procedure: "makeStable",
      spell,
      actionCost: "magicAction",
      rangeFeet: makeStableRangeFeet(
        facts.range,
        spellAdmissionCharacterLevel(ctx),
      ),
    },
  ];
}

function discoverMakeStableCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MakeStableInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveMakeStable(
  input: SpellProcedureProfileResolveInput<MakeStableInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Stable cantrips use one zero-Hit-Point target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelection = selectSingleSpellTarget({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    invalidTargetMessage:
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [targetSelection.targetId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const target = targetSelection.target;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const nextTarget = {
    ...target,
    zeroHpLifecycle: {
      ...target.zeroHpLifecycle,
      deathSaves: { ...resetDeathSaveRuntimeState(), stable: true },
    },
  };
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
  };
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

const MakeStableInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("makeStable"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    rangeFeet: MovementFeet,
  }),
);
export const makeStableProfile: SpellProcedureDeclaration<
  "makeStable",
  MakeStableInvocation,
  MakeStableMechanicsFacts,
  ReturnType<typeof makeStableMechanicsIssueResult>
> = {
  procedure: "makeStable",
  executionSchema: MakeStableInvocationSchema,
  admitMechanics: admitMakeStableMechanics,
  discoverCastAct: discoverMakeStableCastAct,
  resolve: resolveMakeStable,
};
