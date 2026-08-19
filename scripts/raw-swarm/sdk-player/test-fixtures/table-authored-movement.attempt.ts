import type { PlayerContinuation } from "@dnd/player-sdk";

export const continueBattle: PlayerContinuation = async (context) => {
  const moveAct = context.sdk
    .discoverBattleActs(context.session)
    .find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "move" &&
        String(act.subject.actorId) === "goblin-warrior",
    );
  if (
    moveAct === undefined ||
    moveAct.subject.tag !== "runtimeCommand" ||
    moveAct.subject.command !== "move"
  ) {
    throw new Error(
      "Retained Table movement fixture did not surface Goblin Move.",
    );
  }
  const resolved = context.sdk.resolveScenarioMovement({
    kind: "route",
    session: context.session,
    subject: moveAct.subject,
    route: [{ x: 1, y: 0 }],
    speedKind: "walk",
    fills: [],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Retained Table movement did not reach terminal resolution: ${resolved.tag}.`,
    );
  }
  return {
    kind: "playerConcluded",
    session: resolved.session,
    tacticalNote: "Table-authored movement route projected and resolved.",
    conclusion:
      "The retained Table movement transcript reached terminal resolution.",
  };
};
