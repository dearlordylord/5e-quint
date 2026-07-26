import { characterSpellProcedure } from "../character-execution-queries.ts";
import type {
  BattleHole,
  BattleReadiedSpell,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { movementHoleHasRemainingBudget } from "./movement-speed.ts";
import { isReadiedSpellInvocation } from "./spells-discovery.ts";
import {
  spellDamageTypeChoiceHole,
  spellObjectTargetHole,
  spellSavingThrowOutcomeHole,
  spellTargetAllocationHole,
  spellTargetHole,
} from "./spells-holes-fills.ts";
import { readiedMovementHole } from "./movement-holes.ts";

export function readiedSpellInitialHoles(
  state: BattleState,
  casterId: CombatantId,
  readied: BattleReadiedSpell,
): readonly BattleHole[] {
  const caster = state.combatants.get(casterId);
  const invocation =
    caster?.origin.kind === "character"
      ? characterSpellProcedure(
          caster.origin.execution,
          readied.procedureRef,
          caster,
        )
      : undefined;
  if (invocation === undefined || !isReadiedSpellInvocation(invocation)) {
    return [];
  }
  if (invocation.procedure === "saveGatedDamage") {
    return invocation.targeting.kind === "singleCombatant"
      ? [spellTargetHole(state, casterId, invocation)]
      : [spellSavingThrowOutcomeHole(state, casterId, invocation)];
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return [spellTargetAllocationHole(state, casterId, invocation)];
  }
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return [spellDamageTypeChoiceHole(invocation)];
  }
  if (
    invocation.procedure === "spellAttackDamage" &&
    invocation.targeting.kind === "singleCreatureOrObject"
  ) {
    return [
      spellTargetHole(state, casterId, invocation),
      spellObjectTargetHole(invocation),
    ];
  }
  return [spellTargetHole(state, casterId, invocation)];
}

export function readiedMovementInitialHoles(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleHole[] {
  const hole = readiedMovementHole(state, actorId);
  return movementHoleHasRemainingBudget(hole) ? [hole] : [];
}
