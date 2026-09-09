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
type MakeStablePhaseEffect = NonNullable<
  MakeStableActivationPhase["effects"]
>[number];

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
  if (mechanics.family !== "activation") return false;
  if (!isThresholdTierPointRange(mechanics.range)) return false;
  return [
    mechanics.level === 0,
    mechanics.school === "necromancy",
    mechanics.components.v === true,
    mechanics.components.s === true,
    mechanics.components.m === false,
    mechanics.castingTime.kind === "action",
    mechanics.duration.kind === "instantaneous",
    mechanics.range.feet.axis === "character",
  ].every(Boolean);
}

function makeStableMechanicsCandidate(mechanics: SpellMechanics): boolean {
  return (
    makeStableSemanticCandidate(mechanics) ||
    makeStableDistinctiveHeaderFallback(mechanics)
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

type MakeStableMechanicsInspection = SpellProcedureMechanicsInspection<
  "makeStable",
  MakeStableMechanicsFacts,
  MakeStableInvocation,
  ReturnType<typeof makeStableMechanicsIssueResult>
>;

type MakeStablePhaseInspection = Readonly<{
  directPhaseIndex: number;
  phaseOrdinal: ReturnType<typeof PositiveInteger>;
  phase: MakeStableActivationPhase | undefined;
}>;

function makeStablePhaseInspection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): MakeStablePhaseInspection {
  const semanticIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "direct" && makeStableSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticIndex >= 0
      ? semanticIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const inspectionIndex = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const inspectedPhase = mechanics.phases[inspectionIndex];
  return {
    directPhaseIndex,
    phaseOrdinal: PositiveInteger(inspectionIndex + 1),
    phase: inspectedPhase?.kind === "direct" ? inspectedPhase : undefined,
  };
}

function makeStableHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): MakeStableMechanicsIssue[] {
  const issues: MakeStableMechanicsIssue[] = [];
  if (mechanics.level !== 0)
    issues.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  if (mechanics.school !== "necromancy")
    issues.push({
      failedFact: "school",
      mechanicsPath: spellMechanicsHeaderPath("school"),
    });
  if (!isMakeStableRange(mechanics.range))
    issues.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  issues.push(
    ...makeStableComponentIssues(mechanics),
    ...makeStableDurationIssues(mechanics),
  );
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      MAKE_STABLE_CASTING_TIME_FIELDS,
    )
  )
    issues.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  return issues;
}

function makeStableComponentIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): MakeStableMechanicsIssue[] {
  if (
    [
      mechanics.components.v === true,
      mechanics.components.s === true,
      mechanics.components.m === false,
      spellMechanicsObjectHasOnlyKeys(
        mechanics.components,
        MAKE_STABLE_COMPONENT_FIELDS,
      ),
      !("materialCostGp" in mechanics.components),
      !("materialConsumed" in mechanics.components),
    ].every(Boolean)
  )
    return [];
  return [
    {
      failedFact: "components",
      mechanicsPath: spellMechanicsHeaderPath("components"),
    },
    ...spellConsumedMaterialEvidencePaths(mechanics.components).map(
      (mechanicsPath): MakeStableMechanicsIssue => ({
        failedFact: "components",
        mechanicsPath,
      }),
    ),
  ];
}

function makeStableDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): MakeStableMechanicsIssue[] {
  if (
    mechanics.duration.kind === "instantaneous" &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      MAKE_STABLE_DURATION_FIELDS,
    )
  )
    return [];
  return [
    {
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    },
    ...spellDurationValueEvidencePaths(mechanics.duration).map(
      (mechanicsPath): MakeStableMechanicsIssue => ({
        failedFact: "durationValue",
        mechanicsPath,
      }),
    ),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      (child): MakeStableMechanicsIssue => ({
        failedFact: spellDurationChildFailedFact(child),
        mechanicsPath: spellDurationChildPath(child),
      }),
    ),
  ];
}

function makeStablePhasePlacementIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  inspection: MakeStablePhaseInspection,
): MakeStableMechanicsIssue[] {
  const issues: MakeStableMechanicsIssue[] = [];
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === inspection.directPhaseIndex) continue;
      issues.push({
        failedFact: "phaseCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(index + 1)),
      });
    }
    if (mechanics.phases.length === 0)
      issues.push({
        failedFact: "phaseCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      });
  }
  if (inspection.directPhaseIndex < 0)
    issues.push({
      failedFact: "phase",
      mechanicsPath: spellActivationPhasePath(inspection.phaseOrdinal),
    });
  else if (inspection.directPhaseIndex !== 0)
    issues.push({
      failedFact: "phaseOrder",
      mechanicsPath: spellActivationPhasePath(inspection.phaseOrdinal),
    });
  return issues;
}

