import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
//
// The abilityD20TestRollModeSaveGate Spell Procedure Profile: action-time Spell
// Slot casting where a single target makes a Saving Throw before the spell
// applies ability-scoped D20 Test Disadvantage and a damage-roll penalty.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Ray of Enfeeblement requires a Constitution Saving
//     Throw; successful saves impose Disadvantage on the next attack roll
//     until the start of the caster's next turn, while failed saves impose
//     Disadvantage on Strength-based D20 Tests, subtract 1d8 from damage
//     rolls, and repeat at the end of each target turn.
//   - UBIQUITOUS_LANGUAGE.md: Advantage and Disadvantage apply to Ability
//     Checks, Saving Throws, and Attack Rolls; Concentration can end sustained
//     spell effects.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import { readiedSpellAct } from "../spells-discovery.ts";
import { supportedPreparedAbilityD20TestRollModeSaveGateProfile } from "./_save-gate-helpers.ts";
import { resolveAbilityD20TestRollModeSaveGateSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverSpellMetamagicSelections } from "../metamagic-support.ts";
import { spellTargetListHole } from "../spells-holes-fills.ts";

type AbilityD20TestRollModeSaveGateSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "abilityD20TestRollModeSaveGate" }
>;

type AbilityD20TestRollModeSaveGateResolveInput =
  SpellProcedureProfileResolveInput<AbilityD20TestRollModeSaveGateSpellInvocation>;

function admitAbilityD20TestRollModeSaveGate(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly AbilityD20TestRollModeSaveGateSpellInvocation[] {
  return supportedPreparedAbilityD20TestRollModeSaveGateProfile(
    ctx.actor.combatantId,
    spell,
    ctx.spellCastOptions,
  ).filter(isAbilityD20TestRollModeSaveGateInvocation);
}

function isAbilityD20TestRollModeSaveGateInvocation(
  invocation: SupportedSpellInvocation,
): invocation is AbilityD20TestRollModeSaveGateSpellInvocation {
  return invocation.procedure === "abilityD20TestRollModeSaveGate";
}

function discoverAbilityD20TestRollModeSaveGateCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<AbilityD20TestRollModeSaveGateSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [targetHole],
  );
  const metamagicCastActs = discoverSpellMetamagicSelections({
    actor,
    invocation,
  }).map((metamagic) => {
    return {
      ...baseCastAct,
      subject: {
        ...baseCastAct.subject,
        metamagic,
      },
      initialHoles: [targetHole],
    };
  });
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveAbilityD20TestRollModeSaveGate(
  input: AbilityD20TestRollModeSaveGateResolveInput,
): BattleResolutionResult {
  return resolveAbilityD20TestRollModeSaveGateSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const AbilityD20TestRollModeSaveGateInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("abilityD20TestRollModeSaveGate"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("con"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      rangeFeet: MovementFeet,
      successEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("nextAttackRollBySelf"),
        sourceCombatantId: CombatantId,
        mode: Schema.Literal("disadvantage"),
        expiresAt: Schema.Struct({
          kind: Schema.Literal("startOfTurn"),
          combatantId: CombatantId,
        }),
      }),
      failedSaveEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("abilityD20TestRollModeEndTurnSave"),
        sourceCombatantId: CombatantId,
        ability: Schema.Literal("str"),
        mode: Schema.Literal("disadvantage"),
        save: Schema.Struct({
          ability: Schema.Literal("con"),
          dc: Schema.Struct({ kind: Schema.Literal("caster_spell_save_dc") }),
        }),
        expiresAt: Schema.Struct({
          kind: Schema.Literal("concentration"),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
      failedSaveDamagePenaltyEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("sourceDamageRollPenalty"),
        sourceCombatantId: CombatantId,
        amount: Schema.Struct({
          dice: Schema.Literal(1),
          dieSize: Schema.Literal(8),
        }),
        expiresAt: Schema.Struct({
          kind: Schema.Literal("concentration"),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
    }),
  );
export const abilityD20TestRollModeSaveGateProfile = {
  procedure: "abilityD20TestRollModeSaveGate",
  executionSchema: AbilityD20TestRollModeSaveGateInvocationSchema,
  admit: admitAbilityD20TestRollModeSaveGate,
  discoverCastAct: discoverAbilityD20TestRollModeSaveGateCastAct,
  resolve: resolveAbilityD20TestRollModeSaveGate,
} satisfies SpellProcedureDeclaration<
  "abilityD20TestRollModeSaveGate",
  AbilityD20TestRollModeSaveGateSpellInvocation
>;
