import { BATTLE_REACTION_TRIGGERS } from "@dnd/battle-runtime";

export const GENERIC_READY_TRIGGERS = BATTLE_REACTION_TRIGGERS;

export const GENERIC_COMBAT_ACTION_LABELS = [
  "Dash",
  "Disengage",
  "Dodge",
  ...GENERIC_READY_TRIGGERS.map(() => "Ready" as const),
] as const;

export const GENERIC_COMBAT_ACTION_LABELS_WITH_HELP = [
  "Dash",
  "Disengage",
  "Dodge",
  "Help",
  ...GENERIC_READY_TRIGGERS.map(() => "Ready" as const),
] as const;
