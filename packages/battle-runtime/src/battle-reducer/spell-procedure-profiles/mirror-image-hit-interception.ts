import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mirror-image-hit-interception
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
//
// The mirrorImageHitInterception Spell Procedure Profile: a prepared action
// spell that creates a timed self Spell Effect with three duplicates that can
// intercept attack-roll hits against the caster.
//
// What lives here:
//   - admit()           - was supportedPreparedMirrorImageHitInterceptionSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the mirrorImageHitInterception branch in
//                         spells-discovery.ts
//   - castSummary()     - was the mirrorImageHitInterception branch in
//                         spells-discovery.ts
//                         spells-invocation-ref.ts
//   - resolve()         - was resolveMirrorImageHitInterceptionSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyMirrorImageHitInterceptionSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - The duplicate-roll hole, hit redirection, duplicate destruction, and
//     bypass witness logic stay in mirror-image-hit-interception.ts.
//   - Timed duration expiry stays in the shared active-effect lifecycle.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type MirrorImageHitInterceptionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import {
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_INITIAL_DUPLICATES,
  MIRROR_IMAGE_UNAFFECTED_BY,
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
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function mirrorImageHitInterceptionShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<MirrorImageHitInterceptionSpellInvocation, "activeEffect"> | null {
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
    spell.mechanics.duplicatePool.count !== MIRROR_IMAGE_INITIAL_DUPLICATES ||
    spell.mechanics.duplicatePool.dicePerRemainingDuplicate !== 1 ||
    spell.mechanics.duplicatePool.dieSize !== MIRROR_IMAGE_DUPLICATE_DIE_SIZE ||
    spell.mechanics.duplicatePool.successAtLeast !==
      MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST ||
    spell.mechanics.duplicatePool.onHit !==
      "duplicate_hit_instead_and_destroyed" ||
    spell.mechanics.duplicatePool.onFailure !== "caster_hit_normally" ||
    !spell.mechanics.duplicatePool.ignoresOtherDamageAndEffects ||
    spell.mechanics.duplicatePool.endsWhen !== "all_duplicates_destroyed" ||
    !sameStringSet(
      spell.mechanics.duplicatePool.unaffectedBy,
      MIRROR_IMAGE_UNAFFECTED_BY,
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
          kind: "mirrorImageDuplicates",
          sourceCombatantId: actorId,
          remainingDuplicates: MIRROR_IMAGE_INITIAL_DUPLICATES,
          expiresAt: {
            kind: "duration",
            durationTicks: durationTicks.success,
          },
        },
      };
}

function admitMirrorImageHitInterception(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MirrorImageHitInterceptionSpellInvocation[] {
  const shape = mirrorImageHitInterceptionShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly MirrorImageHitInterceptionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "mirrorImageHitInterception",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function discoverMirrorImageHitInterceptionCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MirrorImageHitInterceptionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyMirrorImageHitInterceptionEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MirrorImageHitInterceptionSpellInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "mirrorImageDuplicates" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveMirrorImageHitInterception(
  input: SpellProcedureProfileResolveInput<MirrorImageHitInterceptionSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image uses no target, roll, damage, or selection fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyMirrorImageHitInterceptionEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const MirrorImageHitInterceptionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("mirrorImageHitInterception"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: Schema.Struct({
        kind: Schema.Literal("mirrorImageDuplicates"),
        sourceCombatantId: CombatantId,
        remainingDuplicates: Schema.Literal(MIRROR_IMAGE_INITIAL_DUPLICATES),
        expiresAt: DurationBattleActiveEffectExpirationSchema,
      }),
    }),
  );
export const mirrorImageHitInterceptionProfile: SpellProcedureDeclaration<
  "mirrorImageHitInterception",
  MirrorImageHitInterceptionSpellInvocation
> = {
  procedure: "mirrorImageHitInterception",
  executionSchema: MirrorImageHitInterceptionInvocationSchema,
  admit: admitMirrorImageHitInterception,
  discoverCastAct: discoverMirrorImageHitInterceptionCastAct,
  resolve: resolveMirrorImageHitInterception,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
