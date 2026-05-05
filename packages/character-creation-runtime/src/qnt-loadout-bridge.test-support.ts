import type { LoadoutSlot } from "./index.ts";

const QNT_LOADOUT_CHOICE_KEY_TO_SLOT = {
  loadout_armor: "armor",
  loadout_shield: "shield",
  loadout_weapon: "weapon",
} as const satisfies Readonly<Record<string, LoadoutSlot>>;

export function qntLoadoutSlot(choiceKey: string): LoadoutSlot | undefined {
  return choiceKey in QNT_LOADOUT_CHOICE_KEY_TO_SLOT
    ? QNT_LOADOUT_CHOICE_KEY_TO_SLOT[
        choiceKey as keyof typeof QNT_LOADOUT_CHOICE_KEY_TO_SLOT
      ]
    : undefined;
}
