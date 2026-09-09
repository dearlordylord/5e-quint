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

function seeInvisibleIssueUnless(
  present: boolean,
  failedFact: SeeInvisibleObserverSightFailedFact,
  mechanicsPath: UnitMechanicsPath,
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  return present
    ? []
    : [seeInvisibleObserverSightIssue(failedFact, mechanicsPath)];
}

function seeInvisiblePhaseSelection(
  expected: SeeInvisibleSightEffectOccurrence | undefined,
  phaseOccurrences: readonly SeeInvisiblePhaseOccurrence[],
) {
  const fallbackPhase = phaseOccurrences.find(
    ({ phase }) => phase.kind === "direct",
  );
  const selectedPhaseOrdinal = expected?.phaseOrdinal ?? fallbackPhase?.ordinal;
  return {
    selectedPhaseOrdinal,
    phase: expected?.phase ?? fallbackPhase?.phase,
    phaseOrdinal: selectedPhaseOrdinal ?? PositiveInteger(1),
  };
}

function seeInvisibleDirectEffects(
  phase: SeeInvisiblePhaseOccurrence["phase"] | undefined,
) {
  return phase?.kind === "direct" ? (phase.effects ?? []) : [];
}

function seeInvisibleEffectSelection(
  expected: SeeInvisibleSightEffectOccurrence | undefined,
  effects: ReturnType<typeof seeInvisibleDirectEffects>,
) {
  const selectedEffectOrdinal = expected?.effectOrdinal ?? PositiveInteger(1);
  return {
    selectedEffectOrdinal,
    selectedEffect: effects.find(
      (_effect, index) => PositiveInteger(index + 1) === selectedEffectOrdinal,
    ),
  };
}

function seeInvisibleMechanicsInspection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
) {
  const expected = seeInvisibleSightEffectOccurrences(mechanics)[0];
  const phaseOccurrences = seeInvisiblePhaseOccurrences(mechanics);
  const phaseSelection = seeInvisiblePhaseSelection(expected, phaseOccurrences);
  const effects = seeInvisibleDirectEffects(phaseSelection.phase);
  const effectSelection = seeInvisibleEffectSelection(expected, effects);
  return {
    phaseOccurrences,
    ...phaseSelection,
    effects,
    ...effectSelection,
  };
}

function seeInvisibleHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  const duration = mechanics.duration;
  const durationIsSupported =
    isSeeInvisibleObserverSightDuration(duration) &&
    duration.value.unit === "hour" &&
    duration.value.amount === 1;
  return [
    ...seeInvisibleIssueUnless(
      mechanics.level === SEE_INVISIBLE_OBSERVER_SIGHT_LEVEL,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...seeInvisibleIssueUnless(
      mechanics.castingTime.kind === "action",
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...seeInvisibleIssueUnless(
      mechanics.range.kind === "self",
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...seeInvisibleIssueUnless(
      durationIsSupported,
      "duration",
      spellDurationValuePath(),
    ),
    ...persistentAreaDurationChildPaths(duration).map((mechanicsPath) =>
      seeInvisibleObserverSightIssue("duration", mechanicsPath),
    ),
  ];
}

function seeInvisibleModeIssues(
  phaseOccurrences: readonly SeeInvisiblePhaseOccurrence[],
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  return phaseOccurrences.flatMap(({ phase, ordinal }) =>
    phase.kind === "direct" && phase.mode !== undefined
      ? [
          seeInvisibleObserverSightIssue(
            "mode",
            spellActivationPhasePath(ordinal),
          ),
        ]
      : [],
  );
}

function seeInvisiblePhaseCountIssues(
  phaseOccurrences: readonly SeeInvisiblePhaseOccurrence[],
  selectedPhaseOrdinal: PositiveInteger | undefined,
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  if (
    phaseOccurrences.length === 1 &&
    selectedPhaseOrdinal === PositiveInteger(1)
  ) {
    return [];
  }
  if (phaseOccurrences.length === 0) {
    return [
      seeInvisibleObserverSightIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(1)),
      ),
    ];
  }
  return phaseOccurrences.flatMap((occurrence) =>
    occurrence.ordinal === selectedPhaseOrdinal
      ? []
      : [
          seeInvisibleObserverSightIssue(
            "phaseCount",
            spellActivationPhasePath(occurrence.ordinal),
          ),
        ],
  );
}

