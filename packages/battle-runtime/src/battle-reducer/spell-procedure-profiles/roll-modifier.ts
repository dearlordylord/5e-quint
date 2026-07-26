import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The rollModifier Spell Procedure Profile: SRD spells (Bless, Bane, Guidance,
// Resistance, Shield of Faith and similar) that grant a persistent d20-roll
// modifier or a roll-mode rider on one or more targets, with either cantrip
// access (Guidance, Resistance) or prepared+slot access (Bless, Bane).
//
// What lives here (the public face of the profile):
//   - admit()           — combines cantrip and prepared admission. Was
//                         supportedCantripRollModifierSpellProfile and
//                         supportedPreparedRollModifierSpellProfile in
//                         spells-profiles-support.ts.
//   - resolve()         — was resolveRollModifierSpellAct in
//                         spells-resolve-support-effects.ts.
//   - applyEffect       — both same-effect-for-targets and per-target
//                         variants. Were applyRollModifierSpellEffect and
//                         applyRollModifierSpellEffectsByTarget in
//                         spells-active-effects.ts.
//   - discoverCastAct() — was the rollModifier branch in
//                         spells-discovery.ts:discoverBattleActs.
//   - castSummary()     — was the rollModifier branch in
//                         spellInvocationCastSummary.
//
// What stays in shared infrastructure files (imported back here):
//   - rollModifierSpellProjection + projection sub-helpers
//     (rollModifierActiveEffect, rollModifierAbilityCheckRollModeEffect,
//     rollModifierSpellTargeting, rollModifierSkillFilter) — entangled with
//     scalarBuff and thaumaturgyBoomingVoice; full extraction is a separate
//     sweep.
//   - rollModifierSpellTargetSelection / EffectSelection / AffectedTargets —
//     ~400 lines in spells-resolve-target-selection.ts. Moveable later.
//   - Hole builders (spellRollModifierSkillChoiceHole etc.) in
//     spells-damage-fills.ts — moveable later when the hole subsystem migrates.
//   - The metamagic table entry — same migration story as damageReduction.

import { spellSlotLevel } from "@dnd/shared/types";

import { BattleProcedureExecutionRef, CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SelectedRollModifierSpellEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";

import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  rollModifierUsesTargetAbilityChoices,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHole,
  spellRollModifierSkillChoiceHoleId,
  spellRollModifierTargetAbilityChoicesHole,
  spellRollModifierTargetAbilityChoicesHoleId,
} from "../spells-damage-fills.ts";
import { spellSavingThrowOutcomeHoleId } from "../spells-damage-fills.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import {
  isD20RollModifierSpellProjection,
  rollModifierSpellProjection,
} from "../spells-profiles-support.ts";
import {
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
} from "../spells-resolve-target-selection.ts";
import {
  spellTargetHole,
  spellTargetListHole,
  spellTargetListHoleId,
} from "../spells-targeting.ts";
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
  BATTLE_SURFACE_ABILITIES,
  BATTLE_SURFACE_SKILLS,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  RollModifierSpellSaveGateSchema,
  RollModifierSpellTargetingSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  BATTLE_D20_ROLL_MODIFIER_DIE_SIZES,
  BATTLE_D20_ROLL_MODIFIER_KINDS,
} from "../domain-constants.ts";

const D20RollModifierEffectSchema = Schema.Struct({
  kind: Schema.Literal("d20RollModifier"),
  sourceCombatantId: CombatantId,
  on: Schema.Array(Schema.Literal(...BATTLE_D20_ROLL_MODIFIER_KINDS)),
  delta: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("fixedNumber"),
      amount: Schema.Number,
      sign: Schema.Literal("+", "-"),
    }),
    Schema.Struct({
      dice: Schema.Number,
      dieSize: Schema.Literal(...BATTLE_D20_ROLL_MODIFIER_DIE_SIZES),
      sign: Schema.Literal("+", "-"),
    }),
  ),
  skill: Schema.NullOr(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
  expiresAt: BattleActiveEffectExpirationSchema,
});

