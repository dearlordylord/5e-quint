import type { AttackRollResult } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { BattleDamageRollHole } from "../battle-state-execution.ts";
import { attackDamageComponents } from "./statblock-attacks.ts";

type DamageDiceInput = Pick<
  BattleDamageRollHole,
  | "attack"
  | "critical"
  | "attackDamageRiders"
  | "spellWeaponDamageRiders"
  | "spellMarkedDamageRiders"
  | "cunningStrikeOptions"
> & { readonly attackRoll?: AttackRollResult };

export function attackDamageDiceRequest(
  input: DamageDiceInput,
): BattleDamageRollHole["damageDice"] {
  if (
    input.attackDamageRiders?.some((rider) => rider.optional) ||
    (input.cunningStrikeOptions?.length ?? 0) > 0
  )
    return { kind: "selectionDependent" };
  return {
    kind: "fixed",
    groups: attackDamageComponents(
      input.attack,
      input.critical,
      input.attackRoll,
      input.attackDamageRiders,
      input.spellWeaponDamageRiders,
      input.spellMarkedDamageRiders,
    ).map(({ expr: { dice, dieSize } }) => ({ dice, dieSize })),
  };
}
