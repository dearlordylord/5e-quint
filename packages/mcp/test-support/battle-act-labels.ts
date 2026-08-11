export const GENERIC_COMBAT_ACTION_LABELS = [
  "Dash",
  "Disengage",
  "Dodge",
] as const;

export const GENERIC_COMBAT_ACTION_LABELS_WITH_SHOVE = [
  ...GENERIC_COMBAT_ACTION_LABELS,
  "Unarmed Strike (Shove)",
] as const;

export const GENERIC_COMBAT_ACTION_LABELS_WITH_HELP = [
  "Dash",
  "Disengage",
  "Dodge",
  "Help",
] as const;

export const GENERIC_COMBAT_ACTION_LABELS_WITH_HELP_AND_SHOVE = [
  ...GENERIC_COMBAT_ACTION_LABELS_WITH_HELP,
  "Unarmed Strike (Shove)",
] as const;
