// SRD 5.2.1 Grappling: "However a grapple is initiated, it follows these
// rules." A battle that starts with a grapple in place holds it as the grapple
// link an in-battle Grapple makes, so every Grappled rule follows from it.
import { describe, expect, test } from "vitest";
import { difficultyClass, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";
import { Result } from "effect";
import type {
  BattleInitialGrapple,
  BattleInitialGrappleRejection,
} from "./index.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActCandidates,
  endTurn,
  fighterId,
  goblinAttackSubject,
  goblinId,
  grappleOutcomeFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  snapshotBattle,
  startBattle,
  startBattleRight,
  statBlockCreatureInit,
  statBlockRecord,
  targetFill,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

const escapeDc = difficultyClass(15);

function goblinGrappledByFighter(): BattleState {
  return startBattleRight({
    battleId: battleId("initial-grapple"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        statBlockName: "Skeleton",
        initiative: 5,
      }),
    ],
    initialGrapples: [{ grapplerId: fighterId, targetId: goblinId, escapeDc }],
  });
}

function goblinCombatant(state: BattleState) {
  const goblin = snapshotBattle(state).combatants.find(
    (combatant) => combatant.combatantId === goblinId,
  );
  if (goblin === undefined) throw new Error("Expected the Goblin.");
  return goblin;
}

function initialGrappleRejections(
  initialGrapples: ReadonlyNonEmptyArray<BattleInitialGrapple>,
  fighter: Parameters<typeof characterSeed>[0] = { initiative: 20 },
  goblin: Parameters<typeof statBlockCreatureInit>[0] = { initiative: 10 },
): readonly {
  readonly grappleIndex: number;
  readonly rejection: BattleInitialGrappleRejection;
}[] {
  const started = startBattle({
    battleId: battleId("initial-grapple-rejected"),
    combatants: [characterSeed(fighter), statBlockCreatureInit(goblin)],
    initialGrapples,
  });
  if (Result.isSuccess(started)) {
    throw new Error("Expected the initial grapple to be rejected.");
  }
  const leaves =
    started.failure.tag === "battleStateInitIssues"
      ? started.failure.issues
      : [started.failure];
  return leaves.flatMap((leaf) =>
    leaf.tag === "battleStateInitIssue" && leaf.kind === "initialGrappleInvalid"
      ? [{ grappleIndex: leaf.grappleIndex, rejection: leaf.rejection }]
      : [],
  );
}

function ungrappleableGoblin(): Parameters<typeof statBlockCreatureInit>[0] {
  const baseTarget = statBlockRecord();
  return {
    initiative: 10,
    statBlock: {
      ...baseTarget,
      id: parseSharedStatBlockId("stat_block_ungrappleable_target"),
      name: "Ungrappleable Target",
      statBlock: {
        ...baseTarget.statBlock,
        immunities: decodeCreatureImmunityDeclarationSync({
          conditions: ["grappled"],
        }),
      },
    },
  };
}

