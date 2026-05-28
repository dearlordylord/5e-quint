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

import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  discoverSpellMetamagicSelections,
  spellMetamagicLabel,
} from "../metamagic.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import {
  spellSavingThrowAbility,
  spellTargetListHole,
} from "../spells-holes-fills.ts";
import { supportedPreparedAbilityD20TestRollModeSaveGateProfile } from "./_save-gate-helpers.ts";
import { resolveAbilityD20TestRollModeSaveGateSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type AbilityD20TestRollModeSaveGateSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "abilityD20TestRollModeSaveGate" }
>;

type AbilityD20TestRollModeSaveGateResolveInput =
  SpellProcedureProfileResolveInput<
    AbilityD20TestRollModeSaveGateSpellInvocation,
    ActionSpellBattleResolutionInput
  >;

function admitAbilityD20TestRollModeSaveGate(
  spell: AbilityD20TestRollModeSaveGateSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly AbilityD20TestRollModeSaveGateSpellInvocation[] {
  return supportedPreparedAbilityD20TestRollModeSaveGateProfile(
    ctx.actor.combatantId,
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
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
  invocation: AbilityD20TestRollModeSaveGateSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const baseCastAct = abilityD20TestRollModeSaveGateCastAct(
    actorId,
    invocation,
    [targetHole],
    invocation.spell.name,
    abilityD20TestRollModeSaveGateCastSummaryWithSavingThrow(invocation),
  );
  const metamagicCastActs = discoverSpellMetamagicSelections({
    actor,
    invocation,
  }).map((metamagic) => {
    const label = spellMetamagicLabel(metamagic);
    return {
      ...baseCastAct,
      subject: {
        ...baseCastAct.subject,
        metamagic,
      },
      initialHoles: [targetHole],
      label: `${invocation.spell.name} (${label})`,
      summary: `${baseCastAct.summary} Cast with ${label}.`,
    };
  });
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function abilityD20TestRollModeSaveGateCastAct(
  actorId: CombatantId,
  invocation: AbilityD20TestRollModeSaveGateSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: abilityD20TestRollModeSaveGateInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function abilityD20TestRollModeSaveGateInvocationRef(
  invocation: AbilityD20TestRollModeSaveGateSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "abilityD20TestRollModeSaveGate",
  };
}

function abilityD20TestRollModeSaveGateCastSummary(
  invocation: AbilityD20TestRollModeSaveGateSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function abilityD20TestRollModeSaveGateCastSummaryWithSavingThrow(
  invocation: AbilityD20TestRollModeSaveGateSpellInvocation,
): string {
  return `${abilityD20TestRollModeSaveGateCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
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

export const abilityD20TestRollModeSaveGateProfile = {
  procedure: "abilityD20TestRollModeSaveGate",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitAbilityD20TestRollModeSaveGate,
  discoverCastAct: discoverAbilityD20TestRollModeSaveGateCastAct,
  castSummary: abilityD20TestRollModeSaveGateCastSummary,
  invocationRef: abilityD20TestRollModeSaveGateInvocationRef,
  resolve: resolveAbilityD20TestRollModeSaveGate,
} satisfies SpellProcedureProfile<
  "abilityD20TestRollModeSaveGate",
  AbilityD20TestRollModeSaveGateSpellInvocation,
  ActionSpellBattleResolutionInput
>;
