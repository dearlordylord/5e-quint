import { spellInvocationResourceForCastOption } from "./profile.ts";
import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-blur-attack-roll-defense
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
//
// The perceptionGatedAttackRollDefense Spell Procedure Profile: a prepared action spell
// that creates a concentration self Spell Effect imposing Disadvantage on
// Attack Rolls against the caster unless the attacker perceives them with
// Blindsight or Truesight.
//
// What lives here:
//   - admit()           - was supportedPreparedPerceptionGatedAttackRollDefenseSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the perceptionGatedAttackRollDefense branch in
//                         spells-discovery.ts
//   - castSummary()     - was the perceptionGatedAttackRollDefense branch in
//                         spells-discovery.ts
//                         spells-invocation-ref.ts
//   - resolve()         - was resolvePerceptionGatedAttackRollDefenseSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyPerceptionGatedAttackRollDefenseSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Attack Roll Disadvantage projection and Blindsight/Truesight bypass
//     witnesses stay in attack-roll.ts.
//   - Concentration cleanup stays in the shared active-effect lifecycle.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type PerceptionGatedAttackRollDefenseSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { PerceptionGatedAttackRollDefenseTemplateSchema } from "../../active-effect/codecs.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
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

function perceptionGatedAttackRollDefenseShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  PerceptionGatedAttackRollDefenseSpellInvocation,
  "activeEffect"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 1 ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    (effect.affects ?? "rolls_against_self") !== "rolls_against_self" ||
    !sameStringSet(effect.on, ["attack_roll"]) ||
    effect.attackerTypeFilter !== undefined ||
    expiresAt?.kind !== "concentration"
  ) {
    return null;
  }
  return {
    activeEffect: {
      kind: "perceptionGatedAttackRollDefense",
      sourceCombatantId: actorId,
      expiresAt,
    },
  };
}

function admitPerceptionGatedAttackRollDefense(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly PerceptionGatedAttackRollDefenseSpellInvocation[] {
  const shape = perceptionGatedAttackRollDefenseShape(
    ctx.actor.combatantId,
    spell,
  );
  if (shape === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly PerceptionGatedAttackRollDefenseSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "perceptionGatedAttackRollDefense",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function discoverPerceptionGatedAttackRollDefenseCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PerceptionGatedAttackRollDefenseSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyPerceptionGatedAttackRollDefenseEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PerceptionGatedAttackRollDefenseSpellInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "perceptionGatedAttackRollDefense" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolvePerceptionGatedAttackRollDefense(
  input: SpellProcedureProfileResolveInput<PerceptionGatedAttackRollDefenseSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "temporary attack-roll disadvantage uses no target, roll, damage, or selection fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyPerceptionGatedAttackRollDefenseEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const PerceptionGatedAttackRollDefenseInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("perceptionGatedAttackRollDefense"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: PerceptionGatedAttackRollDefenseTemplateSchema,
    }),
  );
export const perceptionGatedAttackRollDefenseProfile: SpellProcedureDeclaration<
  "perceptionGatedAttackRollDefense",
  PerceptionGatedAttackRollDefenseSpellInvocation
> = {
  procedure: "perceptionGatedAttackRollDefense",
  executionSchema: PerceptionGatedAttackRollDefenseInvocationSchema,
  admit: admitPerceptionGatedAttackRollDefense,
  discoverCastAct: discoverPerceptionGatedAttackRollDefenseCastAct,
  resolve: resolvePerceptionGatedAttackRollDefense,
};
