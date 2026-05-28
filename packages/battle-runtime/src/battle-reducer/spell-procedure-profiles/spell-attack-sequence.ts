// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-independent-attack-sequence
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
//
// The spellAttackSequence Spell Procedure Profile: an action-time spell attack
// that resolves multiple independent spell attack parts from one spell
// invocation.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls" and "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - SRD 5.2.1 spell text for Eldritch Blast and Scorching Ray.
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll,
//     Damage Type, and Spell Invocation.

import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { spellSubjectTagForInvocation } from "../spells-discovery.ts";
import { spellAttackSequencePartName } from "../spells-profile-shared.ts";
import {
  supportedCantripSpellAttackSequenceProfile,
  supportedPreparedSpellAttackSequenceProfile,
  type SpellAttackSequenceInvocation,
} from "../spells-profiles-attack-damage.ts";
import { resolveSpellAttackSequenceAct } from "../spells-resolve-attack-sequence.ts";
import {
  spellAttackSequencePartObjectTargetHole,
  spellAttackSequencePartTargetHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";

type SpellAttackSequenceResolveInput = SpellProcedureProfileResolveInput<
  SpellAttackSequenceInvocation,
  ActionSpellBattleResolutionInput
>;

function admitSpellAttackSequence(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpellAttackSequenceInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  if (spell.mechanics.level === 0) {
    return supportedCantripSpellAttackSequenceProfile(
      spell,
      spellcasting.spellcastingAbilityModifier,
      spellcasting.proficiencyBonus,
      spellAdmissionCharacterLevel(ctx),
    );
  }
  return supportedPreparedSpellAttackSequenceProfile(
    spell,
    spellcasting.spellSlots,
    spellcasting.spellcastingAbilityModifier,
    spellcasting.proficiencyBonus,
  );
}

function discoverSpellAttackSequenceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpellAttackSequenceInvocation,
): readonly AvailableBattleAct[] {
  const initialHoles = Array.from(
    { length: invocation.targeting.attackCount },
    (_, partIndex) => [
      spellAttackSequencePartTargetHole(state, actorId, invocation, partIndex),
      spellAttackSequencePartObjectTargetHole(invocation, partIndex),
    ],
  ).flat();
  return [
    {
      subject: {
        tag: spellSubjectTagForInvocation(invocation),
        actorId,
        invocation: spellAttackSequenceInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: spellAttackSequenceCastSummary(invocation),
      initialHoles,
    },
  ];
}

function spellAttackSequenceInvocationRef(
  invocation: SpellAttackSequenceInvocation,
): SpellInvocationRef {
  return invocation.resource.tag === "spellSlot"
    ? {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "spellAttackSequence",
      }
    : {
        tag: "cantrip",
        spellId: spellId(invocation.spell.id),
        procedure: "spellAttackSequence",
      };
}

function spellAttackSequenceCastSummary(
  invocation: SpellAttackSequenceInvocation,
): string {
  const partName = spellAttackSequencePartName();
  const resource =
    invocation.resource.tag === "spellSlot"
      ? `using a level ${invocation.resource.slotLevel} Spell Slot`
      : "as a cantrip";
  return `Cast ${invocation.spell.name} ${resource}, resolving ${invocation.targeting.attackCount} ${partName}${invocation.targeting.attackCount === 1 ? "" : "s"}.`;
}

function resolveSpellAttackSequence(
  input: SpellAttackSequenceResolveInput,
): BattleResolutionResult {
  return resolveSpellAttackSequenceAct(input);
}

export const spellAttackSequenceProfile: SpellProcedureProfile<
  "spellAttackSequence",
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >
> = {
  procedure: "spellAttackSequence",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpellAttackSequence,
  discoverCastAct: discoverSpellAttackSequenceCastAct,
  castSummary: spellAttackSequenceCastSummary,
  invocationRef: spellAttackSequenceInvocationRef,
  resolve: resolveSpellAttackSequence,
};
