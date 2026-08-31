import { maybeOpenConfiguredSpellCastReactionWindow } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-weapon-enhancement
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The weaponAttackDamageEnhancement Spell Procedure Profile: a Bonus Action spell that
// attaches a timed magic-weapon enhancement to an exact holder-plus-item weapon
// identity supplied by the table-owned fill boundary.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellSlotLevel } from "@dnd/shared/types";
import type { Attachment, EffectAtom } from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES,
  type BattleActDiscoveryCandidate,
  type BattleActiveEffectExpiration,
  type BattleWeaponEnhancementTargetItemFact,
  type BattleResolutionResult,
  type BattleState,
  type WeaponAttackDamageEnhancementBonus,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { CombatantId } from "../../identity.ts";
import { battleWeaponItemHasWeaponAttackDamageEnhancement } from "../attack-damage-apply.ts";
import { isCharacterBattleCreatureState } from "../creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { loadoutHasUsableHeldWeaponItem } from "../wild-shape-equipment.ts";
import { characterEffectiveLoadout } from "../battle-object-lifecycle.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  weaponAttackDamageEnhancementTargetItemHole,
  weaponAttackDamageEnhancementTargetItemHoleId,
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
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type WeaponAttackDamageEnhancementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "weaponAttackDamageEnhancement" }
>;

type WeaponAttackDamageEnhancementProjection = {
  readonly durationTicks: Extract<
    BattleActiveEffectExpiration,
    { readonly kind: "duration" }
  >["durationTicks"];
  readonly bonus: Extract<
    EffectAtom,
    { readonly kind: "grant_weapon_attack_enhancement" }
  >["bonus"];
};
type WeaponAttackDamageEnhancementMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
> & {
  readonly duration: Extract<
    BattleSpellAdmissionSource["mechanics"]["duration"],
    { readonly kind: "timed" }
  >;
};

function weaponAttackDamageEnhancementMechanicsAreSupported(
  mechanics: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { readonly family: "ongoing_effect" }
  >,
): mechanics is WeaponAttackDamageEnhancementMechanics {
  return (
    mechanics.level === 2 &&
    mechanics.castingTime.kind === "bonus_action" &&
    mechanics.range.kind === "touch" &&
    mechanics.duration.kind === "timed" &&
    weaponAttackEnhancementAttachmentIsSupported(mechanics.attachment) &&
    weaponAttackEnhancementDurationEarlyEndIsSupported(mechanics.duration) &&
    mechanics.operations.length === 1
  );
}

function admitWeaponAttackDamageEnhancement(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly WeaponAttackDamageEnhancementInvocation[] {
  const projection = weaponAttackDamageEnhancementProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly WeaponAttackDamageEnhancementInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const bonus = weaponAttackDamageEnhancementBonusForSlot(
        projection.bonus,
        slot.spellLevel,
      );
      return bonus === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "weaponAttackDamageEnhancement",
              spell,
              actionCost: "bonusAction",
              bonus,
              durationTicks: projection.durationTicks,
            },
          ];
    },
  );
}

function weaponAttackDamageEnhancementProjection(
  spell: BattleSpellAdmissionSource,
): WeaponAttackDamageEnhancementProjection | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  if (!weaponAttackDamageEnhancementMechanicsAreSupported(spell.mechanics)) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "grant_weapon_attack_enhancement" ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.success,
    bonus: operation.effect.bonus,
  };
}

function weaponAttackEnhancementAttachmentIsSupported(
  attachment: Attachment,
): boolean {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "object" &&
    attachment.value.count === 1 &&
    attachment.value.filter?.objectKind === "weapon" &&
    attachment.value.filter.magicality === "nonmagical"
  );
}

function weaponAttackEnhancementDurationEarlyEndIsSupported(
  duration: Extract<
    BattleSpellAdmissionSource["mechanics"]["duration"],
    { readonly kind: "timed" }
  >,
): boolean {
  const earlyEnd = duration.earlyEnd ?? [];
  return earlyEnd.length === 1 && earlyEnd[0]?.kind === "caster_recasts_spell";
}

