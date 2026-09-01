import { spellInvocationResourceForCastOption } from "./profile.ts";
import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-blur-attack-roll-defense
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
//
// The perceptionGatedAttackRollDefense Spell Procedure Profile: a prepared action spell
// that creates a concentration self Spell Effect imposing Disadvantage on
// Attack Rolls against the caster unless the attacker perceives them with
// Blindsight or Truesight.
//
// What lives here:
//   - admit()           - was supportedPreparedPerceptionGatedAttackRollDefenseSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the perceptionGatedAttackRollDefense branch in
//                         spells-discovery.ts
//   - castSummary()     - was the perceptionGatedAttackRollDefense branch in
//                         spells-discovery.ts
//                         spells-invocation-ref.ts
//   - resolve()         - was resolvePerceptionGatedAttackRollDefenseSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyPerceptionGatedAttackRollDefenseSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Attack Roll Disadvantage projection and Blindsight/Truesight bypass
//     witnesses stay in attack-roll.ts.
//   - Concentration cleanup stays in the shared active-effect lifecycle.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type PerceptionGatedAttackRollDefenseSpellInvocation,
} from "../../battle-state-execution.ts";
import { PositiveInteger } from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  CastingTime,
  Components,
  Duration,
  EffectAtom,
  Range,
  SpellLevel,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { type CombatantId } from "../../identity.ts";
import { PerceptionGatedAttackRollDefenseTemplateSchema } from "../../active-effect/codecs.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
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
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type PerceptionGatedAttackRollDefenseRange = Extract<
  Range,
  { readonly kind: "self" }
>;
type PerceptionGatedAttackRollDefensePhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;
type PerceptionGatedAttackRollDefenseDuration = Extract<
  Duration,
  { readonly kind: "concentration" }
> & {
  readonly upTo: SpellCanonicalDurationValue & {
    readonly unit: "minute";
    readonly amount: 1;
  };
};
type PerceptionGatedAttackRollDefenseMechanicsFacts = {
  readonly level: SpellLevel;
  readonly duration: PerceptionGatedAttackRollDefenseDuration;
};

export const PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_FAILED_FACTS = [
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
type PerceptionGatedAttackRollDefenseFailedFact =
  (typeof PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_FAILED_FACTS)[number];

type PerceptionGatedAttackRollDefenseMechanicsIssue = {
  readonly failedFact: PerceptionGatedAttackRollDefenseFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type PerceptionGatedComponents = Extract<Components, { readonly m: false }>;
type PerceptionGatedCastingTime = Extract<
  CastingTime,
  { readonly kind: "action" }
>;
type PerceptionGatedPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
>;
type PerceptionGatedAttachment = Extract<Attachment, { readonly kind: "self" }>;
type PerceptionGatedEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;

const PERCEPTION_GATED_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
] as const satisfies ReadonlyArray<keyof PerceptionGatedPhase>;
const PERCEPTION_GATED_ATTACHMENT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PerceptionGatedAttachment>;
const PERCEPTION_GATED_EFFECT_FIELDS = [
  "kind",
  "mode",
  "affects",
  "on",
] as const satisfies ReadonlyArray<keyof PerceptionGatedEffect>;
const PERCEPTION_GATED_RANGE_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof PerceptionGatedAttackRollDefenseRange
>;
const PERCEPTION_GATED_DURATION_FIELDS = [
  "kind",
  "upTo",
] as const satisfies ReadonlyArray<
  keyof PerceptionGatedAttackRollDefenseDuration
>;
const PERCEPTION_GATED_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
] as const satisfies ReadonlyArray<
  keyof PerceptionGatedAttackRollDefenseDuration["upTo"]
>;
const PERCEPTION_GATED_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof PerceptionGatedComponents>;
const PERCEPTION_GATED_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof PerceptionGatedCastingTime>;

function perceptionGatedAttackRollDefenseShape(
  actorId: CombatantId,
  duration: PerceptionGatedAttackRollDefenseMechanicsFacts["duration"],
): Pick<
  PerceptionGatedAttackRollDefenseSpellInvocation,
  "activeEffect"
