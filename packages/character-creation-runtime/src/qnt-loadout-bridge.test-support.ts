import type { LoadoutSlot } from "./index.ts";

const QNT_LOADOUT_CHOICE_KEY_TO_SLOT = {
  loadout_armor: "armor",
  loadout_shield: "shield",
  loadout_weapon: "weapon",
} as const satisfies Readonly<Record<string, LoadoutSlot>>;

export function qntLoadoutSlot(choiceKey: string): LoadoutSlot | undefined {
  return Object.entries(QNT_LOADOUT_CHOICE_KEY_TO_SLOT).find(
    ([key]) => key === choiceKey,
  )?.[1];
}
