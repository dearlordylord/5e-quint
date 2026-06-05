// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV88A dancing_lights
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-dancing-lights-movable-dim-light
import { describe, expect, test } from "vitest";
import {
  dancingLightsUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  interruptDecisionFill,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  battleTablePositionId,
  breakBattleConcentration,
  canSpendAction,
  cantripSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  holeId,
  movementFeet,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
} from "./unit-profile-admission-test-support.ts";
import type { ActionSpellAct } from "./unit-profile-admission-catalog-support.ts";
import type {
  BattleFill,
  BattleState,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV32A deterministic Dancing Lights admission", () => {
  test("dancing_lights is admitted as Magic Action source-owned movable Dim Light", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const castActs = discoverBattleActs(state).filter(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === dancingLightsUnitId,
    );

    expect(castActs.map((act) => act.subject.invocation)).toEqual([
      cantripSpellInvocationRef(
        dancingLightsUnitId,
        "dancingLightsSeparateCast",
      ),
      cantripSpellInvocationRef(
        dancingLightsUnitId,
        "dancingLightsCombinedCast",
      ),
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject:
        castActs[0]?.subject ??
        spellAct({ state, spellId: dancingLightsUnitId }).subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: requireHole(
            castActs[0]?.initialHoles ?? [],
            "dancingLightsPlacement",
          ).holeId,
          value: {
            mode: "cast",
            form: "separateLights",
            lights: [
              {
                positionId: battleTablePositionId("dancing-lights-a"),
                distanceFromCasterFeet: movementFeet(30),
                nearestSiblingDistanceFeet: movementFeet(10),
              },
              {
                positionId: battleTablePositionId("dancing-lights-b"),
                distanceFromCasterFeet: movementFeet(35),
                nearestSiblingDistanceFeet: movementFeet(10),
              },
              {
                positionId: battleTablePositionId("dancing-lights-c"),
                distanceFromCasterFeet: movementFeet(40),
                nearestSiblingDistanceFeet: movementFeet(10),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dancing Lights to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "dancingLights",
        sourceSpellId: dancingLightsUnitId,
        sourceCombatantId: spellCasterId,
        form: "separateLights",
      }),
    );
    expect(resolved.snapshot.lightEmitters).toHaveLength(3);
    expect(resolved.snapshot.lightEmitters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellLightEmitter",
          sourceSpellId: dancingLightsUnitId,
          sourceCombatantId: spellCasterId,
          attachment: expect.objectContaining({
            kind: "dancingLight",
            form: "separateLights",
          }),
          emission: { kind: "dim", radiusFeet: movementFeet(10) },
          opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
          expiresAt: expect.objectContaining({
            kind: "concentration",
            combatantId: spellCasterId,
          }),
        }),
      ]),
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(resolved.state.combatants.get(spellCasterId)?.concentration).toEqual(
      {
        sourceSpellId: dancingLightsUnitId,
        effectKind: "spellEffect",
      },
    );
  });
  test("dancing_lights opens the spell-cast reaction window before applying lights", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      cantrips: [spell],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const readiedRay = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        invocation: cantripSpellInvocationRef(
          rayOfFrostUnitId,
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    if (readiedRay.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const casterTurn = endTurn({
      state: readiedRay.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }
    const castAct = spellAct({
      state: casterTurn.state,
      spellId: dancingLightsUnitId,
    });
    const placement = {
      kind: "dancingLightsPlacement",
      holeId: requireHole(castAct.initialHoles, "dancingLightsPlacement")
        .holeId,
      value: {
        mode: "cast",
        form: "separateLights",
        lights: [
          {
            positionId: battleTablePositionId("dancing-lights-reaction-a"),
            distanceFromCasterFeet: movementFeet(30),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
          {
            positionId: battleTablePositionId("dancing-lights-reaction-b"),
            distanceFromCasterFeet: movementFeet(35),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
        ],
      },
    } satisfies BattleFill;
    const awaitingReaction = resolveBattleSubject({
      state: casterTurn.state,
      subject: castAct.subject,
      fills: [placement],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "spellCast",
          choices: [
            expect.objectContaining({
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: spellTargetId,
            }),
          ],
        },
        lightEmitters: [],
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Dancing Lights spell-cast reaction window.");
    }
    const afterDecline = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: spellTargetId },
      ),
    });
    if (afterDecline.tag !== "resolved") {
      throw new Error("Expected declined reaction to replay Dancing Lights.");
    }
    expect(afterDecline.snapshot.pendingInterrupt).toBeNull();
    expect(afterDecline.snapshot.lightEmitters).toHaveLength(2);
    expect(
      canSpendAction(afterDecline.state.currentTurnResources, "magic"),
    ).toBe(false);
  });
  test("dancing_lights supports combined Medium-form choice, Bonus Action movement, Concentration cleanup, and duration cleanup", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const combinedAct = discoverBattleActs(state).find(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === dancingLightsUnitId &&
        candidate.subject.invocation.procedure === "dancingLightsCombinedCast",
    );
    expect(combinedAct).toBeDefined();
    if (combinedAct === undefined) {
      throw new Error("Expected Dancing Lights combined-form act.");
    }
    const resolved = resolveBattleSubject({
      state,
      subject: combinedAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: requireHole(
            combinedAct.initialHoles,
            "dancingLightsPlacement",
          ).holeId,
          value: {
            mode: "cast",
            form: "combinedMediumForm",
            light: {
              positionId: battleTablePositionId("dancing-lights-combined"),
              distanceFromCasterFeet: movementFeet(60),
            },
          },
        } satisfies BattleFill,
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dancing Lights combined form to resolve.");
    }
    expect(resolved.snapshot.lightEmitters).toEqual([
      expect.objectContaining({
        attachment: expect.objectContaining({
          kind: "dancingLight",
          form: "combinedMediumForm",
        }),
        emission: { kind: "dim", radiusFeet: movementFeet(10) },
      }),
    ]);

    const beforeMovePosition =
      resolved.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
      resolved.snapshot.lightEmitters[0].attachment.kind === "dancingLight"
        ? resolved.snapshot.lightEmitters[0].attachment.positionId
        : null;
    const recastReadyState: BattleState = {
      ...resolved.state,
      currentTurnResources: state.currentTurnResources,
    };
    const recast = resolveBattleSubject({
      state: recastReadyState,
      subject: combinedAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: requireHole(
            combinedAct.initialHoles,
            "dancingLightsPlacement",
          ).holeId,
          value: {
            mode: "cast",
            form: "combinedMediumForm",
            light: {
              positionId: battleTablePositionId("dancing-lights-recast"),
              distanceFromCasterFeet: movementFeet(45),
            },
          },
        } satisfies BattleFill,
      ],
    });
    if (recast.tag !== "resolved") {
      throw new Error("Expected Dancing Lights recast to resolve.");
    }
    expect(recast.snapshot.lightEmitters).toHaveLength(1);
    expect(recast.snapshot.lightEmitters[0]).toEqual(
      expect.objectContaining({
        attachment: expect.objectContaining({
          positionId: battleTablePositionId("dancing-lights-recast"),
        }),
      }),
    );
    expect(recast.snapshot.lightEmitters[0]).not.toEqual(
      expect.objectContaining({
        attachment: expect.objectContaining({ positionId: beforeMovePosition }),
      }),
    );

    const moveAct = bonusSpellAct({
      state: resolved.state,
      spellId: dancingLightsUnitId,
    });
    expect(moveAct.subject.invocation).toEqual(
      cantripSpellInvocationRef(dancingLightsUnitId, "dancingLightsReposition"),
    );
    const moved = resolveBattleSubject({
      state: resolved.state,
      subject: moveAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: requireHole(moveAct.initialHoles, "dancingLightsPlacement")
            .holeId,
          value: {
            mode: "reposition",
            form: "combinedMediumForm",
            light: {
              lightId:
                resolved.snapshot.lightEmitters[0]?.kind ===
                  "spellLightEmitter" &&
                resolved.snapshot.lightEmitters[0].attachment.kind ===
                  "dancingLight"
                  ? resolved.snapshot.lightEmitters[0].attachment.lightId
                  : (() => {
                      throw new Error("Expected Dancing Lights emitter.");
                    })(),
              positionId: battleTablePositionId(
                "dancing-lights-combined-moved",
              ),
              distanceFromCasterFeet: movementFeet(70),
              moveDistanceFeet: movementFeet(50),
            },
          },
        } satisfies BattleFill,
      ],
    });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Dancing Lights reposition to resolve.");
    }
    const afterMovePosition =
      moved.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
      moved.snapshot.lightEmitters[0].attachment.kind === "dancingLight"
        ? moved.snapshot.lightEmitters[0].attachment.positionId
        : null;
    expect(afterMovePosition).not.toBe(beforeMovePosition);
    expect(moved.state.currentTurnResources.currentHasBonusAction).toBe(false);

    const concentrationBroken = breakBattleConcentration(
      moved.state,
      spellCasterId,
    );
    expect(snapshotBattle(concentrationBroken).lightEmitters).toEqual([]);

    const caster = resolved.state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Dancing Lights caster.");
    }
    const expiringState: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "dancingLights"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const afterCasterTurn = resolveBattleSubject({
      state: expiringState,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Dancing Lights caster end turn.");
    }
    const expired = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (expired.tag !== "resolved") {
      throw new Error("Expected Dancing Lights duration end turn.");
    }
    expect(snapshotBattle(expired.state).lightEmitters).toEqual([]);
  });
  test("dancing_lights rejects unrelated fills and duplicate reposition identities", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const separateAct = spellAct({ state, spellId: dancingLightsUnitId });
    const placementHole = requireHole(
      separateAct.initialHoles,
      "dancingLightsPlacement",
    );
    const castPlacement = {
      kind: "dancingLightsPlacement",
      holeId: placementHole.holeId,
      value: {
        mode: "cast",
        form: "separateLights",
        lights: [
          {
            positionId: battleTablePositionId("dancing-lights-identity-a"),
            distanceFromCasterFeet: movementFeet(30),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
          {
            positionId: battleTablePositionId("dancing-lights-identity-b"),
            distanceFromCasterFeet: movementFeet(35),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
        ],
      },
    } satisfies BattleFill;
    const unrelatedFill = {
      kind: "concentrationSavingThrow",
      holeId: holeId("unrelated-dancing-lights-concentration"),
      value: { succeeded: true },
    } satisfies BattleFill;

    expect(
      resolveBattleSubject({
        state,
        subject: separateAct.subject,
        fills: [castPlacement, unrelatedFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const cast = resolveBattleSubject({
      state,
      subject: separateAct.subject,
      fills: [castPlacement],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected two-light Dancing Lights cast.");
    }
    const lightIds = cast.snapshot.lightEmitters.flatMap((emitter) =>
      emitter.kind === "spellLightEmitter" &&
      emitter.attachment.kind === "dancingLight"
        ? [emitter.attachment.lightId]
        : [],
    );
    expect(lightIds).toHaveLength(2);

    const moveAct = bonusSpellAct({
      state: cast.state,
      spellId: dancingLightsUnitId,
    });
    const moveHole = requireHole(
      moveAct.initialHoles,
      "dancingLightsPlacement",
    );
    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(cast.state, spellCasterId),
        subject: moveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const validMovePlacement = {
      kind: "dancingLightsPlacement",
      holeId: moveHole.holeId,
      value: {
        mode: "reposition",
        form: "separateLights",
        lights: [
          {
            lightId: lightIds[0]!,
            positionId: battleTablePositionId("dancing-lights-identity-a-move"),
            distanceFromCasterFeet: movementFeet(40),
            moveDistanceFeet: movementFeet(10),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
          {
            lightId: lightIds[1]!,
            positionId: battleTablePositionId("dancing-lights-identity-b-move"),
            distanceFromCasterFeet: movementFeet(45),
            moveDistanceFeet: movementFeet(10),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
        ],
      },
    } satisfies BattleFill;

    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: moveAct.subject,
        fills: [validMovePlacement, unrelatedFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const duplicateMovePlacement = {
      kind: "dancingLightsPlacement",
      holeId: moveHole.holeId,
      value: {
        mode: "reposition",
        form: "separateLights",
        lights: [
          {
            lightId: lightIds[0]!,
            positionId: battleTablePositionId("dancing-lights-duplicate-a"),
            distanceFromCasterFeet: movementFeet(40),
            moveDistanceFeet: movementFeet(10),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
          {
            lightId: lightIds[0]!,
            positionId: battleTablePositionId("dancing-lights-duplicate-b"),
            distanceFromCasterFeet: movementFeet(45),
            moveDistanceFeet: movementFeet(10),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
        ],
      },
    } satisfies BattleFill;
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: moveAct.subject,
        fills: [duplicateMovePlacement],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });
  test("dancing_lights enforces movement distance, spacing, range expiry, and one-to-four separate lights", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const separateAct = spellAct({ state, spellId: dancingLightsUnitId });
    const placementHole = requireHole(
      separateAct.initialHoles,
      "dancingLightsPlacement",
    );
    const cast = resolveBattleSubject({
      state,
      subject: separateAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: placementHole.holeId,
          value: {
            mode: "cast",
            form: "separateLights",
            lights: [
              {
                positionId: battleTablePositionId("dancing-lights-one"),
                distanceFromCasterFeet: movementFeet(30),
                nearestSiblingDistanceFeet: movementFeet(15),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected one-light Dancing Lights cast.");
    }
    expect(cast.snapshot.lightEmitters).toHaveLength(1);

    const moveAct = bonusSpellAct({
      state: cast.state,
      spellId: dancingLightsUnitId,
    });
    const moveHole = requireHole(
      moveAct.initialHoles,
      "dancingLightsPlacement",
    );
    const lightId =
      cast.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
      cast.snapshot.lightEmitters[0].attachment.kind === "dancingLight"
        ? cast.snapshot.lightEmitters[0].attachment.lightId
        : (() => {
            throw new Error("Expected Dancing Lights emitter.");
          })();
    const tooFar = resolveBattleSubject({
      state: cast.state,
      subject: moveAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: moveHole.holeId,
          value: {
            mode: "reposition",
            form: "separateLights",
            lights: [
              {
                lightId,
                positionId: battleTablePositionId("dancing-lights-too-far"),
                distanceFromCasterFeet: movementFeet(40),
                moveDistanceFeet: movementFeet(65),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });
    expect(tooFar).toMatchObject({ tag: "invalid" });

    const expiredByRange = resolveBattleSubject({
      state: cast.state,
      subject: moveAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: moveHole.holeId,
          value: {
            mode: "reposition",
            form: "separateLights",
            lights: [
              {
                lightId,
                positionId: battleTablePositionId(
                  "dancing-lights-out-of-range",
                ),
                distanceFromCasterFeet: movementFeet(125),
                moveDistanceFeet: movementFeet(50),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });
    if (expiredByRange.tag !== "resolved") {
      throw new Error("Expected out-of-range Dancing Light to vanish.");
    }
    expect(snapshotBattle(expiredByRange.state).lightEmitters).toEqual([]);

    const badSpacing = resolveBattleSubject({
      state,
      subject: separateAct.subject,
      fills: [
        {
          kind: "dancingLightsPlacement",
          holeId: placementHole.holeId,
          value: {
            mode: "cast",
            form: "separateLights",
            lights: [
              {
                positionId: battleTablePositionId("dancing-lights-space-a"),
                distanceFromCasterFeet: movementFeet(30),
                nearestSiblingDistanceFeet: movementFeet(25),
              },
              {
                positionId: battleTablePositionId("dancing-lights-space-b"),
                distanceFromCasterFeet: movementFeet(35),
                nearestSiblingDistanceFeet: movementFeet(25),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });
    expect(badSpacing).toMatchObject({ tag: "invalid" });
  });
});
