import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  DAMAGE_DIE_SIZES,
  attackBonus,
  type DamageDieSize,
} from "@dnd/shared/types";
import type { SpellRecord, WeaponRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import type { BoundCharacterWeaponAttackActionOption } from "../battle-action-options.ts";
import type { CharacterBattleLoadoutRef } from "../battle-init.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CharacterBattleClassLevel } from "../character-class-level.ts";
import type { CombatantId } from "../identity.ts";
import { sameStringSet } from "../battle-reducer/spells-profile-shared.ts";
import { wildShapeCanUseWornLoadoutObject } from "../battle-reducer/wild-shape-equipment.ts";
import type { WeaponAttackOverrideSpellProcedureExecution } from "../procedure-execution/weapon-attack-override.ts";

type WeaponAttackOverrideAdmissionActor = {
  readonly combatantId: CombatantId;
  readonly origin: {
    readonly kind: "character";
    readonly attack: BoundCharacterWeaponAttackActionOption | null;
    readonly offHandAttack?: BoundCharacterWeaponAttackActionOption;
    readonly selectedLoadout: CharacterBattleLoadoutRef;
    readonly classLevels: readonly CharacterBattleClassLevel[];
    readonly spellcasting: CharacterBattleSpellcastingState & {
      readonly canCastSpells: true;
    };
  };
};

export type WeaponAttackOverrideAdmissionContext = {
  readonly actor: WeaponAttackOverrideAdmissionActor;
  readonly activeDruidWildShape: Pick<
    Parameters<typeof wildShapeCanUseWornLoadoutObject>[0],
    "formLimbs" | "equipmentDisposition"
  > | null;
};

export type WeaponAttackOverrideInvocation = Pick<
  WeaponAttackOverrideSpellProcedureExecution,
  "access" | "actionCost" | "activeEffect" | "procedure" | "resource"
> & {
  readonly spell: SpellRecord;
  readonly attachedWeapon: {
    readonly itemId: string;
    readonly attack: BoundCharacterWeaponAttackActionOption;
  };
};

type WeaponAttackOverrideProjection = {
  readonly damage: WeaponAttackOverrideInvocation["activeEffect"]["damage"];
  readonly expiresAt: WeaponAttackOverrideInvocation["activeEffect"]["expiresAt"];
};

export function admitWeaponAttackOverride(
  spell: SpellRecord,
  ctx: WeaponAttackOverrideAdmissionContext,
): readonly WeaponAttackOverrideInvocation[] {
  const projection = weaponAttackOverrideProjection(
    spell,
    ctx.actor.origin.classLevels.reduce(
      (total, classLevel) => total + Number(classLevel.level),
      0,
    ),
  );
  if (projection === null) {
    return [];
  }
  const spellcasting = ctx.actor.origin.spellcasting;
  return attachedWeaponAttacksEligibleForOverride(ctx).map(
    ({ itemId, attack }): WeaponAttackOverrideInvocation => ({
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "weaponAttackOverride",
      spell,
      actionCost: "bonusAction",
      attachedWeapon: { itemId, attack },
      activeEffect: {
        kind: "spellWeaponAttackOverride",
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
      ? weaponAttackOverrideDamageExpr(effect.damageDie, characterLevel)
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

function attachedWeaponAttacksEligibleForOverride(
  actorContext: WeaponAttackOverrideAdmissionContext,
): readonly {
  readonly itemId: string;
  readonly attack: BoundCharacterWeaponAttackActionOption;
}[] {
  const actor = actorContext.actor;
  const origin = actor.origin;
  const activeWildShape = actorContext.activeDruidWildShape;
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
      readonly attack: BoundCharacterWeaponAttackActionOption;
      readonly unitId: WeaponRecord["id"];
    } =>
      held.attack.weapon.usage === "melee" &&
      held.unitId === held.attack.weapon.id &&
      held.attack.weapon.attachedWeaponAttackOverrideEligibility?.kind ===
        "clubOrQuarterstaff",
  );
}

function weaponAttackOverrideDamageExpr(
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
