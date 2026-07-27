import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
//
// The wardingBond Spell Procedure Profile: an action spell that creates one
// paired caster-target bond from caller-supplied willing-target, paired-ring,
// and 60-foot connection witnesses. The active-effect lifecycle and damage
// sharing reducer helpers stay in warding-bond.ts because damage application,
// cleanup, Saving Throw projections, and separation acts consume them outside
// cast resolution.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Either } from "effect";

import { WardingBondActiveEffectTemplateSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type WardingBondSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  WARDING_BOND_ARMOR_CLASS_BONUS,
  WARDING_BOND_CAST_RANGE_FEET,
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "../domain-constants.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  applyWardingBondSpellEffect,
  wardingBondCastFactsAreSatisfied,
} from "../warding-bond.ts";
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
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function admitWardingBond(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly WardingBondSpellInvocation[] {
  const projection = wardingBondSpellProjection(ctx.actor.combatantId, spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly WardingBondSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "wardingBond",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function wardingBondSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  WardingBondSpellInvocation,
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
      Number(WARDING_BOND_CONNECTION_RANGE_FEET) ||
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
    !wardingBondMaterialComponentIsSupported(spell) ||
    !wardingBondEarlyEndsAreSupported(spell.mechanics.duration.earlyEnd) ||
    !wardingBondOperationsAreSupported(spell.mechanics.operations)
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: WARDING_BOND_CAST_RANGE_FEET,
        connectionRangeFeet: WARDING_BOND_CONNECTION_RANGE_FEET,
        activeEffect: {
          kind: "wardingBond",
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function wardingBondMaterialComponentIsSupported(
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

function wardingBondEarlyEndsAreSupported(
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

function wardingBondOperationsAreSupported(
  operations: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"],
): boolean {
  return (
    operations.length === 4 &&
    operations.some(wardingBondArmorClassOperationIsSupported) &&
    operations.some(wardingBondSavingThrowOperationIsSupported) &&
    operations.some(wardingBondResistanceOperationIsSupported) &&
    operations.some(wardingBondDamageShareOperationIsSupported)
  );
}

function wardingBondOperationHasAttachedBondWithinRangePredicate(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return operation.predicate?.kind === "attached_bond_within_range";
}

function wardingBondArmorClassOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === WARDING_BOND_ARMOR_CLASS_BONUS &&
    effect.delta.dieSize === 1
  );
}

function wardingBondSavingThrowOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "modify_roll_numeric" &&
    sameStringSet(effect.on, ["saving_throw"]) &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "+" &&
    effect.delta.dice === WARDING_BOND_SAVING_THROW_BONUS &&
    effect.delta.dieSize === 1
  );
}

function wardingBondResistanceOperationIsSupported(
  operation: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  const effect = operation.effect;
  return (
    operation.trigger.kind === "passive" &&
    wardingBondOperationHasAttachedBondWithinRangePredicate(operation) &&
    effect.kind === "grant_resistance" &&
    typeof effect.damageType === "object" &&
    effect.damageType !== null &&
    effect.damageType.kind === "all_damage_types"
  );
}

function wardingBondDamageShareOperationIsSupported(
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

function discoverWardingBondCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<WardingBondSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveWardingBond(
  input: SpellProcedureProfileResolveInput<WardingBondSpellInvocation>,
): BattleResolutionResult {
  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (!fillsBelongToSpellCastHoles(input.input.fills, [targetHole.holeId])) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Warding Bond uses one willing target with paired worn rings and connection range facts.",
    );
  }

  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }

  const target = input.input.state.combatants.get(input.fillSet.targetId);
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
    !wardingBondCastFactsAreSatisfied({
      casterId: input.actorId,
      targetId: target.combatantId,
      invocation: input.invocation,
      facts: input.fillSet.targetSpatialFacts,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Warding Bond target must be another willing creature with paired worn platinum rings within 60 feet.",
    );
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [target.combatantId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyWardingBondSpellEffect(
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

const WardingBondInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("wardingBond"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: WardingBondActiveEffectTemplateSchema,
    rangeFeet: MovementFeet,
    connectionRangeFeet: MovementFeet,
  }),
);
export const wardingBondProfile: SpellProcedureDeclaration<
  "wardingBond",
  WardingBondSpellInvocation
> = {
  procedure: "wardingBond",
  executionSchema: WardingBondInvocationSchema,
  admit: admitWardingBond,
  discoverCastAct: discoverWardingBondCastAct,
  resolve: resolveWardingBond,
};
