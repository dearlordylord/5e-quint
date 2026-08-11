import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type { BattleObjectId } from "../identity.ts";
import {
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
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (choicesByKey.has(key)) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition includes duplicate item choices.",
      };
    }
    /* v8 ignore stop */
    choicesByKey.set(key, choice);
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (choicesByKey.size !== input.candidates.length) {
    return {
      tag: "invalid",
      message:
        "Druid Wild Shape equipment disposition must choose a disposition for every selected loadout item.",
    };
  }
  /* v8 ignore stop */

  const dispositions: ResolvedWildShapeEquipmentDisposition[] = [];
  for (const candidate of input.candidates) {
    const choice = choicesByKey.get(wildShapeLoadoutObjectKey(candidate));
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (choice === undefined) {
      return {
        tag: "invalid",
        message:
          "Druid Wild Shape equipment disposition must choose a disposition for every selected loadout item.",
      };
    }
    /* v8 ignore stop */
    const disposition = resolvedDispositionForChoice(choice);
    dispositions.push(disposition);
  }

  return {
    tag: "valid",
    dispositions,
  };
}

function resolvedDispositionForChoice(
  choice: WildShapeEquipmentDispositionChoice,
): ResolvedWildShapeEquipmentDisposition {
  if (choice.disposition === "worn") {
    if (choice.practicality.kind === "notPracticalToWear") {
      if (choice.practicality.fallback.disposition === "falls") {
        return resolvedFallenEquipmentDisposition(
          choice.item,
          choice.practicality.fallback.fallInActorSpace,
        );
      }
      return resolvedEquipmentDisposition(choice.item, "merges");
    }
    return resolvedEquipmentDisposition(choice.item, "worn");
  }
  if (choice.disposition === "falls") {
    return resolvedFallenEquipmentDisposition(
      choice.item,
      choice.fallInActorSpace,
    );
  }
  return resolvedEquipmentDisposition(choice.item, "merges");
}

function resolvedEquipmentDisposition(
  item: WildShapeLoadoutObjectRef,
  disposition: Exclude<
    ResolvedWildShapeEquipmentDisposition["disposition"],
    "falls"
  >,
): ResolvedWildShapeEquipmentDisposition {
  return {
    item,
    disposition,
  };
}

function resolvedFallenEquipmentDisposition(
  item: WildShapeLoadoutObjectRef,
  fallInActorSpace: Extract<
    ResolvedWildShapeEquipmentDisposition,
    { readonly disposition: "falls" }
  >["fallInActorSpace"],
): ResolvedWildShapeEquipmentDisposition {
  return {
    item,
    disposition: "falls",
    fallInActorSpace,
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

export function loadoutHasUsableHeldWeaponItem(input: {
  readonly loadout: CharacterBattleLoadoutRef;
  readonly activeWildShape: {
    readonly formLimbs: WildShapeFormLimbObjectHandlingWitness;
    readonly equipmentDisposition: readonly ActiveWildShapeEquipmentDisposition[];
  } | null;
  readonly itemId: BattleObjectId;
}): boolean {
  const heldWeapons = [
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
  ];
  return heldWeapons.some(
    (heldWeapon) =>
      heldWeapon.itemId === input.itemId &&
      (input.activeWildShape === null ||
        wildShapeCanUseWornLoadoutObject({
          loadout: input.loadout,
          formLimbs: input.activeWildShape.formLimbs,
          equipmentDisposition: input.activeWildShape.equipmentDisposition,
          objectKind: heldWeapon.objectKind,
          objectId: heldWeapon.itemId,
        })),
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

function sameLoadoutObject(
  left: WildShapeLoadoutObjectRef,
  right: WildShapeLoadoutObjectRef,
): boolean {
  return left.kind === right.kind && left.objectId === right.objectId;
}

function wildShapeLoadoutObjectKey(item: WildShapeLoadoutObjectRef): string {
  return `${item.kind}:${item.objectId}`;
}
