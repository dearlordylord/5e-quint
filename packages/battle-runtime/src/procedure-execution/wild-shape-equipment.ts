import type { BattleObjectId } from "../identity.ts";

export const WILD_SHAPE_EQUIPMENT_DISPOSITIONS = [
  "falls",
  "merges",
  "worn",
] as const;
export type WildShapeEquipmentDisposition =
  (typeof WILD_SHAPE_EQUIPMENT_DISPOSITIONS)[number];

export type WildShapeLoadoutObjectRef =
  | {
      readonly kind: "armor";
      readonly objectId: BattleObjectId;
      readonly unitId: string;
    }
  | {
      readonly kind: "shield";
      readonly objectId: BattleObjectId;
      readonly unitId: string;
    }
  | {
      readonly kind: "mainWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: string;
    }
  | {
      readonly kind: "offHandWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: string;
    };

export const WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES = [
  "canHandleObjects",
  "cannotHandleObjects",
] as const;
export type WildShapeFormLimbObjectHandlingWitness = {
  readonly kind: (typeof WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES)[number];
};

export const WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS = [
  "armor",
  "shield",
  "mainWeapon",
  "offHandWeapon",
] as const satisfies ReadonlyArray<WildShapeLoadoutObjectRef["kind"]>;
export type WildShapeEffectiveLoadoutWornKind =
  (typeof WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS)[number];
export type WildShapeWornLoadoutObjectRef = Extract<
  WildShapeLoadoutObjectRef,
  { readonly kind: WildShapeEffectiveLoadoutWornKind }
>;

export const WILD_SHAPE_ARMOR_CLASS_WORN_KINDS = [
  "armor",
  "shield",
] as const satisfies ReadonlyArray<WildShapeEffectiveLoadoutWornKind>;
export type WildShapeArmorClassWornKind =
  (typeof WILD_SHAPE_ARMOR_CLASS_WORN_KINDS)[number];

export type WildShapeWearPracticalityWitness =
  | { readonly kind: "practicalToWear" }
  | {
      readonly kind: "notPracticalToWear";
      readonly fallback: Extract<
        WildShapeEquipmentDisposition,
        "falls" | "merges"
      >;
    };

export type WildShapeEquipmentDispositionChoice =
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: Extract<
        WildShapeEquipmentDisposition,
        "falls" | "merges"
      >;
    }
  | {
      readonly item: WildShapeWornLoadoutObjectRef;
      readonly disposition: "worn";
      readonly practicality: WildShapeWearPracticalityWitness;
    };

export type ActiveWildShapeEquipmentDisposition =
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "merges";
    }
  | {
      readonly item: WildShapeWornLoadoutObjectRef;
      readonly disposition: "worn";
    };
export type ResolvedWildShapeEquipmentDisposition =
  | ActiveWildShapeEquipmentDisposition
  | {
      readonly item: WildShapeLoadoutObjectRef;
      readonly disposition: "falls";
    };
