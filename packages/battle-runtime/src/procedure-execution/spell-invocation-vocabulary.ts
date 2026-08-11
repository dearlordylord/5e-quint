import type { MovementFeet, SpellSlotLevel } from "@dnd/shared/types";
import type { Ability, DcSource } from "@dnd/surface/surface/types";
import type {
  BattleResourcePoolExecutionRef,
  CombatantId,
} from "../identity.ts";

/** Authored-identity-free access facts retained for spell execution. */
export type PreparedSpellAccess = { readonly tag: "prepared" };

/** Authored-identity-free spell-slot spend retained for spell execution. */
export type SpellSlotInvocationResource = {
  readonly tag: "spellSlot";
  readonly slotLevel: SpellSlotLevel;
};

export type ClassCantripSpellAccess = { readonly tag: "classCantrip" };
export type ArmorOfShadowsSpellAccess = {
  readonly tag: "armorOfShadows";
};
export type SpellEffectSpellAccess = {
  readonly tag: "spellEffect";
  readonly sourceCombatantId: CombatantId;
};
export type NoSpellInvocationResource = { readonly tag: "none" };
export type ClassFeatureFreeCastInvocationResource = {
  readonly tag: "classFeatureFreeCast";
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
};

export type RollModifierSpellSaveGate = {
  readonly ability: Ability;
  readonly dc: DcSource;
};

/** Authored-identity-free target shape retained for spell execution. */
export type SpellTargeting =
  | { readonly kind: "singleCombatant" }
  | { readonly kind: "singleCreatureOrObject" }
  | {
      readonly kind: "targetList";
      readonly minTargets: 1;
      readonly maxTargets: number;
    }
  | { readonly kind: "pointOriginSphere"; readonly radiusFeet: MovementFeet }
  | {
      readonly kind: "pointOriginSphereDiameter";
      readonly diameterFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginCylinder";
      readonly radiusFeet: MovementFeet;
      readonly heightFeet: MovementFeet;
    }
  | {
      readonly kind: "pointOriginCubeExcludingCaster";
      readonly sideFeet: MovementFeet;
    }
  | { readonly kind: "pointOriginCube"; readonly sideFeet: MovementFeet }
  | { readonly kind: "selfOriginCube"; readonly sideFeet: MovementFeet }
  | { readonly kind: "selfOriginCone"; readonly lengthFeet: MovementFeet }
  | {
      readonly kind: "selfOriginLine";
      readonly lengthFeet: MovementFeet;
      readonly widthFeet: MovementFeet;
    }
  | {
      readonly kind: "selfOriginEmanation";
      readonly radiusFeet: MovementFeet;
    }
  | {
      readonly kind: "primaryTargetOriginEmanation";
      readonly radiusFeet: MovementFeet;
    };

type SpellTargetingByKind<Kind extends SpellTargeting["kind"]> = Extract<
  SpellTargeting,
  { readonly kind: Kind }
>;

type SaveGatedConditionAreaSpellTargeting =
  | SpellTargetingByKind<"pointOriginSphere">
  | SpellTargetingByKind<"pointOriginCubeExcludingCaster">
  | SpellTargetingByKind<"pointOriginCube">
  | SpellTargetingByKind<"selfOriginCone">;

type SaveGatedDamageAreaSpellTargeting =
  | SaveGatedConditionAreaSpellTargeting
  | SpellTargetingByKind<"pointOriginCylinder">
  | SpellTargetingByKind<"selfOriginCube">
  | SpellTargetingByKind<"selfOriginLine">;

export type SaveGatedConditionSpellTargeting =
  | SpellTargetingByKind<"targetList">
  | SaveGatedConditionAreaSpellTargeting;

export type SaveGatedDamageSpellTargeting =
  | SpellTargetingByKind<"singleCombatant">
  | SaveGatedDamageAreaSpellTargeting;
