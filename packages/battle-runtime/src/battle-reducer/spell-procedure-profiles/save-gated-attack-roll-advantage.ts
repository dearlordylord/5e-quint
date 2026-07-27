import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-attack-roll-advantage-save
//
// The saveGatedAttackRollAdvantage Spell Procedure Profile: action-time Spell
// Slot casting where affected targets make a Saving Throw before failed-save
// creatures and affected objects grant sight-gated attack-roll Advantage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Faerie Fire outlines objects in a 20-foot Cube and
//     creatures that fail a Dexterity Saving Throw; attack rolls against an
//     affected creature or object have Advantage if the attacker can see it.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Attack Roll, Advantage, Magic
//     Action, and Spell Invocation.

import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { supportedPreparedSaveGateAttackRollAdvantageProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateAttackRollAdvantageSpellAct } from "../spells-resolve-save-gates.ts";
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
  AbilitySchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const FailedSaveAttackRollAdvantageEffectSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("faerieFireOutline"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

type SaveGatedAttackRollAdvantageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

type SaveGatedAttackRollAdvantageResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedAttackRollAdvantageSpellInvocation>;

function admitSaveGatedAttackRollAdvantage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SaveGatedAttackRollAdvantageSpellInvocation[] {
  return supportedPreparedSaveGateAttackRollAdvantageProfile(
    ctx.actor.combatantId,
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  ).filter(isSaveGatedAttackRollAdvantageInvocation);
}

function isSaveGatedAttackRollAdvantageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedAttackRollAdvantageSpellInvocation {
  return invocation.procedure === "saveGatedAttackRollAdvantage";
}

function discoverSaveGatedAttackRollAdvantageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolveSaveGatedAttackRollAdvantage(
  input: SaveGatedAttackRollAdvantageResolveInput,
): BattleResolutionResult {
  return resolveSaveGateAttackRollAdvantageSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const SaveGatedAttackRollAdvantageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedAttackRollAdvantage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
      ),
      effect: FailedSaveAttackRollAdvantageEffectSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedAttackRollAdvantageProfile = {
  procedure: "saveGatedAttackRollAdvantage",
  executionSchema: SaveGatedAttackRollAdvantageInvocationSchema,
  admit: admitSaveGatedAttackRollAdvantage,
  discoverCastAct: discoverSaveGatedAttackRollAdvantageCastAct,
  resolve: resolveSaveGatedAttackRollAdvantage,
} satisfies SpellProcedureDeclaration<
  "saveGatedAttackRollAdvantage",
  SaveGatedAttackRollAdvantageSpellInvocation
>;
