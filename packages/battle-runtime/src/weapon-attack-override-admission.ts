import {
  attackBonus,
  type CharacterLevel,
  type DamageDieSize,
  type PositiveInteger,
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

export type WeaponAttackOverrideDamageTierFacts<
  AtLevel extends number,
  Dice extends number,
  DieSize extends DamageDieSize,
> = {
  readonly atLevel: CharacterLevel & AtLevel;
  readonly override: {
    readonly dice: PositiveInteger & Dice;
    readonly dieSize: DamageDieSize & DieSize;
  };
};

export type WeaponAttackOverrideDamageDieFacts = {
  readonly base: {
    readonly dice: PositiveInteger & 1;
    readonly dieSize: DamageDieSize & 8;
  };
  readonly tiers: readonly [
    WeaponAttackOverrideDamageTierFacts<5, 1, 10>,
    WeaponAttackOverrideDamageTierFacts<11, 1, 12>,
    WeaponAttackOverrideDamageTierFacts<17, 2, 6>,
  ];
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
  readonly dice: PositiveInteger;
  readonly dieSize: DamageDieSize;
} {
  const [tierAtFive, tierAtEleven, tierAtSeventeen] = damageDie.tiers;
  if (characterLevel >= tierAtSeventeen.atLevel) {
    return tierAtSeventeen.override;
  }
  if (characterLevel >= tierAtEleven.atLevel) {
    return tierAtEleven.override;
  }
  if (characterLevel >= tierAtFive.atLevel) {
    return tierAtFive.override;
  }
  return damageDie.base;
}
