// KERNEL-COVERAGE: runtime-owner BATTLE.COMPOSITION.SHARED_TURN_START
import { Result } from "effect";

import {
  admitBattle,
  closeInitialInitiativeSetup,
  type InitialInitiativeSetup,
} from "./battle-reducer/api-lifecycle.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";
import type { StartBattle } from "./battle-start-protocol.ts";

/**
 * Start a battle: admit its combatants, establish Initiative, and start the
 * first participant's turn. The battle opens on ordinary Acts when that turn's
 * start needs no choice or roll; otherwise its only Act is that turn's start.
 */
export const startBattle: StartBattle = (input) => {
  const admitted = admitBattle(input);
  return Result.isFailure(admitted)
    ? admitted
    : Result.succeed(startOpeningTurn(admitted.success));
};

/**
 * Close initial-initiative setup and start the first participant's turn, as
 * `startBattle` does once Initiative is final.
 */
export function finishInitialInitiativeSetup(
  setup: InitialInitiativeSetup,
): BattleRuntimeSession {
  return startOpeningTurn(closeInitialInitiativeSetup(setup));
}

/**
 * Start the opening turn at once when its start asks nothing. A start that
 * needs a choice or a roll leaves the turn pending, so its `startTurn` Act is
 * discovered and replayed like any other subject.
 */
function startOpeningTurn(session: BattleRuntimeSession): BattleRuntimeSession {
  const started = resolveBattleRuntimeSubject({
    session,
    subject: {
      tag: "runtimeCommand",
      actorId: currentActorId(session.state),
      command: "startTurn",
    },
    fills: [],
  });
  return started.tag === "resolved" ? started.session : session;
}
