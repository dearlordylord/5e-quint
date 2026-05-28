// UNIT-PROFILE-COVERAGE: runtime-owner spell.reaction-counterspell
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME
//
// The Counterspell Spell Procedure Profile: a prepared Reaction spell that
// interrupts a visible spell cast within range, optionally asks for the
// triggering caster's Constitution Saving Throw, and ends the triggering spell
// on a failed save or sufficient Counterspell slot level.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Counterspell": Reaction when seeing a creature within
//     60 feet casting a spell with V/S/M components; range 60 feet; S
//     component; instantaneous; target makes a Constitution save; on failure
//     the spell dissipates with no effect and its action, Bonus Action, or
//     Reaction is wasted while a used slot is not expended; using a sufficient
//     slot automatically ends the spell.
//   - SRD 5.2.1 Playing the Game "Reactions": a Reaction is an instant
//     response to a trigger and an interrupting Reaction returns control after
//     the Reaction.
//   - UBIQUITOUS_LANGUAGE.md: Reaction, Casting Time, Cast Level.

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AvailableBattleAct,
  type BattleReactionFrame,
  type BattleReactionInterruptFrame,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleState,
  type BattleTurnResources,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import { spellId } from "../../identity.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { counterspellReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { spellSavingThrowOutcomeHole } from "../spells-damage-fills.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
import {
  markSpellSlotExpendedThisTurn,
  releasePendingSpellSlotUseThisTurn,
} from "../spell-turn-resources.ts";
import {
  type SpellAdmissionContext,
  type SpellProcedureProfile,
  type SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { hasSaveGateRepeatSaves } from "./_save-gate-helpers.ts";

type CounterspellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "counterspell" }
>;
type CounterspellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >
> & {
  readonly frame: BattleReactionFrame;
};
type CounterspellResolveInput = SpellProcedureProfileResolveInput<
  CounterspellInvocation,
  CounterspellBattleResolutionInput
>;

function admitCounterspell(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly CounterspellInvocation[] {
  const projection = counterspellSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly CounterspellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "counterspell",
              spell,
              ...projection,
            },
          ],
  );
}

function counterspellSpellProjection(
  spell: SpellRecord,
): Pick<
  CounterspellInvocation,
  "ability" | "dc" | "targeting" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "creature_casts_spell" ||
    !sameStringSet(spell.mechanics.castingTime.trigger.components ?? [], [
      "V",
      "S",
      "M",
    ]) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    !spell.mechanics.components.s ||
    spell.mechanics.components.v ||
    spell.mechanics.components.m ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    !spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "negate_triggering_spell" ||
    phase.onSuccess.kind !== "none" ||
    phase.autoSuccessIfCasterSlotGte !== "triggering_spell_level"
  ) {
    return null;
  }
  return {
    ability: phase.ability,
    dc: phase.dc,
    targeting: { kind: "singleCombatant" },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function discoverCounterspellCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function counterspellInvocationRef(
  invocation: CounterspellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "counterspell",
  };
}