> | null {
  const expiresAt = scalarBuffActiveEffectExpiration(actorId, duration);
  return expiresAt?.kind === "concentration"
    ? {
        activeEffect: {
          kind: "perceptionGatedAttackRollDefense",
          sourceCombatantId: actorId,
          expiresAt,
        },
      }
    : null;
}

function admitPerceptionGatedAttackRollDefense(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: PerceptionGatedAttackRollDefenseMechanicsFacts,
): readonly PerceptionGatedAttackRollDefenseSpellInvocation[] {
  const shape = perceptionGatedAttackRollDefenseShape(
    ctx.actor.combatantId,
    facts.duration,
  );
  if (shape === null) return [];
  return ctx.spellCastOptions.flatMap(
    (slot): readonly PerceptionGatedAttackRollDefenseSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "perceptionGatedAttackRollDefense",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function perceptionGatedAttackRollDefenseSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        perceptionGatedAttackRollDefenseSemanticPhase(phase),
    )
  );
}

function perceptionGatedAttackRollDefenseSemanticPhase(
  phase: PerceptionGatedAttackRollDefensePhase,
): boolean {
  return (
    phase.attachment.kind === "self" &&
    (phase.effects ?? []).some(
      (effect) =>
        effect.kind === "modify_roll_advantage" &&
        effect.mode === "disadvantage" &&
        sameStringSet(effect.on, ["attack_roll"]),
    )
  );
}

function perceptionGatedAttackRollDefenseDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.level === 2 &&
    mechanics.school === "illusion" &&
    mechanics.components.v === true &&
    mechanics.components.s === false &&
    mechanics.components.m === false &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "self" &&
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount === 1
  );
}