describe("initial grapples", () => {
  test("hold the target in the grappler's first free hand with the table's escape DC", () => {
    const state = goblinGrappledByFighter();

    expect(state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
        escapeDc,
      }),
    ]);
    expect(goblinCombatant(state)).toMatchObject({
      conditions: expect.arrayContaining(["grappled"]),
      movement: expect.objectContaining({ speedFeet: 0 }),
    });
  });

  test("give attack rolls against a target other than the grappler Disadvantage", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: goblinGrappledByFighter(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );

    expect(
      requireHole(
        resolveBattleSubject({
          state: goblinTurn,
          subject,
          fills: [targetFill(target, skeletonId)],
        }),
        "attackRoll",
      ),
    ).toMatchObject({ rollMode: "disadvantage" });
    const againstGrappler = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    expect(againstGrappler.rollMode ?? "normal").toBe("normal");
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(againstGrappler, { total: 15, naturalD20: 10 }),
        ],
      }),
    ).not.toMatchObject({ tag: "invalid" });
  });

  test("end through Escape Grapple against the table's escape DC", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: goblinGrappledByFighter(), actorId: fighterId }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };
    expect(
      discoverBattleActCandidates(goblinTurn).map((act) => act.subject),
    ).toContainEqual(subject);
    const escape = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "grappleOutcome",
    );
    expect(escape).toMatchObject({
      mode: "escapeCheck",
      targetId: fighterId,
      dc: escapeDc,
    });

    const escaped = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    );
    expect(escaped.state.grapples).toEqual([]);
    expect(goblinCombatant(escaped.state)).toMatchObject({
      conditions: expect.not.arrayContaining(["grappled"]),
    });
  });

  test("end when the grappler releases the target", () => {
    const released = requireResolved(
      resolveBattleSubject({
        state: goblinGrappledByFighter(),
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    );

    expect(released.state.grapples).toEqual([]);
    expect(goblinCombatant(released.state)).toMatchObject({
      conditions: expect.not.arrayContaining(["grappled"]),
      movement: expect.objectContaining({ speedFeet: expect.any(Number) }),
    });
    expect(goblinCombatant(released.state).movement.speedFeet).toBeGreaterThan(
      0,
    );
  });

  test("take the grappler's hands in order, so a third grapple has no free hand", () => {
    const secondGoblinId = combatantId("second-goblin");
    const thirdGoblinId = combatantId("third-goblin");
    const started = startBattle({
      battleId: battleId("initial-grapple-hands"),
      combatants: [
        characterSeed({ initiative: 20, attack: null }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({ combatantId: secondGoblinId, initiative: 9 }),
        statBlockCreatureInit({ combatantId: thirdGoblinId, initiative: 8 }),
      ],
      initialGrapples: [
        { grapplerId: fighterId, targetId: goblinId, escapeDc },
        { grapplerId: fighterId, targetId: secondGoblinId, escapeDc },
        { grapplerId: fighterId, targetId: thirdGoblinId, escapeDc },
      ],
    });

    expect(started).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "battleStateInitIssue",
        kind: "initialGrappleInvalid",
        grappleIndex: 2,
        grapplerId: fighterId,
        targetId: thirdGoblinId,
        rejection: "noFreeHand",
        ownerPath: ["battleInitialization", "initialGrapples", 2],
      },
    });
  });

  test("reject a grapple that names no grappler or no target in the battle", () => {
    const missingId = combatantId("missing");

    expect(
      initialGrappleRejections([
        { grapplerId: missingId, targetId: goblinId, escapeDc },
        { grapplerId: fighterId, targetId: missingId, escapeDc },
      ]),
    ).toEqual([
      { grappleIndex: 0, rejection: "unknownGrappler" },
      { grappleIndex: 1, rejection: "unknownTarget" },
    ]);
  });

  test("reject a grapple the grappler can't take hold of", () => {
    expect(
      initialGrappleRejections([
        { grapplerId: fighterId, targetId: fighterId, escapeDc },
        { grapplerId: fighterId, targetId: goblinId, escapeDc },
        { grapplerId: fighterId, targetId: goblinId, escapeDc },
      ]),
    ).toEqual([
      { grappleIndex: 0, rejection: "selfGrapple" },
      { grappleIndex: 2, rejection: "targetAlreadyGrappled" },
    ]);
  });

  // SRD 5.2.1 Unarmed Strike, Grapple: "This grapple is possible only if the
  // target is no more than one size larger than you". A grapple that began
  // some other way, such as a monster's trait, has no such limit.
  test("hold a target more than one size larger, which only an Unarmed Strike Grapple can't", () => {
    const baseTarget = statBlockRecord();
    const hugeTarget = {
      initiative: 10,
      statBlock: {
        ...baseTarget,
        id: parseSharedStatBlockId("stat_block_huge_initial_grapple"),
        name: "Huge Initial Grapple Target",
        statBlock: { ...baseTarget.statBlock, size: "huge" as const },
      },
    };
    const state = startBattleRight({
      battleId: battleId("initial-grapple-huge-target"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit(hugeTarget),
      ],
      initialGrapples: [
        { grapplerId: fighterId, targetId: goblinId, escapeDc },
      ],
    });

    expect(state.grapples).toEqual([
      expect.objectContaining({ grapplerId: fighterId, targetId: goblinId }),
    ]);
    const released = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    ).state;
    expect(
      discoverBattleActCandidates(released).map((act) => act.subject),
    ).not.toContainEqual({
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    });
  });

  test("reject a grapple that would already have ended", () => {
    expect(
      initialGrappleRejections(
        [{ grapplerId: fighterId, targetId: goblinId, escapeDc }],
        { initiative: 20, conditions: ["stunned"] },
      ),
    ).toEqual([{ grappleIndex: 0, rejection: "grapplerIncapacitated" }]);
    expect(
      initialGrappleRejections(
        [{ grapplerId: fighterId, targetId: goblinId, escapeDc }],
        { initiative: 20 },
        { initiative: 10, currentHp: 0 },
      ),
    ).toEqual([{ grappleIndex: 0, rejection: "combatantDead" }]);
  });

  test("reject a Grappled condition given without its grapple", () => {
    const fighter = characterSeed({ initiative: 20 });
    const started = startBattle({
      battleId: battleId("initial-grappled-condition"),
      combatants: [
        {
          ...fighter,
          creatureInit: {
            ...fighter.creatureInit,
            // A caller outside the types names Grappled as a plain condition.
            conditions: JSON.parse('["grappled"]'),
          },
        },
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(started).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "battleStateInitIssue",
        kind: "initialGrappledWithoutGrapple",
        combatantId: fighterId,
      },
    });
  });

  test("reject a target that can't have the Grappled condition, as an in-battle Grapple does", () => {
    const ungrappleable = ungrappleableGoblin();

    expect(
      initialGrappleRejections(
        [{ grapplerId: fighterId, targetId: goblinId, escapeDc }],
        { initiative: 20 },
        ungrappleable,
      ),
    ).toEqual([{ grappleIndex: 0, rejection: "targetImmune" }]);

    const state = startBattleRight({
      battleId: battleId("grapple-immune-target"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit(ungrappleable),
      ],
    });
    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).not.toContainEqual({
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    });
  });
});
