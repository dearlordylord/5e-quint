import type { MovementFeet } from "@dnd/shared/types";
import type { UnitId } from "@dnd/shared/game-facts";
import type {
  Ability,
  SixAbilityScores,
  Skill,
} from "@dnd/surface/surface/types";
import type { BattleObjectId } from "./identity.ts";

export type CharacterBattleInvocationFeature = {
  readonly tag: "eldritchMind";
};

export type CharacterBattleLoadoutRef = {
  readonly armor?: { readonly itemId: BattleObjectId; readonly unitId: UnitId };
  readonly shield?: {
    readonly itemId: BattleObjectId;
    readonly unitId: UnitId;
  };
  readonly weapon?: {
    readonly itemId: BattleObjectId;
    readonly unitId: UnitId;
    readonly grip: "one_handed" | "two_handed";
  };
  readonly offHandWeapon?: {
    readonly itemId: BattleObjectId;
    readonly unitId: UnitId;
  };
};

export type CharacterBattleWeaponMasterySelection = {
  readonly weaponUnitId: UnitId;
};

export function weaponMasteryIsSelectedForWeapon(
  weaponUnitId: UnitId,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): boolean {
  return weaponMasteries.some(
    (mastery) => mastery.weaponUnitId === weaponUnitId,
  );
}

export type CharacterBattleD20Statistics = {
  readonly abilityScores: SixAbilityScores;
  readonly savingThrowProficiencies: readonly Ability[];
  readonly skillProficiencies: readonly Skill[];
  readonly skillExpertise: readonly Skill[];
};

export type BattleWalkSpeed = { readonly walkFeet: MovementFeet };