function seeInvisibleEffectIssues(
  inspection: ReturnType<typeof seeInvisibleMechanicsInspection>,
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  if (inspection.effects.length === 0) {
    return [
      seeInvisibleObserverSightIssue(
        "effect",
        spellActivationEffectPath(inspection.phaseOrdinal, PositiveInteger(1)),
      ),
    ];
  }
  const extraEffectIssues = inspection.effects.flatMap((_effect, index) => {
    const effectOrdinal = PositiveInteger(index + 1);
    return effectOrdinal === inspection.selectedEffectOrdinal
      ? []
      : [
          seeInvisibleObserverSightIssue(
            "phaseCount",
            spellActivationEffectPath(inspection.phaseOrdinal, effectOrdinal),
          ),
        ];
  });
  return inspection.selectedEffect?.kind === "see_invisible_and_ethereal"
    ? extraEffectIssues
    : [
        ...extraEffectIssues,
        seeInvisibleObserverSightIssue(
          "effect",
          spellActivationEffectPath(
            inspection.phaseOrdinal,
            inspection.selectedEffectOrdinal,
          ),
        ),
      ];
}

function seeInvisibleAdmissionIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  inspection: ReturnType<typeof seeInvisibleMechanicsInspection>,
): readonly SeeInvisibleObserverSightAdmissionIssue[] {
  return [
    ...seeInvisibleHeaderIssues(mechanics),
    ...seeInvisibleModeIssues(inspection.phaseOccurrences),
    ...seeInvisiblePhaseCountIssues(
      inspection.phaseOccurrences,
      inspection.selectedPhaseOrdinal,
    ),
    ...seeInvisibleIssueUnless(
      inspection.phase?.kind === "direct" &&
        inspection.phase.attachment.kind === "self",
      "attachment",
      spellActivationAttachmentPath(inspection.phaseOrdinal),
    ),
    ...seeInvisibleEffectIssues(inspection),
  ];
}

type SeeInvisibleFactsResolution =
  | {
      readonly tag: "supported";
      readonly facts: SeeInvisibleObserverSightMechanicsFacts;
    }
  | {
      readonly tag: "unsupported";
      readonly issue: SeeInvisibleObserverSightAdmissionIssue;
    };

function seeInvisibleFacts(
  source: SpellMechanicsAdmissionSource,
): SeeInvisibleFactsResolution {
  const range = source.spellDefinitionRuleFacts.range;
  if (range.kind !== "self") {
    return {
      tag: "unsupported",
      issue: seeInvisibleObserverSightIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    };
  }
  const duration = source.spellDefinitionRuleFacts.duration;
  if (!isSeeInvisibleObserverSightDuration(duration)) {
    return {
      tag: "unsupported",
      issue: seeInvisibleObserverSightIssue(
        "duration",
        spellDurationValuePath(),
      ),
    };
  }
  return {
    tag: "supported",
    facts: {
      ...source.spellDefinitionRuleFacts,
      range,
      duration,
      durationTicks: spellDurationTicksFromCanonicalValue(duration.value),
    },
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
  const inspection = seeInvisibleMechanicsInspection(mechanics);
  const issues = seeInvisibleAdmissionIssues(mechanics, inspection);
  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(failures, (issue) => issue),
    };
  }
  const factsResolution = seeInvisibleFacts(source);
  if (factsResolution.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [factsResolution.issue],
    };
  }
  const facts = factsResolution.facts;
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
