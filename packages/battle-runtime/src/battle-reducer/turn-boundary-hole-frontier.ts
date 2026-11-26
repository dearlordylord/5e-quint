import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";
import type {
  BattlePendingProcedure,
  BattlePendingStartTurnOccurrence,
  BattlePendingTurnStartRequest,
} from "../battle-pending-procedure.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleOrdinaryHole,
  BattleOrdinaryNeedsHolesResult,
  BattleHoleId,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleState,
  BattleTurnStartEntry,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResultWithProcedure } from "./needs-holes-result.ts";

type BattleTurnBoundaryHoleRequestContext = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly holes: ReadonlyNonEmptyArray<BattleOrdinaryHole>;
};

export type BattleTurnBoundaryStartTurnOccurrence =
  BattlePendingStartTurnOccurrence;

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
      readonly entry: BattleTurnStartEntry;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
    })
  | (BattleTurnBoundaryHoleRequestContext & {
      readonly kind: "incomingStartTurnOccurrence";
      readonly entry: BattleTurnStartEntry;
      readonly sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"];
      readonly occurrence: BattleTurnBoundaryStartTurnOccurrence;
    });

/** Project a canonical turn-boundary request to the existing Hole result. */
export function turnBoundaryNeedsHolesResult<
  const Subject extends BattleSubject,
  const Holes extends ReadonlyNonEmptyArray<BattleOrdinaryHole>,
>(
  request: BattleTurnBoundaryHoleRequest & {
    readonly subject: Subject;
    readonly holes: Holes;
  },
): BattleOrdinaryNeedsHolesResult<Holes, Subject> {
  const pendingProcedure = pendingProcedureForTurnBoundaryRequest(request);
  return needsHolesResultWithProcedure(
    request.state,
    request.subject,
    request.holes,
    pendingProcedure,
  );
}

function pendingProcedureForTurnBoundaryRequest(
  request: BattleTurnBoundaryHoleRequest,
): Extract<
  BattlePendingProcedure,
  { readonly kind: "turnBoundary" | "turnStart" }
> {
  return Match.value(request).pipe(
    Match.when(
      { kind: "outgoingEndTurn" },
      ({ endingActorId, sourceTurn }) => ({
        kind: "turnBoundary" as const,
        endingActorId,
        sourceTurn,
        request: { kind: "outgoingEndTurn" as const },
      }),
    ),
    Match.when({ kind: "startTurnOccurrenceOrder" }, ({ entry, sourceTurn }) =>
      pendingTurnStartProcedure(entry, sourceTurn, {
        kind: "startTurnOccurrenceOrder",
      }),
    ),
    Match.when(
      { kind: "incomingStartTurnOccurrence" },
      ({ entry, sourceTurn, occurrence }) =>
        pendingTurnStartProcedure(entry, sourceTurn, {
          kind: "startTurnOccurrence",
          occurrence,
        }),
    ),
    Match.exhaustive,
  );
}

/**
 * A turn start's request belongs to End Turn's boundary when an ending actor
 * reached it, and to the opening turn start otherwise.
 */
function pendingTurnStartProcedure(
  entry: BattleTurnStartEntry,
  sourceTurn: BattleStartTurnOccurrenceSequenceCheckpoint["sourceTurn"],
  request: BattlePendingTurnStartRequest,
): Extract<
  BattlePendingProcedure,
  { readonly kind: "turnBoundary" | "turnStart" }
> {
  return Match.value(entry).pipe(
    Match.when({ kind: "endTurn" }, ({ endingActorId }) => ({
      kind: "turnBoundary" as const,
      endingActorId,
      sourceTurn,
      request,
    })),
    Match.when({ kind: "battleStart" }, () => ({
      kind: "turnStart" as const,
      sourceTurn,
      request,
    })),
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
  readonly hitPointBudgetConditionRepeat: readonly BattleOrdinaryHole[];
  readonly saveGatedConditionWithRepeatRepeat: readonly BattleOrdinaryHole[];
  readonly spellCondition: readonly BattleOrdinaryHole[];
  readonly countedSpellCondition: readonly BattleOrdinaryHole[];
  readonly unitFeatureCondition: readonly BattleOrdinaryHole[];
  readonly saveGatedTurnConstraintBundle: readonly BattleOrdinaryHole[];
  readonly abilityD20TestRollMode: readonly BattleOrdinaryHole[];
};

export function firstMissingEndTurnSaveHoleFrontier(
  frontiers: EndTurnSaveHoleFrontiers,
): readonly BattleOrdinaryHole[] {
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
  readonly endTurn: readonly BattleOrdinaryHole[];
  readonly startTurn: readonly BattleOrdinaryHole[];
};

export function firstMissingTurnBoundaryDamageHoleFrontier(
  frontiers: TurnBoundaryDamageHoleFrontiers,
): readonly BattleOrdinaryHole[] {
  return firstNonEmptyFrontier([frontiers.endTurn, frontiers.startTurn]);
}

function firstNonEmptyFrontier(
  frontiers: readonly (readonly BattleOrdinaryHole[])[],
): readonly BattleOrdinaryHole[] {
  return frontiers.find((frontier) => frontier.length > 0) ?? [];
}
