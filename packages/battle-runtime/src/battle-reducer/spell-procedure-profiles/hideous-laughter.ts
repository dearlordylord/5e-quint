// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hideous-laughter-repeat-save-lifecycle
//
// The hideousLaughter Spell Procedure Profile: action-time Spell Slot casting
// where target-list creatures make a Wisdom Saving Throw before failed-save
// targets receive Prone and Incapacitated spell effects with repeat Saving
// Throws at end of turn and on damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Hideous Laughter applies Prone and Incapacitated on a
//     failed Wisdom Saving Throw, prevents the target from ending Prone on
//     itself, repeats the save at end of target turn and on damage with
//     Advantage, and adds one target per Spell Slot level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Advantage, Condition, Prone,
//     Incapacitated, Magic Action, and Spell Invocation.

import type { SpellSlotLevel } from "@dnd/shared/types";
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
import { readiedSpellAct } from "../spells-discovery.ts";
import { oneAdditionalTargetPerSpellSlotAboveBaseLevel } from "./_save-gate-helpers.ts";
import { resolveHideousLaughterSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { SpellRuleExecutionFactsSchema, spellProcedureExecutionSchema } from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
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
  heightenedSpellTargetChoiceHole,
  spellTargetListHole,
} from "../spells-holes-fills.ts";

type HideousLaughterSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "hideousLaughter" }
>;

type HideousLaughterPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
};

type HideousLaughterResolveInput = SpellProcedureProfileResolveInput<
  HideousLaughterSpellInvocation,
  ActionSpellBattleResolutionInput
> & {
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitHideousLaughter(
  spell: HideousLaughterSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly HideousLaughterSpellInvocation[] {
  return supportedPreparedHideousLaughterProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  );
}

export function supportedPreparedHideousLaughterProfile(
  spell: HideousLaughterSpellInvocation["spell"],
  spellSlots: SpellAdmissionContext["actor"]["origin"]["spellcasting"]["spellSlots"],
): readonly HideousLaughterSpellInvocation[] {
  const hideousLaughter = hideousLaughterSpell(spell);
  if (hideousLaughter === null) {
    return [];
  }

  return spellSlots.flatMap(
    (slot): readonly HideousLaughterSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "hideousLaughter",
          spell,
          actionCost: "magicAction",
          ability: hideousLaughter.phase.ability,
          dc: hideousLaughter.phase.dc,
          targeting: hideousLaughter.targeting(slot.spellLevel),
        },
      ];
    },
  );
}

function hideousLaughterSpell(spell: HideousLaughterSpellInvocation["spell"]): {
  readonly phase: HideousLaughterPhase;
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
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    !isHideousLaughterPhase(phase)
  ) {
    return null;
  }
  const targetCountBySlot = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  const targetKinds = phase.attachment.value.selection.targetKinds;
  if (
    targetCountBySlot === null ||
    targetKinds?.length !== 1 ||
    targetKinds[0] !== "creature"
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

function isHideousLaughterPhase(
  phase: ActivationPhase | undefined,
): phase is HideousLaughterPhase {
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    failedEffects.length === 3 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "apply_condition" && effect.condition === "prone",
    ).length === 1 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "apply_condition" &&
        effect.condition === "incapacitated",
    ).length === 1 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "suppress_condition_self_end" &&
        effect.condition === "prone",
    ).length === 1 &&
    repeatSaves.length === 2 &&
    repeatSaves.some(
      (repeatSave) =>
        repeatSave.cadence === "end_of_target_turn" &&
        repeatSave.rollMode === undefined &&
        repeatSave.onSuccess === "ends_on_target" &&
        repeatSave.onFailAgain === undefined,
    ) &&
    repeatSaves.some(
      (repeatSave) =>
        repeatSave.cadence === "on_target_takes_damage" &&
        repeatSave.rollMode === "advantage" &&
        repeatSave.onSuccess === "ends_on_target" &&
        repeatSave.onFailAgain === undefined,
    )
  );
}

function discoverHideousLaughterCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HideousLaughterSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const baseCastAct = hideousLaughterCastAct(actorId, invocation, [targetHole]);
  const metamagicCastActs = hideousLaughterMetamagicCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
    baseCastAct,
  });
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function hideousLaughterMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState;
  readonly invocation: BattleExecutableSpellInvocation<HideousLaughterSpellInvocation>;
  readonly targetHole: BattleHole;
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
        ...hideousLaughterMetamagicInitialHoles(
          input.state,
          input.actorId,
          input.invocation,
          spellMetamagicApplications(input.actor, metamagic),
        ),
      ],
    };
  });
}

function hideousLaughterCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<HideousLaughterSpellInvocation>,
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

function hideousLaughterMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HideousLaughterSpellInvocation>,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const holes: BattleHole[] = [];
  if (
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}


function resolveHideousLaughter(
  input: HideousLaughterResolveInput,
): BattleResolutionResult {
  return resolveHideousLaughterSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const HideousLaughterInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("hideousLaughter"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
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
export const hideousLaughterProfile = {
  procedure: "hideousLaughter",
  executionSchema: HideousLaughterInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  admit: admitHideousLaughter,
  discoverCastAct: discoverHideousLaughterCastAct,
  resolve: resolveHideousLaughter,
} satisfies SpellProcedureProfile<
  "hideousLaughter",
  HideousLaughterSpellInvocation,
  ActionSpellBattleResolutionInput
>;
