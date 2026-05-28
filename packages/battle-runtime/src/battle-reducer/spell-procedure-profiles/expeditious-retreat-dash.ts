// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-expeditious-retreat-dash
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE
//
// The expeditiousRetreatDash Spell Procedure Profile: a self-targeted Bonus
// Action spell that immediately resolves Dash and stores a Concentration-owned
// permission to take Dash as a Bonus Action while the spell lasts.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Expeditious Retreat": Bonus Action, Self,
//     Concentration up to 10 minutes; take Dash immediately and again as a
//     Bonus Action until the spell ends.
//   - SRD 5.2.1 Rules Glossary "Bonus Action": Bonus Actions exist only when
//     explicitly granted.
//   - UBIQUITOUS_LANGUAGE.md: Speed is capacity; Movement is consumption; Dash
//     grants additional movement budget rather than changing Speed.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  activeOngoingFeaturesPreventSpellcasting,
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionDashSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { applyDashToActor } from "../attack-resolution.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { revealHidden } from "../hole-helpers.ts";
import { representedMovementSpeedKinds } from "../movement-speed.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { spellRequiresVerbal } from "../spells-discovery.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "../spell-turn-resources.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type ExpeditiousRetreatDashInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "expeditiousRetreatDash" }
>;
type ExpeditiousRetreatDashResolveInput = SpellProcedureProfileResolveInput<
  ExpeditiousRetreatDashInvocation,
  BonusActionDashSpellBattleResolutionInput
>;

function admitExpeditiousRetreatDash(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ExpeditiousRetreatDashInvocation[] {
  const activeEffect = expeditiousRetreatDashActiveEffect(
    ctx.actor.combatantId,
    spell,
  );
  if (activeEffect === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly ExpeditiousRetreatDashInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "expeditiousRetreatDash",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ],
  );
}

function expeditiousRetreatDashActiveEffect(
  actorId: CombatantId,
  spell: SpellRecord,
): ExpeditiousRetreatDashInvocation["activeEffect"] | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const initialPhase = mechanics.initialPhase;
  const operation = mechanics.operations[0];
  if (
    mechanics.level !== 1 ||
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "self" ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 10 ||
    mechanics.attachment.kind !== "self" ||
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    initialPhase.effects?.length !== 1 ||
    mechanics.operations.length !== 1 ||
    operation === undefined
  ) {
    return null;
  }
  const initialEffect = initialPhase.effects[0];
  if (
    initialEffect?.kind !== "take_standard_action" ||
    initialEffect.action !== "dash" ||
    initialEffect.cost !== "included_in_effect" ||
    operation.trigger.kind !== "passive" ||
    operation.effect.kind !== "grant_alternate_action_cost" ||
    operation.effect.from.kind !== "standard_action" ||
    operation.effect.from.actions.length !== 1 ||
    operation.effect.from.actions[0] !== "dash" ||
    operation.effect.to.kind !== "bonus_action"
  ) {
    return null;
  }
  return {
    kind: "spellDashBonusAction",
    sourceSpellId: spell.id,
    sourceCombatantId: actorId,
    expiresAt: { kind: "concentration", combatantId: actorId },
  };
}

function discoverExpeditiousRetreatDashCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ExpeditiousRetreatDashInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return representedMovementSpeedKinds(actor).map((speedKind) => ({
    subject: {
      tag: "bonusActionDashSpell" as const,
      actorId,
      invocation: expeditiousRetreatDashInvocationRef(invocation),
      mode: { tag: "cast" as const },
      speedKind,
    },
    label: invocation.spell.name,
    summary: expeditiousRetreatDashCastSummary(invocation),
    initialHoles: [],
  }));
}

function expeditiousRetreatDashInvocationRef(
  invocation: ExpeditiousRetreatDashInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "expeditiousRetreatDash",
  };
}

function expeditiousRetreatDashCastSummary(
  invocation: ExpeditiousRetreatDashInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, immediately Dash, and keep Dash available as a Bonus Action while Concentration lasts.`;
}

function resolveExpeditiousRetreatDash(
  input: ExpeditiousRetreatDashResolveInput,
): BattleResolutionResult {
  const subject = input.input.subject;
  const actor = input.input.state.combatants.get(subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  if (!spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {})) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Expeditious Retreat accepts only spell-cast Reaction trigger facts.",
    );
  }
  if (!spellHasAvailableSpend(actor, input.invocation)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Expeditious Retreat no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(
      input.input.state.currentTurnResources,
      input.input.subject.actorId,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (!representedMovementSpeedKinds(actor).includes(subject.speedKind)) {
    return invalidResult(
      input.input.state,
      "unsupportedActOption",
      "Expeditious Retreat Dash speed kind is not represented for this combatant.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Expeditious Retreat is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState = spellRequiresVerbal(input.invocation.spell)
    ? revealHidden(input.input.state, subject.actorId)
    : input.input.state;
  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    spellCastReactionFrame({
      casterId: subject.actorId,
      invocation: input.invocation,
      targetIds: [subject.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
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

  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    castingState,
    subject.actorId,
  );
  const spent = spendActivationResource(spellCastState.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Expeditious Retreat Bonus Action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spent.right,
    input.input.subject.actorId,
  );
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = breakBattleConcentration(
    spellCastState,
    subject.actorId,
  );
  const slotted = expendSpellSlot(
    afterPriorConcentration,
    subject.actorId,
    input.invocation.resource.slotLevel,
  );
  const effectHost = slotted.combatants.get(subject.actorId);
  if (effectHost === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  const effectedActor = {
    ...effectHost,
    concentration: {
      sourceSpellId: input.invocation.spell.id,
      effectKind: "spellEffect" as const,
    },
    activeEffects: [...effectHost.activeEffects, input.invocation.activeEffect],
  };
  const effected = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
    combatants: new Map(slotted.combatants).set(subject.actorId, effectedActor),
  };
  const dashed = applyDashToActor(
    effected,
    effectedActor,
    subject.speedKind,
    effected.currentTurnResources,
  );
  return {
    tag: "resolved",
    state: dashed,
    snapshot: snapshotBattle(dashed),
  };
}

export const expeditiousRetreatDashProfile = {
  procedure: "expeditiousRetreatDash",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitExpeditiousRetreatDash,
  discoverCastAct: discoverExpeditiousRetreatDashCastAct,
  castSummary: expeditiousRetreatDashCastSummary,
  invocationRef: expeditiousRetreatDashInvocationRef,
  resolve: resolveExpeditiousRetreatDash,
} satisfies SpellProcedureProfile<
  "expeditiousRetreatDash",
  ExpeditiousRetreatDashInvocation,
  BonusActionDashSpellBattleResolutionInput
>;
