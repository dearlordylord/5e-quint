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

import { PositiveInteger } from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import type {
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  BattleState,
  SupportedSpellInvocation,
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
  isSpellCanonicalDurationValue,
  spellDurationTicksFromCanonicalValue,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureHasCompleteSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellCanonicalDurationValue,
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
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
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
  | "effect"
  | "mode";
type SeeInvisibleObserverSightDuration = Extract<
  SpellProcedureMechanicsFacts["duration"],
  { readonly kind: "timed" }
> & { readonly value: SpellCanonicalDurationValue };
type SeeInvisibleObserverSightMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "range" | "duration"
> & {
  readonly range: Extract<
    SpellProcedureMechanicsFacts["range"],
    { readonly kind: "self" }
  >;
  readonly duration: SeeInvisibleObserverSightDuration;
  readonly durationTicks: ElapsedTimeTicks;
};
type SeeInvisibleObserverSightAdmissionIssue = SpellProcedureAdmissionIssue<
  "seeInvisibleObserverSight",
  SeeInvisibleObserverSightFailedFact,
  UnitMechanicsPath
>;

const SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL = 2;

type SeeInvisibleDirectPhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;
type SeeInvisiblePhaseOccurrence = {
  readonly phase: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["phases"][number];
  readonly ordinal: PositiveInteger;
};
type SeeInvisibleSightEffectOccurrence = {
  readonly phase: SeeInvisibleDirectPhase;
  readonly phaseOrdinal: PositiveInteger;
  readonly effectOrdinal: PositiveInteger;
};

function isSeeInvisibleObserverSightDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): duration is SeeInvisibleObserverSightDuration {
  return (
    duration.kind === "timed" && isSpellCanonicalDurationValue(duration.value)
  );
}

function seeInvisiblePhaseOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly SeeInvisiblePhaseOccurrence[] {
  return mechanics.phases.map((phase, index) => ({
    phase,
    ordinal: PositiveInteger(index + 1),
  }));
}

function seeInvisibleSightEffectOccurrences(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly SeeInvisibleSightEffectOccurrence[] {
  return seeInvisiblePhaseOccurrences(mechanics).flatMap(
    ({ phase, ordinal: phaseOrdinal }) => {
      if (phase.kind !== "direct") return [];
      return (phase.effects ?? []).flatMap((effect, effectIndex) =>
        effect.kind === "see_invisible_and_ethereal"
          ? [
              {
                phase,
                phaseOrdinal,
                effectOrdinal: PositiveInteger(effectIndex + 1),
              },
            ]
          : [],
      );
    },
  );
}

function isSeeInvisibleObserverSightRepresentation(
  mechanics: SpellMechanicsAdmissionSource["mechanics"],
): mechanics is Extract<
  SpellMechanicsAdmissionSource["mechanics"],
  { readonly family: "activation" }
> {
  if (mechanics.family !== "activation") return false;
  const hasSightEffect =
    seeInvisibleSightEffectOccurrences(mechanics).length > 0;
  const hasExpectedDuration =
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "hour";
  const hasSingleDirectPhase =
    mechanics.phases.length === 1 && mechanics.phases[0]?.kind === "direct";
  const witnesses = [
    {
      name: "spellLevel",
      present: mechanics.level === SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL,
    },
    { name: "selfRange", present: mechanics.range.kind === "self" },
    { name: "hourDuration", present: hasExpectedDuration },
    {
      name: "actionCastingTime",
      present: mechanics.castingTime.kind === "action",
    },
    { name: "singleDirectPhase", present: hasSingleDirectPhase },
  ] as const;
  if (!hasSightEffect) return spellProcedureHasCompleteSignature(witnesses);
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses,
  });
}

function seeInvisibleObserverSightIssue(
  failedFact: SeeInvisibleObserverSightFailedFact,
  mechanicsPath: UnitMechanicsPath,
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
  const rangeFacts =
    mechanics.range.kind === "self" ? mechanics.range : undefined;
  const durationFacts = isSeeInvisibleObserverSightDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  const expected = seeInvisibleSightEffectOccurrences(mechanics)[0];
  const phaseOccurrences = seeInvisiblePhaseOccurrences(mechanics);
  const fallbackPhase = phaseOccurrences.find(
    ({ phase }) => phase.kind === "direct",
  );
  const selectedPhaseOrdinal = expected?.phaseOrdinal ?? fallbackPhase?.ordinal;
  const phase = expected?.phase ?? fallbackPhase?.phase;
  const phaseOrdinal = selectedPhaseOrdinal ?? PositiveInteger(1);
  const issues: Array<{
    readonly failedFact: SeeInvisibleObserverSightFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: SeeInvisibleObserverSightFailedFact,
    mechanicsPath: UnitMechanicsPath,
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
    durationFacts === undefined ||
    durationFacts.value.unit !== "hour" ||
    durationFacts.value.amount !== 1
  ) {
    pushIssue("duration", spellDurationValuePath());
  }
  for (const mechanicsPath of persistentAreaDurationChildPaths(
    mechanics.duration,
  )) {
    pushIssue("duration", mechanicsPath);
  }
  for (const occurrence of phaseOccurrences) {
    if (
      occurrence.phase.kind === "direct" &&
      occurrence.phase.mode !== undefined
    ) {
      pushIssue("mode", spellActivationPhasePath(occurrence.ordinal));
    }
  }
  if (
    mechanics.phases.length !== 1 ||
    selectedPhaseOrdinal !== PositiveInteger(1)
  ) {
    for (const occurrence of phaseOccurrences) {
      if (occurrence.ordinal === selectedPhaseOrdinal) continue;
      pushIssue("phaseCount", spellActivationPhasePath(occurrence.ordinal));
    }
    if (mechanics.phases.length === 0) {
      pushIssue("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (phase?.kind !== "direct" || phase.attachment.kind !== "self") {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const selectedEffectOrdinal = expected?.effectOrdinal ?? PositiveInteger(1);
  if (effects.length === 0) {
    pushIssue(
      "effect",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  } else {
    for (const [index] of effects.entries()) {
      const effectOrdinal = PositiveInteger(index + 1);
      if (effectOrdinal === selectedEffectOrdinal) continue;
      pushIssue(
        "phaseCount",
        spellActivationEffectPath(phaseOrdinal, effectOrdinal),
      );
    }
  }
  const selectedEffect = effects.find(
    (_effect, index) => PositiveInteger(index + 1) === selectedEffectOrdinal,
  );
  if (
    effects.length > 0 &&
    selectedEffect?.kind !== "see_invisible_and_ethereal"
  ) {
    pushIssue(
      "effect",
      spellActivationEffectPath(phaseOrdinal, selectedEffectOrdinal),
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
  if (rangeFacts === undefined || durationFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        seeInvisibleObserverSightIssue(
          rangeFacts === undefined ? "range" : "duration",
          rangeFacts === undefined
            ? spellMechanicsHeaderPath("range")
            : spellDurationValuePath(),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: rangeFacts,
    duration: durationFacts,
    durationTicks: spellDurationTicksFromCanonicalValue(durationFacts.value),
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
                  durationTicks: facts.durationTicks,
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
