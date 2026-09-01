import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mirror-image-hit-interception
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
//
// The duplicateHitInterception Spell Procedure Profile: a prepared action
// spell that creates a timed self Spell Effect with three duplicates that can
// intercept attack-roll hits against the caster.
//
// What lives here:
//   - admit()           - was supportedPreparedDuplicateHitInterceptionSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the duplicateHitInterception branch in
//                         spells-discovery.ts
//   - castSummary()     - was the duplicateHitInterception branch in
//                         spells-discovery.ts
//                         spells-invocation-ref.ts
//   - resolve()         - was resolveDuplicateHitInterceptionSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyDuplicateHitInterceptionSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - The duplicate-roll hole, hit redirection, duplicate destruction, and
//     bypass witness logic stay in duplicate-hit-interception.ts.
//   - Timed duration expiry stays in the shared active-effect lifecycle.

import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { Schema } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import {
  DUPLICATE_HIT_INTERCEPTION_DIE_SIZE,
  DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST,
  DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES,
  DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_BY,
} from "../domain-constants.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellDurationValueTicks,
  spellNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function admitDuplicateHitInterception(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: DuplicateHitInterceptionMechanicsFacts,
): readonly DuplicateHitInterceptionInvocation[] {
  const durationTicks = spellDurationValueTicks(facts.duration.value);
  if (durationTicks === null) return [];
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DuplicateHitInterceptionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "duplicateHitInterception",
              spell,
              actionCost: "magicAction",
              activeEffect: {
                kind: "duplicateHitInterception",
                sourceCombatantId: ctx.actor.combatantId,
                remainingDuplicates:
                  DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES,
                expiresAt: {
                  kind: "duration",
                  durationTicks,
                },
              },
            },
          ],
  );
}

type DuplicateHitInterceptionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "duplicateHitInterception" }
>;
type DuplicateHitInterceptionDuration = Omit<
  Extract<SpellDefinitionRuleFacts["duration"], { readonly kind: "timed" }>,
  "value"
> & {
  readonly value: Omit<
    Extract<
      SpellDefinitionRuleFacts["duration"],
      { readonly kind: "timed" }
    >["value"],
    "unit" | "amount"
  > & { readonly unit: "minute"; readonly amount: 1 };
};
type DuplicateHitInterceptionRange = Extract<
  SpellDefinitionRuleFacts["range"],
  { readonly kind: "self" }
>;
type DuplicateHitInterceptionMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: DuplicateHitInterceptionRange;
  readonly duration: DuplicateHitInterceptionDuration;
};

export const DUPLICATE_HIT_INTERCEPTION_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "attachment",
  "duplicatePool",
] as const;
type DuplicateHitInterceptionFailedFact =
  (typeof DUPLICATE_HIT_INTERCEPTION_FAILED_FACTS)[number];

