// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The command Spell Procedure Profile: action-time Spell Slot casting where
// target-list creatures make a Wisdom Saving Throw before failed-save targets
// receive a table-selected next-turn Command option.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Command names five options: Approach, Drop, Flee,
//     Grovel, and Halt. Failed-save targets follow the selected command on
//     their next turn, and higher-level slots add one target per Spell Slot
//     level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Table Decisions, Saving Throw, Turn, Prone,
//     Magic Action, and Spell Invocation.

import { spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type {
  ActivationPhase,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import { oneAdditionalTargetPerSpellSlotAboveBaseLevel } from "./_save-gate-helpers.ts";
import { resolveCommandSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { SpellRuleExecutionFactsSchema, spellProcedureExecutionSchema } from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  type SpellMetamagicApplicationFact,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  commandOptionChoiceHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowTargeting,
  spellTargetListHole,
} from "../spells-holes-fills.ts";

type CommandSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "command" }
>;

type CommandPhase = Extract<ActivationPhase, { readonly kind: "save_gate" }> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
  readonly onFail: {
    readonly kind: "command_target_next_turn";
    readonly execution: "target_next_turn";
    readonly options: {
      readonly approach: {
        readonly route: "shortest_direct_to_caster";
        readonly endsTurnWhenWithinFeet: 5;
      };
      readonly drop: {
        readonly objectSet: "held_objects";
        readonly afterward: "end_turn";
      };
      readonly flee: {
        readonly direction: "away_from_caster";
        readonly means: "fastest_available";
        readonly duration: "target_turn";
      };
      readonly grovel: {
        readonly condition: "prone";
        readonly afterward: "end_turn";
      };
      readonly halt: {
        readonly movement: "none";
        readonly action: "none";
        readonly bonusAction: "none";
        readonly duration: "target_turn";
      };
    };
  };
};

type CommandResolveInput = SpellProcedureProfileResolveInput<
  CommandSpellInvocation,
  ActionSpellBattleResolutionInput
> & {
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitCommand(
  spell: CommandSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly CommandSpellInvocation[] {
  return supportedPreparedCommandProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  );
}

export function supportedPreparedCommandProfile(
  spell: CommandSpellInvocation["spell"],
  spellSlots: SpellAdmissionContext["actor"]["origin"]["spellcasting"]["spellSlots"],
): readonly CommandSpellInvocation[] {
  const command = commandSpell(spell);
  if (command === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly CommandSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "command",
        spell,
        actionCost: "magicAction",
        ability: command.phase.ability,
        dc: command.phase.dc,
        targeting: command.targeting(slot.spellLevel),
      },
    ];
  });
}

function commandSpell(spell: CommandSpellInvocation["spell"]): {
  readonly phase: CommandPhase;
  readonly targeting: (
    slotLevel: SpellSlotLevel,
  ) => Extract<SpellTargeting, { readonly kind: "targetList" }>;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1 ||
    !isCommandPhase(phase)
  ) {
    return null;
  }
  const targetSelection = phase.attachment.value.selection;
  const targetCountBySlot = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.targetKinds?.length !== 1 ||
    targetSelection.targetKinds[0] !== "creature" ||
    targetCountBySlot === null ||
    targetCountBySlot(spellSlotLevel(spell.mechanics.level)) !== 1
  ) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
  };
}

function isCommandPhase(
  phase: ActivationPhase | undefined,
): phase is CommandPhase {
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  return (
    phase?.kind === "save_gate" &&
    phase.repeatSaves === undefined &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    failedEffect?.kind === "command_target_next_turn" &&
    failedEffect.execution === "target_next_turn" &&
    failedEffect.options.approach.route === "shortest_direct_to_caster" &&
    failedEffect.options.approach.endsTurnWhenWithinFeet === 5 &&
    failedEffect.options.drop.objectSet === "held_objects" &&
    failedEffect.options.drop.afterward === "end_turn" &&
    failedEffect.options.flee.direction === "away_from_caster" &&
    failedEffect.options.flee.means === "fastest_available" &&
    failedEffect.options.flee.duration === "target_turn" &&
    failedEffect.options.grovel.condition === "prone" &&
    failedEffect.options.grovel.afterward === "end_turn" &&
    failedEffect.options.halt.movement === "none" &&
    failedEffect.options.halt.action === "none" &&
    failedEffect.options.halt.bonusAction === "none" &&
    failedEffect.options.halt.duration === "target_turn"
  );
}

function discoverCommandCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CommandSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const commandOptionHole = commandOptionChoiceHole(invocation);
  const baseCastAct = commandCastAct(actorId, invocation, [
    targetHole,
    commandOptionHole,
  ]);
  const metamagicCastActs = commandMetamagicCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
    commandOptionHole,
    baseCastAct,
  });
  return [baseCastAct, ...metamagicCastActs];
}

function commandMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState;
  readonly invocation: BattleExecutableSpellInvocation<CommandSpellInvocation>;
  readonly targetHole: BattleHole;
  readonly commandOptionHole: BattleHole;
  readonly baseCastAct: BattleActDiscoveryCandidate;
}): readonly BattleActDiscoveryCandidate[] {
  return discoverSpellMetamagicSelections({
    actor: input.actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles: [
        input.targetHole,
        ...commandMetamagicInitialHoles(
          input.state,
          input.actorId,
          input.invocation,
          spellMetamagicApplications(input.actor, metamagic),
        ),
        input.commandOptionHole,
      ],
    };
  });
}

function commandCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<CommandSpellInvocation>,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}

function commandMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CommandSpellInvocation>,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}


function resolveCommand(input: CommandResolveInput): BattleResolutionResult {
  return resolveCommandSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const CommandInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("command"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
  }),
);
export const commandProfile = {
  procedure: "command",
  executionSchema: CommandInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  admit: admitCommand,
  discoverCastAct: discoverCommandCastAct,
  resolve: resolveCommand,
} satisfies SpellProcedureProfile<
  "command",
  CommandSpellInvocation,
  ActionSpellBattleResolutionInput
>;
