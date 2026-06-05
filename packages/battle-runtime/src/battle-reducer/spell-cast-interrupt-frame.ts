// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME
import type {
  BattleSpellCastReactionFactsHole,
  BattleSpellCastReactionFact,
  BattleInterruptedProcedure,
  BattleInterruptCheckpointInput,
  BattleSpellCastingTimeResource,
  SpellComponent,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";

export function spellCastReactionFactsHole(input: {
  readonly casterId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): BattleSpellCastReactionFactsHole {
  const resource = input.invocation.resource;
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    holeInstanceKey: SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
    label: `${input.invocation.spell.name} spell-cast Reaction facts`,
    spellBeingCast: {
      casterId: input.casterId,
      spellId: spellId(input.invocation.spell.id),
      castLevel:
        resource.tag === "spellSlot"
          ? Number(resource.slotLevel)
          : input.invocation.spell.mechanics.level,
      components: spellComponents(input.invocation),
    },
    requiresTableSpatialFact: true,
  };
}

export function spellCastInterruptFrame(input: {
  readonly casterId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly targetIds: readonly CombatantId[];
  readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
  readonly castingResource: BattleSpellCastingTimeResource;
  readonly continuation: BattleInterruptedProcedure;
}): Extract<BattleInterruptCheckpointInput, { readonly trigger: "spellCast" }> {
  const resource = input.invocation.resource;
  return {
    trigger: "spellCast",
    casterId: input.casterId,
    spellId: input.invocation.spell.id,
    castLevel:
      resource.tag === "spellSlot"
        ? Number(resource.slotLevel)
        : input.invocation.spell.mechanics.level,
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
  invocation: SupportedSpellInvocation,
): readonly SpellComponent[] {
  const components = invocation.spell.mechanics.components;
  return [
    ...(components.v ? (["V"] as const) : []),
    ...(components.s ? (["S"] as const) : []),
    ...(components.m ? (["M"] as const) : []),
  ];
}
