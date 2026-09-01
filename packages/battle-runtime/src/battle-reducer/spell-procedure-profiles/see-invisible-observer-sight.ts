import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-see-invisible-observer-sight
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
//
// The seeInvisibleObserverSight Spell Procedure Profile: a prepared action
// spell that creates a timed self Spell Effect letting the caster see
// Invisible creatures and objects and into the Ethereal Plane.
//
// What lives here:
//   - admit()           - was supportedPreparedSeeInvisibleObserverSightSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the seeInvisibleObserverSight branch in
//                         spells-discovery.ts
//   - castSummary()     - was the seeInvisibleObserverSight branch in
//                         spells-discovery.ts
//   - resolve()         - was resolveSeeInvisibleObserverSightSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applySeeInvisibleObserverSightSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Observer-scoped visibility witnesses stay with the sight/visibility
//     query helpers and active-effect readers.
//   - Duration expiry stays in the shared active-effect lifecycle.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { PositiveInteger } from "@dnd/shared/types";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
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
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";

type SeeInvisibleObserverSightSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "seeInvisibleObserverSight" }
>;

type SeeInvisibleObserverSightFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "phaseCount"
  | "attachment"
  | "effect";
type SeeInvisibleObserverSightMechanicsFacts = SpellProcedureMechanicsFacts;
type SeeInvisibleObserverSightAdmissionIssue = SpellProcedureAdmissionIssue<
  "seeInvisibleObserverSight",
  SeeInvisibleObserverSightFailedFact,
  SpellMechanicsBranchPath
>;

const SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL = 2;

type SeeInvisibleDirectPhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;
type SeeInvisibleSightEffectOccurrence = {
  readonly phase: SeeInvisibleDirectPhase;
  readonly phaseIndex: number;
  readonly effectIndex: number;
};

function seeInvisibleSightEffectOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly SeeInvisibleSightEffectOccurrence[] {
  return mechanics.phases.flatMap((phase, phaseIndex) => {
    if (phase.kind !== "direct") return [];
    return (phase.effects ?? []).flatMap((effect, effectIndex) =>
      effect.kind === "see_invisible_and_ethereal"
        ? [{ phase, phaseIndex, effectIndex }]
        : [],
    );
  });
}

function isSeeInvisibleObserverSightRepresentation(
  mechanics: SpellMechanicsAdmissionSource["mechanics"],
): mechanics is Extract<
  SpellMechanicsAdmissionSource["mechanics"],
  { readonly family: "activation" }
> {
  if (mechanics.family !== "activation") return false;
  const hasDirectPhase = mechanics.phases.some(
    (phase) => phase.kind === "direct",
  );
  const hasSightEffect =
    seeInvisibleSightEffectOccurrences(mechanics).length > 0;
  if (!hasSightEffect) return false;
  const hasExpectedDuration =
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "hour";
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses: [
      mechanics.level === SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL,
      mechanics.range.kind === "self",
      hasExpectedDuration,
      hasDirectPhase,
      hasSightEffect,
    ],
  });
}

function seeInvisibleObserverSightIssue(
  failedFact: SeeInvisibleObserverSightFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SeeInvisibleObserverSightAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "seeInvisibleObserverSight",
    failedFact,
    mechanicsPath,
    message: `Unsupported seeInvisibleObserverSight mechanics fact: ${failedFact}.`,
  };
}

function seeInvisibleObserverSightMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "seeInvisibleObserverSight",
  SeeInvisibleObserverSightMechanicsFacts,
  SeeInvisibleObserverSightSpellInvocation,
  SeeInvisibleObserverSightAdmissionIssue
> {
  if (!isSeeInvisibleObserverSightRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const expected = seeInvisibleSightEffectOccurrences(mechanics)[0];
  const fallbackPhaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "direct",
  );
  const phaseIndex = expected?.phaseIndex ?? fallbackPhaseIndex;
  const phaseOrdinal = PositiveInteger(phaseIndex < 0 ? 1 : phaseIndex + 1);
  const phase = phaseIndex < 0 ? undefined : mechanics.phases[phaseIndex];
  const issues: Array<{
    readonly failedFact: SeeInvisibleObserverSightFailedFact;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }> = [];
  const pushIssue = (
    failedFact: SeeInvisibleObserverSightFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.level !== SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.duration.kind !== "timed" ||
    mechanics.duration.value.unit !== "hour" ||
    mechanics.duration.value.amount !== 1
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const mechanicsPath of persistentAreaDurationChildPaths(
    mechanics.duration,
  )) {
    pushIssue("duration", mechanicsPath);
  }
  if (mechanics.phases.length !== 1 || phaseIndex !== 0) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (phase?.kind !== "direct" || phase.attachment.kind !== "self") {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const selectedEffectIndex =
    expected?.phaseIndex === phaseIndex ? expected.effectIndex : 0;
  if (effects.length === 0) {
    pushIssue(
      "effect",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  } else {
    for (const [index] of effects.entries()) {
      if (index === selectedEffectIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
  }
  if (effects[selectedEffectIndex]?.kind !== "see_invisible_and_ethereal") {
    pushIssue(
      "effect",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(selectedEffectIndex + 1),
      ),
    );
  }
  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          seeInvisibleObserverSightIssue(failedFact, mechanicsPath),
      ),
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
  } satisfies SeeInvisibleObserverSightMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "seeInvisibleObserverSight",
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
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitSeeInvisibleObserverSight(executionSource, ctx, facts),
    },
  };
}

const SeeInvisibleAndEtherealEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("seeInvisibleAndEthereal"),
  sourceCombatantId: CombatantId,
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});

function admitSeeInvisibleObserverSight(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SeeInvisibleObserverSightMechanicsFacts,
): readonly SeeInvisibleObserverSightSpellInvocation[] {
  if (facts.duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    facts.duration.value,
  );
  if (Result.isFailure(durationTicks)) return [];
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SeeInvisibleObserverSightSpellInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "seeInvisibleObserverSight",
              spell,
              actionCost: "magicAction",
              activeEffect: {
                kind: "seeInvisibleAndEthereal",
                sourceCombatantId: ctx.actor.combatantId,
                expiresAt: {
                  kind: "duration",
                  durationTicks: durationTicks.success,
                },
              },
            },
          ],
  );
}

function discoverSeeInvisibleObserverSightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SeeInvisibleObserverSightSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applySeeInvisibleObserverSightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SeeInvisibleObserverSightSpellInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "seeInvisibleAndEthereal" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveSeeInvisibleObserverSight(
  input: SpellProcedureProfileResolveInput<SeeInvisibleObserverSightSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "concealment-visibility override uses no target, roll, damage, or selection fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applySeeInvisibleObserverSightEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const SeeInvisibleObserverSightInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("seeInvisibleObserverSight"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: SeeInvisibleAndEtherealEffectSchema,
  }),
);
export const seeInvisibleObserverSightProfile: SpellProcedureDeclaration<
  "seeInvisibleObserverSight",
  SeeInvisibleObserverSightSpellInvocation,
  SeeInvisibleObserverSightMechanicsFacts,
  SeeInvisibleObserverSightAdmissionIssue
> = {
  procedure: "seeInvisibleObserverSight",
  executionSchema: SeeInvisibleObserverSightInvocationSchema,
  admitMechanics: seeInvisibleObserverSightMechanicsAdmission,
  discoverCastAct: discoverSeeInvisibleObserverSightCastAct,
  resolve: resolveSeeInvisibleObserverSight,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
