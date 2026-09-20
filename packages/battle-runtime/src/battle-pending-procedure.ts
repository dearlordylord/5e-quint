import type {
  BattleStartTurnOccurrenceOption,
  BattleStartTurnOccurrenceSequenceCheckpoint,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

/**
 * The canonical occurrence identity exposed with an individual start-turn
 * frontier. Labels remain presentation-owned; kind and occurrenceId are the
 * execution facts needed to correlate a fill with the selected occurrence.
 */
export type BattlePendingStartTurnOccurrence = Pick<
  BattleStartTurnOccurrenceOption,
  "kind" | "occurrenceId"
>;

export type BattlePendingTurnBoundaryRequest =
  | { readonly kind: "outgoingEndTurn" }
  | { readonly kind: "startTurnOccurrenceOrder" }
  | {
      readonly kind: "startTurnOccurrence";
      readonly occurrence: BattlePendingStartTurnOccurrence;
    };

/**
 * The procedure that owns an ordinary Hole frontier. This is an ephemeral
 * execution projection: durable sequence and continuation facts remain in
 * their existing checkpoint and replay structures.
 */
export type BattlePendingProcedure =
  | { readonly kind: "subjectResolution" }
  | {
      readonly kind: "turnBoundary";
      readonly endingActorId: CombatantId;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
      readonly request: BattlePendingTurnBoundaryRequest;
    };
