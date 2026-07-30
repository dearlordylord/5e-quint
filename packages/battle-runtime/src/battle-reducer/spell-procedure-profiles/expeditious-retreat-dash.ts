import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-expeditious-retreat-dash
import { ConcentrationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
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
import { Either } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "../spells-invocation-guards.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { CombatantId } from "../../identity.ts";
import { allocateBattleActiveEffectRef } from "../../active-effect/execution-ref.ts";
import { applyDashToActor } from "../mobility-actions.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { revealHidden } from "../hole-helpers.ts";
import { representedMovementSpeedKinds } from "../movement-speed.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "../spell-turn-resources.ts";
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
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ExpeditiousRetreatDashInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "expeditiousRetreatDash" }
>;

const SpellDashBonusActionEffectSchema = Schema.Struct({
  kind: Schema.Literal("spellDashBonusAction"),
  sourceCombatantId: CombatantId,
  expiresAt: ConcentrationBattleActiveEffectExpirationSchema,
});
type ExpeditiousRetreatDashResolveInput =
  SpellProcedureProfileResolveInput<ExpeditiousRetreatDashInvocation>;

function admitExpeditiousRetreatDash(
  spell: BattleSpellAdmissionSource,
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
  spell: BattleSpellAdmissionSource,
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
    sourceCombatantId: actorId,
    expiresAt: { kind: "concentration", combatantId: actorId },
  };
}

function discoverExpeditiousRetreatDashCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ExpeditiousRetreatDashInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return representedMovementSpeedKinds(actor).map((speedKind) => ({
    subject: {
      tag: "bonusActionDashSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" as const },
      speedKind,
    },
    initialHoles: [],
  }));
}

function resolveExpeditiousRetreatDash(
  input: ExpeditiousRetreatDashResolveInput,
): BattleResolutionResult {
  const subject = input.input.subject;
  const actor = input.input.state.combatants.get(subject.actorId);
  /* v8 ignore start -- Internal routing invariant: public resolution verifies that the admitted spell subject still has a battle actor before dispatching to this profile. */
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Expeditious Retreat accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed replay subject: ordinary discovery emits one Expeditious Retreat act for each represented movement speed kind and cannot emit an unrelated kind. */
  if (!representedMovementSpeedKinds(actor).includes(subject.speedKind)) {
    return invalidResult(
      input.input.state,
      "unsupportedActOption",
      "Expeditious Retreat Dash speed kind is not represented for this combatant.",
    );
  }
  /* v8 ignore stop */
  if (
    activeOngoingFeaturesPreventSpellInvocation(
      input.input.state,
      actor,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Expeditious Retreat is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  /* v8 ignore start -- Admitted Expeditious Retreat always has its SRD Verbal component; the non-revealing branch is retained only by the generic spell-facts shape. */
  const castingState = input.invocation.spellRuleFacts.components.verbal
    ? revealHidden(input.input.state, subject.actorId)
    : input.input.state;
  /* v8 ignore stop */
  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [subject.actorId],
    { kind: "bonusAction" },
    undefined,
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
  /* v8 ignore start -- Internal preflight invariant: spellActTurnResourceAvailable immediately above proved the same unchanged action-economy state can spend this Bonus Action. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Expeditious Retreat Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spent.right,
    input.input.subject.actorId,
  );
  /* v8 ignore start -- Internal preflight invariant: spellActTurnResourceAvailable already proved this actor has no Spell Slot use in the unchanged turn-resource state. */
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Internal roster invariant: the caster lookup succeeded above, and concentration teardown plus Spell Slot expenditure do not remove combatants. */
  if (effectHost === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const allocation = allocateBattleActiveEffectRef({
    state: slotted,
    ownerId: subject.actorId,
  });
  /* v8 ignore start -- Internal roster invariant: effectHost immediately proved the same allocation state contains this effect owner. */
  if (allocation.tag === "ownerNotFound") {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  /* v8 ignore stop */
  const effectedActor = {
    ...allocation.owner,
    concentration: {
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      effectKind: "spellEffect" as const,
    },
    activeEffects: [
      ...effectHost.activeEffects,
      {
        ...input.invocation.activeEffect,
        effectRef: allocation.effectRef,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
      },
    ],
  };
  const effected = {
    ...allocation.state,
    currentTurnResources: slotTurnResources.right,
    combatants: new Map(allocation.state.combatants).set(
      subject.actorId,
      effectedActor,
    ),
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

const ExpeditiousRetreatDashInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("expeditiousRetreatDash"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: SpellDashBonusActionEffectSchema,
  }),
);
export const expeditiousRetreatDashProfile = {
  procedure: "expeditiousRetreatDash",
  executionSchema: ExpeditiousRetreatDashInvocationSchema,
  admit: admitExpeditiousRetreatDash,
  discoverCastAct: discoverExpeditiousRetreatDashCastAct,
  resolve: resolveExpeditiousRetreatDash,
} satisfies SpellProcedureDeclaration<
  "expeditiousRetreatDash",
  ExpeditiousRetreatDashInvocation
>;
