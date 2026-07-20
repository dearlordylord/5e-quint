// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
import type {
  BattleSpellCastReactionFactsHole,
  BattleSpellCastReactionFact,
  BattleInterruptedProcedure,
  BattleInterruptCheckpointInput,
  BattleSpellCastingTimeResource,
  SpellComponent,
  BattleExecutableSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";

export function spellCastReactionFactsHole(input: {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
}): BattleSpellCastReactionFactsHole {
  const resource = input.invocation.resource;
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    holeInstanceKey: SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
    label: "Spell-cast Reaction facts",
    spellBeingCast: {
      casterId: input.casterId,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      castLevel:
        resource.tag === "spellSlot"
          ? Number(resource.slotLevel)
          : spellExecutionLevel(input.invocation),
      components: spellComponents(input.invocation),
    },
    requiresTableSpatialFact: true,
  };
}

export function spellCastInterruptFrame(input: {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetIds: readonly CombatantId[];
  readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
  readonly castingResource: BattleSpellCastingTimeResource;
  readonly continuation: BattleInterruptedProcedure;
}): Extract<BattleInterruptCheckpointInput, { readonly trigger: "spellCast" }> {
  const resource = input.invocation.resource;
  return {
    trigger: "spellCast",
    casterId: input.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    castLevel:
      resource.tag === "spellSlot"
        ? Number(resource.slotLevel)
        : spellExecutionLevel(input.invocation),
    components: spellComponents(input.invocation),
    castingResource: input.castingResource,
    spellSlotCommitment:
      resource.tag === "spellSlot"
        ? { kind: "pendingCasterSpellSlot" }
        : { kind: "none" },
    targetIds: input.targetIds,
    reactionSpellTargetFacts: input.reactionSpellTargetFacts,
    continuation: input.continuation,
  };
}

export function spellComponents(
  invocation: BattleExecutableSpellInvocation,
): readonly SpellComponent[] {
  const components = invocation.spellRuleFacts.components;
  return [
    ...(components.verbal ? (["V"] as const) : []),
    ...(components.somatic ? (["S"] as const) : []),
    ...(components.hasMaterial ? (["M"] as const) : []),
  ];
}

function spellExecutionLevel(
  invocation: BattleExecutableSpellInvocation,
): number {
  return invocation.spellRuleFacts.level;
}
