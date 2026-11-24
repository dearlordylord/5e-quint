// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import {
  characterEquipmentItemSourceFromId,
  type CharacterBuildEquipment,
  type CharacterBuildLoadout,
  type CharacterEquipmentItemId,
  type CharacterEquipmentItemSlot,
  type CharacterEquipmentItemUnitId,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import { Match, Option } from "effect";

export type EquipmentMapBySlot<Value> = {
  readonly armor: Map<CharacterEquipmentItemUnitId, Value>;
  readonly shield: Map<CharacterEquipmentItemUnitId, Value>;
  readonly weapon: Map<CharacterEquipmentItemUnitId, Value>;
};

export function emptyEquipmentMapBySlot<Value>(): EquipmentMapBySlot<Value> {
  return {
    armor: new Map<CharacterEquipmentItemUnitId, Value>(),
    shield: new Map<CharacterEquipmentItemUnitId, Value>(),
    weapon: new Map<CharacterEquipmentItemUnitId, Value>(),
  };
}

export function equipmentMapForSlot<Value>(
  maps: EquipmentMapBySlot<Value>,
  slot: CharacterEquipmentItemSlot,
): Map<CharacterEquipmentItemUnitId, Value> {
  return Match.value(slot).pipe(
    Match.when("armor", () => maps.armor),
    Match.when("shield", () => maps.shield),
    Match.when("main", () => maps.weapon),
    Match.when("off", () => maps.weapon),
    Match.exhaustive,
  );
}

export function ownedEquipmentQuantityBySlot(
  owned: readonly CharacterBuildEquipment["owned"][number][],
): EquipmentMapBySlot<number> {
  const quantities = emptyEquipmentMapBySlot<number>();
  for (const item of owned) {
    if (item.kind !== "catalogItem" && item.kind !== "authoredCatalogItem") {
      continue;
    }
    const source = characterEquipmentItemSourceFromId(item.itemId);
    const quantity = equipmentMapForSlot(quantities, source.slot);
    quantity.set(
      source.unitId,
      (quantity.get(source.unitId) ?? 0) + item.quantity,
    );
  }
  return quantities;
}

export function expectedEquipmentKindForLoadoutSlot(
  slot: CharacterEquipmentItemSlot,
): "armor" | "shield" | "weapon" {
  return Match.value(slot).pipe(
    Match.when("armor", () => "armor" as const),
    Match.when("shield", () => "shield" as const),
    Match.when("main", () => "weapon" as const),
    Match.when("off", () => "weapon" as const),
    Match.exhaustive,
  );
}

export type EquipmentLoadoutStructureIssue =
  | {
      readonly tag: "weaponCannotBeHeldOneHanded";
      readonly itemId: CharacterEquipmentItemId;
    }
  | {
      readonly tag: "twoHandedGripHandConflict";
      readonly itemId: CharacterEquipmentItemId<"main">;
    }
  | {
      readonly tag: "shieldAndOffHandWeaponConflict";
    };

/**
 * Validate loadout relationships that are independent of ownership. This is
 * shared by the mutable operation and the persisted-build parser so stored
 * state cannot bypass the same shield, hand-use, or grip invariants.
 *
 * A Two-Handed weapon needs the main hand's `two_handed` grip, so it is
 * refused in the off hand or with a `one_handed` grip. A `two_handed` grip
 * uses both hands, so it leaves none for a shield or an off-hand weapon. Any
 * weapon may take the `two_handed` grip (ASSUMPTIONS.md A58).
 */
export function equipmentLoadoutStructureIssues(
  loadout: CharacterBuildLoadout,
  unitLibrary: UnitCatalog,
): readonly EquipmentLoadoutStructureIssue[] {
  const issues: EquipmentLoadoutStructureIssue[] = [];
  if (loadout.shield !== undefined && loadout.offHandWeapon !== undefined) {
    issues.push({ tag: "shieldAndOffHandWeaponConflict" });
  }

  const weapon = loadout.weapon;
  if (weapon !== undefined) {
    issues.push(
      ...Match.value(weapon.grip).pipe(
        Match.when("one_handed", () =>
          weaponRequiresTwoHands(weapon.itemId, unitLibrary)
            ? [
                {
                  tag: "weaponCannotBeHeldOneHanded" as const,
                  itemId: weapon.itemId,
                },
              ]
            : [],
        ),
        Match.when("two_handed", () =>
          loadout.shield !== undefined || loadout.offHandWeapon !== undefined
            ? [
                {
                  tag: "twoHandedGripHandConflict" as const,
                  itemId: weapon.itemId,
                },
              ]
            : [],
        ),
        Match.exhaustive,
      ),
    );
  }

  const offHandWeapon = loadout.offHandWeapon;
  if (
    offHandWeapon !== undefined &&
    weaponRequiresTwoHands(offHandWeapon.itemId, unitLibrary)
  ) {
    issues.push({
      tag: "weaponCannotBeHeldOneHanded",
      itemId: offHandWeapon.itemId,
    });
  }

  return issues;
}

function weaponRequiresTwoHands(
  itemId: CharacterEquipmentItemId,
  unitLibrary: UnitCatalog,
): boolean {
  const source = characterEquipmentItemSourceFromId(itemId);
  const unit = unitLibrary.getUnit(source.unitId);
  return (
    Option.isSome(unit) &&
    unit.value.kind === "weapon" &&
    unit.value.properties?.some(({ kind }) => kind === "two_handed") === true
  );
}

export function equipmentLoadoutStructureIssueMessage(
  issue: EquipmentLoadoutStructureIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "weaponCannotBeHeldOneHanded" },
      ({ itemId }) => `Weapon ${itemId} cannot be held one-handed.`,
    ),
    Match.when(
      { tag: "twoHandedGripHandConflict" },
      ({ itemId }) =>
        `Weapon ${itemId} is held two-handed, which leaves no hand for a shield or an off-hand weapon.`,
    ),
    Match.when(
      { tag: "shieldAndOffHandWeaponConflict" },
      () => "A shield and an off-hand weapon cannot occupy the same loadout.",
    ),
    Match.exhaustive,
  );
}
