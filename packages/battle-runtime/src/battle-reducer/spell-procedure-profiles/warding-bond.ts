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
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type WardingBondSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  WARDING_BOND_ARMOR_CLASS_BONUS,
  WARDING_BOND_CAST_RANGE_FEET,
  WARDING_BOND_CONNECTION_RANGE_FEET,
  WARDING_BOND_SAVING_THROW_BONUS,
} from "../domain-constants.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
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
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

function admitWardingBond(
  spell: SpellRecord,
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
  spell: SpellRecord,
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
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function wardingBondMaterialComponentIsSupported(spell: SpellRecord): boolean {
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
    SpellRecord["mechanics"],
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
    SpellRecord["mechanics"],
    { readonly family: "ongoing_effect" }
  >["operations"][number],
): boolean {
  return operation.predicate?.kind === "attached_bond_within_range";
}

function wardingBondArmorClassOperationIsSupported(
  operation: Extract<
    SpellRecord["mechanics"],
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
    SpellRecord["mechanics"],
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
    SpellRecord["mechanics"],
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
    SpellRecord["mechanics"],
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
  invocation: WardingBondSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: wardingBondInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: wardingBondCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function wardingBondInvocationRef(
  invocation: WardingBondSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "wardingBond",
  };
}

function wardingBondCastSummary(
  invocation: WardingBondSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveWardingBond(
  input: SpellProcedureProfileResolveInput<WardingBondSpellInvocation>,
): BattleResolutionResult {
  if (wardingBondFillSetHasDisallowedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Warding Bond uses one willing target with paired worn rings and connection range facts.",
    );
  }

  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
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

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [target.combatantId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
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
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

function wardingBondFillSetHasDisallowedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.objectTarget !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.length > 0 ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

const WardingBondInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "wardingBond" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("wardingBond"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
    connectionRangeFeet: MovementFeet,
  }),
);
export const wardingBondProfile: SpellProcedureProfile<
  "wardingBond",
  WardingBondSpellInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "wardingBond",
  invocationSchema: WardingBondInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitWardingBond,
  discoverCastAct: discoverWardingBondCastAct,
  castSummary: wardingBondCastSummary,
  invocationRef: wardingBondInvocationRef,
  resolve: resolveWardingBond,
};
