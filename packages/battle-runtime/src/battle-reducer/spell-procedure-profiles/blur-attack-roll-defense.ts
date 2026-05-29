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
//   - invocationRef()   - was the blurAttackRollDefense branch in
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

import type { SpellRecord } from "@dnd/surface/surface/types";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BlurAttackRollDefenseSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
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

function blurAttackRollDefenseShape(
  actorId: CombatantId,
  spell: SpellRecord,
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
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt,
    },
  };
}

function admitBlurAttackRollDefense(
  spell: SpellRecord,
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
  invocation: BlurAttackRollDefenseSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: blurAttackRollDefenseInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: blurAttackRollDefenseCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function blurAttackRollDefenseInvocationRef(
  invocation: BlurAttackRollDefenseSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "blurAttackRollDefense",
  };
}

function blurAttackRollDefenseCastSummary(
  invocation: BlurAttackRollDefenseSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function applyBlurAttackRollDefenseEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BlurAttackRollDefenseSpellInvocation,
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
          effect.kind === "blurred" &&
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

function resolveBlurAttackRollDefense(
  input: SpellProcedureProfileResolveInput<BlurAttackRollDefenseSpellInvocation>,
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
      "Blur uses no target, roll, damage, or selection fills.",
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

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyBlurAttackRollDefenseEffect(
    concentrationBase,
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

const BlurAttackRollDefenseInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "blurAttackRollDefense" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("blurAttackRollDefense"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: BattleRuntimeObjectSchema,
  }),
);
export const blurAttackRollDefenseProfile: SpellProcedureProfile<
  "blurAttackRollDefense",
  BlurAttackRollDefenseSpellInvocation
> = {
  procedure: "blurAttackRollDefense",
  invocationSchema: BlurAttackRollDefenseInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitBlurAttackRollDefense,
  discoverCastAct: discoverBlurAttackRollDefenseCastAct,
  castSummary: blurAttackRollDefenseCastSummary,
  invocationRef: blurAttackRollDefenseInvocationRef,
  resolve: resolveBlurAttackRollDefense,
};
