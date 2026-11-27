// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.SHARED_TURN_START
import { Match, Result } from "effect";

import {
  admitBattle,
  closeInitialInitiativeSetup,
  type InitialInitiativeSetup,
} from "./battle-reducer/api-lifecycle.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import type { BattleInitializationIssue } from "./battle-initialization-issue.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";
import type { StartBattle } from "./battle-start-protocol.ts";

export { admitBattle };

/**
 * Start a battle: admit its combatants, establish Initiative, and start the
 * first participant's turn. The battle opens on ordinary Acts when that turn's
 * start needs no choice or roll; otherwise its only Act is that turn's start.
 * Initial companions are composed by the Character Battle runtime's
 * `startBattleWithCompanionRoster` before this opening turn is published.
 */
export const startBattle: StartBattle = (input) => {
  const admitted = admitBattle(input);
  return Result.isFailure(admitted)
    ? admitted
    : startBattleOpeningTurn(admitted.success);
};

/**
 * Close initial-initiative setup and start the first participant's turn, as
 * `startBattle` does once Initiative is final.
 */
export function finishInitialInitiativeSetup(
  setup: InitialInitiativeSetup,
): Result.Result<BattleRuntimeSession, BattleInitializationIssue> {
  return startBattleOpeningTurn(closeInitialInitiativeSetup(setup));
}

/**
 * Start the opening turn of a battle whose roster and Initiative are final.
 * A start that asks nothing resolves at once. A start that needs a choice or a
 * roll leaves the turn pending, so its `startTurn` Act is discovered and
 * replayed like any other subject. A battle whose opening turn has already
 * started is refused.
 */
export function startBattleOpeningTurn(
  session: BattleRuntimeSession,
): Result.Result<BattleRuntimeSession, BattleInitializationIssue> {
  const actorId = currentActorId(session.state);
  const started = resolveBattleRuntimeSubject({
    session,
    subject: { tag: "runtimeCommand", actorId, command: "startTurn" },
    fills: [],
  });
  return Match.value(started).pipe(
    Match.discriminatorsExhaustive("tag")({
      resolved: ({ session: startedSession }) => Result.succeed(startedSession),
      needsHoles: () => Result.succeed(session),
      invalid: ({ message }) =>
        Result.fail({
          tag: "battleStateInitIssue" as const,
          kind: "openingTurnStartInvalid" as const,
          combatantId: actorId,
          message,
        }),
    }),
  );
}
