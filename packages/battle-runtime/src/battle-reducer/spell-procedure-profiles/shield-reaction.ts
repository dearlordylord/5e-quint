// UNIT-PROFILE-COVERAGE: runtime-owner spell.reaction-shield
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME
//
// The Shield Reaction Spell Procedure Profile: a prepared Reaction spell that
// responds to an attack-roll hit or Magic Missile targeting, grants a
// one-round Armor Class bonus to the caster, and negates Magic Missile damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Shield": Reaction when hit by an attack roll or
//     targeted by Magic Missile; range Self; V/S components; one-round
//     duration; +5 AC until the start of the caster's next turn, including
//     against the triggering attack; no Magic Missile damage.
//   - SRD 5.2.1 Playing the Game "Reactions": a Reaction is an instant
//     response to a trigger and an interrupting Reaction returns control after
//     the Reaction.
//   - UBIQUITOUS_LANGUAGE.md: Reaction, Armor Class (AC), Casting Time.

import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AvailableBattleAct,
  type BattleInterruptCheckpoint,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import { spellId } from "../../identity.ts";
import { SHIELD_MAGIC_MISSILE_SPELL_ID } from "../domain-constants.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { applyShieldReactionSpellActiveEffect } from "../spells-active-effects.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import {
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
} from "../spell-reaction-trigger-shape.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import { markSpellSlotExpendedThisTurn } from "../spell-turn-resources.ts";
import { shieldReactionSpellMatchesTrigger } from "../shield-reaction-trigger.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ShieldReactionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "shieldReaction" }
>;
type ShieldReactionBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >
> & {
  readonly frame: BattleInterruptCheckpoint;
};
type ShieldReactionResolveInput = SpellProcedureProfileResolveInput<
  ShieldReactionInvocation,
  ShieldReactionBattleResolutionInput
>;

function admitShieldReaction(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ShieldReactionInvocation[] {
  const projection = shieldReactionSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly ShieldReactionInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "shieldReaction",
              spell,
              ...projection,
            },
          ],
  );
}

function shieldReactionSpellProjection(
  spell: SpellRecord,
): Pick<
  ShieldReactionInvocation,
  "armorClassBonus" | "negatedSpellIds"
> | null {
  if (spell.mechanics.family !== "triggered_reaction") {
    return null;
  }

  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const acDeltas = effects.flatMap((effect) =>
    effect.kind === "modify_ac" ? [effect.delta] : [],
  );
  const acDelta = acDeltas[0];
  const negatedSpellIds = effects.flatMap((effect) =>
    effect.kind === "negate_named_effect" &&
    effect.scope === "damage_only" &&
    typeof effect.spellId === "string"
      ? [effect.spellId]
      : [],
  );
  const namedSpellTriggerIds =
    spell.mechanics.castingTime.kind === "reaction"
      ? reactionTriggerNamedSpellIds(spell.mechanics.castingTime)
      : [];

  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    !reactionTriggerIncludesHitByAttackRoll(spell.mechanics.castingTime) ||
    !sameStringSet(namedSpellTriggerIds, [SHIELD_MAGIC_MISSILE_SPELL_ID]) ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "round" ||
    spell.mechanics.duration.value.amount !== 1 ||
    !spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    effects.length !== 2 ||
    acDeltas.length !== 1 ||
    acDelta?.kind !== "fixed_dice" ||
    acDelta.sign !== "+" ||
    acDelta.dice !== 5 ||
    acDelta.dieSize !== 1 ||
    !sameStringSet(negatedSpellIds, namedSpellTriggerIds)
  ) {
    return null;
  }

  return {
    armorClassBonus: acDelta.dice,
    negatedSpellIds,
  };
}

function discoverShieldReactionCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function shieldReactionInvocationRef(
  invocation: ShieldReactionInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "shieldReaction",
  };
}

function shieldReactionCastSummary(
  invocation: ShieldReactionInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveShieldReaction(
  input: ShieldReactionResolveInput,
): BattleResolutionResult {
  if (!shieldReactionSpellMatchesTrigger(input.invocation, input.input.frame)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Shield requires a matching attack-hit or Magic Missile Reaction trigger.",
    );
  }
  if (!spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {})) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Shield accepts only spell-cast Reaction trigger facts.",
    );
  }

  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected = applyShieldReactionSpellActiveEffect(
    castingState,
    input.input.subject.reactorId,
    input.invocation,
  );
  const slotted = expendSpellSlot(
    effected,
    input.input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.input.subject.reactorId,
  );
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

const ShieldReactionInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "shieldReaction" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("shieldReaction"),
    spell: BattleRuntimeObjectSchema,
    armorClassBonus: Schema.Number,
    negatedSpellIds: Schema.Array(Schema.String),
  }),
);
export const shieldReactionProfile = {
  procedure: "shieldReaction",
  invocationSchema: ShieldReactionInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitShieldReaction,
  discoverCastAct: discoverShieldReactionCastAct,
  castSummary: shieldReactionCastSummary,
  invocationRef: shieldReactionInvocationRef,
  resolve: resolveShieldReaction,
} satisfies SpellProcedureProfile<
  "shieldReaction",
  ShieldReactionInvocation,
  ShieldReactionBattleResolutionInput
>;
