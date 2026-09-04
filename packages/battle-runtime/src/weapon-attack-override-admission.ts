import {
  DAMAGE_DIE_SIZES,
  attackBonus,
  type CharacterLevel,
  type DamageDieSize,
} from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "./battle-state-execution.ts";
import type { BoundCharacterWeaponAttackActionOption } from "./battle-action-options.ts";
import type { CharacterBattleLoadoutRef } from "./character-creature-execution-facts.ts";
import type { CharacterBattleSpellcastingExecutionState } from "./character-battle-resource-execution.ts";
import {
  characterBattleLevel,
  type CharacterBattleClassLevels,
} from "./character-class-level.ts";
import { type BattleObjectId, type CombatantId } from "./identity.ts";
import type { WeaponAttackOverrideProcedureFacts } from "./procedure-facts/weapon-attack-override.ts";
import { cantripSpellAccessForCastingSource } from "./procedure-execution/spell-invocation-vocabulary.ts";
import {
  loadoutHeldWeaponSlotIsUsable,
  wildShapeCanUseWornLoadoutObject,
} from "./battle-reducer/wild-shape-equipment.ts";

type WeaponAttackOverrideAdmissionActor = {
  readonly combatantId: CombatantId;
  readonly origin: {
    readonly kind: "character";
    readonly attack: BoundCharacterWeaponAttackActionOption | null;
    readonly offHandAttack?: BoundCharacterWeaponAttackActionOption;
    readonly selectedLoadout: CharacterBattleLoadoutRef;
    readonly classLevels: CharacterBattleClassLevels;
    readonly spellcasting: CharacterBattleSpellcastingExecutionState & {
      readonly canCastSpells: true;
    };
  };
};

export type WeaponAttackOverrideAdmissionContext = {
  readonly actor: WeaponAttackOverrideAdmissionActor;
  readonly castingSource: BattleSpellAdmissionSource["castingSource"];
  readonly activeDruidWildShape: Pick<
    Parameters<typeof wildShapeCanUseWornLoadoutObject>[0],
    "formLimbs" | "equipmentDisposition"
  > | null;
};

export type WeaponAttackOverrideInvocation =
  WeaponAttackOverrideProcedureFacts & {
    readonly spell: BattleSpellExecutionSource;
    readonly attachedWeapon: {
      readonly attack: BoundCharacterWeaponAttackActionOption;
    };
  };

export type WeaponAttackOverrideDamageDieFacts = {
  readonly base: {
    readonly dice: 1;
    readonly dieSize: 8;
  };
  readonly tiers: readonly {
    readonly atLevel: CharacterLevel;
    readonly override: {
      readonly dice?: number;
      readonly dieSize?: number;
    };
  }[];
};

export type WeaponAttackOverrideMechanicsProjection = {
  readonly damageDie: WeaponAttackOverrideDamageDieFacts;
  readonly durationTicks: ElapsedTimeTicks;
};

export function admitWeaponAttackOverride(
  spell: BattleSpellExecutionSource,
  projection: WeaponAttackOverrideMechanicsProjection,
  ctx: WeaponAttackOverrideAdmissionContext,
): readonly WeaponAttackOverrideInvocation[] {
  const damageExpr = weaponAttackOverrideDamageExpr(
    projection.damageDie,
    characterBattleLevel(ctx.actor.origin.classLevels),
  );
  if (damageExpr === null) return [];
  const spellcasting = ctx.actor.origin.spellcasting;
  return attachedWeaponAttacksEligibleForOverride(ctx).map(
    ({ itemId, slot, attack }): WeaponAttackOverrideInvocation => ({
      access: cantripSpellAccessForCastingSource(spell.castingSource),
      resource: { tag: "none" },
      procedure: "weaponAttackOverride",
      spell,
      actionCost: "bonusAction",
      attachedWeaponSlot: slot,
      attachedWeapon: { attack },
      activeEffect: {
        kind: "spellWeaponAttackOverride",
        sourceCombatantId: ctx.actor.combatantId,
        weaponItemId: itemId,
        spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
        attackBonus: attackBonus(
          Number(ctx.castingSource.abilityModifier) +
            Number(spellcasting.proficiencyBonus),
        ),
        damage: { expr: damageExpr },
        damageTypeChoices: ["force", attack.weapon.damage.damageType],
        expiresAt: {
          kind: "duration",
          durationTicks: projection.durationTicks,
        },
      },
    }),
  );
}

function attachedWeaponAttacksEligibleForOverride(
  actorContext: WeaponAttackOverrideAdmissionContext,
): readonly {
  readonly itemId: BattleObjectId;
  readonly slot: WeaponAttackOverrideProcedureFacts["attachedWeaponSlot"];
  readonly attack: BoundCharacterWeaponAttackActionOption;
}[] {
  const actor = actorContext.actor;
  const origin = actor.origin;
  const activeWildShape = actorContext.activeDruidWildShape;
  return [
    ...(origin.attack === null ||
    origin.selectedLoadout.weapon === undefined ||
    !loadoutHeldWeaponSlotIsUsable({
      loadout: origin.selectedLoadout,
      activeWildShape,
      objectKind: "mainWeapon",
      itemId: origin.selectedLoadout.weapon.itemId,
    })
      ? []
      : [
          {
            itemId: origin.selectedLoadout.weapon.itemId,
            slot: "mainWeapon" as const,
            attack: origin.attack,
          },
        ]),
    ...(origin.offHandAttack === undefined ||
    origin.selectedLoadout.offHandWeapon === undefined ||
    !loadoutHeldWeaponSlotIsUsable({
      loadout: origin.selectedLoadout,
      activeWildShape,
      objectKind: "offHandWeapon",
      itemId: origin.selectedLoadout.offHandWeapon.itemId,
    })
      ? []
      : [
          {
            itemId: origin.selectedLoadout.offHandWeapon.itemId,
            slot: "offHandWeapon" as const,
            attack: origin.offHandAttack,
          },
        ]),
  ].filter(
    (
      held,
    ): held is {
      readonly itemId: BattleObjectId;
      readonly slot: WeaponAttackOverrideProcedureFacts["attachedWeaponSlot"];
      readonly attack: BoundCharacterWeaponAttackActionOption;
    } =>
      held.attack.weapon.usage === "melee" &&
      held.itemId === held.attack.weaponObjectId &&
      held.attack.weapon.attachedWeaponAttackOverrideEligibility?.kind ===
        "clubOrQuarterstaff",
  );
}

function weaponAttackOverrideDamageExpr(
  damageDie: WeaponAttackOverrideDamageDieFacts,
  characterLevel: CharacterLevel,
): {
  readonly dice: number;
  readonly dieSize: DamageDieSize;
} | null {
  if (damageDie.base.dice !== 1 || damageDie.base.dieSize !== 8) {
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
  return isDamageDieSize(override.dieSize) && override.dice > 0
    ? {
        dice: override.dice,
        dieSize: override.dieSize,
      }
    : null;
}

function isDamageDieSize(value: number): value is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((dieSize) => dieSize === value);
}
