// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
//
// The magicWeaponEnhancement Spell Procedure Profile: a Bonus Action spell that
// attaches a timed magic-weapon enhancement to an exact holder-plus-item weapon
// identity supplied by the table-owned fill boundary.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellSlotLevel } from "@dnd/shared/types";
import type {
  Attachment,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  maybeOpenReactionWindow,
  snapshotBattle,
  MAGIC_WEAPON_ENHANCEMENT_BONUSES,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleMagicWeaponTargetItemFact,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type MagicWeaponEnhancementBonus,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type { CombatantId } from "../../identity.ts";
import { spellId } from "../../identity.ts";
import { battleWeaponItemHasMagicWeaponEnhancement } from "../attack-damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { magicWeaponTargetItemHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type MagicWeaponEnhancementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "magicWeaponEnhancement" }
>;

type MagicWeaponEnhancementProjection = {
  readonly durationTicks: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "duration" }
  >["durationTicks"];
  readonly bonus: Extract<
    EffectAtom,
    { readonly kind: "grant_magic_weapon_enhancement" }
  >["bonus"];
};

function admitMagicWeaponEnhancement(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly MagicWeaponEnhancementInvocation[] {
  const projection = magicWeaponEnhancementProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MagicWeaponEnhancementInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const bonus = magicWeaponEnhancementBonusForSlot(
        projection.bonus,
        slot.spellLevel,
      );
      return bonus === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "magicWeaponEnhancement",
              spell,
              actionCost: "bonusAction",
              bonus,
              durationTicks: projection.durationTicks,
            },
          ];
    },
  );
}

function magicWeaponEnhancementProjection(
  spell: SpellRecord,
): MagicWeaponEnhancementProjection | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    !magicWeaponAttachmentIsSupported(spell.mechanics.attachment) ||
    !magicWeaponDurationEarlyEndIsSupported(spell.mechanics.duration) ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "grant_magic_weapon_enhancement" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    bonus: operation.effect.bonus,
  };
}

function magicWeaponAttachmentIsSupported(attachment: Attachment): boolean {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "object" &&
    attachment.value.count === 1 &&
    attachment.value.filter?.objectKind === "weapon" &&
    attachment.value.filter.magicality === "nonmagical"
  );
}

function magicWeaponDurationEarlyEndIsSupported(
  duration: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "timed" }
  >,
): boolean {
  const earlyEnd = duration.earlyEnd ?? [];
  return earlyEnd.length === 1 && earlyEnd[0]?.kind === "caster_recasts_spell";
}

function magicWeaponEnhancementBonusForSlot(
  bonus: MagicWeaponEnhancementProjection["bonus"],
  slotLevel: SpellSlotLevel,
): MagicWeaponEnhancementBonus | null {
  if (
    bonus.kind !== "threshold_tiers" ||
    bonus.axis !== "slot" ||
    bonus.sign !== "+"
  ) {
    return null;
  }
  const base = magicWeaponEnhancementBonusFromNumber(bonus.base);
  if (base === null) {
    return null;
  }
  return bonus.tiers.reduce<MagicWeaponEnhancementBonus | null>(
    (current, tier) => {
      if (current === null) {
        return null;
      }
      if (Number(slotLevel) < tier.atLevel) {
        return current;
      }
      return magicWeaponEnhancementBonusFromNumber(tier.value);
    },
    base,
  );
}

function magicWeaponEnhancementBonusFromNumber(
  value: number,
): MagicWeaponEnhancementBonus | null {
  return isMagicWeaponEnhancementBonus(value) ? value : null;
}

function isMagicWeaponEnhancementBonus(
  value: number,
): value is MagicWeaponEnhancementBonus {
  return MAGIC_WEAPON_ENHANCEMENT_BONUSES.some((bonus) => bonus === value);
}

function discoverMagicWeaponEnhancementCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: MagicWeaponEnhancementInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        invocation: magicWeaponEnhancementInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: magicWeaponEnhancementCastSummary(invocation),
      initialHoles: [magicWeaponTargetItemHole(invocation)],
    },
  ];
}

function magicWeaponEnhancementInvocationRef(
  invocation: MagicWeaponEnhancementInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "magicWeaponEnhancement",
  };
}

function magicWeaponEnhancementCastSummary(
  invocation: MagicWeaponEnhancementInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot on a nonmagical weapon.`;
}

function resolveMagicWeaponEnhancement(
  input: SpellProcedureProfileResolveInput<
    MagicWeaponEnhancementInvocation,
    BonusActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (magicWeaponEnhancementFillSetHasDisallowedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon uses one nonmagical weapon item target fill and spell-cast Reaction facts only.",
    );
  }
  if (input.fillSet.magicWeaponTargetItem === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      magicWeaponTargetItemHole(input.invocation),
    ]);
  }
  const targetItem = input.fillSet.magicWeaponTargetItem.value;
  if (!battleMagicWeaponTargetItemIsHeldWeapon(input.input.state, targetItem)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon target item must identify a held nonmagical weapon item.",
    );
  }
  if (
    battleWeaponItemHasMagicWeaponEnhancement(
      input.input.state,
      targetItem.holderCombatantId,
      targetItem.itemId,
      {
        exceptSourceCombatantId: input.actorId,
        exceptSourceSpellId: input.invocation.spell.id,
      },
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon target item is already magical from an active Magic Weapon effect.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
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

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Magic Weapon caster is not in this battle.",
    );
  }
  const activeEffects: readonly BattleActiveEffect[] = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMagicWeaponEnhancement" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    {
      kind: "spellMagicWeaponEnhancement",
      sourceSpellId: input.invocation.spell.id,
      sourceCombatantId: input.actorId,
      holderCombatantId: targetItem.holderCombatantId,
      weaponItemId: targetItem.itemId,
      bonus: input.invocation.bonus,
      expiresAt: {
        kind: "duration",
        durationTicks: input.invocation.durationTicks,
      },
    },
  ];
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects,
    }),
  };
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

function battleMagicWeaponTargetItemIsHeldWeapon(
  state: BattleState,
  targetItem: BattleMagicWeaponTargetItemFact,
): boolean {
  const holder = state.combatants.get(targetItem.holderCombatantId);
  if (holder?.origin.kind !== "character") {
    return false;
  }
  return (
    holder.origin.selectedLoadout.weapon?.itemId === targetItem.itemId ||
    holder.origin.selectedLoadout.offHandWeapon?.itemId === targetItem.itemId
  );
}

function magicWeaponEnhancementFillSetHasDisallowedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.objectContactTargets !== undefined ||
    fillSet.objectContactSavingThrowOutcome !== undefined ||
    fillSet.objectDropResolution !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (attackSequencePartFill) =>
        attackSequencePartFill.target !== undefined ||
        attackSequencePartFill.attackRoll !== undefined ||
        attackSequencePartFill.mirrorImageDuplicateRoll !== undefined ||
        attackSequencePartFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.selfTransformationModeChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.mirrorImageDuplicateRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

export const magicWeaponEnhancementProfile: SpellProcedureProfile<
  "magicWeaponEnhancement",
  MagicWeaponEnhancementInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "magicWeaponEnhancement",
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMagicWeaponEnhancement,
  discoverCastAct: discoverMagicWeaponEnhancementCastAct,
  castSummary: magicWeaponEnhancementCastSummary,
  invocationRef: magicWeaponEnhancementInvocationRef,
  resolve: resolveMagicWeaponEnhancement,
};
