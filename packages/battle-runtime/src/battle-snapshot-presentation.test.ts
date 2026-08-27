import * as Either from "effect/Either";
import { Schema } from "effect";
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
import { currentBattleCheckpointFrontierEnvelope } from "./battle-session-execution.ts";
import {
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  battlePresentedCheckpointFrontierEnvelope,
  presentBattleInterruptChoices,
} from "./battle-snapshot-presentation.ts";

describe("battle snapshot frontier presentation", () => {
  const session = startBattleSessionRight({
    battleId: battleId("battle-snapshot-presentation"),
    combatants: [
      characterSeed({ combatantId: fighterId, initiative: 20 }),
      statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
    ],
  });

  test("preserves canonical act subjects and holes while joining presentation", () => {
    const mechanical = currentBattleCheckpointFrontierEnvelope(session);
    const presented = battlePresentedCheckpointFrontierEnvelope(session);
    expect(Either.isRight(presented)).toBe(true);
    if (Either.isLeft(presented)) {
      throw new Error("Expected a presented checkpoint frontier envelope.");
    }
    expect(mechanical.frontier.kind).toBe("acts");
    expect(presented.right.frontier.kind).toBe("acts");
    if (mechanical.frontier.kind !== "acts") {
      throw new Error("Expected a mechanical Acts frontier.");
    }
    if (presented.right.frontier.kind !== "acts") {
      throw new Error("Expected a presented Acts frontier.");
    }

    const decoded = Schema.decodeUnknownSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(
      Schema.encodeSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(
        presented.right,
      ),
    );
    expect(decoded.frontier.kind).toBe("acts");
    if (decoded.frontier.kind !== "acts") {
      throw new Error("Expected the codec to preserve the Acts frontier.");
    }

    expect(decoded.frontier.acts.length).toBeGreaterThan(0);
    expect(
      decoded.frontier.acts.map(({ subject, initialHoles }) => ({
        subject,
        initialHoles,
      })),
    ).toEqual(mechanical.frontier.acts);
    expect(
      decoded.frontier.acts.map(({ label, summary, presentation }) => ({
        label,
        summary,
        presentation,
      })),
    ).toEqual(
      presented.right.frontier.acts.map(({ label, summary, presentation }) => ({
        label,
        summary,
        presentation,
      })),
    );
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
