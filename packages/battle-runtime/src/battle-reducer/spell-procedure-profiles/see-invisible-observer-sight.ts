import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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

import { elapsedTimeTicksFromHours } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SeeInvisibleObserverSightSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
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

function seeInvisibleObserverSightShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
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
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "seeInvisibleAndEthereal",
      sourceCombatantId: actorId,
      expiresAt: {
        kind: "duration",
        durationTicks: durationTicks.success,
      },
    },
  };
}

const SeeInvisibleAndEtherealEffectSchema = Schema.Struct({
  kind: Schema.Literal("seeInvisibleAndEthereal"),
  sourceCombatantId: CombatantId,
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});

function admitSeeInvisibleObserverSight(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SeeInvisibleObserverSightSpellInvocation[] {
  const shape = seeInvisibleObserverSightShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SeeInvisibleObserverSightSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
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
      "See Invisibility uses no target, roll, damage, or selection fills.",
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
  SeeInvisibleObserverSightSpellInvocation
> = {
  procedure: "seeInvisibleObserverSight",
  executionSchema: SeeInvisibleObserverSightInvocationSchema,
  admit: admitSeeInvisibleObserverSight,
  discoverCastAct: discoverSeeInvisibleObserverSightCastAct,
  resolve: resolveSeeInvisibleObserverSight,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
