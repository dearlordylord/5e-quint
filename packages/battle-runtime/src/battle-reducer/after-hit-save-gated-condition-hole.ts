import type { Size } from "@dnd/shared/types";
import type {
  AfterHitSaveGatedConditionSpellInvocation,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleSpellSavingThrowOutcomeHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";

export function afterHitSaveGatedConditionSavingThrowOutcomeHole(
  state: BattleState,
  casterId: CombatantId,
  target: BattleCreatureState,
  invocation: BattleExecutableSpellInvocation<AfterHitSaveGatedConditionSpellInvocation>,
): BattleSpellSavingThrowOutcomeHole {
  const base = spellSavingThrowOutcomeHole(state, casterId, invocation);
  return {
    ...base,
    label: "Spell Saving Throw outcome",
    targetRollModes: [
      ...base.targetRollModes,
      ...(creatureSizeIsLargeOrLarger(combatantEffectiveSize(target))
        ? [{ targetId: target.combatantId, rollMode: "advantage" as const }]
        : []),
    ],
  };
}

function creatureSizeIsLargeOrLarger(size: Size): boolean {
  return size === "large" || size === "huge" || size === "gargantuan";
}
