import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import {
  attackInitialTargetHole,
  attackRollFill,
  battleId,
  characterSeed,
  damageRollFill,
  fighterAttackSubject,
  findHole,
  goblinId,
  startBattleSessionRight,
  snapshotBattle,
  statBlockCreatureInit,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";

describe("battle runtime ordinary continuation replay", () => {
  test("keeps the durable checkpoint and stable frontier across a rejected fill", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ordinary-replay-checkpoint"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(session.state);
    const committedSnapshot = snapshotBattle(session.state);

    const initial = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    expect(initial.session).toBe(session);
    expect(initial.envelope.checkpoint).toEqual(committedSnapshot);
    expect(initial.envelope.frontier.kind).toBe("holes");
    if (initial.envelope.frontier.kind !== "holes") return;
    expect(initial.envelope.frontier.continuation).toEqual({
      kind: "ordinaryReplay",
    });

    const target = attackInitialTargetHole(session.state, subject);
    const selectedTarget = targetFill(target, goblinId);
    const afterTarget = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget],
    });
    expect(afterTarget.tag).toBe("needsHoles");
    if (afterTarget.tag !== "needsHoles") return;
    expect(afterTarget.session).toBe(session);
    expect(afterTarget.envelope.checkpoint).toEqual(committedSnapshot);
    expect(afterTarget.envelope.frontier.kind).toBe("holes");
    if (afterTarget.envelope.frontier.kind !== "holes") return;
    expect(afterTarget.envelope.frontier.continuation).toEqual({
      kind: "ordinaryReplay",
    });
    expect(afterTarget.envelope.frontier.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "attackRoll" })]),
    );

    const attackRoll = findHole(
      afterTarget.envelope.frontier.holes,
      "attackRoll",
    );
    const invalid = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [
        selectedTarget,
        {
          ...attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          holeId: holeId("battle:ordinary-replay-stale-hole"),
        },
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      session,
      envelope: { checkpoint: committedSnapshot },
    });

    const retry = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget],
    });
    expect(retry).toMatchObject({
      tag: "needsHoles",
      session,
      envelope: {
        checkpoint: committedSnapshot,
        frontier: { kind: "holes", holes: afterTarget.envelope.frontier.holes },
      },
    });
    if (invalid.tag !== "invalid" || retry.tag !== "needsHoles") return;
    expect(invalid.envelope).toEqual(retry.envelope);

    const acceptedAttackRoll = attackRollFill(attackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const afterAttackRoll = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget, acceptedAttackRoll],
    });
    expect(afterAttackRoll.tag).toBe("needsHoles");
    if (afterAttackRoll.tag !== "needsHoles") return;
    expect(afterAttackRoll.session).toBe(session);
    expect(afterAttackRoll.envelope.checkpoint).toEqual(committedSnapshot);
    expect(afterAttackRoll.envelope.frontier.kind).toBe("holes");
    if (afterAttackRoll.envelope.frontier.kind !== "holes") return;

    const damage = findHole(
      afterAttackRoll.envelope.frontier.holes,
      "rolledDice",
    );
    const resolved = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget, acceptedAttackRoll, damageRollFill(damage, 5)],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      envelope: {
        checkpoint: expect.anything(),
        frontier: { kind: "acts" },
      },
    });
  });
});
