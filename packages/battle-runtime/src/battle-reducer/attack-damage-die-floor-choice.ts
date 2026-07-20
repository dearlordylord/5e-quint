import type { BattleProcedureExecutionRef } from "../identity.ts";

export const ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS = [
  "apply",
  "decline",
] as const;

export type AttackDamageDieFloorChoiceSelection =
  (typeof ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS)[number];

export type AttackDamageDieFloorChoiceFill = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly selection: AttackDamageDieFloorChoiceSelection;
};

export type AttackDamageDieFloorChoiceProcedureRefs = readonly [
  BattleProcedureExecutionRef,
  ...BattleProcedureExecutionRef[],
];

export function attackDamageDieFloorChoiceProcedureRefs(
  procedureRefs: readonly BattleProcedureExecutionRef[],
): AttackDamageDieFloorChoiceProcedureRefs | null {
  const [first, ...rest] = procedureRefs;
  return first === undefined ? null : [first, ...rest];
}
