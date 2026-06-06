import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterBattleLoadoutRef } from "../battle-init.ts";
import { battleObjectId, type BattleObjectId } from "../identity.ts";

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
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "shield";
      readonly objectId: BattleObjectId;
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "mainWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: NonNullable<
        CharacterBattleLoadoutRef["weapon"]
      >["unitId"];
    }
  | {
      readonly kind: "offHandWeapon";
      readonly objectId: BattleObjectId;
      readonly unitId: NonNullable<
        CharacterBattleLoadoutRef["offHandWeapon"]
      >["unitId"];
    };

export const WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS = [
  "armor",
  "shield",
] as const satisfies ReadonlyArray<WildShapeLoadoutObjectRef["kind"]>;
export type WildShapeEffectiveLoadoutWornKind =
  (typeof WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS)[number];
export type WildShapeWornLoadoutObjectRef = Extract<
  WildShapeLoadoutObjectRef,
  { readonly kind: WildShapeEffectiveLoadoutWornKind }
>;

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

export type WildShapeEquipmentDispositionFillValue = {
  readonly choices: readonly WildShapeEquipmentDispositionChoice[];
};

export function wildShapeLoadoutObjectRefs(
  loadout: CharacterBattleLoadoutRef,
): readonly WildShapeLoadoutObjectRef[] {
  return [
    ...(loadout.armor === undefined
      ? []
      : [
          {
            kind: "armor" as const,
            objectId: battleObjectId(loadout.armor.itemId),
            unitId: loadout.armor.unitId,
          },
        ]),
    ...(loadout.shield === undefined
      ? []
      : [
          {
            kind: "shield" as const,
            objectId: battleObjectId(loadout.shield.itemId),
            unitId: loadout.shield.unitId,
          },
        ]),
    ...(loadout.weapon === undefined
      ? []
      : [
          {
            kind: "mainWeapon" as const,
            objectId: battleObjectId(loadout.weapon.itemId),
            unitId: loadout.weapon.unitId,
          },
        ]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [
          {
            kind: "offHandWeapon" as const,
            objectId: battleObjectId(loadout.offHandWeapon.itemId),
            unitId: loadout.offHandWeapon.unitId,
          },
        ]),
  ];
}

export function wildShapeAllMergedEquipmentDisposition(
  candidates: readonly WildShapeLoadoutObjectRef[],
): readonly ActiveWildShapeEquipmentDisposition[] {
  return candidates.map((item) => ({ item, disposition: "merges" }));
}

export type WildShapeEquipmentDispositionValidation =
  | {
      readonly tag: "valid";
      readonly dispositions: readonly ActiveWildShapeEquipmentDisposition[];
    }
  | { readonly tag: "invalid"; readonly message: string };

export function validateWildShapeEquipmentDispositionFill(input: {
  readonly candidates: readonly WildShapeLoadoutObjectRef[];
  readonly value: WildShapeEquipmentDispositionFillValue;
}): WildShapeEquipmentDispositionValidation {
  const choicesByKey = new Map<string, WildShapeEquipmentDispositionChoice>();

  for (const choice of input.value.choices) {
    const key = wildShapeLoadoutObjectKey(choice.item);
    if (
      !input.candidates.some((candidate) =>
        sameLoadoutObject(candidate, choice.item),
      )
    ) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition includes an item outside the selected loadout.",
      };
    }
    if (choicesByKey.has(key)) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition includes duplicate item choices.",
      };
    }
    choicesByKey.set(key, choice);
  }

  if (choicesByKey.size !== input.candidates.length) {
    return {
      tag: "invalid",
      message:
        "Druid Wild Shape equipment disposition must choose a disposition for every selected loadout item.",
    };
  }

  const dispositions: ActiveWildShapeEquipmentDisposition[] = [];
  for (const candidate of input.candidates) {
    const choice = choicesByKey.get(wildShapeLoadoutObjectKey(candidate));
    if (choice === undefined) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition must choose a disposition for every selected loadout item.",
      };
    }
    const disposition = activeDispositionForChoice(choice);
    if (disposition.tag === "invalid") {
      return disposition;
    }
    dispositions.push(disposition.value);
  }

  return {
    tag: "valid",
    dispositions,
  };
}

function activeDispositionForChoice(
  choice: WildShapeEquipmentDispositionChoice,
):
  | {
      readonly tag: "valid";
      readonly value: ActiveWildShapeEquipmentDisposition;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (choice.disposition === "worn") {
    if (choice.practicality.kind === "notPracticalToWear") {
      if (choice.practicality.fallback === "falls") {
        return unsupportedFallenEquipmentDisposition();
      }
      return {
        tag: "valid",
        value: {
          item: choice.item,
          disposition: "merges",
        },
      };
    }
    if (!wildShapeLoadoutObjectSupportsEffectiveWornProjection(choice.item)) {
      return unsupportedWornEquipmentDisposition();
    }
    return {
      tag: "valid",
      value: {
        item: choice.item,
        disposition: "worn",
      },
    };
  }
  if (choice.disposition === "falls") {
    return unsupportedFallenEquipmentDisposition();
  }
  return {
    tag: "valid",
    value: {
      item: choice.item,
      disposition: "merges",
    },
  };
}

function unsupportedFallenEquipmentDisposition(): {
  readonly tag: "invalid";
  readonly message: string;
} {
  return {
    tag: "invalid",
    message:
      "Druid Wild Shape fallen equipment requires fallen-object boundary support before battle resolution.",
  };
}

function unsupportedWornEquipmentDisposition(): {
  readonly tag: "invalid";
  readonly message: string;
} {
  return {
    tag: "invalid",
    message:
      "Druid Wild Shape practical worn equipment support is limited to armor and Shields; worn weapon and held-object handling require form-limb object support.",
  };
}

export function wildShapeEquipmentDispositionWearsKind(
  dispositions: readonly ActiveWildShapeEquipmentDisposition[],
  kind: WildShapeEffectiveLoadoutWornKind,
): boolean {
  return dispositions.some(
    (disposition) =>
      disposition.disposition === "worn" && disposition.item.kind === kind,
  );
}

function wildShapeLoadoutObjectSupportsEffectiveWornProjection(
  item: WildShapeLoadoutObjectRef,
): item is WildShapeWornLoadoutObjectRef {
  return WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS.includes(
    item.kind as WildShapeEffectiveLoadoutWornKind,
  );
}

function sameLoadoutObject(
  left: WildShapeLoadoutObjectRef,
  right: WildShapeLoadoutObjectRef,
): boolean {
  return (
    left.kind === right.kind &&
    left.objectId === right.objectId &&
    left.unitId === right.unitId
  );
}

function wildShapeLoadoutObjectKey(item: WildShapeLoadoutObjectRef): string {
  return `${item.kind}:${item.objectId}:${item.unitId}`;
}
