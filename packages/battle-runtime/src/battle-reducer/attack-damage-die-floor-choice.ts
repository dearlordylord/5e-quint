import type { UnitRecord } from "@dnd/surface/surface/types";

export const ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS = [
  "apply",
  "decline",
] as const;

export type AttackDamageDieFloorChoiceSelection =
  (typeof ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS)[number];

export type AttackDamageDieFloorChoiceFill = {
  readonly unitId: UnitRecord["id"];
  readonly selection: AttackDamageDieFloorChoiceSelection;
};

export type AttackDamageDieFloorChoiceUnitIds = readonly [
  UnitRecord["id"],
  ...UnitRecord["id"][],
];

export function attackDamageDieFloorChoiceUnitIds(
  unitIds: readonly UnitRecord["id"][],
): AttackDamageDieFloorChoiceUnitIds | null {
  const [first, ...rest] = unitIds;
  return first === undefined ? null : [first, ...rest];
}
