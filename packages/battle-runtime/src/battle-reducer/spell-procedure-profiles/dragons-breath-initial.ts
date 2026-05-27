// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
//
// The dragonsBreathInitial Spell Procedure Profile: a prepared Bonus Action
// spell that attaches a Concentration-owned Spell Effect to one willing touched
// creature and stores the chosen damage type plus caster Spell Save DC for the
// target-granted Magic Action.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Dragon's Breath": Bonus Action, Touch,
//     Concentration up to 1 minute; choose Acid, Cold, Fire, Lightning, or
//     Poison; one willing creature can take a Magic Action to exhale a 15-foot
//     Cone; Dexterity Saving Throw for half damage.
//   - The same spell's "Using a Higher-Level Spell Slot" section: damage
//     increases by 1d6 for each Spell Slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Magic Action, Concentration,
//     Spell Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type SpellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type DragonsBreathInitialSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { spellSaveDcForCaster } from "../attack-resolution.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { applyDragonsBreathInitialSpellEffect } from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type DragonsBreathInitialInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "dragonsBreathInitial" }
>;
type DragonsBreathInitialResolveInput = SpellProcedureProfileResolveInput<
  DragonsBreathInitialInvocation,
  BonusActionSpellBattleResolutionInput
>;

function admitDragonsBreathInitial(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DragonsBreathInitialInvocation[] {
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly DragonsBreathInitialInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const projection = dragonsBreathInitialSpellProjection(
        ctx.actor.combatantId,
        spell,
        slot.spellLevel,
      );
      return projection === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "dragonsBreathInitial",
              spell,
              actionCost: "bonusAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: 1,
              },
              ...projection,
            },
          ];
    },
  );
}

function dragonsBreathInitialSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): Pick<
  DragonsBreathInitialSpellInvocation,
  "activeEffect" | "damageTypeChoices" | "rangeFeet"
> | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const operation = mechanics.operations[0];
  const selection =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target"
      ? mechanics.attachment.value.selection
      : null;
  const effect = operation?.effect;
  const attachment = effect?.kind === "save_gate" ? effect.attachment : null;
  const damage = effect?.kind === "save_gate" ? effect.onFail : null;
  const damageType = damage?.kind === "damage" ? damage.damageType : null;
  const damageTypeChoice =
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value.kind === "choice"
      ? damageType.value
      : null;
  if (
    mechanics.level !== 2 ||
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "touch" ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 1 ||
    selection?.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    mechanics.operations.length !== 1 ||
    operation === undefined ||
    operation.trigger.kind !== "on_attached_spends_action" ||
    operation.trigger.cost.kind !== "standard_action" ||
    operation.trigger.cost.action !== "magic" ||
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    attachment?.kind !== "area" ||
    !("origin" in attachment) ||
    attachment.origin.kind !== "on_attached_creature" ||
    !("shape" in attachment) ||
    attachment.shape.kind !== "cone" ||
    attachment.shape.lengthFeet !== 15 ||
    effect.onSuccess.kind !== "half_damage" ||
    damage?.kind !== "damage" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.base.dice !== 3 ||
    damage.amount.base.dieSize !== 6 ||
    damage.amount.perLevel.dice !== 1 ||
    damage.amount.startingAtLevel !== 2 ||
    damageTypeChoice === null
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        damageTypeChoices: damageTypeChoice.options,
        activeEffect: {
          kind: "dragonsBreath",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          originalSlotLevel: slotLevel,
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.right,
          },
        },
      };
}

function discoverDragonsBreathInitialCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: DragonsBreathInitialInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: dragonsBreathInitialInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: dragonsBreathInitialCastSummary(invocation),
          initialHoles: [targetHole, spellDamageTypeChoiceHole(invocation)],
        },
      ];
}

function dragonsBreathInitialInvocationRef(
  invocation: DragonsBreathInitialInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "dragonsBreathInitial",
  };
}

function dragonsBreathInitialCastSummary(
  invocation: DragonsBreathInitialInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveDragonsBreathInitial(
  input: DragonsBreathInitialResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dragon's Breath uses one target-list fill and one damage type choice.",
    );
  }

  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }
  const targetId = input.fillSet.targetList.targetIds[0];
  if (targetId === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dragon's Breath must target one willing creature.",
    );
  }
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dragon's Breath damage type must be one of the selected spell's choices.",
    );
  }
  const spellSaveDc = spellSaveDcForCaster(input.input.state, input.actorId);
  if (spellSaveDc === null) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Dragon's Breath requires a caster Spell Save DC.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: input.fillSet.targetList.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyDragonsBreathInitialSpellEffect(
    concentrationBase,
    input.actorId,
    targetId,
    input.fillSet.damageTypeChoice.value,
    spellSaveDc,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

export const dragonsBreathInitialProfile = {
  procedure: "dragonsBreathInitial",
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDragonsBreathInitial,
  discoverCastAct: discoverDragonsBreathInitialCastAct,
  castSummary: dragonsBreathInitialCastSummary,
  invocationRef: dragonsBreathInitialInvocationRef,
  resolve: resolveDragonsBreathInitial,
} satisfies SpellProcedureProfile<
  "dragonsBreathInitial",
  DragonsBreathInitialInvocation,
  BonusActionSpellBattleResolutionInput
>;
