import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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
import { Either } from "effect";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type MirrorImageHitInterceptionSpellInvocation,
} from "../../battle-state-execution.ts";
import { maybeOpenInterruptWindow, snapshotBattle } from "../dispatcher.ts";
import { CombatantId } from "../../identity.ts";
import {
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_INITIAL_DUPLICATES,
  MIRROR_IMAGE_UNAFFECTED_BY,
} from "../domain-constants.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
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
  SpellSlotInvocationResourceSchema,
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
  return Either.isLeft(durationTicks)
    ? null
    : {
        activeEffect: {
          kind: "mirrorImageDuplicates",
          sourceCombatantId: actorId,
          remainingDuplicates: MIRROR_IMAGE_INITIAL_DUPLICATES,
          expiresAt: {
            kind: "duration",
            durationTicks: durationTicks.right,
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
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MirrorImageHitInterceptionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
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
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [],
    },
  ];
}

function applyMirrorImageHitInterceptionEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MirrorImageHitInterceptionSpellInvocation>,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const nextEffect = {
    ...invocation.activeEffect,
    sourceProcedureRef: invocation.sourceProcedureRef,
    sourceCombatantId: actorId,
  };
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "mirrorImageDuplicates" &&
          effect.sourceProcedureRef === invocation.sourceProcedureRef &&
          effect.sourceCombatantId === actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actorId,
      battleCreatureWithSpellActiveEffects(actor, activeEffects),
    ),
  };
}

function resolveMirrorImageHitInterception(
  input: SpellProcedureProfileResolveInput<MirrorImageHitInterceptionSpellInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image uses no target, roll, damage, or selection fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyMirrorImageHitInterceptionEffect(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

const MirrorImageHitInterceptionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
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
