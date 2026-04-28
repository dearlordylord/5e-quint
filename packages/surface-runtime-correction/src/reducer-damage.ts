import { Hp } from "@dnd/shared/types";

import type { CreatureState } from "#/reducer-state.ts";

export function applyHpDamage(
  creature: CreatureState,
  damageAmount: number,
): CreatureState {
  const effectiveDamage = Math.max(0, damageAmount);
  const currentTempHp = Number(creature.tempHp);
  const currentHp = Number(creature.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextTempHp = Hp(currentTempHp - tempHpAbsorbed);
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));

  // RAW TODO: excess damage matters for Instant Death, damage at 0 HP can
  // cause Death Saving Throw failures, and monster/PC death differs. This
  // package has no dead/dying/death-save state yet, so this helper only owns
  // temporary-HP absorption and the HP clamp.
  return { ...creature, hp: nextHp, tempHp: nextTempHp };
}
