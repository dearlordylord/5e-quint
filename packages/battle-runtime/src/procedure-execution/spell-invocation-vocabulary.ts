import type { MovementFeet, SpellSlotLevel } from "@dnd/shared/types";
import type { Ability, DcSource, SpellLevel } from "@dnd/surface/surface/types";
import type {
  BattleResourcePoolExecutionRef,
  StatBlockSpellInvocationRef,
  CombatantId,
} from "../identity.ts";

/** Authored-identity-free access facts retained for spell execution. */
export type StatBlockCantripSpellAccess = {
  readonly tag: "statBlockCantrip";
  readonly invocationRef: StatBlockSpellInvocationRef;
};
export type StatBlockLeveledSpellAccess = {
  readonly tag: "statBlockLeveled";
  readonly invocationRef: StatBlockSpellInvocationRef;
};
export type LeveledSpellAccess =
  | { readonly tag: "prepared" }
  | StatBlockLeveledSpellAccess;

export type ClassCantripSpellAccess = { readonly tag: "classCantrip" };
export type SpellAccessCantripSpellAccess = {
  readonly tag: "spellAccessCantrip";
};
export type CantripSpellAccess =
  | StatBlockCantripSpellAccess
  | ClassCantripSpellAccess
  | SpellAccessCantripSpellAccess;

export function cantripSpellAccessForCastingSource(
  source: import("./spell-rule-facts.ts").SpellCastingSource,
): CantripSpellAccess {
  if (source.tag === "statBlock")
    return { tag: "statBlockCantrip", invocationRef: source.invocationRef };
  return source.tag === "classSpellcasting"
    ? { tag: "classCantrip" }
    : { tag: "spellAccessCantrip" };
}

export function isCantripSpellAccess(
  access: SpellAccess,
): access is CantripSpellAccess {
  return (
    access.tag === "classCantrip" ||
    access.tag === "spellAccessCantrip" ||
    access.tag === "statBlockCantrip"
  );
}

export type ArmorOfShadowsSpellAccess = {
  readonly tag: "armorOfShadows";
};
export type SpellEffectSpellAccess = {
  readonly tag: "spellEffect";
  readonly sourceCombatantId: CombatantId;
};
export type StatBlockSpellInvocationResource<
  Level extends SpellSlotLevel | 0 = SpellSlotLevel | 0,
> =
  | { readonly tag: "statBlockAtWill"; readonly castLevel: Level }
  | {
      readonly tag: "statBlockLimited";
      readonly castLevel: Level;
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };
export type NoSpellInvocationResource = { readonly tag: "none" };
export type CantripSpellInvocationResource =
  | NoSpellInvocationResource
  | StatBlockSpellInvocationResource<0>;
/** Authored-identity-free spell-slot spend retained for spell execution. */
export type SpellSlotInvocationResource = {
  readonly tag: "spellSlot";
  readonly slotLevel: SpellSlotLevel;
};
export type SpellAccessFreeCastInvocationResource = {
  readonly tag: "spellAccessFreeCast";
  readonly castLevel: SpellSlotLevel;
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
};
export type LeveledSpellInvocationResource =
  | StatBlockSpellInvocationResource<SpellSlotLevel>
  | SpellSlotInvocationResource
  | SpellAccessFreeCastInvocationResource;

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
  | {
      readonly kind: "pointOriginGroundSquare";
      readonly sideFeet: MovementFeet;
    }
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

export function leveledSpellAccessForCastingSource(
  source: import("./spell-rule-facts.ts").SpellCastingSource,
): LeveledSpellAccess {
  return source.tag === "statBlock"
    ? { tag: "statBlockLeveled", invocationRef: source.invocationRef }
    : { tag: "prepared" };
}
export function isLeveledSpellAccess(
  access: SpellAccess,
): access is LeveledSpellAccess {
  return access.tag === "prepared" || access.tag === "statBlockLeveled";
}
