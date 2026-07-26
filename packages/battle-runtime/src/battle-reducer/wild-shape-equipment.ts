import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type { BattleObjectId } from "../identity.ts";
import {
  WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS,
  type ActiveWildShapeEquipmentDisposition,
  type ResolvedWildShapeEquipmentDisposition,
  type WildShapeEffectiveLoadoutWornKind,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeFormLimbObjectHandlingWitness,
  type WildShapeLoadoutObjectRef,
  type WildShapeWornLoadoutObjectRef,
} from "../procedure-execution/wild-shape-equipment.ts";
export {
  WILD_SHAPE_ARMOR_CLASS_WORN_KINDS,
  WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS,
  WILD_SHAPE_EQUIPMENT_DISPOSITIONS,
  WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES,
  type ActiveWildShapeEquipmentDisposition,
  type ResolvedWildShapeEquipmentDisposition,
  type WildShapeArmorClassWornKind,
  type WildShapeEffectiveLoadoutWornKind,
  type WildShapeEquipmentDisposition,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeFormLimbObjectHandlingWitness,
  type WildShapeLoadoutObjectRef,
  type WildShapeWearPracticalityWitness,
  type WildShapeWornLoadoutObjectRef,
} from "../procedure-execution/wild-shape-equipment.ts";

export type WildShapeEquipmentDispositionFillValue = {
  readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
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
            objectId: loadout.armor.itemId,
          },
        ]),
    ...(loadout.shield === undefined
      ? []
      : [
          {
            kind: "shield" as const,
            objectId: loadout.shield.itemId,
          },
        ]),
    ...(loadout.weapon === undefined
      ? []
      : [
          {
            kind: "mainWeapon" as const,
            objectId: loadout.weapon.itemId,
          },
        ]),
    ...(loadout.offHandWeapon === undefined
      ? []
      : [
          {
            kind: "offHandWeapon" as const,
            objectId: loadout.offHandWeapon.itemId,
          },
        ]),
  ];
}

export type WildShapeEquipmentDispositionValidation =
  | {
      readonly tag: "valid";
      readonly dispositions: readonly ResolvedWildShapeEquipmentDisposition[];
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

  const dispositions: ResolvedWildShapeEquipmentDisposition[] = [];
  for (const candidate of input.candidates) {
    const choice = choicesByKey.get(wildShapeLoadoutObjectKey(candidate));
    if (choice === undefined) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition must choose a disposition for every selected loadout item.",
      };
    }
    const disposition = resolvedDispositionForChoice(choice);
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

function resolvedDispositionForChoice(
  choice: WildShapeEquipmentDispositionChoice,
):
  | {
      readonly tag: "valid";
      readonly value: ResolvedWildShapeEquipmentDisposition;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (choice.disposition === "worn") {
    if (choice.practicality.kind === "notPracticalToWear") {
      if (choice.practicality.fallback === "falls") {
        return resolvedEquipmentDisposition(choice.item, "falls");
      }
      return resolvedEquipmentDisposition(choice.item, "merges");
    }
    if (!wildShapeLoadoutObjectSupportsEffectiveWornProjection(choice.item)) {
      return unsupportedWornEquipmentDisposition();
    }
    return resolvedEquipmentDisposition(choice.item, "worn");
  }
  if (choice.disposition === "falls") {
    return resolvedEquipmentDisposition(choice.item, "falls");
  }
  return resolvedEquipmentDisposition(choice.item, "merges");
}

function resolvedEquipmentDisposition(
  item: WildShapeLoadoutObjectRef,
  disposition: ResolvedWildShapeEquipmentDisposition["disposition"],
): {
  readonly tag: "valid";
  readonly value: ResolvedWildShapeEquipmentDisposition;
} {
  return {
    tag: "valid",
    value: {
      item,
      disposition,
    },
  };
}

function unsupportedWornEquipmentDisposition(): {
  readonly tag: "invalid";
  readonly message: string;
} {
  return {
    tag: "invalid",
    message:
      "Druid Wild Shape practical worn equipment support requires a selected loadout object with promoted worn-object behavior.",
  };
}

export function wildShapeActiveEquipmentDispositions(
  dispositions: readonly ResolvedWildShapeEquipmentDisposition[],
): readonly ActiveWildShapeEquipmentDisposition[] {
  return dispositions.flatMap(
    (disposition): readonly ActiveWildShapeEquipmentDisposition[] =>
      disposition.disposition === "falls" ? [] : [disposition],
  );
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

export function wildShapeEquipmentDispositionWearsObject(
  dispositions: readonly ActiveWildShapeEquipmentDisposition[],
  item: WildShapeLoadoutObjectRef,
): boolean {
  return dispositions.some(
    (disposition) =>
      disposition.disposition === "worn" &&
      sameLoadoutObject(disposition.item, item),
  );
}

export function wildShapeCanUseWornLoadoutObject(input: {
  readonly loadout: CharacterBattleLoadoutRef;
  readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
  readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
  readonly objectKind: WildShapeEffectiveLoadoutWornKind;
  readonly objectId: BattleObjectId;
}): boolean {
  return wildShapeWornLoadoutObjectForUse(input) !== undefined;
}

export function loadoutWeaponItemIsUsableDuringWildShape(input: {
  readonly loadout: CharacterBattleLoadoutRef;
  readonly activeWildShape: {
    readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
    readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
  } | null;
  readonly itemId: BattleObjectId;
}): boolean {
  const heldWeapon = [
    ...(input.loadout.weapon === undefined
      ? []
      : [{ objectKind: "mainWeapon" as const, ...input.loadout.weapon }]),
    ...(input.loadout.offHandWeapon === undefined
      ? []
      : [
          {
            objectKind: "offHandWeapon" as const,
            ...input.loadout.offHandWeapon,
          },
        ]),
  ].find((candidate) => candidate.itemId === input.itemId);
  if (heldWeapon === undefined) {
    return false;
  }
  return (
    input.activeWildShape === null ||
    wildShapeCanUseWornLoadoutObject({
      loadout: input.loadout,
      formLimbs: input.activeWildShape.formLimbs,
      equipmentDisposition: input.activeWildShape.equipmentDisposition,
      objectKind: heldWeapon.objectKind,
      objectId: heldWeapon.itemId,
    })
  );
}

export function wildShapeWornLoadoutObjectForUse(input: {
  readonly loadout: CharacterBattleLoadoutRef;
  readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
  readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
  readonly objectKind: WildShapeEffectiveLoadoutWornKind;
  readonly objectId: BattleObjectId;
}): WildShapeWornLoadoutObjectRef | undefined {
  if (!wildShapeFormLimbsCanHandleObjects(input.formLimbs)) {
    return undefined;
  }
  const item = wildShapeLoadoutObjectRefs(input.loadout).find(
    (candidate): candidate is WildShapeWornLoadoutObjectRef =>
      candidate.kind === input.objectKind &&
      candidate.objectId === input.objectId,
  );
  return item !== undefined &&
    wildShapeEquipmentDispositionWearsObject(input.equipmentDisposition, item)
    ? item
    : undefined;
}

export function wildShapeFormLimbsCanHandleObjects(
  witness: WildShapeFormLimbObjectHandlingWitness,
): boolean {
  return witness.kind === "canHandleObjects";
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
  return left.kind === right.kind && left.objectId === right.objectId;
}

function wildShapeLoadoutObjectKey(item: WildShapeLoadoutObjectRef): string {
  return `${item.kind}:${item.objectId}`;
}
