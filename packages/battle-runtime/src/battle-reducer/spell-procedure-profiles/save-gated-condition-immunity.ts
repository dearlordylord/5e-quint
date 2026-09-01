import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-save-gated-condition-immunity
import { CreatureTypeSchema } from "@dnd/surface/surface/schema";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
//
// The saveGatedConditionImmunity Spell Procedure Profile: action-time Spell
// Slot casting where Humanoid area targets make a Saving Throw before failed
// saves gain condition Immunity.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Calm Emotions has Humanoids in a point-origin Sphere
//     make a Charisma Saving Throw; failed-save targets can gain Immunity to
//     the Charmed and Frightened conditions until the spell ends.
//   - SRD 5.2.1 Rules Glossary / Playing the Game: Immunity to a condition
//     means the condition does not affect the creature.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition Immunity, Magic Action,
//     and Spell Invocation.

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
  saveGatedConditionImmunityInvocationsFromFacts,
  saveGatedConditionImmunityMechanicsFacts,
  type SaveGatedConditionImmunityMechanicsFacts,
} from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionImmunitySpellAct } from "../spells-resolve-save-gates.ts";
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
  spellProcedureResolutionContext,
} from "./profile.ts";
import {
  AbilitySchema,
  BattleConditionSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const ConditionImmunityActiveEffectTemplateSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("conditionImmunity"),
  condition: BattleConditionSchema,
  expiresAt: BattleActiveEffectExpirationSchema,
  ...BattleEffectOccurrenceTemplateSchemaFields,
});

type SaveGatedConditionImmunitySpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionImmunity" }
>;

type SaveGatedConditionImmunityResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionImmunitySpellInvocation>;

function admitSaveGatedConditionImmunityMechanics(
  source: SpellMechanicsAdmissionSource,
) {
  return saveGateMechanicsInspection<
    "saveGatedConditionImmunity",
    SaveGatedConditionImmunitySpellInvocation,
    SaveGatedConditionImmunityMechanicsFacts
  >({
    source,
    procedure: "saveGatedConditionImmunity",
    projection: saveGatedConditionImmunityMechanicsFacts(source),
    admit: (
      facts,
      spell: BattleSpellExecutionSource,
      ctx: SpellAdmissionContext,
    ) =>
      ctx.spellCastOptions.flatMap((slot) =>
        saveGatedConditionImmunityInvocationsFromFacts({
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

function discoverSaveGatedConditionImmunityCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolveSaveGatedConditionImmunity(
  input: SaveGatedConditionImmunityResolveInput,
): BattleResolutionResult {
  return resolveSaveGateConditionImmunitySpellAct(
    spellProcedureResolutionContext(input),
  );
}

const SaveGatedConditionImmunityInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedConditionImmunity"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      targetCreatureTypes: Schema.Array(CreatureTypeSchema),
      activeEffects: Schema.Tuple([
        ConditionImmunityActiveEffectTemplateSchema,
        ConditionImmunityActiveEffectTemplateSchema,
      ]),
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedConditionImmunityProfile = {
  procedure: "saveGatedConditionImmunity",
  executionSchema: SaveGatedConditionImmunityInvocationSchema,
  admitMechanics: admitSaveGatedConditionImmunityMechanics,
  discoverCastAct: discoverSaveGatedConditionImmunityCastAct,
  resolve: resolveSaveGatedConditionImmunity,
} satisfies SpellProcedureDeclaration<
  "saveGatedConditionImmunity",
  SaveGatedConditionImmunitySpellInvocation
>;
