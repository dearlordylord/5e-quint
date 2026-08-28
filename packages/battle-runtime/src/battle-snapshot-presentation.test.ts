import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleProcedureExecutionRefForTest,
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  holeId,
  holeInstanceKey,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { BattleInterruptProcedureChoice } from "./battle-state-execution.ts";
import {
  battleFrontierHoles,
  currentBattleCheckpointFrontierEnvelope,
  resolveBattleRuntimeSubject,
} from "./battle-session-execution.ts";
import { battleReplayStackDepth } from "./identity.ts";
import { BattleCheckpointFrontierEnvelopeSchema } from "./index.ts";
import {
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  battlePresentedCheckpointFrontierEnvelope,
  battlePresentedSnapshot,
  presentBattleCheckpointFrontierEnvelope,
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

  test("presents the durable snapshot from the live session", () => {
    const presented = battlePresentedSnapshot(session);
    expect(Either.isRight(presented)).toBe(true);
    if (Either.isLeft(presented)) return;
    expect(
      presented.right.combatants.map(({ combatantId, displayName }) => ({
        combatantId,
        displayName,
      })),
    ).toEqual([
      { combatantId: fighterId, displayName: "Fighter" },
      { combatantId: goblinId, displayName: "Goblin Warrior" },
    ]);
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

  test("preserves a mechanical holes frontier while presenting its checkpoint", () => {
    const mechanical = currentBattleCheckpointFrontierEnvelope(session);
    if (mechanical.frontier.kind !== "acts") {
      throw new Error("Expected an Acts frontier.");
    }
    expect(battleFrontierHoles(mechanical)).toBeNull();
    const act = mechanical.frontier.acts.find(
      (candidate) => candidate.initialHoles.length > 0,
    );
    if (act === undefined) {
      throw new Error("Expected an act with an initial hole.");
    }
    const resolution = resolveBattleRuntimeSubject({
      session,
      subject: act.subject,
      fills: [],
    });
    if (
      resolution.tag !== "needsHoles" ||
      resolution.envelope.frontier.kind !== "holes"
    ) {
      throw new Error("Expected a mechanical holes frontier.");
    }
    expect(battleFrontierHoles(resolution.envelope)).toEqual(
      resolution.envelope.frontier,
    );
    const encoded = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
      resolution.envelope,
    );
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encoded,
        ),
      ),
    ).toBe(true);

    const presented = presentBattleCheckpointFrontierEnvelope(
      session,
      resolution.envelope,
    );
    expect(Either.isRight(presented)).toBe(true);
    if (Either.isLeft(presented)) return;
    expect(presented.right.frontier).toEqual(resolution.envelope.frontier);
  });

  test("retains modifier-only interrupt choices without an authored join", () => {
    const choice = {
      kind: "reactionModifier",
      responderId: fighterId,
      modifier: {
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

    const mechanical = currentBattleCheckpointFrontierEnvelope(session);
    const presentedEnvelope = presentBattleCheckpointFrontierEnvelope(session, {
      checkpoint: mechanical.checkpoint,
      frontier: {
        kind: "interruptDecision",
        trigger: "afterDamage",
        decisionHole: {
          holeInstanceKey: holeInstanceKey(
            "battle:snapshot-presentation:frontier-modifier",
          ),
          holeId: holeId("battle:snapshot-presentation:frontier-modifier"),
          kind: "interruptDecision",
          label: "Reduce damage",
          trigger: "afterDamage",
          eligibleResponders: [fighterId],
        },
        choices: [choice],
        stackDepth: battleReplayStackDepth(1),
      },
    });
    expect(Either.isRight(presentedEnvelope)).toBe(true);
    if (Either.isRight(presentedEnvelope)) {
      expect(presentedEnvelope.right.frontier).toMatchObject({
        kind: "interruptDecision",
        choices: [{ choice }],
      });
    }
  });

  test("round-trips a modifier-only interrupt choice without presentation", () => {
    const choice = {
      kind: "reactionModifier",
      responderId: fighterId,
      modifier: {
        kind: "attackDamageReduction",
        procedureRef: battleProcedureExecutionRefForTest(
          "snapshot-presentation-modifier-codec",
        ),
        reduction: { kind: "halfDamage" },
      },
      initialHoles: [],
    } as const satisfies BattleInterruptProcedureChoice;
    const presented = battlePresentedCheckpointFrontierEnvelope(session);
    if (Either.isLeft(presented)) {
      throw new Error("Expected a presented checkpoint frontier envelope.");
    }
    const envelope = {
      checkpoint: presented.right.checkpoint,
      frontier: {
        kind: "interruptDecision",
        trigger: "afterDamage",
        decisionHole: {
          holeInstanceKey: holeInstanceKey(
            "battle:snapshot-presentation:modifier",
          ),
          holeId: holeId("battle:snapshot-presentation:modifier"),
          kind: "interruptDecision",
          label: "Reduce damage",
          trigger: "afterDamage",
          eligibleResponders: [fighterId],
        },
        choices: [{ choice }],
        stackDepth: battleReplayStackDepth(1),
      },
    } as const;

    const encoded = Schema.encodeSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(envelope);
    if (encoded.frontier.kind !== "interruptDecision") {
      throw new Error("Expected an encoded interrupt-decision frontier.");
    }
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(
          BattlePresentedCheckpointFrontierEnvelopeSchema,
        )({
          ...encoded,
          frontier: { ...encoded.frontier, choices: [] },
        }),
      ),
    ).toBe(true);

    const decoded = Schema.decodeUnknownSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(encoded);
    if (decoded.frontier.kind !== "interruptDecision") {
      throw new Error("Expected a decoded interrupt-decision frontier.");
    }
    expect({
      trigger: decoded.frontier.trigger,
      decisionHole: decoded.frontier.decisionHole,
      stackDepth: decoded.frontier.stackDepth,
    }).toEqual({
      trigger: envelope.frontier.trigger,
      decisionHole: envelope.frontier.decisionHole,
      stackDepth: envelope.frontier.stackDepth,
    });
    expect(decoded.frontier.choices).toHaveLength(1);
    expect(decoded.frontier.choices[0]).toEqual({ choice });
    expect(decoded.frontier.choices[0]).not.toHaveProperty("presentation");
  });

  test("requires and round-trips presentation for a subject-bearing interrupt choice", () => {
    const choice = {
      kind: "nestedProcedure",
      initialHoles: [],
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "releaseReadiedAction",
        reactorId: fighterId,
      },
    } as const satisfies BattleInterruptProcedureChoice;
    const presentation = { kind: "intrinsic" } as const;
    expect(presentBattleInterruptChoices(session, [choice])).toEqual(
      Either.right([{ choice, presentation }]),
    );
    const presented = battlePresentedCheckpointFrontierEnvelope(session);
    if (Either.isLeft(presented)) {
      throw new Error("Expected a presented checkpoint frontier envelope.");
    }
    const envelope = {
      checkpoint: presented.right.checkpoint,
      frontier: {
        kind: "interruptDecision",
        trigger: "reportedReadyTrigger",
        decisionHole: {
          holeInstanceKey: holeInstanceKey(
            "battle:snapshot-presentation:readied-action",
          ),
          holeId: holeId("battle:snapshot-presentation:readied-action"),
          kind: "interruptDecision",
          label: "Release readied action",
          trigger: "reportedReadyTrigger",
          eligibleResponders: [fighterId],
        },
        choices: [{ choice, presentation }],
        stackDepth: battleReplayStackDepth(1),
      },
    } as const;

    const encoded = Schema.encodeSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(envelope);
    if (encoded.frontier.kind !== "interruptDecision") {
      throw new Error("Expected an encoded interrupt-decision frontier.");
    }
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(
          BattlePresentedCheckpointFrontierEnvelopeSchema,
        )({
          ...encoded,
          frontier: {
            ...encoded.frontier,
            choices: encoded.frontier.choices.map(({ choice }) => ({ choice })),
          },
        }),
      ),
    ).toBe(true);

    const decoded = Schema.decodeUnknownSync(
      BattlePresentedCheckpointFrontierEnvelopeSchema,
    )(encoded);
    if (decoded.frontier.kind !== "interruptDecision") {
      throw new Error("Expected a decoded interrupt-decision frontier.");
    }
    expect({
      trigger: decoded.frontier.trigger,
      decisionHole: decoded.frontier.decisionHole,
      stackDepth: decoded.frontier.stackDepth,
    }).toEqual({
      trigger: envelope.frontier.trigger,
      decisionHole: envelope.frontier.decisionHole,
      stackDepth: envelope.frontier.stackDepth,
    });
    expect(decoded.frontier.choices).toHaveLength(1);
    expect(decoded.frontier.choices[0]).toEqual({ choice, presentation });
  });

  test("returns a typed failure instead of dropping a choice without presentation", () => {
    const choice = {
      kind: "nestedProcedure",
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
          responderId: fighterId,
          choiceKind: "nestedProcedure",
          subject: choice.subject,
        },
      ]),
    );
  });
});