function weaponAttackDamageEnhancementBonusForSlot(
  bonus: WeaponAttackDamageEnhancementProjection["bonus"],
  slotLevel: SpellSlotLevel,
): WeaponAttackDamageEnhancementBonus | null {
  if (
    bonus.kind !== "threshold_tiers" ||
    bonus.axis !== "slot" ||
    bonus.sign !== "+"
  ) {
    return null;
  }
  const base = weaponAttackDamageEnhancementBonusFromNumber(bonus.base);
  if (base === null) {
    return null;
  }
  return bonus.tiers.reduce<WeaponAttackDamageEnhancementBonus | null>(
    (current, tier) => {
      if (current === null) {
        return null;
      }
      if (Number(slotLevel) < tier.atLevel) {
        return current;
      }
      return weaponAttackDamageEnhancementBonusFromNumber(tier.value);
    },
    base,
  );
}

function weaponAttackDamageEnhancementBonusFromNumber(
  value: number,
): WeaponAttackDamageEnhancementBonus | null {
  return isWeaponAttackDamageEnhancementBonus(value) ? value : null;
}

function isWeaponAttackDamageEnhancementBonus(
  value: number,
): value is WeaponAttackDamageEnhancementBonus {
  return WEAPON_ATTACK_DAMAGE_ENHANCEMENT_BONUSES.some(
    (bonus) => bonus === value,
  );
}

function discoverWeaponAttackDamageEnhancementCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<WeaponAttackDamageEnhancementInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [weaponAttackDamageEnhancementTargetItemHole(invocation)],
    },
  ];
}

function resolveWeaponAttackDamageEnhancement(
  input: SpellProcedureProfileResolveInput<WeaponAttackDamageEnhancementInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      weaponAttackDamageEnhancementTargetItemHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "weapon attack enhancement uses one nonmagical weapon item target fill and spell-cast Reaction facts only.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.weaponAttackDamageEnhancementTargetItem === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      weaponAttackDamageEnhancementTargetItemHole(input.invocation),
    ]);
  }
  const targetItem =
    input.fillSet.weaponAttackDamageEnhancementTargetItem.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !battleWeaponAttackDamageEnhancementTargetItemIsHeldWeapon(
      input.input.state,
      targetItem,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "weapon attack enhancement target item must identify a held nonmagical weapon item.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    battleWeaponItemHasWeaponAttackDamageEnhancement(
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
      "weapon attack enhancement target item is already magical from an active weapon attack enhancement effect.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: [],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  /* v8 ignore start -- @preserve -- Admitted spell-resolution invariant: the bound Magic Weapon procedure and its caster are resolved together before profile dispatch. */
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "weapon attack enhancement caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effected = replaceTargetActiveEffect(
    input.input.state,
    input.actorId,
    (effect) =>
      effect.kind === "weaponAttackDamageEnhancement" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    {
      kind: "weaponAttackDamageEnhancement",
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      holderCombatantId: targetItem.holderCombatantId,
      weaponItemId: targetItem.itemId,
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

function battleWeaponAttackDamageEnhancementTargetItemIsHeldWeapon(
  state: BattleState,
  targetItem: BattleWeaponEnhancementTargetItemFact,
): boolean {
  const holder = state.combatants.get(targetItem.holderCombatantId);
  if (!isCharacterBattleCreatureState(holder)) {
    return false;
  }
  const loadout = characterEffectiveLoadout(state, holder);
  return loadoutHasUsableHeldWeaponItem({
    loadout,
    activeWildShape: activeDruidWildShapeEffect(holder),
    itemId: targetItem.itemId,
  });
}

export const WeaponAttackDamageEnhancementInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("weaponAttackDamageEnhancement"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      bonus: Schema.Literals([1, 2, 3]),
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );
export const weaponAttackDamageEnhancementProfile: SpellProcedureDeclaration<
  "weaponAttackDamageEnhancement",
  WeaponAttackDamageEnhancementInvocation
> = {
  procedure: "weaponAttackDamageEnhancement",
  executionSchema: WeaponAttackDamageEnhancementInvocationSchema,
  admit: admitWeaponAttackDamageEnhancement,
  discoverCastAct: discoverWeaponAttackDamageEnhancementCastAct,
  resolve: resolveWeaponAttackDamageEnhancement,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
