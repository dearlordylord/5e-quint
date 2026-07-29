import { maybeOpenConfiguredSpellCastReactionWindow } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The magicWeaponEnhancement Spell Procedure Profile: a Bonus Action spell that
// attaches a timed magic-weapon enhancement to an exact holder-plus-item weapon
// identity supplied by the table-owned fill boundary.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellSlotLevel } from "@dnd/shared/types";
import type { Attachment, EffectAtom } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  MAGIC_WEAPON_ENHANCEMENT_BONUSES,
  type BattleActDiscoveryCandidate,
  type BattleActiveEffectExpiration,
  type BattleMagicWeaponTargetItemFact,
  type BattleResolutionResult,
  type BattleState,
  type MagicWeaponEnhancementBonus,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { CombatantId } from "../../identity.ts";
import { battleWeaponItemHasMagicWeaponEnhancement } from "../attack-damage-apply.ts";
import { isCharacterBattleCreatureState } from "../creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { wildShapeCanUseWornLoadoutObject } from "../wild-shape-equipment.ts";
import { characterEffectiveLoadout } from "../battle-object-lifecycle.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  magicWeaponTargetItemHole,
  magicWeaponTargetItemHoleId,
} from "../spells-targeting.ts";
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
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

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
  spell: BattleSpellAdmissionSource,
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
  spell: BattleSpellAdmissionSource,
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
    BattleSpellAdmissionSource["mechanics"]["duration"],
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
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<MagicWeaponEnhancementInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [magicWeaponTargetItemHole(invocation)],
    },
  ];
}

function resolveMagicWeaponEnhancement(
  input: SpellProcedureProfileResolveInput<MagicWeaponEnhancementInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      magicWeaponTargetItemHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon uses one nonmagical weapon item target fill and spell-cast Reaction facts only.",
    );
  }
  /* v8 ignore stop */
  if (input.fillSet.magicWeaponTargetItem === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      magicWeaponTargetItemHole(input.invocation),
    ]);
  }
  const targetItem = input.fillSet.magicWeaponTargetItem.value;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!battleMagicWeaponTargetItemIsHeldWeapon(input.input.state, targetItem)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon target item must identify a held nonmagical weapon item.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    battleWeaponItemHasMagicWeaponEnhancement(
      input.input.state,
      targetItem.holderCombatantId,
      targetItem.itemId,
      {
        exceptSourceCombatantId: input.actorId,
        exceptSourceProcedureRef: input.invocation.sourceProcedureRef,
      },
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Magic Weapon target item is already magical from an active Magic Weapon effect.",
    );
  }
  /* v8 ignore stop */

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: [],
  });
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
  const effected = replaceTargetActiveEffect(
    input.input.state,
    input.actorId,
    (effect) =>
      effect.kind === "spellMagicWeaponEnhancement" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    {
      kind: "spellMagicWeaponEnhancement",
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      holderCombatantId: targetItem.holderCombatantId,
      weaponItemId: targetItem.itemId,
      bonus: input.invocation.bonus,
      expiresAt: {
        kind: "duration",
        durationTicks: input.invocation.durationTicks,
      },
    },
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

function battleMagicWeaponTargetItemIsHeldWeapon(
  state: BattleState,
  targetItem: BattleMagicWeaponTargetItemFact,
): boolean {
  const holder = state.combatants.get(targetItem.holderCombatantId);
  if (!isCharacterBattleCreatureState(holder)) {
    return false;
  }
  const loadout = characterEffectiveLoadout(state, holder);
  const activeWildShape = activeDruidWildShapeEffect(holder);
  if (activeWildShape !== null) {
    const main = loadout.weapon;
    const offHand = loadout.offHandWeapon;
    return (
      (main !== undefined &&
        main.itemId === targetItem.itemId &&
        wildShapeCanUseWornLoadoutObject({
          loadout,
          formLimbs: activeWildShape.formLimbs,
          equipmentDisposition: activeWildShape.equipmentDisposition,
          objectKind: "mainWeapon",
          objectId: main.itemId,
        })) ||
      (offHand !== undefined &&
        offHand.itemId === targetItem.itemId &&
        wildShapeCanUseWornLoadoutObject({
          loadout,
          formLimbs: activeWildShape.formLimbs,
          equipmentDisposition: activeWildShape.equipmentDisposition,
          objectKind: "offHandWeapon",
          objectId: offHand.itemId,
        }))
    );
  }
  return (
    loadout.weapon?.itemId === targetItem.itemId ||
    loadout.offHandWeapon?.itemId === targetItem.itemId
  );
}

export const MagicWeaponEnhancementInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("magicWeaponEnhancement"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      bonus: Schema.Literal(1, 2, 3),
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );
export const magicWeaponEnhancementProfile: SpellProcedureDeclaration<
  "magicWeaponEnhancement",
  MagicWeaponEnhancementInvocation
> = {
  procedure: "magicWeaponEnhancement",
  executionSchema: MagicWeaponEnhancementInvocationSchema,
  admit: admitMagicWeaponEnhancement,
  discoverCastAct: discoverMagicWeaponEnhancementCastAct,
  resolve: resolveMagicWeaponEnhancement,
};
