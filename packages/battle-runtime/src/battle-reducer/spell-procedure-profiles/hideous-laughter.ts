import { optionalProperty } from "../../optional-property.ts";
import { discoverTargetSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-hideous-laughter-repeat-save-lifecycle
//
// The saveGatedConditionWithRepeat Spell Procedure Profile: action-time Spell Slot casting
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
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { oneAdditionalTargetPerSpellSlotAboveBaseLevel } from "./_save-gate-helpers.ts";
import { resolveSaveGatedConditionWithRepeatSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  preparedSpellSlotInvocationsFrom,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellTargetListHole } from "../spells-holes-fills.ts";

type SaveGatedConditionWithRepeatSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionWithRepeat" }
>;

type SaveGatedConditionWithRepeatPhase = Extract<
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

type SaveGatedConditionWithRepeatResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionWithRepeatSpellInvocation>;

function admitSaveGatedConditionWithRepeat(
  spell: SaveGatedConditionWithRepeatSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedConditionWithRepeatSpellInvocation[] {
  return supportedPreparedSaveGatedConditionWithRepeatProfile(
    spell,
    ctx.spellCastOptions,
  );
}

export function supportedPreparedSaveGatedConditionWithRepeatProfile(
  spell: SaveGatedConditionWithRepeatSpellInvocation["spell"],
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SaveGatedConditionWithRepeatSpellInvocation[] {
  const saveGatedConditionWithRepeat = saveGatedConditionWithRepeatSpell(spell);
  if (saveGatedConditionWithRepeat === null) {
    return [];
  }

  return preparedSpellSlotInvocationsFrom(
    spell,
    castOptions,
    (base, slotLevel) => ({
      ...base,
      procedure: "saveGatedConditionWithRepeat",
      actionCost: "magicAction",
      ability: saveGatedConditionWithRepeat.phase.ability,
      dc: saveGatedConditionWithRepeat.phase.dc,
      targeting: saveGatedConditionWithRepeat.targeting(slotLevel),
    }),
  );
}

function saveGatedConditionWithRepeatSpell(
  spell: SaveGatedConditionWithRepeatSpellInvocation["spell"],
): {
  readonly phase: SaveGatedConditionWithRepeatPhase;
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
    !isSaveGatedConditionWithRepeatPhase(phase)
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

function isSaveGatedConditionWithRepeatPhase(
  phase: ActivationPhase | undefined,
): phase is SaveGatedConditionWithRepeatPhase {
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

function discoverSaveGatedConditionWithRepeatCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionWithRepeatSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const castActs = discoverTargetSavingThrowSpellCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
  });
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveSaveGatedConditionWithRepeat(
  input: SaveGatedConditionWithRepeatResolveInput,
): BattleResolutionResult {
  return resolveSaveGatedConditionWithRepeatSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const SaveGatedConditionWithRepeatInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedConditionWithRepeat"),
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
export const saveGatedConditionWithRepeatProfile = {
  procedure: "saveGatedConditionWithRepeat",
  executionSchema: SaveGatedConditionWithRepeatInvocationSchema,
  admit: admitSaveGatedConditionWithRepeat,
  discoverCastAct: discoverSaveGatedConditionWithRepeatCastAct,
  resolve: resolveSaveGatedConditionWithRepeat,
} satisfies SpellProcedureDeclaration<
  "saveGatedConditionWithRepeat",
  SaveGatedConditionWithRepeatSpellInvocation
>;
