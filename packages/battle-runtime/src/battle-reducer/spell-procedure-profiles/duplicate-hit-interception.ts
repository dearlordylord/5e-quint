import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type DuplicateHitInterceptionSpellInvocation,
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

function duplicateHitInterceptionShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<DuplicateHitInterceptionSpellInvocation, "activeEffect"> | null {
  if (
    spell.mechanics.family !== "passive_hit_intercept" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    !spell.mechanics.components.v ||
    !spell.mechanics.components.s ||
    spell.mechanics.components.m !== false ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.duplicatePool.count !==
      DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES ||
    spell.mechanics.duplicatePool.dicePerRemainingDuplicate !== 1 ||
    spell.mechanics.duplicatePool.dieSize !==
      DUPLICATE_HIT_INTERCEPTION_DIE_SIZE ||
    spell.mechanics.duplicatePool.successAtLeast !==
      DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST ||
    spell.mechanics.duplicatePool.onHit !==
      "duplicate_hit_instead_and_destroyed" ||
    spell.mechanics.duplicatePool.onFailure !== "caster_hit_normally" ||
    !spell.mechanics.duplicatePool.ignoresOtherDamageAndEffects ||
    spell.mechanics.duplicatePool.endsWhen !== "all_duplicates_destroyed" ||
    !sameStringSet(
      spell.mechanics.duplicatePool.unaffectedBy,
      DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_BY,
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        activeEffect: {
          kind: "duplicateHitInterception",
          sourceCombatantId: actorId,
          remainingDuplicates: DUPLICATE_HIT_INTERCEPTION_INITIAL_DUPLICATES,
          expiresAt: {
            kind: "duration",
            durationTicks: durationTicks.success,
          },
        },
      };
}

function admitDuplicateHitInterception(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly DuplicateHitInterceptionSpellInvocation[] {
  const shape = duplicateHitInterceptionShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DuplicateHitInterceptionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "duplicateHitInterception",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function discoverDuplicateHitInterceptionCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DuplicateHitInterceptionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyDuplicateHitInterceptionEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DuplicateHitInterceptionSpellInvocation>,
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
  input: SpellProcedureProfileResolveInput<DuplicateHitInterceptionSpellInvocation>,
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
  DuplicateHitInterceptionSpellInvocation
> = {
  procedure: "duplicateHitInterception",
  executionSchema: DuplicateHitInterceptionInvocationSchema,
  admit: admitDuplicateHitInterception,
  discoverCastAct: discoverDuplicateHitInterceptionCastAct,
  resolve: resolveDuplicateHitInterception,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
