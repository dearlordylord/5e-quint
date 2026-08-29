// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME levitate
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-levitated-creature
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
import { describe, expect, test } from "vitest";
import type {
  BattleFill,
  BattleHole,
  BattleState,
  CombatantId,
} from "./index.ts";
import {
  levitateUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  breakBattleConcentration,
  discoverBattleActCandidates,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import { spellProcedureBoundToActiveEffect } from "./battle-reducer/spell-active-effect-binding.ts";

describe("L12G deterministic Levitate creature admission", () => {
  test("levitate admits the creature branch as a level-2 Magic Action Spell Slot profile", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef: expect.any(String),
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ kind: "targetChoice" }),
    ]);
  });

  test("known willing creature target receives a concentration-owned suspended altitude projection", () => {
    const cast = castWillingLevitate({ initialRiseFeet: 12 });
    const target = requireCombatant(cast.state, spellTargetId);

    expect(requireLevitatedEffect(cast.state)).toEqual(
      expect.objectContaining({
        kind: "controlledVerticalSuspension",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        altitudeFeet: movementFeet(12),
        maxAltitudeChangeFeet: movementFeet(20),
        rangeFeet: movementFeet(60),
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(100),
        },
      }),
    );
    expect(target.activeEffects).toContainEqual(
      requireLevitatedEffect(cast.state),
    );
  });

  test("unwilling creature save success spends the slot without levitating or starting concentration", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const saved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(saved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
      },
    });
    if (saved.tag !== "resolved") {
      throw new Error("Expected successful Levitate save resolution.");
    }
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(saved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });

  test("unwilling creature save success rejects an inert initial-rise fill", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "controlledVerticalSuspensionInitialRise",
    );

    const invalid = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Successful Levitate creature saves are unaffected and do not use an initial-rise fill.",
    });
  });

  test("levitate creature cast requires a caller-selected initial rise up to 20 feet", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "controlledVerticalSuspensionInitialRise",
    );

    const tooHigh = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 25),
      ],
    });
    expect(tooHigh).toMatchObject({ tag: "invalid" });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Levitate with selected initial rise.");
    }
    expect(requireLevitatedEffect(resolved.state).altitudeFeet).toBe(
      movementFeet(5),
    );
  });

  test("levitated target movement requires a fixed-object or surface witness and can change self altitude", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const moveAct = discoverBattleActCandidates(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");

    const missingWitness = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(missingWitness).toMatchObject({ tag: "invalid" });

    const underpaidClimbingCost = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(targetTurn.state).effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(targetTurn.state)
              .sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(underpaidClimbingCost).toMatchObject({
      tag: "invalid",
      message:
        "Levitated movement must spend the altitude-change distance as climbing, plus any area movement costs.",
    });

    const moved = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(targetTurn.state).effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(targetTurn.state)
              .sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected witnessed Levitate movement.");
    }
    expect(requireLevitatedEffect(moved.state).altitudeFeet).toBe(
      movementFeet(15),
    );
  });

  test("caster Magic Action altitude control requires range facts and rejects stale acts", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn.");
    }
    const altitudeAct = discoverBattleActCandidates(nextCasterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command ===
          "controlledVerticalSuspensionAltitudeControl",
    );
    expect(altitudeAct).toBeDefined();
    if (altitudeAct === undefined) {
      throw new Error("Expected Levitate altitude control act.");
    }
    const hole = requireHole(
      altitudeAct.initialHoles,
      "controlledVerticalSuspensionAltitudeChange",
    );
    const levitated = requireLevitatedEffect(nextCasterTurn.state);
    const witnessedAltitudeChange =
      controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
        {
          kind: "controlledVerticalSuspensionTargetWithinRange",
          effectRef: levitated.effectRef,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: levitated.sourceProcedureRef,
          targetId: spellTargetId,
          rangeFeet: movementFeet(60),
        },
      ]);
    const missingFact = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [
        controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, []),
      ],
    });
    expect(missingFact).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(nextCasterTurn.state, spellCasterId),
        subject: altitudeAct.subject,
        fills: [witnessedAltitudeChange],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Levitate altitude control is no longer active for the target.",
    });

    const raised = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [witnessedAltitudeChange],
    });
    expect(raised).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (raised.tag !== "resolved") {
      throw new Error("Expected Levitate altitude control.");
    }
    expect(requireLevitatedEffect(raised.state).altitudeFeet).toBe(
      movementFeet(30),
    );
    expect(
      resolveBattleSubject({
        state: raised.state,
        subject: altitudeAct.subject,
        fills: [witnessedAltitudeChange],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Magic action is no longer available for Levitate altitude control.",
    });
  });

  test("altitude control mutates only the selected Levitate occurrence", () => {
    const cast = castWillingLevitate();
    const casterTurn = advanceToNextCasterTurn(cast.state);
    const original = requireLevitatedEffect(casterTurn);
    const targetBeforeAllocation = requireCombatant(casterTurn, spellTargetId);
    const casterBeforeAllocation = requireCombatant(casterTurn, spellCasterId);
    const twoOccurrences = battleStateWithAllocatedEffectForTest({
      state: casterTurn,
      ownerId: spellTargetId,
      effect: {
        kind: "controlledVerticalSuspension",
        sourceProcedureRef: original.sourceProcedureRef,
        sourceCombatantId: original.sourceCombatantId,
        altitudeFeet: original.altitudeFeet,
        expiresAt: original.expiresAt,
      },
    });
    const targetAfterAllocation = requireCombatant(
      twoOccurrences,
      spellTargetId,
    );
    const casterAfterAllocation = requireCombatant(
      twoOccurrences,
      spellCasterId,
    );
    const selected = targetAfterAllocation.activeEffects.find(
      (effect) =>
        effect.kind === "controlledVerticalSuspension" &&
        effect.effectRef !== original.effectRef,
    );
    if (selected?.kind !== "controlledVerticalSuspension") {
      throw new Error("Expected a second allocated Levitate occurrence.");
    }
    expect(Number(targetAfterAllocation.nextEffectOrdinal)).toBe(
      Number(targetBeforeAllocation.nextEffectOrdinal) + 1,
    );
    expect(casterAfterAllocation.nextEffectOrdinal).toBe(
      casterBeforeAllocation.nextEffectOrdinal,
    );
    expect(
      casterAfterAllocation.activeEffects.some(
        (effect) => effect.effectRef === selected.effectRef,
      ),
    ).toBe(false);
    const altitudeAct = discoverBattleActCandidates(twoOccurrences).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command ===
          "controlledVerticalSuspensionAltitudeControl" &&
        candidate.subject.effectRef === selected.effectRef,
    );
    if (altitudeAct === undefined) {
      throw new Error("Expected the selected Levitate occurrence control act.");
    }
    const hole = requireHole(
      altitudeAct.initialHoles,
      "controlledVerticalSuspensionAltitudeChange",
    );
    expect(hole.effectRef).toBe(selected.effectRef);
    const awaitingAltitudeChange = resolveBattleSubject({
      state: twoOccurrences,
      subject: altitudeAct.subject,
      fills: [],
    });
    if (awaitingAltitudeChange.tag !== "needsHoles") {
      throw new Error("Expected Levitate altitude-change hole.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingAltitudeChange.snapshot);
    const staleRangeFact = {
      kind: "controlledVerticalSuspensionTargetWithinRange" as const,
      effectRef: original.effectRef,
      sourceCombatantId: spellCasterId,
      sourceProcedureRef: original.sourceProcedureRef,
      targetId: spellTargetId,
      rangeFeet: movementFeet(60),
    };
    expect(
      resolveBattleSubject({
        state: twoOccurrences,
        subject: altitudeAct.subject,
        fills: [
          controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
            staleRangeFact,
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    const raised = resolveBattleSubject({
      state: twoOccurrences,
      subject: altitudeAct.subject,
      fills: [
        controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
          {
            kind: "controlledVerticalSuspensionTargetWithinRange",
            effectRef: selected.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: selected.sourceProcedureRef,
            targetId: spellTargetId,
            rangeFeet: movementFeet(60),
          },
        ]),
      ],
    });
    expect(raised).toMatchObject({ tag: "resolved" });
    if (raised.tag !== "resolved") {
      throw new Error("Expected exact-occurrence altitude control to resolve.");
    }
    assertBattleSnapshotCodecRoundTripForTest(raised.snapshot);
    const levitateEffects = requireCombatant(
      raised.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) => effect.kind === "controlledVerticalSuspension",
    );
    expect(levitateEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectRef: original.effectRef,
          altitudeFeet: movementFeet(20),
        }),
        expect.objectContaining({
          effectRef: selected.effectRef,
          altitudeFeet: movementFeet(30),
        }),
      ]),
    );
  });

  test("self-target Levitate uses movement, not a caster Magic Action, to change altitude", () => {
    const cast = castWillingLevitate({
      targetId: spellCasterId,
      initialRiseFeet: 10,
    });
    const casterTurn = advanceToNextCasterTurn(cast.state);
    expect(
      discoverBattleActCandidates(casterTurn).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command ===
            "controlledVerticalSuspensionAltitudeControl",
      ),
    ).toBe(false);
    const moveAct = discoverBattleActCandidates(casterTurn).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected self-target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");
    const moved = resolveBattleSubject({
      state: casterTurn,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(casterTurn, spellCasterId)
              .effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(
              casterTurn,
              spellCasterId,
            ).sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "up",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected self-target Levitate movement.");
    }
    expect(
      requireLevitatedEffect(moved.state, spellCasterId).altitudeFeet,
    ).toBe(movementFeet(15));
  });

  test("concentration and duration cleanup remove the levitated creature projection", () => {
    const cast = castWillingLevitate();
    const concentrationBroken = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);

    const target = requireCombatant(cast.state, spellTargetId);
    const nearlyExpired: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: target.activeEffects.map((effect) =>
          effect.kind === "controlledVerticalSuspension" &&
          effect.expiresAt.kind === "concentration"
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
    const expired = advanceToNextCasterTurn(nearlyExpired);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(
      requireCombatant(expired, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });

  test("Levitate concentration cleanup preserves an unrelated target resistance", () => {
    const cast = castWillingLevitate();
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-levitate-unrelated-resistance",
    );
    const state = battleStateWithAllocatedEffectForTest({
      state: cast.state,
      ownerId: spellTargetId,
      effect: {
        kind: "damageResistance" as const,
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellTargetId,
        damageType: "cold" as const,
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });

    const broken = breakBattleConcentration(state, spellCasterId);
    const brokenTarget = requireCombatant(broken, spellTargetId);
    expect(brokenTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
        damageType: "cold",
      }),
    );
    expect(
      brokenTarget.activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });
});

