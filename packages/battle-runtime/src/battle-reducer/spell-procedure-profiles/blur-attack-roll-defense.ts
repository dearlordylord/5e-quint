import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-blur-attack-roll-defense
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE
//
// The blurAttackRollDefense Spell Procedure Profile: a prepared action spell
// that creates a concentration self Spell Effect imposing Disadvantage on
// Attack Rolls against the caster unless the attacker perceives them with
// Blindsight or Truesight.
//
// What lives here:
//   - admit()           - was supportedPreparedBlurAttackRollDefenseSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the blurAttackRollDefense branch in
//                         spells-discovery.ts
//   - castSummary()     - was the blurAttackRollDefense branch in
//                         spells-discovery.ts
//                         spells-invocation-ref.ts
//   - resolve()         - was resolveBlurAttackRollDefenseSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyBlurAttackRollDefenseSpellEffect in
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
  type BlurAttackRollDefenseSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { BlurredActiveEffectTemplateSchema } from "../../active-effect/codecs.ts";
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
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function blurAttackRollDefenseShape(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<BlurAttackRollDefenseSpellInvocation, "activeEffect"> | null {
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
      kind: "blurred",
      sourceCombatantId: actorId,
      expiresAt,
    },
  };
}

function admitBlurAttackRollDefense(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly BlurAttackRollDefenseSpellInvocation[] {
  const shape = blurAttackRollDefenseShape(ctx.actor.combatantId, spell);
  if (shape === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly BlurAttackRollDefenseSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "blurAttackRollDefense",
              spell,
              actionCost: "magicAction",
              ...shape,
            },
          ],
  );
}

function discoverBlurAttackRollDefenseCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<BlurAttackRollDefenseSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [actionSpellCastCandidate(actorId, invocation.sourceProcedureRef, [])];
}

function applyBlurAttackRollDefenseEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<BlurAttackRollDefenseSpellInvocation>,
): BattleState {
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      effect.kind === "blurred" &&
      effect.sourceProcedureRef === invocation.sourceProcedureRef &&
      effect.sourceCombatantId === actorId,
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveBlurAttackRollDefense(
  input: SpellProcedureProfileResolveInput<BlurAttackRollDefenseSpellInvocation>,
): BattleResolutionResult {
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Blur uses no target, roll, damage, or selection fills.",
    );
  }

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyBlurAttackRollDefenseEffect(state, input.actorId, input.invocation),
  });
}

const BlurAttackRollDefenseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("blurAttackRollDefense"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: BlurredActiveEffectTemplateSchema,
  }),
);
export const blurAttackRollDefenseProfile: SpellProcedureDeclaration<
  "blurAttackRollDefense",
  BlurAttackRollDefenseSpellInvocation
> = {
  procedure: "blurAttackRollDefense",
  executionSchema: BlurAttackRollDefenseInvocationSchema,
  admit: admitBlurAttackRollDefense,
  discoverCastAct: discoverBlurAttackRollDefenseCastAct,
  resolve: resolveBlurAttackRollDefense,
};