function makeStableAttachmentIssues(
  phase: MakeStableActivationPhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): MakeStableMechanicsIssue[] {
  const targetAttachment = admitSpellTargetAttachment(
    phase.attachment,
    MAKE_STABLE_TARGET_SELECTION_FIELDS,
  );
  if (targetAttachment.tag === "rejected")
    return [
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(phaseOrdinal),
      },
    ];
  const selection = targetAttachment.attachment.value.selection;
  const stateFilter =
    "stateFilter" in selection && Array.isArray(selection.stateFilter)
      ? selection.stateFilter
      : [];
  if (
    [
      selection.mode === "one",
      sameStringSet(selection.targetKinds ?? [], ["creature"]),
      sameStringSet(stateFilter, ["zero_hp_not_dead"]),
    ].every(Boolean)
  )
    return [];
  return [
    {
      failedFact: "attachment",
      mechanicsPath: spellActivationAttachmentPath(phaseOrdinal),
    },
  ];
}

function makeStableExtraEffectIssues(
  effects: readonly MakeStablePhaseEffect[],
  makeStableIndex: number,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): MakeStableMechanicsIssue[] {
  if (effects.length === 1) return [];
  const issues: MakeStableMechanicsIssue[] = [];
  if (effects.length === 0)
    issues.push({
      failedFact: "effects",
      mechanicsPath: spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(1),
      ),
    });
  for (const [index] of effects.entries()) {
    if (index === makeStableIndex) continue;
    issues.push({
      failedFact: "effects",
      mechanicsPath: spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(index + 1),
      ),
    });
  }
  return issues;
}

function makeStableRequiredEffectIssue(
  effects: readonly MakeStablePhaseEffect[],
  makeStableIndex: number,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): MakeStableMechanicsIssue[] {
  const effect = makeStableIndex < 0 ? undefined : effects[makeStableIndex];
  if (
    effect !== undefined &&
    effect.kind === "make_stable" &&
    spellMechanicsObjectHasOnlyKeys(effect, MAKE_STABLE_EFFECT_FIELDS)
  )
    return [];
  return [
    {
      failedFact: "effect",
      mechanicsPath: spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(makeStableIndex < 0 ? 1 : makeStableIndex + 1),
      ),
    },
  ];
}

function makeStableEffectIssues(
  phase: MakeStableActivationPhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): MakeStableMechanicsIssue[] {
  const effects = phase.effects ?? [];
  const makeStableIndex = effects.findIndex(
    (effect) => effect.kind === "make_stable",
  );
  return [
    ...makeStableExtraEffectIssues(effects, makeStableIndex, phaseOrdinal),
    ...makeStableRequiredEffectIssue(effects, makeStableIndex, phaseOrdinal),
  ];
}

function makeStablePhaseIssues(
  inspection: MakeStablePhaseInspection,
): MakeStableMechanicsIssue[] {
  const phase = inspection.phase;
  if (phase === undefined)
    return [
      {
        failedFact: "phase",
        mechanicsPath: spellActivationPhasePath(inspection.phaseOrdinal),
      },
    ];
  const issues: MakeStableMechanicsIssue[] = [];
  if (!spellMechanicsObjectHasOnlyKeys(phase, MAKE_STABLE_PHASE_FIELDS))
    issues.push({
      failedFact: "phase",
      mechanicsPath: spellActivationPhasePath(inspection.phaseOrdinal),
    });
  return [
    ...issues,
    ...makeStableAttachmentIssues(phase, inspection.phaseOrdinal),
    ...makeStableEffectIssues(phase, inspection.phaseOrdinal),
  ];
}

function admitMakeStableMechanics(
  source: SpellMechanicsAdmissionSource,
): MakeStableMechanicsInspection {
  if (!makeStableMechanicsCandidate(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }

  const mechanics = source.mechanics;
  const phaseInspection = makeStablePhaseInspection(mechanics);
  const issues = [
    ...makeStableHeaderIssues(mechanics),
    ...makeStablePhasePlacementIssues(mechanics, phaseInspection),
    ...makeStablePhaseIssues(phaseInspection),
  ];

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(makeStableMechanicsIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    phaseInspection.phase === undefined ||
    !isMakeStableRange(mechanics.range)
  ) {
    return {
      tag: "unsupported",
      issues: [
        makeStableMechanicsIssueResult({
          failedFact: phaseInspection.phase === undefined ? "phase" : "range",
          mechanicsPath:
            phaseInspection.phase === undefined
              ? spellActivationPhasePath(phaseInspection.phaseOrdinal)
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
      evidence: makeStableMechanicsEvidence(
        mechanics,
        phaseInspection.phaseOrdinal,
        phaseInspection.phase,
      ),
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
