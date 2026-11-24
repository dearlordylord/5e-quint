// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.TARGET_COVER
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  armorClassBehindCover,
  type DirectTargetCover,
} from "@dnd/shared-algebras/cover-algebra";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";

/** The AC an attack roll must meet against an admitted creature target. */
export function armorClassAgainstAttack(
  state: BattleState,
  target: BattleCreatureState,
  cover: DirectTargetCover,
): number {
  return armorClassBehindCover(
    currentArmorClass(activeEffectArmorClass(state, target)),
    cover,
  );
}
