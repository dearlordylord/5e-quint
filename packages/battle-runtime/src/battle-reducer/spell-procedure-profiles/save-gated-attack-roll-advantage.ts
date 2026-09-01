import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-attack-roll-advantage-save
//
// The saveGatedAttackRollAdvantage Spell Procedure Profile: action-time Spell
// Slot casting where affected targets make a Saving Throw before failed-save
// creatures and affected objects grant sight-gated attack-roll Advantage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells/Descriptions-E-L.md, point-origin outline spell:
//     objects and failed-save creatures shed Dim Light; attack rolls against
//     an affected creature or object have Advantage if the attacker can see it.
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
import {
  saveGateMechanicsInspection,
  saveGatedAttackRollAdvantageInvocationsFromFacts,
  saveGatedAttackRollAdvantageMechanicsFacts,
  type SaveGatedAttackRollAdvantageMechanicsFacts,
} from "./_save-gate-helpers.ts";
import { resolveSaveGateAttackRollAdvantageSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AbilitySchema,
  DimIlluminationEmissionFactsSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const FailedSaveAttackRollAdvantageEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("saveGatedTargetProjection"),
  expiresAt: BattleActiveEffectExpirationSchema,
});

type SaveGatedAttackRollAdvantageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

type SaveGatedAttackRollAdvantageResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedAttackRollAdvantageSpellInvocation>;

function admitSaveGatedAttackRollAdvantageMechanics(
  source: SpellMechanicsAdmissionSource,
) {
  return saveGateMechanicsInspection<
    "saveGatedAttackRollAdvantage",
    SaveGatedAttackRollAdvantageSpellInvocation,
    SaveGatedAttackRollAdvantageMechanicsFacts
  >({
    source,
    procedure: "saveGatedAttackRollAdvantage",
    projection: saveGatedAttackRollAdvantageMechanicsFacts(source),
    admit: (
      facts,
      spell: BattleSpellExecutionSource,
      ctx: SpellAdmissionContext,
    ) =>
      ctx.spellCastOptions.flatMap((slot) =>
        saveGatedAttackRollAdvantageInvocationsFromFacts({
          spell,
          facts,
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          slotLevel: slot.spellLevel,
          sourceCombatantId: ctx.actor.combatantId,
        }),
      ),
  });
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
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const SaveGatedAttackRollAdvantageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedAttackRollAdvantage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
      ]),
      effect: FailedSaveAttackRollAdvantageEffectSchema,
      illumination: DimIlluminationEmissionFactsSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedAttackRollAdvantageProfile = {
  procedure: "saveGatedAttackRollAdvantage",
  executionSchema: SaveGatedAttackRollAdvantageInvocationSchema,
  admitMechanics: admitSaveGatedAttackRollAdvantageMechanics,
  discoverCastAct: discoverSaveGatedAttackRollAdvantageCastAct,
  resolve: resolveSaveGatedAttackRollAdvantage,
} satisfies SpellProcedureDeclaration<
  "saveGatedAttackRollAdvantage",
  SaveGatedAttackRollAdvantageSpellInvocation
>;