type DuplicateHitInterceptionMechanicsIssue = {
  readonly failedFact: DuplicateHitInterceptionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function duplicateHitInterceptionIssueResult(
  issue: DuplicateHitInterceptionMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "duplicateHitInterception";
  readonly failedFact: DuplicateHitInterceptionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "duplicateHitInterception",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported duplicateHitInterception mechanics fact: ${issue.failedFact}.`,
  };
}

function duplicateHitInterceptionMechanicsEvidence(
  mechanics: Extract<
    SpellMechanics,
    { readonly family: "passive_hit_intercept" }
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
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function duplicateHitInterceptionDurationProjection(
  duration: SpellDefinitionRuleFacts["duration"],
): DuplicateHitInterceptionDuration | null {
  if (
    duration.kind !== "timed" ||
    duration.value.unit !== "minute" ||
    duration.value.amount !== 1
  ) {
    return null;
  }
  return {
    ...duration,
    value: { ...duration.value, unit: "minute", amount: 1 },
  };
}

function admitDuplicateHitInterceptionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "duplicateHitInterception",
  DuplicateHitInterceptionMechanicsFacts,
  DuplicateHitInterceptionInvocation,
  ReturnType<typeof duplicateHitInterceptionIssueResult>
> {
  if (source.mechanics.family !== "passive_hit_intercept") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const range = mechanics.range.kind === "self" ? mechanics.range : null;
  const duration = duplicateHitInterceptionDurationProjection(
    mechanics.duration,
  );
  const issues: DuplicateHitInterceptionMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: DuplicateHitInterceptionFailedFact,
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
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false
  ) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
  }
  if (mechanics.duration.kind !== "timed") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  } else {
    if (
      mechanics.duration.value.unit !== "minute" ||
      mechanics.duration.value.amount !== 1
    ) {
      pushIssue("durationValue", spellDurationValuePath());
    }
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      if (path.nodes.at(-1)?.role === "extension") {
        pushIssue("durationExtension", path);
      } else if (path.nodes.at(-1)?.role === "effect") {
        pushIssue("durationEnding", path);
      }
    }
  }
  if (mechanics.attachment.kind !== "self") {
    pushIssue("attachment", spellMechanicsHeaderPath("family"));
  }
  const duplicatePool = mechanics.duplicatePool;
  if (
    duplicatePool.count !== DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES ||
    duplicatePool.dicePerRemainingDuplicate !== 1 ||
    duplicatePool.dieSize !== DUPLICATE_HIT_INTERCEPTION_DIE_SIZE ||
    duplicatePool.successAtLeast !==
      DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST ||
    duplicatePool.onHit !== "duplicate_hit_instead_and_destroyed" ||
    duplicatePool.onFailure !== "caster_hit_normally" ||
    duplicatePool.ignoresOtherDamageAndEffects !== true ||
    duplicatePool.endsWhen !== "all_duplicates_destroyed" ||
    !sameStringSet(
      duplicatePool.unaffectedBy,
      DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_BY,
    )
  ) {
    pushIssue("duplicatePool", spellMechanicsHeaderPath("family"));
  }
  const uniqueIssues = spellUniqueMechanicsIssues(issues);
  const nonEmptyIssues = spellNonEmpty(uniqueIssues);
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      duplicateHitInterceptionIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (range === null || duration === null) {
    return {
      tag: "unsupported",
      issues: [
        duplicateHitInterceptionIssueResult({
          failedFact: range === null ? "range" : "durationValue",
          mechanicsPath:
            range === null
              ? spellMechanicsHeaderPath("range")
              : spellDurationValuePath(),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range,
    duration,
  } satisfies DuplicateHitInterceptionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "duplicateHitInterception",
      facts,
      evidence: duplicateHitInterceptionMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitDuplicateHitInterception(executionSource, ctx, facts),
    },
  };
}

function discoverDuplicateHitInterceptionCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DuplicateHitInterceptionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyDuplicateHitInterceptionEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DuplicateHitInterceptionInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "duplicateHitInterception" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveDuplicateHitInterception(
  input: SpellProcedureProfileResolveInput<DuplicateHitInterceptionInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "duplicate-hit interception uses no target, roll, damage, or selection fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyDuplicateHitInterceptionEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const DuplicateHitInterceptionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("duplicateHitInterception"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: Schema.Struct({
      ...BattleEffectOccurrenceTemplateSchemaFields,
      kind: Schema.Literal("duplicateHitInterception"),
      sourceCombatantId: CombatantId,
      remainingDuplicates: Schema.Literals([
        DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES,
      ]),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  }),
);
export const duplicateHitInterceptionProfile: SpellProcedureDeclaration<
  "duplicateHitInterception",
  DuplicateHitInterceptionInvocation
> = {
  procedure: "duplicateHitInterception",
  executionSchema: DuplicateHitInterceptionInvocationSchema,
  admitMechanics: admitDuplicateHitInterceptionMechanics,
  discoverCastAct: discoverDuplicateHitInterceptionCastAct,
  resolve: resolveDuplicateHitInterception,
};
