import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
//
// The linkedDefenseResistanceDamageShare Spell Procedure Profile: an action spell that creates one
// paired caster-target bond from caller-supplied willing-target, paired-ring,
// and 60-foot connection witnesses. The active-effect lifecycle and damage
// sharing reducer helpers stay in linked-defense-damage-share.ts because damage application,
// cleanup, Saving Throw projections, and separation acts consume them outside
// cast resolution.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Result } from "effect";

import { LinkedDefenseResistanceDamageShareTemplateSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type LinkedDefenseResistanceDamageShareSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  LINKED_DEFENSE_DAMAGE_SHARE_ARMOR_CLASS_BONUS as LINKED_DEFENSE_ARMOR_CLASS_BONUS,
  LINKED_DEFENSE_DAMAGE_SHARE_CAST_RANGE_FEET as LINKED_DEFENSE_CAST_RANGE_FEET,
  LINKED_DEFENSE_DAMAGE_SHARE_CONNECTION_RANGE_FEET as LINKED_DEFENSE_CONNECTION_RANGE_FEET,
  LINKED_DEFENSE_DAMAGE_SHARE_SAVING_THROW_BONUS as LINKED_DEFENSE_SAVING_THROW_BONUS,
} from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  applyLinkedDefenseResistanceDamageShareSpellEffect,
  linkedDefenseResistanceDamageShareCastFactsAreSatisfied,
} from "../linked-defense-damage-share.ts";
import {
  spellTargetHole,
  spellTargetIsKnownWilling,
  spellTargetIsLegal,
} from "../spells-holes-fills.ts";
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
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function admitLinkedDefenseResistanceDamageShare(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly LinkedDefenseResistanceDamageShareSpellInvocation[] {
  const projection = linkedDefenseResistanceDamageShareSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly LinkedDefenseResistanceDamageShareSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "linkedDefenseResistanceDamageShare",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function linkedDefenseResistanceDamageShareSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  LinkedDefenseResistanceDamageShareSpellInvocation,
  "activeEffect" | "rangeFeet" | "connectionRangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.attachment.kind !== "caster_target_bond" ||
    spell.mechanics.attachment.range.kind !== "within_feet" ||
    spell.mechanics.attachment.range.feet !==
      Number(LINKED_DEFENSE_CONNECTION_RANGE_FEET) ||
    spell.mechanics.attachment.target.kind !== "hole" ||
    spell.mechanics.attachment.target.value.kind !== "target" ||
    spell.mechanics.attachment.target.value.selection.mode !== "one" ||
    !("disposition" in spell.mechanics.attachment.target.value.selection) ||
    spell.mechanics.attachment.target.value.selection.disposition !==
      "willing" ||
    !sameStringSet(
      spell.mechanics.attachment.target.value.selection.targetKinds ?? [],
      ["creature"],
    ) ||
    !linkedDefenseResistanceDamageShareMaterialComponentIsSupported(spell) ||
    !linkedDefenseResistanceDamageShareEarlyEndsAreSupported(
      spell.mechanics.duration.earlyEnd,
    ) ||
    !linkedDefenseResistanceDamageShareOperationsAreSupported(
      spell.mechanics.operations,
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        rangeFeet: LINKED_DEFENSE_CAST_RANGE_FEET,
        connectionRangeFeet: LINKED_DEFENSE_CONNECTION_RANGE_FEET,
        activeEffect: {
          kind: "linkedDefenseResistanceDamageShare",
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.success },
        },
      };
}

function linkedDefenseResistanceDamageShareMaterialComponentIsSupported(
  spell: BattleSpellAdmissionSource,
): boolean {
  if (!("components" in spell.mechanics)) {
    return false;
  }
  const material = spell.mechanics.components.m;
  return (
    typeof material === "object" &&
    material !== null &&
    material.kind === "paired_worn_items" &&
    material.itemKind === "ring" &&
    material.material === "platinum" &&
    material.minimumValueGpEach === 50 &&
    material.requiredFor === "spell_duration" &&
    sameStringSet(material.wornBy, ["caster", "target"])
  );
}