function castWillingLevitate(
  input: {
    readonly initialRiseFeet?: number;
    readonly targetId?: CombatantId;
  } = {},
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const spell = spellRecord(levitateUnitId);
  const session = levitateSpellBattle(spell);
  const state = session.state;
  const act = spellAct({
    session,
    spellId: levitateUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const targetId = input.targetId ?? spellTargetId;
  const needsInitialRise = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  if (needsInitialRise.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole.");
  }
  const initialRiseHole = requireHole(
    needsInitialRise.holes,
    "controlledVerticalSuspensionInitialRise",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
      controlledVerticalSuspensionInitialRiseFill(
        initialRiseHole,
        input.initialRiseFeet ?? 20,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Levitate to resolve.");
  }
  return resolved;
}

function levitateSpellBattle(spell: ReturnType<typeof spellRecord>) {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
}

function requireLevitatedEffect(
  state: BattleState,
  targetId: CombatantId = spellTargetId,
) {
  const target = requireCombatant(state, targetId);
  const effect = target.activeEffects.find(
    (candidate) => candidate.kind === "controlledVerticalSuspension",
  );
  if (effect === undefined) {
    throw new Error("Expected Levitate active effect.");
  }
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  if (facts?.procedure !== "controlledVerticalSuspension") {
    throw new Error("Expected bound Levitate procedure facts.");
  }
  return {
    ...effect,
    maxAltitudeChangeFeet: facts.maxAltitudeChangeFeet,
    rangeFeet: facts.rangeFeet,
  };
}

function controlledVerticalSuspensionAltitudeChangeFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
  >,
  direction: "up" | "down",
  distanceFeet: number,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
  >["spatialFacts"],
): Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
> {
  return {
    kind: "controlledVerticalSuspensionAltitudeChange",
    holeId: hole.holeId,
    value: { direction, distanceFeet: movementFeet(distanceFeet) },
    spatialFacts,
  };
}

function controlledVerticalSuspensionInitialRiseFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "controlledVerticalSuspensionInitialRise" }
  >,
  distanceFeet: number,
): Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionInitialRise" }
> {
  return {
    kind: "controlledVerticalSuspensionInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(distanceFeet) },
  };
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const casterTurn = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return casterTurn.state;
}
