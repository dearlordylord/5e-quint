// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-weapon-attack-override
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The weaponAttackOverride Spell Procedure Profile: a Bonus Action cantrip
// that attaches a timed spellcasting-ability attack and damage override to an
// exact held Club or Quarterstaff item.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Shillelagh": Bonus Action, Self, 1 minute; a held
//     Club or Quarterstaff can use spellcasting ability for melee attack and
//     damage rolls, changes weapon damage dice, and can deal Force or normal
//     weapon damage. The spell ends early if cast again or the weapon is let go.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Damage Roll, Damage
//     Type, and Weapon Property.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  DAMAGE_DIE_SIZES,
  attackBonus,
  type DamageDieSize,
} from "@dnd/shared/types";
import type { SpellRecord, WeaponRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { CharacterWeaponAttackActionOption } from "../../battle-action-options.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { invalidResult } from "../result-helpers.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { wildShapeCanUseWornLoadoutObject } from "../wild-shape-equipment.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionActor,
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  CharacterWeaponAttackActionOptionSchema,
  ClassCantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const SHILLELAGH_WEAPON_UNIT_IDS = [
  "weapon_club",
  "weapon_quarterstaff",
] as const satisfies readonly WeaponRecord["id"][];

type WeaponAttackOverrideInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "weaponAttackOverride" }
>;
type WeaponAttackOverrideResolveInput = SpellProcedureProfileResolveInput<
  WeaponAttackOverrideInvocation,
  BonusActionSpellBattleResolutionInput
>;
type WeaponAttackOverrideProjection = {
  readonly damage: WeaponAttackOverrideInvocation["activeEffect"]["damage"];
  readonly expiresAt: WeaponAttackOverrideInvocation["activeEffect"]["expiresAt"];
};

function admitWeaponAttackOverride(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly WeaponAttackOverrideInvocation[] {
  const projection = weaponAttackOverrideProjection(
    spell,
    spellAdmissionCharacterLevel(ctx),
  );
  if (projection === null) {
    return [];
  }
  const spellcasting = ctx.actor.origin.spellcasting;
  return shillelaghAttachedWeaponAttacks(ctx.actor).map(
    ({ itemId, attack }): WeaponAttackOverrideInvocation => ({
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "weaponAttackOverride",
      spell,
      actionCost: "bonusAction",
      attachedWeapon: { itemId, attack },
      activeEffect: {
        kind: "spellWeaponAttackOverride",
        sourceSpellId: spell.id,
        sourceCombatantId: ctx.actor.combatantId,
        weaponItemId: itemId,
        spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
        attackBonus: attackBonus(
          Number(spellcasting.spellcastingAbilityModifier) +
            Number(spellcasting.proficiencyBonus),
        ),
        damage: projection.damage,
        damageTypeChoices: ["force", attack.weapon.damage.damageType],
        expiresAt: projection.expiresAt,
      },
    }),
  );
}

function weaponAttackOverrideProjection(
  spell: SpellRecord,
  characterLevel: number,
): WeaponAttackOverrideProjection | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const effect =
    operation?.trigger.kind === "passive" &&
    operation.effect.kind === "override_attached_weapon_attack"
      ? operation.effect
      : null;
  if (
    effect === null ||
    effect.replacesAbility !== "str" ||
    effect.attackRollAbility !== "spellcasting" ||
    effect.damageRollAbility !== "spellcasting" ||
    effect.attackScope !== "melee_attacks_using_attached_weapon" ||
    !sameStringSet(effect.damageTypeChoice, ["force", "weapon_normal"])
  ) {
    return null;
  }
  const damageExpr =
    effect.damageDie.kind === "threshold_tiers"
      ? shillelaghDamageExpr(effect.damageDie, characterLevel)
      : null;
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return damageExpr === null || Either.isLeft(durationTicks)
    ? null
    : {
        damage: { expr: damageExpr },
        expiresAt: {
          kind: "duration",
          durationTicks: durationTicks.right,
        },
      };
}

