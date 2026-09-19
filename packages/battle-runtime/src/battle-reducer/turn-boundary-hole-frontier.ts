import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleHole,
  BattleHoleId,
  BattleResolutionResult,
  BattleStartTurnOccurrenceOption,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./needs-holes-result.ts";

type BattleTurnBoundaryHoleRequestContext = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly holes: ReadonlyNonEmptyArray<BattleHole>;
};

export type BattleTurnBoundaryStartTurnOccurrence = Pick<
  BattleStartTurnOccurrenceOption,
  "kind" | "occurrenceId"
>;

/**
 * The execution branch that requested a turn-boundary Hole frontier.
 *
 * The request is ephemeral: it carries the canonical facts needed by the
 * frontier projection without adding an ordinary continuation cursor to
 * Battle state.
 */
export type BattleTurnBoundaryHoleRequest =
  | (BattleTurnBoundaryHoleRequestContext & {
      readonly kind: "outgoingEndTurn";
      readonly endingActorId: CombatantId;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
    })
  | (BattleTurnBoundaryHoleRequestContext & {
      readonly kind: "startTurnOccurrenceOrder";
      readonly endingActorId: CombatantId;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
    })
  | (BattleTurnBoundaryHoleRequestContext & {
      readonly kind: "incomingStartTurnOccurrence";
      readonly endingActorId: CombatantId;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
      readonly occurrence: BattleTurnBoundaryStartTurnOccurrence;
    });

/** Project a canonical turn-boundary request to the existing Hole result. */
export function turnBoundaryNeedsHolesResult(
  request: BattleTurnBoundaryHoleRequest,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return Match.value(request).pipe(
    Match.when({ kind: "outgoingEndTurn" }, ({ state, subject, holes }) =>
      needsHolesResult(state, subject, holes),
    ),
    Match.when(
      { kind: "startTurnOccurrenceOrder" },
      ({ state, subject, holes }) => needsHolesResult(state, subject, holes),
    ),
    Match.when(
      { kind: "incomingStartTurnOccurrence" },
      ({ state, subject, holes }) => needsHolesResult(state, subject, holes),
    ),
    Match.exhaustive,
  );
}

type TurnBoundaryHoleRequest = {
  readonly hole: { readonly holeId: BattleHoleId };
};

export function collectTurnBoundaryHoleFills<
  Request extends TurnBoundaryHoleRequest,
  Fill,
>(
  requests: readonly Request[],
  fillForHole: (hole: Request["hole"]) => Fill | undefined,
): {
  readonly resolved: readonly {
    readonly request: Request;
    readonly fill: Fill;
  }[];
  readonly missingHoles: readonly Request["hole"][];
} {
  const resolved: { request: Request; fill: Fill }[] = [];
  const missingHoles: Request["hole"][] = [];
  for (const request of requests) {
    const fill = fillForHole(request.hole);
    if (fill === undefined) {
      missingHoles.push(request.hole);
    } else {
      resolved.push({ request, fill });
    }
  }
  return { resolved, missingHoles };
}

type EndTurnSaveHoleFrontiers = {
  readonly hitPointBudgetConditionRepeat: readonly BattleHole[];
  readonly saveGatedConditionWithRepeatRepeat: readonly BattleHole[];
  readonly spellCondition: readonly BattleHole[];
  readonly countedSpellCondition: readonly BattleHole[];
  readonly unitFeatureCondition: readonly BattleHole[];
  readonly saveGatedTurnConstraintBundle: readonly BattleHole[];
  readonly abilityD20TestRollMode: readonly BattleHole[];
};

export function firstMissingEndTurnSaveHoleFrontier(
  frontiers: EndTurnSaveHoleFrontiers,
): readonly BattleHole[] {
  return firstNonEmptyFrontier([
    frontiers.hitPointBudgetConditionRepeat,
    frontiers.saveGatedConditionWithRepeatRepeat,
    frontiers.spellCondition,
    frontiers.countedSpellCondition,
    frontiers.unitFeatureCondition,
    frontiers.saveGatedTurnConstraintBundle,
    frontiers.abilityD20TestRollMode,
  ]);
}

type TurnBoundaryDamageHoleFrontiers = {
  readonly endTurn: readonly BattleHole[];
  readonly startTurn: readonly BattleHole[];
};

export function firstMissingTurnBoundaryDamageHoleFrontier(
  frontiers: TurnBoundaryDamageHoleFrontiers,
): readonly BattleHole[] {
  return firstNonEmptyFrontier([frontiers.endTurn, frontiers.startTurn]);
}

function firstNonEmptyFrontier(
  frontiers: readonly (readonly BattleHole[])[],
): readonly BattleHole[] {
  return frontiers.find((frontier) => frontier.length > 0) ?? [];
}