const AbilityCheckRollModeEffectSchema = Schema.Struct({
  kind: Schema.Literal("abilityCheckRollMode"),
  sourceCombatantId: CombatantId,
  mode: Schema.Literal("advantage"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

type RollModifierInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
>;
type RollModifierResolveInput =
  SpellProcedureProfileResolveInput<RollModifierInvocation>;

function admitRollModifier(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly RollModifierInvocation[] {
  const out: RollModifierInvocation[] = [];
  if (spell.mechanics.level === 0) {
    const projection = rollModifierSpellProjection(
      ctx.actor.combatantId,
      spell,
      spellSlotLevel(0),
    );
    if (projection !== null) {
      out.push(
        buildRollModifierInvocation(
          spell,
          { tag: "classCantrip" },
          { tag: "none" },
          projection,
        ),
      );
    }
  }
  if (spell.mechanics.level >= 1) {
    for (const slot of ctx.actor.origin.spellcasting.spellSlots) {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        continue;
      }
      const projection = rollModifierSpellProjection(
        ctx.actor.combatantId,
        spell,
        slot.spellLevel,
      );
      if (projection !== null) {
        out.push(
          buildRollModifierInvocation(
            spell,
            { tag: "prepared" },
            { tag: "spellSlot", slotLevel: slot.spellLevel },
            projection,
          ),
        );
      }
    }
  }
  return out;
}

// The casts below are warranted: RollModifierInvocation is a union whose
// branches are discriminated by which of `skillChoices`/`abilityChoices` is
// non-null and whether `abilityChoiceApplication` is present, rather than by a
// single tag field. TypeScript cannot narrow the spread of `base` plus
// variant-specific fields against that union, so we assert at the point where
// `isD20RollModifierSpellProjection(projection)` has already discriminated
// the projection variant. Matches the original branching in the deleted
// supportedCantripRollModifierSpellProfile / supportedPreparedRollModifier
// SpellProfile predicates one-for-one.
function buildRollModifierInvocation(
  spell: BattleSpellAdmissionSource,
  access: RollModifierInvocation["access"],
  resource: RollModifierInvocation["resource"],
  projection: NonNullable<ReturnType<typeof rollModifierSpellProjection>>,
): RollModifierInvocation {
  const base = {
    access,
    resource,
    procedure: "rollModifier" as const,
    spell,
    actionCost: "magicAction" as const,
    targeting: projection.targeting,
    rangeFeet: projection.rangeFeet,
    saveGate: projection.saveGate,
  } as const;
  return isD20RollModifierSpellProjection(projection)
    ? ({
        ...base,
        effect: projection.effect,
        skillChoices: projection.skillChoices,
        abilityChoices: null,
      } as RollModifierInvocation)
    : ({
        ...base,
        effect: projection.effect,
        skillChoices: null,
        abilityChoices: projection.abilityChoices,
        abilityChoiceApplication: projection.abilityChoiceApplication,
      } as RollModifierInvocation);
}

function applyRollModifierEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return applyRollModifierEffectsByTarget(
    state,
    targetIds.map((targetId) => ({ targetId, effect: selectedEffect })),
    sourceProcedureRef,
  );
}

function applyRollModifierEffectsByTarget(
  state: BattleState,
  targetEffects: readonly {
    readonly targetId: CombatantId;
    readonly effect: SelectedRollModifierSpellEffect;
  }[],
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  return targetEffects.reduce((nextState, targetEffect) => {
    const { targetId, effect: selectedEffect } = targetEffect;
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === selectedEffect.kind &&
            effect.sourceProcedureRef === sourceProcedureRef
          ),
      ),
      { ...selectedEffect, sourceProcedureRef },
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

function discoverRollModifierCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<RollModifierInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const initialHoles =
    targetHole.choices.length === 0
      ? []
      : [
          targetHole,
          ...(invocation.skillChoices === null
            ? []
            : [spellRollModifierSkillChoiceHole(invocation)]),
          ...(invocation.abilityChoices === null
            ? []
            : rollModifierUsesTargetAbilityChoices(invocation)
              ? [spellRollModifierTargetAbilityChoicesHole(invocation)]
              : [spellRollModifierAbilityChoiceHole(invocation)]),
        ];
  if (initialHoles.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles,
    },
  ];
}

function resolveRollModifier(
  input: RollModifierResolveInput,
): BattleResolutionResult {
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellRollModifierSkillChoiceHoleId(input.invocation),
      spellRollModifierAbilityChoiceHoleId(input.invocation),
      spellRollModifierTargetAbilityChoicesHoleId(input.invocation),
      spellSavingThrowOutcomeHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill or ability, and optional Saving Throw fills.",
    );
  }

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const effectSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellEffectSelection({
      ...input,
      targetIds: targetSelection.targetIds,
    }),
  );
  if (effectSelectionResolution.tag === "resolution")
    return effectSelectionResolution.result;
  const effectSelection = effectSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: targetSelection.targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const affectedTargetsResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    rollModifierSpellAffectedTargets(input),
  );
  if (affectedTargetsResolution.tag === "resolution")
    return affectedTargetsResolution.result;
  const affectedTargets = affectedTargetsResolution.selection;

  const affectedTargetIds = new Set(affectedTargets.targetIds);
  return completeSpellActiveEffectCast({
    resolution: input,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
    applyEffect: (state) =>
      effectSelection.selection.kind === "sameForTargets"
        ? applyRollModifierEffect(
            state,
            affectedTargets.targetIds,
            effectSelection.selection.effect,
            input.invocation.sourceProcedureRef,
          )
        : applyRollModifierEffectsByTarget(
            state,
            effectSelection.selection.targetEffects.filter((targetEffect) =>
              affectedTargetIds.has(targetEffect.targetId),
            ),
            input.invocation.sourceProcedureRef,
          ),
  });
}

const RollModifierInvocationCommonFields = {
  access: Schema.Union(
    PreparedSpellAccessSchema,
    ClassCantripSpellAccessSchema,
  ),
  resource: Schema.Union(
    SpellSlotInvocationResourceSchema,
    NoSpellInvocationResourceSchema,
  ),
  procedure: Schema.Literal("rollModifier"),
  spellRuleFacts: SpellRuleExecutionFactsSchema,
  actionCost: Schema.Literal("magicAction"),
  targeting: RollModifierSpellTargetingSchema,
  rangeFeet: MovementFeet,
  saveGate: RollModifierSpellSaveGateSchema,
} as const;

const RollModifierInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union(
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: D20RollModifierEffectSchema,
      skillChoices: Schema.NullOr(
        Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
      ),
      abilityChoices: Schema.Literal(null),
      abilityChoiceApplication: Schema.optionalWith(Schema.Never, {
        exact: true,
      }),
    }),
    Schema.Struct({
      ...RollModifierInvocationCommonFields,
      effect: AbilityCheckRollModeEffectSchema,
      skillChoices: Schema.Literal(null),
      abilityChoices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_ABILITIES)),
      abilityChoiceApplication: Schema.Literal("single", "perTarget"),
    }),
  ),
);
export const rollModifierProfile: SpellProcedureDeclaration<
  "rollModifier",
  RollModifierInvocation
> = {
  procedure: "rollModifier",
  admit: admitRollModifier,

  discoverCastAct: discoverRollModifierCastAct,
  executionSchema: RollModifierInvocationSchema,
  resolve: resolveRollModifier,
};
