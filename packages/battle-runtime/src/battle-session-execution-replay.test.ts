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
    expect(initial.checkpointBoundary).toEqual({ kind: "ordinaryReplay" });
    expect(initial.snapshot).toEqual(committedSnapshot);

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
    expect(afterTarget.checkpointBoundary).toEqual({ kind: "ordinaryReplay" });
    expect(afterTarget.snapshot).toEqual(committedSnapshot);
    expect(afterTarget.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "attackRoll" })]),
    );

    const attackRoll = findHole(afterTarget.holes, "attackRoll");
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
      snapshot: committedSnapshot,
    });

    const retry = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget],
    });
    expect(retry).toMatchObject({
      tag: "needsHoles",
      session,
      snapshot: committedSnapshot,
      holes: afterTarget.holes,
    });

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
    expect(afterAttackRoll.snapshot).toEqual(committedSnapshot);

    const damage = findHole(afterAttackRoll.holes, "rolledDice");
    const resolved = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget, acceptedAttackRoll, damageRollFill(damage, 5)],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });
});
