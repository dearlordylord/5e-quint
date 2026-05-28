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

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resources.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";
import { supportedPreparedSaveGateAttackRollAdvantageProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateAttackRollAdvantageSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type SaveGatedAttackRollAdvantageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

type SaveGatedAttackRollAdvantageResolveInput =
  SpellProcedureProfileResolveInput<
    SaveGatedAttackRollAdvantageSpellInvocation,
    ActionSpellBattleResolutionInput
  > & {
    readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
  };

function admitSaveGatedAttackRollAdvantage(
  spell: SaveGatedAttackRollAdvantageSpellInvocation["spell"],
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
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedAttackRollAdvantageCastAct(
    actorId,
    invocation,
    [savingThrowHole],
    invocation.spell.name,
    saveGatedAttackRollAdvantageCastSummaryWithSavingThrow(invocation),
  );
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
  readonly invocation: SaveGatedAttackRollAdvantageSpellInvocation;
  readonly baseCastAct: AvailableBattleAct;
  readonly baseHoles: readonly BattleHole[];
}): readonly AvailableBattleAct[] {
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
    const label = spellMetamagicLabel(metamagic);
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
      label: `${input.invocation.spell.name} (${label})`,
      summary: `${saveGatedAttackRollAdvantageCastSummaryWithSavingThrow(
        input.invocation,
      )} Cast with ${label}.`,
    };
  });
}

function saveGatedAttackRollAdvantageCastAct(
  actorId: CombatantId,
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: saveGatedAttackRollAdvantageInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function saveGatedAttackRollAdvantageMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
  metamagicApplications: readonly CharacterBattleMetamagicOptionFact[],
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

function saveGatedAttackRollAdvantageInvocationRef(
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "saveGatedAttackRollAdvantage",
  };
}

function saveGatedAttackRollAdvantageCastSummary(
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function saveGatedAttackRollAdvantageCastSummaryWithSavingThrow(
  invocation: SaveGatedAttackRollAdvantageSpellInvocation,
): string {
  return `${saveGatedAttackRollAdvantageCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
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

export const saveGatedAttackRollAdvantageProfile = {
  procedure: "saveGatedAttackRollAdvantage",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSaveGatedAttackRollAdvantage,
  discoverCastAct: discoverSaveGatedAttackRollAdvantageCastAct,
  castSummary: saveGatedAttackRollAdvantageCastSummary,
  invocationRef: saveGatedAttackRollAdvantageInvocationRef,
  resolve: resolveSaveGatedAttackRollAdvantage,
} satisfies SpellProcedureProfile<
  "saveGatedAttackRollAdvantage",
  SaveGatedAttackRollAdvantageSpellInvocation,
  ActionSpellBattleResolutionInput
>;
