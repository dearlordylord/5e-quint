import {
  discoverSavingThrowMetamagicCastActs,
  savingThrowMetamagicHolesOr,
} from "../saving-throw-metamagic-holes.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { supportedPreparedSaveGateConditionImmunityProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionImmunitySpellAct } from "../spells-resolve-save-gates.ts";
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
  BattleConditionSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const ConditionImmunityActiveEffectTemplateSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("conditionImmunity"),
  condition: BattleConditionSchema,
  expiresAt: BattleActiveEffectExpirationSchema,
});
import { spellSavingThrowOutcomeHole } from "../spells-holes-fills.ts";

type SaveGatedConditionImmunitySpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionImmunity" }
>;

type SaveGatedConditionImmunityResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedConditionImmunitySpellInvocation>;

function admitSaveGatedConditionImmunity(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SaveGatedConditionImmunitySpellInvocation[] {
  return supportedPreparedSaveGateConditionImmunityProfile(
    ctx.actor.combatantId,
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  ).filter(isSaveGatedConditionImmunityInvocation);
}

function isSaveGatedConditionImmunityInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedConditionImmunitySpellInvocation {
  return invocation.procedure === "saveGatedConditionImmunity";
}

function discoverSaveGatedConditionImmunityCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedConditionImmunityCastAct(actorId, invocation, [
    savingThrowHole,
  ]);
  return [
    baseCastAct,
    ...discoverSavingThrowMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      initialHoles: (applications) =>
        savingThrowMetamagicHolesOr(state, actorId, invocation, applications, [
          savingThrowHole,
        ]),
    }),
  ];
}

function saveGatedConditionImmunityCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>,
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

function resolveSaveGatedConditionImmunity(
  input: SaveGatedConditionImmunityResolveInput,
): BattleResolutionResult {
  return resolveSaveGateConditionImmunitySpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const SaveGatedConditionImmunityInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
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
      activeEffects: Schema.Tuple(
        ConditionImmunityActiveEffectTemplateSchema,
        ConditionImmunityActiveEffectTemplateSchema,
      ),
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedConditionImmunityProfile = {
  procedure: "saveGatedConditionImmunity",
  executionSchema: SaveGatedConditionImmunityInvocationSchema,
  admit: admitSaveGatedConditionImmunity,
  discoverCastAct: discoverSaveGatedConditionImmunityCastAct,
  resolve: resolveSaveGatedConditionImmunity,
} satisfies SpellProcedureDeclaration<
  "saveGatedConditionImmunity",
  SaveGatedConditionImmunitySpellInvocation
>;
