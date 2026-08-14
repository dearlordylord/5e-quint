// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
import type {
  BattleSpellCastReactionFactsHole,
  BattleSpellCastReactionFact,
  BattleInterruptedProcedure,
  BattleInterruptCheckpointInput,
  BattleSpellCastingTimeResource,
  SpellComponent,
  BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { spellInvocationCastLevel } from "./spells-effective-level.ts";

export function spellCastReactionFactsHole(input: {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
}): BattleSpellCastReactionFactsHole {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    holeInstanceKey: SPELL_CAST_REACTION_FACTS_HOLE_INSTANCE,
    label: "Spell-cast Reaction facts",
    spellBeingCast: {
      casterId: input.casterId,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      castLevel: spellInvocationCastLevel(input.invocation),
      components: spellComponents(input.invocation),
    },
    requiresTableSpatialFact: true,
  };
}

type SpellCastInterruptFrameInput = {
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetIds: readonly CombatantId[];
  readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
  readonly castingResource: BattleSpellCastingTimeResource;
  readonly continuation: BattleInterruptedProcedure;
} & (
  | { readonly metamagicApplications?: never }
  | {
      readonly metamagicApplications: readonly [
        CharacterBattleMetamagicOptionFact,
        ...CharacterBattleMetamagicOptionFact[],
      ];
    }
);

export function spellCastMetamagicApplicationsInput(
  applications: readonly CharacterBattleMetamagicOptionFact[],
):
  | { readonly metamagicApplications?: never }
  | {
      readonly metamagicApplications: readonly [
        CharacterBattleMetamagicOptionFact,
        ...CharacterBattleMetamagicOptionFact[],
      ];
    } {
  return applications.length === 0
    ? {}
    : {
        metamagicApplications: [applications[0], ...applications.slice(1)],
      };
}

export function spellCastInterruptFrame(
  input: SpellCastInterruptFrameInput,
): Extract<BattleInterruptCheckpointInput, { readonly trigger: "spellCast" }> {
  const resource = input.invocation.resource;
  return {
    trigger: "spellCast",
    casterId: input.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    castLevel: spellInvocationCastLevel(input.invocation),
    components: spellComponents(input.invocation),
    castingResource: input.castingResource,
    paymentCommitment:
      resource.tag === "spellSlot"
        ? { kind: "pendingCasterSpellSlot" }
        : resource.tag === "spellAccessFreeCast"
          ? {
              kind: "spellAccessFreeCast",
              resourcePoolRef: resource.resourcePoolRef,
            }
          : { kind: "none" },
    metamagicCommitment:
      input.metamagicApplications === undefined
        ? { kind: "none" }
        : {
            kind: "applications",
            applications: input.metamagicApplications,
          },
    concentrationCommitment:
      input.invocation.spellRuleFacts.duration.kind === "concentration"
        ? { kind: "breakExisting" }
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
