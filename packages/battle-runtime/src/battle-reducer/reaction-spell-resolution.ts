import { Either } from "effect";
import type {
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import type { SpellSlotLevel } from "@dnd/shared/types";
import { snapshotBattle } from "./interrupt-execution.ts";
import { invalidResult } from "./result-helpers.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import { markSpellSlotExpendedThisTurn } from "./spell-turn-resources.ts";

export function completeReactionSpellSlotCast(input: {
  readonly effectedState: BattleState;
  readonly errorState: BattleState;
  readonly casterId: CombatantId;
  readonly slotLevel: SpellSlotLevel;
}): BattleResolutionResult {
  const slotted = expendSpellSlot(
    input.effectedState,
    input.casterId,
    input.slotLevel,
  );
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.casterId,
  );
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
