// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel
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

import {
  movementFeet,
  spellSlotLevel,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  ActivationPhase,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resources.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic.ts";
import {
  carefulSpellProtectedTargetsHole,
  commandOptionChoiceHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowTargeting,
  spellTargetListHole,
} from "../spells-holes-fills.ts";
import { oneAdditionalTargetPerSpellSlotAboveBaseLevel } from "./_save-gate-helpers.ts";
import { resolveCommandSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

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
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
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
        rangeFeet: command.rangeFeet,
      },
    ];
  });
}

function commandSpell(spell: CommandSpellInvocation["spell"]): {
  readonly phase: CommandPhase;
  readonly targeting: (
    slotLevel: SpellSlotLevel,
  ) => Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly rangeFeet: CommandSpellInvocation["rangeFeet"];
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
    rangeFeet: movementFeet(spell.mechanics.range.feet),
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
  invocation: CommandSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const commandOptionHole = commandOptionChoiceHole(invocation);
  const baseCastAct = commandCastAct(
    actorId,
    invocation,
    [targetHole, commandOptionHole],
    invocation.spell.name,
    commandCastSummaryWithSavingThrow(invocation),
  );
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
  readonly invocation: CommandSpellInvocation;
  readonly targetHole: BattleHole;
  readonly commandOptionHole: BattleHole;
  readonly baseCastAct: AvailableBattleAct;
}): readonly AvailableBattleAct[] {
  return discoverSpellMetamagicSelections({
    actor: input.actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const label = spellMetamagicLabel(metamagic);
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
      label: `${input.invocation.spell.name} (${label})`,
      summary: `${input.baseCastAct.summary} Cast with ${label}.`,
    };
  });
}

function commandCastAct(
  actorId: CombatantId,
  invocation: CommandSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: commandInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function commandMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: CommandSpellInvocation,
  metamagicApplications: readonly CharacterBattleMetamagicOptionFact[],
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

function commandInvocationRef(
  invocation: CommandSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "command",
  };
}

function commandCastSummary(invocation: CommandSpellInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function commandCastSummaryWithSavingThrow(
  invocation: CommandSpellInvocation,
): string {
  return `${commandCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws. Failed targets follow the selected command on their next turns.`;
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

const CommandInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "command" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("command"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const commandProfile = {
  procedure: "command",
  invocationSchema: CommandInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitCommand,
  discoverCastAct: discoverCommandCastAct,
  castSummary: commandCastSummary,
  invocationRef: commandInvocationRef,
  resolve: resolveCommand,
} satisfies SpellProcedureProfile<
  "command",
  CommandSpellInvocation,
  ActionSpellBattleResolutionInput
>;
