import {
  battleHoleAcceptsFill,
  sameBattleSubject,
  type BattleCheckpointFrontierEnvelope,
  type BattleFill,
  type BattleHole,
  type BattleInterruptDecisionHole,
  type BattleSubject,
  type BattleTargetChoiceHole,
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
      sameBattleSubject(holesFrontier.replaySubject, subject),
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

/** Find the canonical attack-target Hole for this decoded subject and fill. */
export function currentAttackTargetHoleForFill(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  subject: BattleSubject,
  fill: BattleFill,
):
  | (BattleTargetChoiceHole & {
      readonly attack: NonNullable<BattleTargetChoiceHole["attack"]>;
    })
  | undefined {
  if (fill.kind !== "targetChoice") return undefined;
  const holes = attackTargetHolesForSubject(frontier, subject);
  const hole = holes.find(
    (candidate) =>
      candidate.kind === "targetChoice" && candidate.holeId === fill.holeId,
  );
  return hole?.kind === "targetChoice" && hole.attack !== undefined
    ? { ...hole, attack: hole.attack }
    : undefined;
}

function attackTargetHolesForSubject(
  frontier: BattleCheckpointFrontierEnvelope["frontier"],
  subject: BattleSubject,
): readonly BattleHole[] {
  return Match.value(frontier).pipe(
    Match.when({ kind: "interruptDecision" }, () => []),
    Match.when({ kind: "holes" }, (holesFrontier) =>
      sameBattleSubject(holesFrontier.replaySubject, subject)
        ? holesFrontier.holes
        : [],
    ),
    Match.when(
      { kind: "acts" },
      (actsFrontier) =>
        actsFrontier.acts.find((act) => sameBattleSubject(act.subject, subject))
          ?.initialHoles ?? [],
    ),
    Match.exhaustive,
  );
}