function linkedDefenseResistanceDamageShareEarlyEndsAreSupported(
  earlyEnds: readonly { readonly kind: string }[] | undefined,
): boolean {
  return (
    Array.isArray(earlyEnds) &&
    earlyEnds.length === 3 &&
    earlyEnds.some((earlyEnd) => earlyEnd.kind === "caster_drops_to_0_hp") &&
    earlyEnds.some(
      (earlyEnd) => earlyEnd.kind === "attached_bond_exceeds_range",
    ) &&
    earlyEnds.some(
      (earlyEnd) => earlyEnd.kind === "spell_cast_again_on_connected_creature",
    )
  );
}

function linkedDefenseResistanceDamageShareOperationsAreSupported(
  operations: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"],
): boolean {
  return (
    operations.length === 4 &&
    operations.some(
      linkedDefenseResistanceDamageShareArmorClassOperationIsSupported,
    ) &&
    operations.some(
      linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported,
    ) &&
    operations.some(
      linkedDefenseResistanceDamageShareResistanceOperationIsSupported,
    ) &&
    operations.some(
      linkedDefenseResistanceDamageShareDamageShareOperationIsSupported,
    )
  );
}

function linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return operation.predicate?.kind === "attached_bond_within_range";
}

function linkedDefenseResistanceDamageShareArmorClassOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === LINKED_DEFENSE_ARMOR_CLASS_BONUS &&
    effect.delta.dieSize === 1
  );
}

function linkedDefenseResistanceDamageShareSavingThrowOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "modify_roll_numeric" &&
    sameStringSet(effect.on, ["saving_throw"]) &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === LINKED_DEFENSE_SAVING_THROW_BONUS &&
    effect.delta.dieSize === 1
  );
}

function linkedDefenseResistanceDamageShareResistanceOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    linkedDefenseResistanceDamageShareOperationHasAttachedBondWithinRangePredicate(
      operation,
    ) &&
    effect.kind === "grant_resistance" &&
    typeof effect.damageType === "object" &&
    effect.damageType !== null &&
    effect.damageType.kind === "all_damage_types"
  );
}

function linkedDefenseResistanceDamageShareDamageShareOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return (
    operation.trigger.kind === "on_attached_damaged" &&
    operation.effect.kind === "share_damage_to_caster" &&
    operation.effect.amount === "same_as_attached_damage_taken"
  );
}

function discoverLinkedDefenseResistanceDamageShareCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<LinkedDefenseResistanceDamageShareSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveLinkedDefenseResistanceDamageShare(
  input: SpellProcedureProfileResolveInput<LinkedDefenseResistanceDamageShareSpellInvocation>,
): BattleResolutionResult {
  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills, [targetHole.holeId])) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "linked defense damage share uses one willing target with paired worn rings and connection range facts.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }

  const target = input.input.state.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    ) ||
    !spellTargetIsKnownWilling(
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    ) ||
    !linkedDefenseResistanceDamageShareCastFactsAreSatisfied({
      casterId: input.actorId,
      targetId: target.combatantId,
      invocation: input.invocation,
      facts: input.fillSet.targetSpatialFacts,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "linked defense damage share target must be another willing creature with paired worn platinum rings within 60 feet.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [target.combatantId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyLinkedDefenseResistanceDamageShareSpellEffect(
    input.input.state,
    input.actorId,
    target.combatantId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

const LinkedDefenseResistanceDamageShareInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("linkedDefenseResistanceDamageShare"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: LinkedDefenseResistanceDamageShareTemplateSchema,
      rangeFeet: MovementFeet,
      connectionRangeFeet: MovementFeet,
    }),
  );
export const linkedDefenseResistanceDamageShareProfile: SpellProcedureDeclaration<
  "linkedDefenseResistanceDamageShare",
  LinkedDefenseResistanceDamageShareSpellInvocation
> = {
  procedure: "linkedDefenseResistanceDamageShare",
  executionSchema: LinkedDefenseResistanceDamageShareInvocationSchema,
  admit: admitLinkedDefenseResistanceDamageShare,
  discoverCastAct: discoverLinkedDefenseResistanceDamageShareCastAct,
  resolve: resolveLinkedDefenseResistanceDamageShare,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
