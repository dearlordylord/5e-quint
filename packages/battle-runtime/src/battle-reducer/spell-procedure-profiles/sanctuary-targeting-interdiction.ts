// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sanctuary-targeting-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
//
// The sanctuaryTargetingInterdiction Spell Procedure Profile: a prepared Bonus
// Action spell that wards one creature, asks for a Wisdom Saving Throw when a
// direct attack roll or damaging spell targets that creature, and removes the
// ward when the warded creature makes an attack roll, casts a spell, or deals
// damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Sanctuary": Bonus Action, 30 feet, 1 minute; ward one
//     creature; direct attack-roll and damaging-spell targeting require a
//     Wisdom Saving Throw; failure chooses a new target or loses the attack or
//     spell; areas of effect are excluded; the spell ends when the warded
//     creature makes an attack roll, casts a spell, or deals damage.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Saving Throw, Spell
//     Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SanctuaryTargetingInterdictionSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  combatantWithSanctuaryWard,
} from "../sanctuary-targeting-interdiction.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetIsLegal,
  spellTargetListHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type SanctuaryTargetingInterdictionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "sanctuaryTargetingInterdiction" }
>;
type SanctuaryTargetingInterdictionResolveInput =
  SpellProcedureProfileResolveInput<
    SanctuaryTargetingInterdictionInvocation,
    BonusActionSpellBattleResolutionInput
  >;

function admitSanctuaryTargetingInterdiction(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SanctuaryTargetingInterdictionInvocation[] {
  const projection = sanctuaryTargetingInterdictionProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SanctuaryTargetingInterdictionInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "sanctuaryTargetingInterdiction",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
              ...projection,
            },
          ],
  );
}

function sanctuaryTargetingInterdictionProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  SanctuaryTargetingInterdictionSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const targetSelection =
    attachment.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const operation = spell.mechanics.operations[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    targetSelection?.mode !== "one" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    operation?.trigger.kind !== "on_attached_targeted" ||
    operation.trigger.excludes !== "area_of_effect" ||
    !sameStringSet(operation.trigger.targeting, [
      "attack_roll",
      "damaging_spell",
    ]) ||
    operation.effect.kind !== "save_gate" ||
    operation.effect.ability !== "wis" ||
    operation.effect.dc.kind !== "caster_spell_save_dc" ||
    operation.effect.onSuccess.kind !== "none" ||
    operation.effect.onFail.kind !== "choose_new_target_or_lose" ||
    operation.effect.onFail.subject !== "triggering_attack_or_spell" ||
    !sameStringSet(
      earlyEnd.map((end) => end.kind),
      ["target_makes_attack_roll", "target_casts_spell", "target_deals_damage"],
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(30),
        activeEffect: {
          kind: "sanctuaryWard",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          save: { ability: "wis", dc: operation.effect.dc },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function discoverSanctuaryTargetingInterdictionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SanctuaryTargetingInterdictionInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: sanctuaryTargetingInterdictionInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: sanctuaryTargetingInterdictionCastSummary(invocation),
          initialHoles: [targetHole],
        },
      ];
}

function sanctuaryTargetingInterdictionInvocationRef(
  invocation: SanctuaryTargetingInterdictionInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "sanctuaryTargetingInterdiction",
  };
}

function sanctuaryTargetingInterdictionCastSummary(
  invocation: SanctuaryTargetingInterdictionInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveSanctuaryTargetingInterdiction(
  input: SanctuaryTargetingInterdictionResolveInput,
): BattleResolutionResult {
  const targetList = input.fillSet.targetList;
  if (targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  if (targetList.targetIds.length !== 1) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sanctuary must target exactly one creature.",
    );
  }
  const targetId = targetList.targetIds[0]!;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.actorId,
  );
  const target = spellCastState.combatants.get(targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      spellCastState,
      input.actorId,
      targetId,
      input.invocation,
      targetList.spatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sanctuary target must be a combatant within range.",
    );
  }
  const combatants = new Map(spellCastState.combatants).set(
    targetId,
    combatantWithSanctuaryWard(target, input.invocation),
  );
  return spendSpellCastResources({
    state: { ...spellCastState, combatants },
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    skipTargetActionSpellCastEarlyEnd: true,
  });
}

export const sanctuaryTargetingInterdictionProfile = {
  procedure: "sanctuaryTargetingInterdiction",
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSanctuaryTargetingInterdiction,
  discoverCastAct: discoverSanctuaryTargetingInterdictionCastAct,
  castSummary: sanctuaryTargetingInterdictionCastSummary,
  invocationRef: sanctuaryTargetingInterdictionInvocationRef,
  resolve: resolveSanctuaryTargetingInterdiction,
} satisfies SpellProcedureProfile<
  "sanctuaryTargetingInterdiction",
  SanctuaryTargetingInterdictionInvocation,
  BonusActionSpellBattleResolutionInput
>;
