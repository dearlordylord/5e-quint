// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-see-invisible-observer-sight
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
//   - invocationRef()   - was the seeInvisibleObserverSight branch in
//                         spells-invocation-ref.ts
//   - resolve()         - was resolveSeeInvisibleObserverSightSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applySeeInvisibleObserverSightSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Observer-scoped visibility witnesses stay with the sight/visibility
//     query helpers and active-effect readers.
//   - Duration expiry stays in the shared active-effect lifecycle.
//   - The central codec branch in battle-codecs.ts still owns the authoritative
//     Schema literal for this invocation until its profile branch migrates.

import { elapsedTimeTicksFromHours } from "@dnd/shared-algebras/elapsed-time-algebra";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
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
  type SeeInvisibleObserverSightSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

function seeInvisibleObserverSightShape(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<SeeInvisibleObserverSightSpellInvocation, "activeEffect"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const durationTicks = elapsedTimeTicksFromHours(
    spell.mechanics.duration.value.amount,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 1 ||
    effect?.kind !== "see_invisible_and_ethereal" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "seeInvisibleAndEthereal",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt: {
        kind: "duration",
        durationTicks: durationTicks.right,
      },
    },
  };
}

function admitSeeInvisibleObserverSight(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SeeInvisibleObserverSightSpellInvocation[] {
  const shape = seeInvisibleObserverSightShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SeeInvisibleObserverSightSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "seeInvisibleObserverSight",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function discoverSeeInvisibleObserverSightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: SeeInvisibleObserverSightSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: seeInvisibleObserverSightInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: seeInvisibleObserverSightCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function seeInvisibleObserverSightInvocationRef(
  invocation: SeeInvisibleObserverSightSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "seeInvisibleObserverSight",
  };
}

function seeInvisibleObserverSightCastSummary(
  invocation: SeeInvisibleObserverSightSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function applySeeInvisibleObserverSightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: SeeInvisibleObserverSightSpellInvocation,
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
          effect.kind === "seeInvisibleAndEthereal" &&
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

function resolveSeeInvisibleObserverSight(
  input: SpellProcedureProfileResolveInput<SeeInvisibleObserverSightSpellInvocation>,
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
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "See Invisibility uses no target, roll, damage, or selection fills.",
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

  const effected = applySeeInvisibleObserverSightEffect(
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

export const seeInvisibleObserverSightProfile: SpellProcedureProfile<
  "seeInvisibleObserverSight",
  SeeInvisibleObserverSightSpellInvocation
> = {
  procedure: "seeInvisibleObserverSight",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSeeInvisibleObserverSight,
  discoverCastAct: discoverSeeInvisibleObserverSightCastAct,
  castSummary: seeInvisibleObserverSightCastSummary,
  invocationRef: seeInvisibleObserverSightInvocationRef,
  resolve: resolveSeeInvisibleObserverSight,
};