function counterspellCastSummary(invocation: CounterspellInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveCounterspell(
  input: CounterspellResolveInput,
): BattleResolutionResult {
  if (
    input.input.frame.trigger !== "spellCast" ||
    !counterspellReactionSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
      input.input.subject.reactorId,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Counterspell requires a matching spell-cast Reaction trigger.",
    );
  }
  if (
    !spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {
      allowSavingThrowOutcomes: true,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Counterspell targets the caster from the spell-cast trigger and uses only that caster's Constitution Saving Throw when needed.",
    );
  }

  const countersAutomatically =
    Number(input.invocation.resource.slotLevel) >= input.input.frame.castLevel;
  if (
    countersAutomatically &&
    input.fillSet.savingThrowOutcomes !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Counterspell cast with a sufficient spell slot does not use a Saving Throw outcome.",
    );
  }

  let triggeringCasterSaveSucceeded = false;
  if (!countersAutomatically) {
    const savingThrowHole = spellSavingThrowOutcomeHole(
      input.input.state,
      input.input.subject.reactorId,
      input.invocation,
    );
    if (input.fillSet.savingThrowOutcomes === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        savingThrowHole,
      ]);
    }
    const validation = validateSavingThrowOutcomes(
      input.fillSet.savingThrowOutcomes,
      savingThrowHole,
      input.input.state,
      input.input.subject.reactorId,
      input.input.frame.casterId,
    );
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
    const outcome = input.fillSet.savingThrowOutcomes.outcomes[0];
    if (outcome === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Counterspell requires the triggering caster's Saving Throw outcome.",
      );
    }
    triggeringCasterSaveSucceeded = outcome.succeeded;
  }

  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const slotted = expendSpellSlot(
    castingState,
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
  const counterspellState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  if (triggeringCasterSaveSucceeded) {
    return {
      tag: "resolved",
      state: counterspellState,
      snapshot: snapshotBattle(counterspellState),
    };
  }

  const counteredState = stateAfterCounteredSpellCast(
    counterspellState,
    input.input.frame,
  );
  if (counteredState.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "staleSubject",
      counteredState.message,
    );
  }
  return {
    tag: "resolved",
    state: counteredState.state,
    snapshot: snapshotBattle(counteredState.state),
  };
}

function stateAfterCounteredSpellCast(
  state: BattleState,
  frame: Extract<BattleReactionFrame, { readonly trigger: "spellCast" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const interruptFrame = state.interruptStack[state.interruptStack.length - 1];
  const reactionFrame =
    interruptFrame?.kind === "reaction" ? interruptFrame.frame : null;
  if (reactionFrame?.trigger !== "spellCast") {
    return {
      tag: "invalid",
      message:
        "Counterspell can only end the current spell-cast Reaction frame.",
    };
  }
  const releasedResources =
    frame.spellSlotCommitment.kind === "none"
      ? state.currentTurnResources
      : releasePendingSpellSlotUseThisTurn(
          state.currentTurnResources,
          frame.casterId,
        );
  const wastedResources = turnResourcesAfterWastedSpellCastingResource(
    releasedResources,
    frame,
  );
  if (Either.isLeft(wastedResources)) {
    return {
      tag: "invalid",
      message: wastedResources.left,
    };
  }
  return {
    tag: "ok",
    state: {
      ...state,
      currentTurnResources: wastedResources.right,
      interruptStack: [
        ...state.interruptStack.slice(0, -1),
        counterspellReactionInterruptFrame({
          ...reactionFrame,
          offeredReactors: reactionFrame.eligibleReactors,
          continuation: {
            kind: "resolved",
            subject: reactionFrame.continuation.subject,
          },
        }),
      ],
    },
  };
}

function turnResourcesAfterWastedSpellCastingResource(
  resources: BattleTurnResources,
  frame: Extract<BattleReactionFrame, { readonly trigger: "spellCast" }>,
): Either.Either<BattleTurnResources, string> {
  if (frame.castingResource.kind === "magicAction") {
    const spent = spendAction(resources, "magic");
    return Either.isLeft(spent)
      ? Either.left(
          "Magic action is no longer available for the countered spell.",
        )
      : Either.right(spent.right);
  }
  if (frame.castingResource.kind === "bonusAction") {
    const spent = spendActivationResource(resources, { kind: "bonusAction" });
    return Either.isLeft(spent)
      ? Either.left(
          "Bonus Action is no longer available for the countered spell.",
        )
      : Either.right(spent.right);
  }
  return Either.right(resources);
}

function counterspellReactionInterruptFrame(
  frame: BattleReactionFrame,
): BattleReactionInterruptFrame {
  return { kind: "reaction", frame };
}

export const counterspellProfile = {
  procedure: "counterspell",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitCounterspell,
  discoverCastAct: discoverCounterspellCastAct,
  castSummary: counterspellCastSummary,
  invocationRef: counterspellInvocationRef,
  resolve: resolveCounterspell,
} satisfies SpellProcedureProfile<
  "counterspell",
  CounterspellInvocation,
  CounterspellBattleResolutionInput
>;
