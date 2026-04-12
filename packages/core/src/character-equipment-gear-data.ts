export * from "#/character-equipment-armor-data.ts";
export * from "#/character-equipment-weapon-data.ts";

import { CHARACTER_ARMORS } from "#/character-equipment-armor-data.ts";
import { CHARACTER_WEAPONS } from "#/character-equipment-weapon-data.ts";

export const CHARACTER_COMBAT_EQUIPMENT_ITEMS = [
  ...CHARACTER_ARMORS,
  ...CHARACTER_WEAPONS,
  "shield",
] as const;
export type CharacterCombatEquipmentItem =
  (typeof CHARACTER_COMBAT_EQUIPMENT_ITEMS)[number];
