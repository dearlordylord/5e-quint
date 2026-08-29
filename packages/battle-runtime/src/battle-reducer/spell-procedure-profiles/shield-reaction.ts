import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { unitId } from "@dnd/shared/game-facts";
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

import { Match, Schema } from "effect";
import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { applyTriggeredArmorDefenseSpellActiveEffect } from "../spells-active-effects.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
} from "../spell-reaction-trigger-shape.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { completeReactionSpellSlotCast } from "../reaction-spell-resolution.ts";
import { triggeredArmorDefenseSpellMatchesTrigger } from "../shield-reaction-trigger.ts";
import { spendSpellAccessFreeCastResource } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

// Required SRD cross-record reference: Shield explicitly also triggers when
// targeted by the Magic Missile spell.
const SHIELD_MAGIC_MISSILE_SPELL_ID = unitId("magic_missile");
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type TriggeredArmorDefenseInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "triggeredArmorDefense" }
>;
type TriggeredArmorDefenseResolveInput =
  SpellProcedureProfileResolveInput<TriggeredArmorDefenseInvocation>;

function admitTriggeredArmorDefense(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly TriggeredArmorDefenseInvocation[] {
  const projection = triggeredArmorDefenseSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly TriggeredArmorDefenseInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "triggeredArmorDefense",
              spell,
              ...projection,
            },
          ],
  );
}

function triggeredArmorDefenseSpellProjection(
  spell: BattleSpellAdmissionSource,
): Pick<
  TriggeredArmorDefenseInvocation,
  "armorClassBonus" | "negatesRepeatedDamageAllocation"
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
    negatesRepeatedDamageAllocation: true,
  };
}

/* v8 ignore start -- @preserve -- Reaction-only profile: Shield candidates are admitted from attack-hit or Magic Missile interrupt frames, so ordinary turn discovery must return no acts. */
function discoverTriggeredArmorDefenseCastAct(): readonly AvailableBattleAct[] {
  return [];
}
/* v8 ignore stop -- @preserve */

function resolveTriggeredArmorDefense(
  input: TriggeredArmorDefenseResolveInput,
): BattleResolutionResult {
  if (
    !triggeredArmorDefenseSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Shield requires a matching attack-hit or Magic Missile Reaction trigger.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Shield accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected = applyTriggeredArmorDefenseSpellActiveEffect(
    castingState,
    input.input.subject.reactorId,
    input.invocation,
  );
  return Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) => {
      const resourced = spendSpellAccessFreeCastResource(
        effected,
        input.input.subject.reactorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      );
      return resourced.tag === "invalid"
        ? resourced
        : {
            tag: "resolved" as const,
            state: resourced.state,
            snapshot: snapshotBattle(resourced.state),
          };
    }),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) =>
      completeReactionSpellSlotCast({
        effectedState: effected,
        errorState: input.input.state,
        casterId: input.input.subject.reactorId,
        slotLevel,
      }),
    ),
    Match.exhaustive,
  );
}

const TriggeredArmorDefenseInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("triggeredArmorDefense"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    armorClassBonus: Schema.Number,
    negatesRepeatedDamageAllocation: Schema.Literal(true),
  }),
);
export const triggeredArmorDefenseProfile = {
  procedure: "triggeredArmorDefense",
  executionSchema: TriggeredArmorDefenseInvocationSchema,
  admit: admitTriggeredArmorDefense,
  discoverCastAct: discoverTriggeredArmorDefenseCastAct,
  resolve: resolveTriggeredArmorDefense,
} satisfies SpellProcedureDeclaration<
  "triggeredArmorDefense",
  TriggeredArmorDefenseInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
