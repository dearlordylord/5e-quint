import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.reaction-counterspell
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
import { DcSourceSchema } from "@dnd/surface/surface/schema";
//
// The Counterspell Spell Procedure Profile: a prepared Reaction spell that
// interrupts a visible spell cast within range, asks for the
// triggering caster's Constitution Saving Throw, and ends the triggering spell
// on a failed save.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Counterspell": Reaction when seeing a creature within
//     60 feet casting a spell with V/S/M components; range 60 feet; S
//     component; instantaneous; target makes a Constitution save; on failure
//     the spell dissipates with no effect and its action, Bonus Action, or
//     Reaction is wasted while a used slot is not expended.
//   - SRD 5.2.1 Playing the Game "Reactions": a Reaction is an instant
//     response to a trigger and an interrupting Reaction returns control after
//     the Reaction.
//   - UBIQUITOUS_LANGUAGE.md: Reaction, Casting Time, Cast Level.

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Either } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleInterruptCheckpoint,
  type BattleInterruptCheckpointFrame,
  type BattleResolutionResult,
  type BattleState,
  type BattleTurnResources,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  snapshotBattle,
  interruptedProcedureSubject,
} from "../interrupt-execution.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { counterspellReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import {
  spellSavingThrowOutcomeHole,
  spellSavingThrowOutcomeHoleId,
} from "../spells-damage-fills.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { validateSavingThrowOutcomes } from "../spells-resolve-save-gates.ts";
import {
  markSpellSlotExpendedThisTurn,
  releasePendingSpellSlotUseThisTurn,
} from "../spell-turn-resources.ts";
import { spendSpellCastMetamagicResources } from "../spells-resolve-resources.ts";
import { hasSaveGateRepeatSaves } from "./_save-gate-helpers.ts";
import { Schema } from "effect";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  preparedSpellSlotInvocations,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  type SpellAdmissionContext,
  type SpellProcedureDeclaration,
  type SpellProcedureProfileResolveInput,
} from "./profile.ts";

type CounterspellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "counterspell" }
>;
type CounterspellResolveInput =
  SpellProcedureProfileResolveInput<CounterspellInvocation>;

function admitCounterspell(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly CounterspellInvocation[] {
  const projection = counterspellSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return preparedSpellSlotInvocations(spell, ctx, (base) => ({
    ...base,
    procedure: "counterspell",
    ...projection,
  }));
}

function counterspellSpellProjection(
  spell: BattleSpellAdmissionSource,
): Pick<
  CounterspellInvocation,
  "ability" | "dc" | "targeting" | "rangeFeet" | "triggerComponents"
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
    phase.autoSuccessIfCasterSlotGte !== undefined
  ) {
    return null;
  }
  return {
    triggerComponents: ["V", "S", "M"],
    ability: phase.ability,
    dc: phase.dc,
    targeting: { kind: "singleCombatant" },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

/* v8 ignore next -- Reaction-only profile: Counterspell candidates are admitted from matching spell-cast interrupt frames, so ordinary turn discovery must return no acts. */
function discoverCounterspellCastAct(): readonly BattleActDiscoveryCandidate[] {
  return [];
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Counterspell targets the caster from the spell-cast trigger and uses only that caster's Constitution Saving Throw when needed.",
    );
  }
  /* v8 ignore stop */

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
    input.invocation,
    input.input.state,
    input.input.subject.reactorId,
    input.input.frame.casterId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }
  /* v8 ignore stop */
  const outcome = input.fillSet.savingThrowOutcomes.outcomes[0];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcome === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Counterspell requires the triggering caster's Saving Throw outcome.",
    );
  }
  /* v8 ignore stop */
  const triggeringCasterSaveSucceeded = outcome.succeeded;

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
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const interruptFrame = state.interruptStack[state.interruptStack.length - 1];
  const spellCastCheckpoint =
    interruptFrame?.kind === "interruptCheckpoint"
      ? interruptFrame.frame
      : null;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellCastCheckpoint?.trigger !== "spellCast") {
    return {
      tag: "invalid",
      message:
        "Counterspell can only end the current spell-cast interrupt checkpoint.",
    };
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Either.isLeft(wastedResources)) {
    return {
      tag: "invalid",
      message: wastedResources.left,
    };
  }
  /* v8 ignore stop */
  const metamagicSpend = spendSpellCastMetamagicResources({
    state: { ...state, currentTurnResources: wastedResources.right },
    actorId: frame.casterId,
    applications:
      frame.metamagicCommitment.kind === "none"
        ? []
        : frame.metamagicCommitment.applications,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (Either.isLeft(metamagicSpend)) {
    return { tag: "invalid", message: metamagicSpend.left };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    state: {
      ...metamagicSpend.right,
      interruptStack: [
        ...state.interruptStack.slice(0, -1),
        counterspellReactionInterruptFrame({
          ...spellCastCheckpoint,
          offeredResponders: spellCastCheckpoint.eligibleResponders,
          continuation: {
            kind: "resolved",
            subject: interruptedProcedureSubject(
              spellCastCheckpoint.continuation,
            ),
          },
        }),
      ],
    },
  };
}

function turnResourcesAfterWastedSpellCastingResource(
  resources: BattleTurnResources,
  frame: Extract<BattleInterruptCheckpoint, { readonly trigger: "spellCast" }>,
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
  frame: BattleInterruptCheckpoint,
): BattleInterruptCheckpointFrame {
  return { kind: "interruptCheckpoint", frame };
}

const CounterspellInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("counterspell"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    triggerComponents: Schema.Array(Schema.Literal("V", "S", "M")),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
    rangeFeet: MovementFeet,
  }),
);
export const counterspellProfile = {
  procedure: "counterspell",
  executionSchema: CounterspellInvocationSchema,
  admit: admitCounterspell,
  discoverCastAct: discoverCounterspellCastAct,
  resolve: resolveCounterspell,
} satisfies SpellProcedureDeclaration<"counterspell", CounterspellInvocation>;
