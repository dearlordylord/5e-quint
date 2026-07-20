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
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { CombatantId } from "../../identity.ts";
import { supportedPreparedSaveGateConditionImmunityProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionImmunitySpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { SpellRuleExecutionFactsSchema, spellProcedureExecutionSchema } from "./profile.ts";
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
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";

type SaveGatedConditionImmunitySpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionImmunity" }
>;

type SaveGatedConditionImmunityResolveInput = SpellProcedureProfileResolveInput<
  SaveGatedConditionImmunitySpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitSaveGatedConditionImmunity(
  spell: SaveGatedConditionImmunitySpellInvocation["spell"],
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
    ...saveGatedConditionImmunityMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [savingThrowHole],
    }),
  ];
}

function saveGatedConditionImmunityMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>;
  readonly baseCastAct: BattleActDiscoveryCandidate;
  readonly baseHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }
  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    const metamagicInitialHoles =
      saveGatedConditionImmunityMetamagicInitialHoles(
        input.state,
        input.actorId,
        input.invocation,
        applications,
      );
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles:
        metamagicInitialHoles.length === 0
          ? input.baseHoles
          : metamagicInitialHoles,
    };
  });
}

function saveGatedConditionImmunityCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>,
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

function saveGatedConditionImmunityMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedConditionImmunitySpellInvocation>,
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
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  admit: admitSaveGatedConditionImmunity,
  discoverCastAct: discoverSaveGatedConditionImmunityCastAct,
  resolve: resolveSaveGatedConditionImmunity,
} satisfies SpellProcedureProfile<
  "saveGatedConditionImmunity",
  SaveGatedConditionImmunitySpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
>;
