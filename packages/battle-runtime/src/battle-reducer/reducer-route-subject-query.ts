import type { BattleResolutionInput } from "../battle-state-execution.ts";

export function isEndTurnSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return subject.tag === "runtimeCommand" && subject.command === "endTurn";
}

/** Start Turn and End Turn: the runtime commands that own a turn boundary. */
export type TurnBoundaryCommandSubject = Extract<
  BattleResolutionInput["subject"],
  {
    readonly tag: "runtimeCommand";
    readonly command: "startTurn" | "endTurn";
  }
>;

export function isTurnBoundaryCommandSubject(
  subject: BattleResolutionInput["subject"],
): subject is TurnBoundaryCommandSubject {
  return isStartTurnSubject(subject) || isEndTurnSubject(subject);
}

export function isStartTurnSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "runtimeCommand"; readonly command: "startTurn" }
> {
  return subject.tag === "runtimeCommand" && subject.command === "startTurn";
}
