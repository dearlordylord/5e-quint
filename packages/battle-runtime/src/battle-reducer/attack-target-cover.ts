// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.TARGET_COVER
// The AC an attack roll must meet: the target's AC plus the bonus from the
// degree of cover the table stated for that attack, read from the same geometry
// fact that made the target legal. A target the table stated no degree for has
// no cover.
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  armorClassBehindCover,
  directTargetCover,
} from "@dnd/shared-algebras/cover-algebra";
import type { CoverType } from "@dnd/shared/types";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { attackTargetStatedCover } from "./attack-spatial.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  spellAttackTargetStatedCover,
  type SpellTargetLegalityOptions,
} from "./spells-targeting.ts";

/**
 * The AC an attack roll must meet against an admitted target behind the stated
 * cover. Target legality refuses a target with Total Cover before any attack
 * roll, so an admitted target never has it.
 */
export function admittedArmorClassBehindCover(
  armorClass: number,
  cover: CoverType | undefined,
): number {
  const directCover = directTargetCover(cover);
  /* v8 ignore start -- @preserve -- Internal invariant: every attack target's legality check refuses Total Cover from the same geometry fact before its attack roll. */
  if (directCover === null) {
    throw new Error(
      "Target legality must refuse Total Cover before the attack roll.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return armorClassBehindCover(armorClass, directCover);
}

/** The AC an attack roll must meet against an admitted creature target. */
export function armorClassAgainstAttack(
  state: BattleState,
  target: BattleCreatureState,
  cover: CoverType | undefined,
): number {
  return admittedArmorClassBehindCover(
    currentArmorClass(activeEffectArmorClass(state, target)),
    cover,
  );
}

/** The AC a weapon or Stat Block attack roll must meet. */
export function weaponAttackArmorClass(
  state: BattleState,
  attackerId: CombatantId,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): number {
  return armorClassAgainstAttack(
    state,
    target,
    attackTargetStatedCover(facts, attackerId, target.combatantId, attack),
  );
}

/** The AC a Spell Attack roll must meet. */
export function spellAttackArmorClass(
  state: BattleState,
  casterId: CombatantId,
  target: BattleCreatureState,
  invocation: BattleExecutableSpellInvocation,
  facts: readonly BattleTargetSpatialFact[],
  options: SpellTargetLegalityOptions = {},
): number {
  return armorClassAgainstAttack(
    state,
    target,
    spellAttackTargetStatedCover(
      facts,
      casterId,
      target.combatantId,
      invocation,
      options,
    ),
  );
}
