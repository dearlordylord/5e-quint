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
  type BattleCreatureState,
  type BattleHole,
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
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";

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
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedAttackRollAdvantageCastAct(actorId, invocation, [
    savingThrowHole,
  ]);
  return [
    baseCastAct,
    ...saveGatedAttackRollAdvantageMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [savingThrowHole],
    }),
  ];
}

function saveGatedAttackRollAdvantageMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageSpellInvocation>;
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
      saveGatedAttackRollAdvantageMetamagicInitialHoles(
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

function saveGatedAttackRollAdvantageCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageSpellInvocation>,
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

function saveGatedAttackRollAdvantageMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedAttackRollAdvantageSpellInvocation>,
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
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  admit: admitSaveGatedAttackRollAdvantage,
  discoverCastAct: discoverSaveGatedAttackRollAdvantageCastAct,
  resolve: resolveSaveGatedAttackRollAdvantage,
} satisfies SpellProcedureDeclaration<
  "saveGatedAttackRollAdvantage",
  SaveGatedAttackRollAdvantageSpellInvocation
>;
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
