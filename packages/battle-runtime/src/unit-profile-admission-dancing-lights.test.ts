import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV88A dancing_lights
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-dancing-lights-movable-dim-light
import { describe, expect, test } from "vitest";
import {
  dancingLightsUnitId,
  longstriderUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  interruptDecisionFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  assertBattleSnapshotCodecRoundTripForTest,
  battleLightEmitterProjection,
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
} from "./unit-profile-admission.test-support.ts";
import type { ActionSpellAct } from "./unit-profile-admission-catalog.test-support.ts";
import type {
  BattleFill,
  BattleState,
} from "./unit-profile-admission.test-support.ts";

describe("SRDINV32A deterministic Dancing Lights admission", () => {
  test("dancing_lights is admitted as Magic Action source-owned movable Dim Light", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const castActs = discoverBattleActs(session).filter(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          dancingLightsUnitId,
    );

    expect(
      castActs.map((act) => battleActSpellPresentation(act)?.invocation),
    ).toEqual([
      cantripSpellInvocationRef(
        dancingLightsUnitId,
        "movableLightManifestation",
      ),
      cantripSpellInvocationRef(
        dancingLightsUnitId,
        "movableLightManifestation",
      ),
    ]);
    const castAct = castActs[0];
    if (castAct === undefined) {
      throw new Error("Expected Dancing Lights separate-cast act.");
    }
    const awaitingPlacement = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [],
    });
    if (awaitingPlacement.tag !== "needsHoles") {
      throw new Error("Expected Dancing Lights placement.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingPlacement.snapshot);

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: castAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: requireHole(castAct.initialHoles, "movableLightPlacement")
            .holeId,
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
        kind: "movableLightManifestation",
        sourceProcedureRef: castAct.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        form: "separateLights",
      }),
    );
    expect(resolved.snapshot.lightEmitters).toHaveLength(3);
    expect(resolved.snapshot.lightEmitters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellLightEmitter",
          sourceProcedureRef: castAct.subject.procedureRef,
          sourceCombatantId: spellCasterId,
          attachment: expect.objectContaining({
            kind: "movableLight",
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
    const dancingEmitter = resolved.snapshot.lightEmitters[0];
    if (
      dancingEmitter?.kind !== "spellLightEmitter" ||
      dancingEmitter.attachment.kind !== "movableLight"
    ) {
      throw new Error("Expected projected Dancing Light emitter.");
    }
    const dancingLightFact = {
      ...dancingEmitter.attachment,
      distanceFeet: movementFeet(5),
    };
    expect(
      battleLightEmitterProjection(dancingEmitter, dancingLightFact),
    ).toEqual({ emitter: dancingEmitter, illumination: "dimLight" });
    expect(
      battleLightEmitterProjection(dancingEmitter, {
        ...dancingLightFact,
        distanceFeet: movementFeet(15),
      }),
    ).toBeNull();
    expect(
      battleLightEmitterProjection(dancingEmitter, {
        ...dancingLightFact,
        positionId: battleTablePositionId("wrong-dancing-light-position"),
      }),
    ).toBeNull();

    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(resolved.state.combatants.get(spellCasterId)?.concentration).toEqual(
      {
        sourceProcedureRef: castAct.subject.procedureRef,
        effectKind: "spellEffect",
      },
    );
  });
  test("dancing_lights opens the spell-cast reaction window before applying lights", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialSession = spellBattle({
      cantrips: [spell],
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialSession.state,
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
        procedureRef: requireCharacterSpellProcedureRefForTest(
          initialSession,
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
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
      session: battleRuntimeSessionForTest({
        state: casterTurn.state,
        context: initialSession.context,
      }),
      spellId: dancingLightsUnitId,
    });
    const placement = {
      kind: "movableLightPlacement",
      holeId: requireHole(castAct.initialHoles, "movableLightPlacement").holeId,
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
        lightEmitters: [],
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Dancing Lights spell-cast reaction window.");
    }
    const reactionFrontier = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    );
    expect(reactionFrontier).toMatchObject({
      trigger: "spellCast",
      choices: [
        expect.objectContaining({
          kind: "nestedProcedure",
          subject: expect.objectContaining({
            command: "releaseReadiedSpell",
            readiedSpellCasterId: spellTargetId,
          }),
        }),
      ],
    });
    if (reactionFrontier === null) {
      throw new Error("Expected Dancing Lights reaction frontier.");
    }
    const afterDecline = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(reactionFrontier.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    if (afterDecline.tag !== "resolved") {
      throw new Error("Expected declined reaction to replay Dancing Lights.");
    }
    expect(
      battleFrontierInterruptDecisionForState(afterDecline.state),
    ).toBeNull();
    expect(afterDecline.snapshot.lightEmitters).toHaveLength(2);
    expect(
      canSpendAction(afterDecline.state.currentTurnResources, "magic"),
    ).toBe(false);
  });
  test("dancing_lights supports combined Medium-form choice, Bonus Action movement, Concentration cleanup, and duration cleanup", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const baseSession = spellBattle({
      cantrips: [spell],
      preparedSpells: [spellRecord(longstriderUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const longstriderAct = spellAct({
      session: baseSession,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const longstriderTarget = requireHole(
      longstriderAct.initialHoles,
      "targetChoice",
    );
    const longstriderCast = resolveBattleSubject({
      state: baseSession.state,
      subject: longstriderAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          longstriderTarget,
          longstriderUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    if (longstriderCast.tag !== "resolved") {
      throw new Error("Expected admitted Longstrider cast to resolve.");
    }
    const targetTurnAfterLongstrider = endTurn({
      state: longstriderCast.state,
      actorId: spellCasterId,
    });
    if (targetTurnAfterLongstrider.tag !== "resolved") {
      throw new Error("Expected Longstrider caster turn to end.");
    }
    const casterTurnAfterLongstrider = endTurn({
      state: targetTurnAfterLongstrider.state,
      actorId: spellTargetId,
    });
    if (casterTurnAfterLongstrider.tag !== "resolved") {
      throw new Error("Expected Longstrider target turn to end.");
    }
    const session = battleRuntimeSessionForTest({
      ...baseSession,
      state: casterTurnAfterLongstrider.state,
    });
    const combinedAct = discoverBattleActs(session).find(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          dancingLightsUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "movableLightManifestation" &&
        candidate.initialHoles.some(
          (hole) =>
            hole.kind === "movableLightPlacement" &&
            hole.form === "combinedMediumForm",
        ),
    );
    expect(combinedAct).toBeDefined();
    if (combinedAct === undefined) {
      throw new Error("Expected Dancing Lights combined-form act.");
    }
    const combinedPlacementHole = requireHole(
      combinedAct.initialHoles,
      "movableLightPlacement",
    );
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: combinedAct.subject,
        fills: [
          {
            kind: "movableLightPlacement",
            holeId: combinedPlacementHole.holeId,
            value: {
              mode: "cast",
              form: "combinedMediumForm",
              light: {
                positionId: battleTablePositionId(
                  "dancing-lights-combined-out-of-range",
                ),
                distanceFromCasterFeet: movementFeet(125),
              },
            },
          } satisfies BattleFill,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable-light placement must be within spell range.",
    });
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: combinedAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: combinedPlacementHole.holeId,
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
          kind: "movableLight",
          form: "combinedMediumForm",
        }),
        emission: { kind: "dim", radiusFeet: movementFeet(10) },
      }),
    ]);
    expect(
      resolved.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
        resolved.snapshot.lightEmitters[0].attachment.kind === "movableLight"
        ? String(resolved.snapshot.lightEmitters[0].attachment.lightId)
        : "",
    ).toContain(String(combinedAct.subject.procedureRef));
    expect(JSON.stringify(resolved.snapshot.lightEmitters)).not.toContain(
      dancingLightsUnitId,
    );

    const beforeMovePosition =
      resolved.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
      resolved.snapshot.lightEmitters[0].attachment.kind === "movableLight"
        ? resolved.snapshot.lightEmitters[0].attachment.positionId
        : null;
    const targetTurnBeforeRecast = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurnBeforeRecast.tag !== "resolved") {
      throw new Error("Expected Dancing Lights caster turn to end.");
    }
    const casterTurnBeforeRecast = endTurn({
      state: targetTurnBeforeRecast.state,
      actorId: spellTargetId,
    });
    if (casterTurnBeforeRecast.tag !== "resolved") {
      throw new Error("Expected Dancing Lights target turn to end.");
    }
    const recastSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurnBeforeRecast.state,
    });
    const recastAct = discoverBattleActs(recastSession).find(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          dancingLightsUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "movableLightManifestation" &&
        candidate.initialHoles.some(
          (hole) =>
            hole.kind === "movableLightPlacement" &&
            hole.form === "combinedMediumForm",
        ),
    );
    if (recastAct === undefined) {
      throw new Error("Expected a fresh Dancing Lights combined-form act.");
    }
    const recast = resolveBattleSubject({
      state: recastSession.state,
      subject: recastAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: requireHole(recastAct.initialHoles, "movableLightPlacement")
            .holeId,
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
      session: battleRuntimeSessionForTest({
        state: resolved.state,
        context: session.context,
      }),
      spellId: dancingLightsUnitId,
    });
    expect(battleActSpellPresentation(moveAct)?.invocation).toEqual(
      cantripSpellInvocationRef(
        dancingLightsUnitId,
        "movableLightManifestation",
      ),
    );
    expect(
      resolveBattleSubject({
        state: recast.state,
        subject: moveAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: resolved.state,
        subject: moveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "movableLightPlacement",
          mode: "reposition",
          form: "combinedMediumForm",
          activeLightIds: [
            expect.stringContaining(String(combinedAct.subject.procedureRef)),
          ],
        }),
      ],
    });
    const unrelatedEffect = requireCombatant(
      resolved.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) =>
        "sourceProcedureRef" in effect &&
        effect.sourceProcedureRef === longstriderAct.subject.procedureRef,
    );
    if (unrelatedEffect === undefined) {
      throw new Error("Expected allocated Longstrider occurrence.");
    }
    const moved = resolveBattleSubject({
      state: resolved.state,
      subject: moveAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: requireHole(moveAct.initialHoles, "movableLightPlacement")
            .holeId,
          value: {
            mode: "reposition",
            form: "combinedMediumForm",
            light: {
              lightId:
                resolved.snapshot.lightEmitters[0]?.kind ===
                  "spellLightEmitter" &&
                resolved.snapshot.lightEmitters[0].attachment.kind ===
                  "movableLight"
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
      moved.snapshot.lightEmitters[0].attachment.kind === "movableLight"
        ? moved.snapshot.lightEmitters[0].attachment.positionId
        : null;
    expect(afterMovePosition).not.toBe(beforeMovePosition);
    expect(moved.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      moved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(unrelatedEffect);

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
          effect.kind === "movableLightManifestation"
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
    const session = spellBattle({ cantrips: [spell] });
    const separateAct = spellAct({
      session,
      spellId: dancingLightsUnitId,
    });
    const placementHole = requireHole(
      separateAct.initialHoles,
      "movableLightPlacement",
    );
    const castPlacement = {
      kind: "movableLightPlacement",
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
        state: session.state,
        subject: separateAct.subject,
        fills: [castPlacement, unrelatedFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const cast = resolveBattleSubject({
      state: session.state,
      subject: separateAct.subject,
      fills: [castPlacement],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected two-light Dancing Lights cast.");
    }
    const lightIds = cast.snapshot.lightEmitters.flatMap((emitter) =>
      emitter.kind === "spellLightEmitter" &&
      emitter.attachment.kind === "movableLight"
        ? [emitter.attachment.lightId]
        : [],
    );
    expect(lightIds).toHaveLength(2);

    const moveAct = bonusSpellAct({
      session: battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
      spellId: dancingLightsUnitId,
    });
    const moveHole = requireHole(moveAct.initialHoles, "movableLightPlacement");
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
      kind: "movableLightPlacement",
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
      kind: "movableLightPlacement",
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
    const session = spellBattle({ cantrips: [spell] });
    const separateAct = spellAct({
      session,
      spellId: dancingLightsUnitId,
    });
    const placementHole = requireHole(
      separateAct.initialHoles,
      "movableLightPlacement",
    );
    const oneLightPlacement = {
      kind: "movableLightPlacement",
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
    } as const satisfies BattleFill;
    for (const lights of [
      [],
      Array.from({ length: 5 }, (_, index) => ({
        positionId: battleTablePositionId(`dancing-lights-five-${index}`),
        distanceFromCasterFeet: movementFeet(30),
        nearestSiblingDistanceFeet: movementFeet(10),
      })),
    ]) {
      expect(
        resolveBattleSubject({
          state: session.state,
          subject: separateAct.subject,
          fills: [
            {
              ...oneLightPlacement,
              value: { ...oneLightPlacement.value, lights },
            },
          ],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message: "Movable-light separate form requires one to four lights.",
      });
    }
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: separateAct.subject,
        fills: [
          {
            ...oneLightPlacement,
            value: {
              ...oneLightPlacement.value,
              lights: [
                {
                  ...oneLightPlacement.value.lights[0],
                  distanceFromCasterFeet: movementFeet(125),
                },
              ],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable-light placement must be within spell range.",
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: separateAct.subject,
      fills: [oneLightPlacement],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected one-light Dancing Lights cast.");
    }
    expect(cast.snapshot.lightEmitters).toHaveLength(1);

    const fourLightCast = resolveBattleSubject({
      state: session.state,
      subject: separateAct.subject,
      fills: [
        {
          ...oneLightPlacement,
          value: {
            ...oneLightPlacement.value,
            lights: Array.from({ length: 4 }, (_, index) => ({
              positionId: battleTablePositionId(`dancing-lights-four-${index}`),
              distanceFromCasterFeet: movementFeet(30 + index * 5),
              nearestSiblingDistanceFeet: movementFeet(5),
            })),
          },
        } satisfies BattleFill,
      ],
    });
    if (fourLightCast.tag !== "resolved") {
      throw new Error("Expected four-light Dancing Lights cast.");
    }
    expect(fourLightCast.snapshot.lightEmitters).toHaveLength(4);

    const moveAct = bonusSpellAct({
      session: battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
      spellId: dancingLightsUnitId,
    });
    const moveHole = requireHole(moveAct.initialHoles, "movableLightPlacement");
    const lightId =
      cast.snapshot.lightEmitters[0]?.kind === "spellLightEmitter" &&
      cast.snapshot.lightEmitters[0].attachment.kind === "movableLight"
        ? cast.snapshot.lightEmitters[0].attachment.lightId
        : (() => {
            throw new Error("Expected Dancing Lights emitter.");
          })();
    const tooFar = resolveBattleSubject({
      state: cast.state,
      subject: moveAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
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
          kind: "movableLightPlacement",
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
      state: session.state,
      subject: separateAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
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

    const fourMoveAct = bonusSpellAct({
      session: battleRuntimeSessionForTest({
        state: fourLightCast.state,
        context: session.context,
      }),
      spellId: dancingLightsUnitId,
    });
    const fourMoveHole = requireHole(
      fourMoveAct.initialHoles,
      "movableLightPlacement",
    );
    const fourLightIds = fourLightCast.snapshot.lightEmitters.flatMap(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        emitter.attachment.kind === "movableLight"
          ? [emitter.attachment.lightId]
          : [],
    );
    expect(fourLightIds).toHaveLength(4);
    const badReposition = resolveBattleSubject({
      state: fourLightCast.state,
      subject: fourMoveAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: fourMoveHole.holeId,
          value: {
            mode: "reposition",
            form: "separateLights",
            lights: fourLightIds.map((lightId, index) => ({
              lightId,
              positionId: battleTablePositionId(
                `dancing-lights-bad-reposition-${index}`,
              ),
              distanceFromCasterFeet: movementFeet(40 + index * 5),
              moveDistanceFeet: movementFeet(10),
              nearestSiblingDistanceFeet: movementFeet(25),
            })),
          },
        } satisfies BattleFill,
      ],
    });
    expect(badReposition).toMatchObject({
      tag: "invalid",
      message:
        "Separate movable lights must remain within their spacing limit.",
    });
  });

  test("dancing_lights rejects placement mode mismatches and inactive effects", () => {
    const spell = spellRecord(dancingLightsUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const separateAct = spellAct({
      session,
      spellId: dancingLightsUnitId,
    });
    const placementHole = requireHole(
      separateAct.initialHoles,
      "movableLightPlacement",
    );
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: separateAct.subject,
        fills: [
          {
            kind: "movableLightPlacement",
            holeId: placementHole.holeId,
            value: {
              mode: "reposition",
              form: "separateLights",
              lights: [],
            },
          } satisfies BattleFill,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable-light placement does not match the selected form.",
    });

    const cast = resolveBattleSubject({
      state: session.state,
      subject: separateAct.subject,
      fills: [
        {
          kind: "movableLightPlacement",
          holeId: placementHole.holeId,
          value: {
            mode: "cast",
            form: "separateLights",
            lights: [
              {
                positionId: battleTablePositionId(
                  "dancing-lights-form-mismatch-a",
                ),
                distanceFromCasterFeet: movementFeet(30),
                nearestSiblingDistanceFeet: movementFeet(10),
              },
              {
                positionId: battleTablePositionId(
                  "dancing-lights-form-mismatch-b",
                ),
                distanceFromCasterFeet: movementFeet(35),
                nearestSiblingDistanceFeet: movementFeet(10),
              },
            ],
          },
        } satisfies BattleFill,
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Dancing Lights cast before form checks.");
    }
    const moveAct = bonusSpellAct({
      session: battleRuntimeSessionForTest({
        state: cast.state,
        context: session.context,
      }),
      spellId: dancingLightsUnitId,
    });
    const moveFrontier = resolveBattleSubject({
      state: cast.state,
      subject: moveAct.subject,
      fills: [],
    });
    if (moveFrontier.tag !== "needsHoles") {
      throw new Error("Expected Dancing Lights reposition placement.");
    }
    const moveHole = requireHole(moveFrontier.holes, "movableLightPlacement");
    const lightEmitter = cast.snapshot.lightEmitters.find(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        emitter.attachment.kind === "movableLight",
    );
    if (
      lightEmitter === undefined ||
      lightEmitter.kind !== "spellLightEmitter" ||
      lightEmitter.attachment.kind !== "movableLight"
    ) {
      throw new Error("Expected a Dancing Lights light identity.");
    }
    const lightId = lightEmitter.attachment.lightId;
    const validMovePlacement = {
      kind: "movableLightPlacement",
      holeId: moveHole.holeId,
      value: {
        mode: "reposition",
        form: "separateLights",
        lights: [
          {
            lightId,
            positionId: battleTablePositionId("dancing-lights-valid-move"),
            distanceFromCasterFeet: movementFeet(35),
            moveDistanceFeet: movementFeet(5),
            nearestSiblingDistanceFeet: movementFeet(10),
          },
        ],
      },
    } satisfies BattleFill;
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: moveAct.subject,
        fills: [
          {
            kind: "movableLightPlacement",
            holeId: moveHole.holeId,
            value: {
              mode: "cast",
              form: "separateLights",
              lights: [
                {
                  positionId: battleTablePositionId(
                    "dancing-lights-cast-mode-move",
                  ),
                  distanceFromCasterFeet: movementFeet(35),
                  nearestSiblingDistanceFeet: movementFeet(10),
                },
              ],
            },
          } satisfies BattleFill,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Movable-light movement requires reposition placement.",
    });
    const inactiveLightsState = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      resolveBattleSubject({
        state: inactiveLightsState,
        subject: moveAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Movable-light reposition requires an active manifestation from this spell.",
    });
    expect(
      resolveBattleSubject({
        state: inactiveLightsState,
        subject: moveAct.subject,
        fills: [validMovePlacement],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Movable-light reposition requires an active manifestation from this spell.",
    });
  });
});
