import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import { Schema } from "effect";

import { BattleRoundSchema } from "./active-effect/round-codec.ts";
import type { BattleState } from "./battle-state-execution.ts";
import { CombatantId } from "./identity.ts";

export const BattleInitiativePositionSchema = Schema.Struct({
  roundReached: BattleRoundSchema,
  activeTurnActorId: CombatantId,
}).annotations({ identifier: "BattleInitiativePosition" });

export type BattleInitiativePosition =
  typeof BattleInitiativePositionSchema.Type;

/** Projects the current position in a Battle's Initiative order. */
export function battleInitiativePosition(
  state: Pick<BattleState, "initiative">,
): BattleInitiativePosition {
  return {
    roundReached: state.initiative.round,
    activeTurnActorId: currentActing(state.initiative),
  };
}