function perceptionGatedAttackRollDefenseIssueResult(
  issue: PerceptionGatedAttackRollDefenseMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "perceptionGatedAttackRollDefense";
  readonly failedFact: PerceptionGatedAttackRollDefenseFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "perceptionGatedAttackRollDefense",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported perceptionGatedAttackRollDefense mechanics fact: ${issue.failedFact}.`,
  };
}

function isPerceptionGatedRange(
  range: Range,
): range is PerceptionGatedAttackRollDefenseRange {
  return (
    range.kind === "self" &&
    spellMechanicsObjectHasOnlyKeys(range, PERCEPTION_GATED_RANGE_FIELDS)
  );
}

function isPerceptionGatedDuration(
  duration: Duration,
): duration is PerceptionGatedAttackRollDefenseDuration {
  return (
    duration.kind === "concentration" &&
    spellMechanicsObjectHasOnlyKeys(
      duration,
      PERCEPTION_GATED_DURATION_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.upTo,
      PERCEPTION_GATED_DURATION_VALUE_FIELDS,
    ) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(duration.upTo)
  );
}

function perceptionGatedAttackRollDefenseMechanicsEvidence(
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

function admitPerceptionGatedAttackRollDefenseMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "perceptionGatedAttackRollDefense",
  PerceptionGatedAttackRollDefenseMechanicsFacts,
  PerceptionGatedAttackRollDefenseSpellInvocation,
  ReturnType<typeof perceptionGatedAttackRollDefenseIssueResult>
> {
  if (
    !perceptionGatedAttackRollDefenseSemanticCandidate(source.mechanics) &&
    !perceptionGatedAttackRollDefenseDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      perceptionGatedAttackRollDefenseSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const issues: PerceptionGatedAttackRollDefenseMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: PerceptionGatedAttackRollDefenseFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 2) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "illusion") {
    pushIssue("school", spellMechanicsHeaderPath("school"));
  }
  if (!isPerceptionGatedRange(mechanics.range)) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== false ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      PERCEPTION_GATED_COMPONENT_FIELDS,
    ) ||
    ("materialCostGp" in mechanics.components &&
      mechanics.components.materialCostGp !== undefined) ||
    ("materialConsumed" in mechanics.components &&
      mechanics.components.materialConsumed === true)
  ) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(
      mechanics.components,
    )) {
      pushIssue("components", path);
    }
  }
  if (!isPerceptionGatedDuration(mechanics.duration)) {
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
      PERCEPTION_GATED_CASTING_TIME_FIELDS,
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
    if (
      !spellMechanicsObjectHasOnlyKeys(phase, PERCEPTION_GATED_PHASE_FIELDS)
    ) {
      pushIssue("phase", spellActivationPhasePath(phaseOrdinal));
    }
    if (
      phase.attachment.kind !== "self" ||
      !spellMechanicsObjectHasOnlyKeys(
        phase.attachment,
        PERCEPTION_GATED_ATTACHMENT_FIELDS,
      )
    ) {
      pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
    }
    const effects = phase.effects ?? [];
    const effectIndex = effects.findIndex(
      (effect) => effect.kind === "modify_roll_advantage",
    );
    if (effects.length !== 1) {
      if (effects.length === 0) {
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        );
      }
      for (const [index] of effects.entries()) {
        if (index === effectIndex) continue;
        pushIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
      }
    }
    const effect = effectIndex < 0 ? undefined : effects[effectIndex];
    if (
      effect?.kind !== "modify_roll_advantage" ||
      effect.mode !== "disadvantage" ||
      ("affects" in effect && effect.affects !== "rolls_against_self") ||
      !sameStringSet(effect.on, ["attack_roll"]) ||
      !spellMechanicsObjectHasOnlyKeys(effect, PERCEPTION_GATED_EFFECT_FIELDS)
    ) {
      pushIssue(
        "effect",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(effectIndex < 0 ? 1 : effectIndex + 1),
        ),
      );
    }
  }

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      perceptionGatedAttackRollDefenseIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (!isPerceptionGatedRange(mechanics.range)) {
    return {
      tag: "unsupported",
      issues: [
        perceptionGatedAttackRollDefenseIssueResult({
          failedFact: "range",
          mechanicsPath: spellMechanicsHeaderPath("range"),
        }),
      ],
    };
  }
  if (!isPerceptionGatedDuration(mechanics.duration)) {
    return {
      tag: "unsupported",
      issues: [
        perceptionGatedAttackRollDefenseIssueResult({
          failedFact: "duration",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        }),
      ],
    };
  }
  if (phase === undefined) {
    return {
      tag: "unsupported",
      issues: [
        perceptionGatedAttackRollDefenseIssueResult({
          failedFact: "phase",
          mechanicsPath: spellActivationPhasePath(phaseOrdinal),
        }),
      ],
    };
  }
  const facts = {
    level: mechanics.level,
    duration: mechanics.duration,
  } satisfies PerceptionGatedAttackRollDefenseMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "perceptionGatedAttackRollDefense",
      facts,
      evidence: perceptionGatedAttackRollDefenseMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        phase,
      ),
      admit: (executionSource, ctx) =>
        admitPerceptionGatedAttackRollDefense(executionSource, ctx, facts),
    },
  };
}

function discoverPerceptionGatedAttackRollDefenseCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PerceptionGatedAttackRollDefenseSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyPerceptionGatedAttackRollDefenseEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PerceptionGatedAttackRollDefenseSpellInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "perceptionGatedAttackRollDefense" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolvePerceptionGatedAttackRollDefense(
  input: SpellProcedureProfileResolveInput<PerceptionGatedAttackRollDefenseSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "temporary attack-roll disadvantage uses no target, roll, damage, or selection fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyPerceptionGatedAttackRollDefenseEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const PerceptionGatedAttackRollDefenseInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("perceptionGatedAttackRollDefense"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: PerceptionGatedAttackRollDefenseTemplateSchema,
    }),
  );
export const perceptionGatedAttackRollDefenseProfile: SpellProcedureDeclaration<
  "perceptionGatedAttackRollDefense",
  PerceptionGatedAttackRollDefenseSpellInvocation,
  PerceptionGatedAttackRollDefenseMechanicsFacts,
  ReturnType<typeof perceptionGatedAttackRollDefenseIssueResult>
> = {
  procedure: "perceptionGatedAttackRollDefense",
  executionSchema: PerceptionGatedAttackRollDefenseInvocationSchema,
  admitMechanics: admitPerceptionGatedAttackRollDefenseMechanics,
  discoverCastAct: discoverPerceptionGatedAttackRollDefenseCastAct,
  resolve: resolvePerceptionGatedAttackRollDefense,
};
