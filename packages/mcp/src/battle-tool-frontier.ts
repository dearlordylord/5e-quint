import {
  battleHoleAcceptsFill,
  sameBattleSubject,
  type BattleCheckpointFrontierEnvelope,
  type BattleFill,
  type BattleHole,
  type BattleInterruptDecisionHole,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { Match } from "effect";

export function battleSubjectIsAvailableWithoutPendingFills(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  subject: BattleSubject,
): boolean {
  return Match.value(frontier).pipe(
    Match.when({ kind: "acts" }, (actsFrontier) =>
      actsFrontier.acts.some((act) => sameBattleSubject(act.subject, subject)),
    ),
    Match.when({ kind: "holes" }, (holesFrontier) =>
      sameBattleSubject(holesFrontier.subject, subject),
    ),
    Match.when({ kind: "interruptDecision" }, () => false),
    Match.exhaustive,
  );
}

export function pendingFillFrontierIssue(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  fill: BattleFill,
): {
  readonly message: string;
  readonly details:
    | {
        readonly code: "BATTLE_FILL_HOLE_MISMATCH";
        readonly currentFrontier: BattleCheckpointFrontierEnvelope["frontier"];
        readonly requestedFill: BattleFill;
      }
    | {
        readonly code: "BATTLE_FILL_KIND_MISMATCH";
        readonly pendingHole: BattleHole | BattleInterruptDecisionHole;
        readonly requestedFill: BattleFill;
      };
} | null {
  const holes =
    frontier.kind === "holes"
      ? frontier.holes
      : frontier.kind === "interruptDecision"
        ? [frontier.decisionHole]
        : frontier.acts.flatMap((act) => act.initialHoles);
  const matchingHoles = holes.filter((hole) => hole.holeId === fill.holeId);
  if (matchingHoles.length === 0) {
    return {
      message: "Battle fill does not match the current Hole frontier.",
      details: {
        code: "BATTLE_FILL_HOLE_MISMATCH" as const,
        currentFrontier: frontier,
        requestedFill: fill,
      },
    };
  }
  const matchingKindHole = matchingHoles.find((hole) =>
    battleHoleAcceptsFill(hole, fill),
  );
  if (matchingKindHole !== undefined) return null;
  const pendingHole = matchingHoles[0];
  if (pendingHole === undefined) return null;
  return {
    message: "Battle fill kind does not match the current Hole.",
    details: {
      code: "BATTLE_FILL_KIND_MISMATCH" as const,
      pendingHole,
      requestedFill: fill,
    },
  };
}