function shillelaghAttachedWeaponAttacks(actor: SpellAdmissionActor): readonly {
  readonly itemId: string;
  readonly attack: CharacterWeaponAttackActionOption;
}[] {
  const origin = actor.origin;
  const activeWildShape = activeDruidWildShapeEffect(actor);
  return [
    ...(origin.attack === null ||
    origin.selectedLoadout.weapon === undefined ||
    (activeWildShape !== null &&
      !wildShapeCanUseWornLoadoutObject({
        loadout: origin.selectedLoadout,
        formLimbs: activeWildShape.formLimbs,
        equipmentDisposition: activeWildShape.equipmentDisposition,
        objectKind: "mainWeapon",
        unitId: origin.selectedLoadout.weapon.unitId,
      }))
      ? []
      : [
          {
            itemId: origin.selectedLoadout.weapon.itemId,
            attack: origin.attack,
            unitId: origin.selectedLoadout.weapon.unitId,
          },
        ]),
    ...(origin.offHandAttack === undefined ||
    origin.selectedLoadout.offHandWeapon === undefined ||
    (activeWildShape !== null &&
      !wildShapeCanUseWornLoadoutObject({
        loadout: origin.selectedLoadout,
        formLimbs: activeWildShape.formLimbs,
        equipmentDisposition: activeWildShape.equipmentDisposition,
        objectKind: "offHandWeapon",
        unitId: origin.selectedLoadout.offHandWeapon.unitId,
      }))
      ? []
      : [
          {
            itemId: origin.selectedLoadout.offHandWeapon.itemId,
            attack: origin.offHandAttack,
            unitId: origin.selectedLoadout.offHandWeapon.unitId,
          },
        ]),
  ].filter(
    (
      held,
    ): held is {
      readonly itemId: string;
      readonly attack: CharacterWeaponAttackActionOption;
      readonly unitId: WeaponRecord["id"];
    } =>
      held.attack.weapon.usage === "melee" &&
      held.unitId === held.attack.weapon.id &&
      SHILLELAGH_WEAPON_UNIT_IDS.some((unitId) => unitId === held.unitId),
  );
}

function shillelaghDamageExpr(
  damageDie: {
    readonly kind: string;
    readonly axis: string;
    readonly base: { readonly dice: number; readonly dieSize: number };
    readonly tiers: readonly {
      readonly atLevel: number;
      readonly override: {
        readonly dice?: number | undefined;
        readonly dieSize?: number | undefined;
      };
    }[];
  },
  characterLevel: number,
): {
  readonly dice: number;
  readonly dieSize: DamageDieSize;
} | null {
  if (
    damageDie.kind !== "threshold_tiers" ||
    damageDie.axis !== "character" ||
    damageDie.base.dice !== 1 ||
    damageDie.base.dieSize !== 8
  ) {
    return null;
  }
  const override = damageDie.tiers.reduce<{
    readonly dice: number;
    readonly dieSize: number;
  }>(
    (projection, tier) =>
      characterLevel >= tier.atLevel
        ? {
            dice: tier.override.dice ?? projection.dice,
            dieSize: tier.override.dieSize ?? projection.dieSize,
          }
        : projection,
    damageDie.base,
  );
  return isDamageDieSize(override.dieSize)
    ? {
        dice: override.dice,
        dieSize: override.dieSize,
      }
    : null;
}

function isDamageDieSize(value: number): value is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((dieSize) => dieSize === value);
}

function discoverWeaponAttackOverrideCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: WeaponAttackOverrideInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        invocation: weaponAttackOverrideInvocationRef(invocation),
        mode: { tag: "cast" },
        componentWeaponItemId: invocation.attachedWeapon.itemId,
      },
      label: `${invocation.spell.name} (${invocation.attachedWeapon.attack.weapon.name})`,
      summary: weaponAttackOverrideCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function weaponAttackOverrideInvocationRef(
  invocation: WeaponAttackOverrideInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "weaponAttackOverride",
  };
}

function weaponAttackOverrideCastSummary(
  invocation: WeaponAttackOverrideInvocation,
): string {
  return `Cast ${invocation.spell.name} as a cantrip on ${invocation.attachedWeapon.attack.weapon.name}.`;
}

function resolveWeaponAttackOverride(
  input: WeaponAttackOverrideResolveInput,
): BattleResolutionResult {
  if (weaponAttackOverrideFillSetHasDisallowedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon attack override spells do not use target, roll, damage, or save fills.",
    );
  }
  if (
    input.input.subject.componentWeaponItemId !==
    input.invocation.attachedWeapon.itemId
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Weapon attack override spell no longer matches the selected held weapon.",
    );
  }

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Weapon attack override caster is not in this battle.",
    );
  }
  const activeEffects: readonly BattleActiveEffect[] = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponAttackOverride" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    input.invocation.activeEffect,
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

function weaponAttackOverrideFillSetHasDisallowedFills(
  fillSet: OkSpellFillSet,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.concentrationSavingThrows.length > 0
  );
}

const WeaponAttackOverrideInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponAttackOverride" }
  >
>(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("weaponAttackOverride"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("bonusAction"),
    attachedWeapon: Schema.Struct({
      itemId: Schema.String,
      attack: CharacterWeaponAttackActionOptionSchema,
    }),
    activeEffect: BattleRuntimeObjectSchema,
  }),
);
export const weaponAttackOverrideProfile: SpellProcedureProfile<
  "weaponAttackOverride",
  WeaponAttackOverrideInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "weaponAttackOverride",
  invocationSchema: WeaponAttackOverrideInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitWeaponAttackOverride,
  discoverCastAct: discoverWeaponAttackOverrideCastAct,
  castSummary: weaponAttackOverrideCastSummary,
  invocationRef: weaponAttackOverrideInvocationRef,
  resolve: resolveWeaponAttackOverride,
};
