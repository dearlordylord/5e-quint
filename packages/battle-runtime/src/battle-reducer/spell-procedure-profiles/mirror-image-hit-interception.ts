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
//   - invocationRef()   - was the mirrorImageHitInterception branch in
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
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type MirrorImageHitInterceptionSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_INITIAL_DUPLICATES,
  MIRROR_IMAGE_UNAFFECTED_BY,
} from "../domain-constants.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function mirrorImageHitInterceptionShape(
  actorId: CombatantId,
  spell: SpellRecord,
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
          sourceSpellId: spell.id,
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
  spell: SpellRecord,
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
  invocation: MirrorImageHitInterceptionSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: mirrorImageHitInterceptionInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: mirrorImageHitInterceptionCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function mirrorImageHitInterceptionInvocationRef(
  invocation: MirrorImageHitInterceptionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "mirrorImageHitInterception",
  };
}

function mirrorImageHitInterceptionCastSummary(
  invocation: MirrorImageHitInterceptionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function applyMirrorImageHitInterceptionEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: MirrorImageHitInterceptionSpellInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const nextEffect = {
    ...invocation.activeEffect,
    sourceCombatantId: actorId,
  };
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "mirrorImageDuplicates" &&
          effect.sourceSpellId === invocation.spell.id &&
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

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
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
    input.input.suppressedReactionTrigger,
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
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "mirrorImageHitInterception" }
    >
  >(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("mirrorImageHitInterception"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: BattleRuntimeObjectSchema,
    }),
  );
export const mirrorImageHitInterceptionProfile: SpellProcedureProfile<
  "mirrorImageHitInterception",
  MirrorImageHitInterceptionSpellInvocation
> = {
  procedure: "mirrorImageHitInterception",
  invocationSchema: MirrorImageHitInterceptionInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMirrorImageHitInterception,
  discoverCastAct: discoverMirrorImageHitInterceptionCastAct,
  castSummary: mirrorImageHitInterceptionCastSummary,
  invocationRef: mirrorImageHitInterceptionInvocationRef,
  resolve: resolveMirrorImageHitInterception,
};
