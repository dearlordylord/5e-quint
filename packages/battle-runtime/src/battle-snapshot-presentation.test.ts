import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  battleProcedureExecutionRefForTest,
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { BattleInterruptProcedureChoice } from "./battle-state-execution.ts";
import { presentBattleInterruptChoices } from "./battle-snapshot-presentation.ts";

describe("battle snapshot frontier presentation", () => {
  const session = startBattleSessionRight({
    battleId: battleId("battle-snapshot-presentation"),
    combatants: [
      characterSeed({ combatantId: fighterId, initiative: 20 }),
      statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
    ],
  });

  test("retains modifier-only interrupt choices without an authored join", () => {
    const choice = {
      kind: "reactionRollOrDamageReduction",
      reactorId: fighterId,
      choice: {
        kind: "attackDamageReduction",
        procedureRef: battleProcedureExecutionRefForTest(
          "snapshot-presentation-modifier",
        ),
        reduction: { kind: "halfDamage" },
      },
      initialHoles: [],
    } as const satisfies BattleInterruptProcedureChoice;

    const result = presentBattleInterruptChoices(session, [choice]);
    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) return;
    expect(result.right).toEqual([{ choice }]);
  });

  test("returns a typed failure instead of dropping a choice without presentation", () => {
    const choice = {
      kind: "castTriggeredReactionSpell",
      reactorId: fighterId,
      initialHoles: [],
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "castTriggeredReactionSpell",
        reactorId: fighterId,
        procedureRef: battleProcedureExecutionRefForTest(
          "snapshot-presentation-missing-subject",
        ),
      },
    } as const satisfies BattleInterruptProcedureChoice;

    const result = presentBattleInterruptChoices(session, [choice]);
    expect(result).toEqual(
      Either.left([
        {
          tag: "battleInterruptChoicePresentationIssue",
          reason: "missingSubjectPresentation",
          reactorId: fighterId,
          choiceKind: "castTriggeredReactionSpell",
          subject: choice.subject,
        },
      ]),
    );
  });
});
