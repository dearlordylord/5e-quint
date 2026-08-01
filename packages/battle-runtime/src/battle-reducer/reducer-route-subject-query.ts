import type { BattleResolutionInput } from "../battle-state-execution.ts";

export function isEndTurnSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return subject.tag === "runtimeCommand" && subject.command === "endTurn";
}
