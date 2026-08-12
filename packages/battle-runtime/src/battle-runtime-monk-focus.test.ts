import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-03-MONK-HEIGHTENED-FOCUS-ATTACK-DEFENSE monk_heightened_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-04-MONK-STEP-OF-WIND-CARRY monk_heightened_focus
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.monk-focus-battle-options
import { describe, expect, test } from "vitest";
import { Either, Schema } from "effect";
import { resolveReplayContinuationFromState } from "./battle-execution-composition.ts";
import {
  actionSurgeResource,
  applyCondition,
  assertBattleSnapshotCodecRoundTripForTest,
  attackRollFill,
  battleActiveEffectExecutionRefForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  BattleSnapshotSchema,
  characterSeed,
  characterAttackSubjectForTest,
  damageRollFillWithGroups,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  fighterAttackSubject,
  fighterId,
  goblinId,
  grappleOutcomeFill,
  monksFocusResource,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  shoveOutcomeFill,
  snapshotBattle,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testBattleCreatureStateWithConditions,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: Monk's Focus battle options", () => {
  test("rejects an execution ref bound to a different Unit procedure family", () => {
    const state = startBattleRight({
      battleId: battleId("battle-monk-focus-wrong-procedure-family"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk Fighter",
          initiative: 20,
          classLevels: [
            { className: "monk", level: 2 },
            { className: "fighter", level: 2 },
          ],
          attack: null,
          resources: [
            monksFocusResource({ usesRemaining: 2 }),
            actionSurgeResource(),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "patientDefense" &&
        candidate.mode === "freeDisengage",
    );
    if (subject.tag !== "monkFocusOption" || !("procedureRef" in subject)) {
      throw new Error("Expected a Monk Focus option subject.");
    }
    const monk = state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    const unrelatedProcedureRef = monk.origin.execution.procedureBindings.find(
      (binding) => binding.procedureRef !== subject.procedureRef,
    )?.procedureRef;
    if (unrelatedProcedureRef === undefined) {
      throw new Error("Expected a distinct Unit feature procedure binding.");
    }

    const mismatchedSubject = {
      ...subject,
      procedureRef: unrelatedProcedureRef,
    };
    expect(
      resolveBattleSubject({ state, subject: mismatchedSubject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveReplayContinuationFromState(
        state,
        { kind: "replay", subject: mismatchedSubject, fills: [] },
        "attackHit",
        [],
      ),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Patient Defense can take Disengage as a Bonus Action without spending Focus", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(state));
    const subject = monkFocusSubject(
      state,
      (subject) =>
        subject.tag === "monkFocusOption" &&
        subject.option === "patientDefense" &&
        subject.mode === "freeDisengage",
    );

    const resolved = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.disengaged).toBe(true);
    expect(monk.dodging).toBe(false);
    expect(
      monkFocusResourceForSubject(resolved.state, subject).usesRemaining,
    ).toBe(2);

    expect(
      resolveBattleSubject({ state: resolved.state, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Monk Focus Bonus Action is no longer available.",
    });
  });

  test("Patient Defense spends a shared Focus Point for Disengage and Dodge", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subject = monkFocusSubject(
      state,
      (subject) =>
        subject.tag === "monkFocusOption" &&
        subject.option === "patientDefense" &&
        subject.mode === "focusDisengageDodge",
    );

    const resolved = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.disengaged).toBe(true);
    expect(monk.dodging).toBe(true);
    expect(
      monkFocusResourceForSubject(resolved.state, subject).usesRemaining,
    ).toBe(1);
  });

  test("Heightened Focus Patient Defense rolls two Martial Arts dice for Temporary Hit Points", () => {
    const state = monkFocusBattle({ usesRemaining: 10, classLevel: 10 });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "patientDefense" &&
        candidate.mode === "focusDisengageDodge",
    );
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [damageRollFillWithGroups(roll, [[3, 4]])],
      }),
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.disengaged).toBe(true);
    expect(monk.dodging).toBe(true);
    expect(Number(monk.tempHp)).toBe(7);
    expect(
      monkFocusResourceForSubject(resolved.state, subject).usesRemaining,
    ).toBe(9);
  });

  test("Heightened Focus Patient Defense keeps higher existing Temporary Hit Points", () => {
    const state = monkFocusBattle({
      usesRemaining: 10,
      classLevel: 10,
      tempHp: 9,
    });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "patientDefense" &&
        candidate.mode === "focusDisengageDodge",
    );
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [damageRollFillWithGroups(roll, [[1, 2]])],
      }),
    );

    expect(Number(resolved.state.combatants.get(fighterId)?.tempHp)).toBe(9);
  });

  test("Step of the Wind can take Dash as a Bonus Action without spending Focus", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subject = monkFocusSubject(
      state,
      (subject) =>
        subject.tag === "monkFocusOption" &&
        subject.option === "stepOfTheWind" &&
        subject.mode === "freeDash" &&
        subject.speedKind === "walk",
    );

    const resolved = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.disengaged).toBe(false);
    expect(resolved.state.currentTurnResources.dashMovementBonusFeet).toBe(
      movementFeet(30),
    );
    expect(
      monkFocusResourceForSubject(resolved.state, subject).usesRemaining,
    ).toBe(2);
    expect(monk.activeEffects).toEqual([]);
  });

  test("Step of the Wind rejects a stored Dash subject after its granted Speed disappears", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const monk = state.combatants.get(fighterId);
    if (monk === undefined) {
      throw new Error("Expected Monk combatant.");
    }
    const speedGrantProcedureRef = battleProcedureExecutionRefForTest(
      "monk-temporary-fly-speed",
    );
    const activeEffects = [
      ...monk.activeEffects,
      {
        kind: "specialSpeedGrant",
        sourceProcedureRef: speedGrantProcedureRef,
        sourceCombatantId: fighterId,
        speedKind: "fly",
        speed: { kind: "fixed", speedFeet: movementFeet(40) },
        hover: true,
        expiresAt: { kind: "untilDispelled" },
      },
    ] as const;
    const withFlySpeed: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...monk,
        activeEffects,
      }),
    };
    const subject = monkFocusSubject(
      withFlySpeed,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "freeDash" &&
        candidate.speedKind === "fly",
    );
    const focusSubject = monkFocusSubject(
      withFlySpeed,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "fly",
    );
    const withoutFlySpeed: BattleState = {
      ...withFlySpeed,
      combatants: new Map(withFlySpeed.combatants).set(fighterId, {
        ...monk,
        activeEffects: activeEffects.filter(
          (effect) =>
            effect.kind !== "specialSpeedGrant" ||
            effect.sourceProcedureRef !== speedGrantProcedureRef,
        ),
      }),
    };

    expect(
      resolveBattleSubject({
        state: withoutFlySpeed,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Step of the Wind speed kind is not represented for this combatant.",
    });
    expect(
      resolveBattleSubject({
        state: withoutFlySpeed,
        subject: focusSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Step of the Wind speed kind is not represented for this combatant.",
    });
  });

  test("Step of the Wind spends Focus for Disengage and Dash", () => {
    const state = monkFocusBattle({ usesRemaining: 1 });
    const subject = monkFocusSubject(
      state,
      (subject) =>
        subject.tag === "monkFocusOption" &&
        subject.option === "stepOfTheWind" &&
        subject.mode === "focusDisengageDash" &&
        subject.speedKind === "walk",
    );

    const resolved = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.state.currentTurnResources.disengaged).toBe(true);
    expect(resolved.state.currentTurnResources.dashMovementBonusFeet).toBe(
      movementFeet(30),
    );
    expect(resolved.snapshot.turn.jumpDistanceMultiplier).toEqual({
      multiplier: 2,
    });
    expect(
      monkFocusResourceForSubject(resolved.state, subject).usesRemaining,
    ).toBe(0);
    expect(monk.activeEffects).toEqual([]);

    const targetTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: fighterId }),
    );
    const nextMonkTurn = requireResolved(
      endTurn({ state: targetTurn.state, actorId: goblinId }),
    );
    expect(
      resolveBattleSubject({
        state: nextMonkTurn.state,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Step of the Wind requires an unspent Focus Point for Disengage.",
    });
  });

  test("Heightened Focus Step of the Wind carries a willing nearby creature for the turn", () => {
    const state = monkFocusBattle({ usesRemaining: 10, classLevel: 10 });
    const act = discoverBattleActCandidates(state).find(
      (candidate) =>
        candidate.subject.tag === "monkFocusOption" &&
        candidate.subject.option === "stepOfTheWind" &&
        candidate.subject.mode === "focusDisengageDash" &&
        candidate.subject.speedKind === "walk",
    );
    if (act === undefined) {
      throw new Error("Expected Heightened Focus Step of the Wind act.");
    }
    const carryHole = act.initialHoles.find(
      (hole) =>
        hole.kind === "targetChoice" &&
        "label" in hole &&
        hole.label.includes("carried creature"),
    );
    if (carryHole === undefined) {
      throw new Error("Expected carried creature target choice.");
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetFill(carryHole, goblinId, [
            {
              kind: "heightenedStepOfTheWindCarryEligible",
              carrierId: fighterId,
              carriedCreatureId: goblinId,
            },
          ]),
        ],
      }),
    );

    expect(
      resolved.snapshot.turn.heightenedStepOfTheWindCarriedCreatures,
    ).toEqual([
      {
        carrierId: fighterId,
        carriedCreatureId: goblinId,
        sourceProcedureRef: expect.any(String),
        movementDoesNotProvokeOpportunityAttacks: true,
        expires: "endOfCarrierTurn",
      },
    ]);
    expect(resolved.snapshot.turn.jumpDistanceMultiplier).toEqual({
      multiplier: 2,
    });
    expect(resolved.snapshot.turn.disengaged).toBe(true);
    expect(monkFocusUsesRemaining(resolved.snapshot)).toBe(9);

    const nextTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: fighterId }),
    );
    expect(
      nextTurn.snapshot.turn.heightenedStepOfTheWindCarriedCreatures,
    ).toEqual([]);
  });

  test("Heightened Focus Step of the Wind rejects carry without eligibility facts", () => {
    const state = monkFocusBattle({ usesRemaining: 10, classLevel: 10 });
    const act = discoverBattleActCandidates(state).find(
      (candidate) =>
        candidate.subject.tag === "monkFocusOption" &&
        candidate.subject.option === "stepOfTheWind" &&
        candidate.subject.mode === "focusDisengageDash" &&
        candidate.subject.speedKind === "walk",
    );
    if (act === undefined) {
      throw new Error("Expected Heightened Focus Step of the Wind act.");
    }
    const carryHole = act.initialHoles.find(
      (hole) =>
        hole.kind === "targetChoice" &&
        "label" in hole &&
        hole.label.includes("carried creature"),
    );
    if (carryHole === undefined) {
      throw new Error("Expected carried creature target choice.");
    }

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill(carryHole, goblinId, [])],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(monkFocusUsesRemaining(result.snapshot)).toBe(10);
  });

  test("Step of the Wind Focus jump distance multiplier resets at turn handoff", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "walk",
    );

    const stepped = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const nextTurn = requireResolved(
      endTurn({ state: stepped.state, actorId: fighterId }),
    );

    expect(nextTurn.state.currentTurnResources.jumpDistanceMultiplier).toBe(
      null,
    );
    expect(nextTurn.snapshot.turn.jumpDistanceMultiplier).toBe(null);
  });

  test("Step of the Wind Focus doubles caller-witnessed Jump spell distance for the turn", () => {
    const state = withJumpMovementReplacementEffect(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "walk",
    );
    const stepped = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const jumpAct = monkFocusSubject(
      stepped.state,
      (candidate) =>
        candidate.tag === "runtimeCommand" &&
        candidate.command === "jumpMovementReplacement",
    );
    const movement = requireHole(
      resolveBattleSubject({
        state: stepped.state,
        subject: jumpAct,
        fills: [],
      }),
      "movement",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state: stepped.state,
        subject: jumpAct,
        fills: [jumpMovementReplacementFill(movement, 60)],
      }),
    );

    expect(
      resolved.state.combatants
        .get(fighterId)
        ?.activeEffects.find(
          (effect) => effect.kind === "jumpMovementReplacement",
        )?.usedThisTurn,
    ).toBe(true);
  });

  test("Step of the Wind Focus projects doubled Jump spell distance in act discovery", () => {
    const session = monkFocusBattleSession({ usesRemaining: 2 });
    const state = withJumpMovementReplacementEffect(session.state);
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "walk",
    );
    const stepped = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );

    const jumpAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...session,
        state: stepped.state,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "jumpMovementReplacement",
    );

    expect(jumpAct?.summary).toContain("up to 60 feet");
  });

  test("Step of the Wind Focus rejects jump-route witnesses past the doubled distance", () => {
    const state = withJumpMovementReplacementEffect(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "walk",
    );
    const stepped = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const jumpAct = monkFocusSubject(
      stepped.state,
      (candidate) =>
        candidate.tag === "runtimeCommand" &&
        candidate.command === "jumpMovementReplacement",
    );
    const movement = requireHole(
      resolveBattleSubject({
        state: stepped.state,
        subject: jumpAct,
        fills: [],
      }),
      "movement",
    );

    const result = resolveBattleSubject({
      state: stepped.state,
      subject: jumpAct,
      fills: [jumpMovementReplacementFill(movement, 61)],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("Flurry of Blows spends one shared Focus Point and executes granted Unarmed Strikes", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "flurryOfBlows",
    );
    const activated = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const monkAfterActivation = activated.state.combatants.get(fighterId);
    if (monkAfterActivation?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(
      monkFocusResourceForSubject(activated.state, subject).usesRemaining,
    ).toBe(1);
    expect(
      activated.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "monkFocusFlurryOfBlows",
      ),
    ).toHaveLength(2);

    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(activated.state),
    );
    const forgedFocusOwner = {
      ...encoded,
      acts: encoded.acts.map((act) =>
        act.subject.tag === "monkFocusFlurryOfBlowsStrike"
          ? {
              ...act,
              subject: {
                ...act.subject,
                focusProcedureRef: act.subject.procedureRef,
              },
            }
          : act,
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(forgedFocusOwner),
      ),
    ).toBe(true);
    const target = requireHole(
      resolveBattleSubject({
        state: activated.state,
        subject: strikeSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated.state,
        subject: strikeSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const resolvedStrike = requireResolved(
      resolveBattleSubject({
        state: activated.state,
        subject: strikeSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        ],
      }),
    );

    expect(
      resolvedStrike.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "monkFocusFlurryOfBlows",
      ),
    ).toHaveLength(1);
  });

  test("Heightened Focus Flurry of Blows grants three Unarmed Strike resources", () => {
    const state = monkFocusBattle({ usesRemaining: 10, classLevel: 10 });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "flurryOfBlows",
    );

    const activated = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );

    expect(
      activated.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "monkFocusFlurryOfBlows",
      ),
    ).toHaveLength(3);
    expect(monkFocusUsesRemaining(activated.snapshot)).toBe(9);
  });

  test("Flurry of Blows resources do not pay for a generic weapon Attack", () => {
    const state = monkFocusBattle({
      usesRemaining: 2,
      weaponAttackAvailable: true,
    });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "flurryOfBlows",
    );
    const activated = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );

    const weaponAttackSubject = fighterAttackSubject(activated.state);
    const target = requireHole(
      resolveBattleSubject({
        state: activated.state,
        subject: weaponAttackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated.state,
        subject: weaponAttackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const resolvedWeaponAttack = requireResolved(
      resolveBattleSubject({
        state: activated.state,
        subject: weaponAttackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );

    expect(
      resolvedWeaponAttack.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "monkFocusFlurryOfBlows",
      ),
    ).toHaveLength(2);
    expect(
      resolvedWeaponAttack.state.currentTurnResources.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
  });

  test("Flurry of Blows resources can pay for Grapple Unarmed Strike effects", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const flurryOnly = stateWithoutTurnActionResource(activated.state);
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    expect(
      discoverBattleActCandidates(flurryOnly).map((act) => act.subject),
    ).toEqual(expect.arrayContaining([grappleSubject]));

    const target = requireHole(
      resolveBattleSubject({
        state: flurryOnly,
        subject: grappleSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state: flurryOnly,
        subject: grappleSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state: flurryOnly,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );

    expect(flurryResourceCount(grappled.snapshot.turn.actionResources)).toBe(1);
    expect(
      grappled.snapshot.turn.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(grappled.state.grapples).toEqual([
      expect.objectContaining({ grapplerId: fighterId, targetId: goblinId }),
    ]);
  });

  test("Flurry of Blows resources can pay for Shove Unarmed Strike effects", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const flurryOnly = stateWithoutTurnActionResource(activated.state);
    const shoveSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "shove",
    };
    expect(
      discoverBattleActCandidates(flurryOnly).map((act) => act.subject),
    ).toEqual(expect.arrayContaining([shoveSubject]));

    const target = requireHole(
      resolveBattleSubject({
        state: flurryOnly,
        subject: shoveSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state: flurryOnly,
        subject: shoveSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "shoveOutcome",
    );
    const shoved = requireResolved(
      resolveBattleSubject({
        state: flurryOnly,
        subject: shoveSubject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(outcome, {
            succeeded: false,
            failedEffect: { kind: "prone" },
          }),
        ],
      }),
    );

    expect(flurryResourceCount(shoved.snapshot.turn.actionResources)).toBe(1);
    expect(
      shoved.snapshot.turn.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(shoved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["prone"]),
        }),
      ]),
    );
  });

  test("incapacitated actors cannot resolve stale Monk Focus option subjects", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subjects = [
      monkFocusSubject(
        state,
        (candidate) =>
          candidate.tag === "monkFocusOption" &&
          candidate.option === "patientDefense" &&
          candidate.mode === "focusDisengageDodge",
      ),
      monkFocusSubject(
        state,
        (candidate) =>
          candidate.tag === "monkFocusOption" &&
          candidate.option === "stepOfTheWind" &&
          candidate.mode === "focusDisengageDash" &&
          candidate.speedKind === "walk",
      ),
      monkFocusSubject(
        state,
        (candidate) =>
          candidate.tag === "monkFocusOption" &&
          candidate.option === "flurryOfBlows",
      ),
    ];
    const incapacitated = stateWithIncapacitatedMonk(state);

    for (const subject of subjects) {
      const result = resolveBattleSubject({
        state: incapacitated,
        subject,
        fills: [],
      });
      expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
      expect(result.snapshot.turn.bonusActionAvailable).toBe(false);
      expect(monkFocusUsesRemaining(result.snapshot)).toBe(2);
      expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(0);
    }
  });

  test("stored Focus options become stale after another option spends the last Focus Point", () => {
    const state = monkFocusBattle({ usesRemaining: 1 });
    const flurry = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "flurryOfBlows",
    );
    const patientDefense = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "patientDefense" &&
        candidate.mode === "focusDisengageDodge",
    );
    const step = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "stepOfTheWind" &&
        candidate.mode === "focusDisengageDash" &&
        candidate.speedKind === "walk",
    );
    const stepped = requireResolved(
      resolveBattleSubject({ state, subject: step, fills: [] }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: stepped.state, actorId: fighterId }),
    );
    const nextMonkTurn = requireResolved(
      endTurn({ state: goblinTurn.state, actorId: goblinId }),
    );

    expect(
      resolveBattleSubject({
        state: nextMonkTurn.state,
        subject: flurry,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Flurry of Blows requires an unspent Focus Point.",
    });
    expect(
      resolveBattleSubject({
        state: nextMonkTurn.state,
        subject: patientDefense,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Patient Defense requires an unspent Focus Point for Dodge.",
    });
    expect(monkFocusUsesRemaining(nextMonkTurn.snapshot)).toBe(0);
  });

  test("stale Flurry activation fails without spending Focus or Bonus Action when targets disappear", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const subject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "flurryOfBlows",
    );
    const stale = stateWithoutGoblin(state);

    const result = resolveBattleSubject({ state: stale, subject, fills: [] });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot.turn.bonusActionAvailable).toBe(true);
    expect(monkFocusUsesRemaining(result.snapshot)).toBe(2);
    expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(0);
  });

  test("incapacitated actors cannot continue stale Flurry strike subjects", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
    const stale = stateWithIncapacitatedMonk(activated.state);

    const result = resolveBattleSubject({
      state: stale,
      subject: strikeSubject,
      fills: [],
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(monkFocusUsesRemaining(result.snapshot)).toBe(1);
    expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(2);
  });

  test("incapacitated actors cannot spend stale Flurry resources on Grapple or Shove subjects", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const stale = stateWithIncapacitatedMonk(
      stateWithoutTurnActionResource(activated.state),
    );
    const subjects: ReadonlyArray<BattleSubject> = [
      { tag: "action", actorId: fighterId, action: "grapple" },
      { tag: "action", actorId: fighterId, action: "shove" },
    ];

    for (const subject of subjects) {
      const result = resolveBattleSubject({ state: stale, subject, fills: [] });
      expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
      expect(result.snapshot.turn.bonusActionAvailable).toBe(false);
      expect(monkFocusUsesRemaining(result.snapshot)).toBe(1);
      expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(2);
      expect(
        result.snapshot.turn.actionResources.some(
          (resource) => resource.source === "turn",
        ),
      ).toBe(false);
    }
  });

  test("stale Flurry strike subjects fail before opening holes when their strike resource is gone", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
    const stale = stateWithoutFlurryResources(activated.state);

    const result = resolveBattleSubject({
      state: stale,
      subject: strikeSubject,
      fills: [],
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(monkFocusUsesRemaining(result.snapshot)).toBe(1);
    expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(0);
  });

  test("stale Flurry strike subjects fail when their last target disappears", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({ usesRemaining: 2 }),
    );
    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );

    expect(
      resolveBattleSubject({
        state: stateWithoutGoblin(activated.state),
        subject: strikeSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Flurry of Blows requires an available Unarmed Strike target.",
    });
  });

  test("rejects a Flurry strike subject bound to a different attack", () => {
    const activated = activateFlurryOfBlows(
      monkFocusBattle({
        usesRemaining: 2,
        weaponAttackAvailable: true,
      }),
    );
    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
    if (strikeSubject.tag !== "monkFocusFlurryOfBlowsStrike") {
      throw new Error("Expected Flurry of Blows strike subject.");
    }
    const weaponAttackSubject = characterAttackSubjectForTest(
      activated.state,
      fighterId,
      "Longsword",
    );

    expect(
      resolveBattleSubject({
        state: activated.state,
        subject: {
          ...strikeSubject,
          procedureRef: weaponAttackSubject.procedureRef,
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message: "Flurry of Blows requires the actor's Unarmed Strike.",
    });
  });

  test("Command Halt suppresses stale Monk Focus option and Flurry strike subjects", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
    const optionSubject = monkFocusSubject(
      state,
      (candidate) =>
        candidate.tag === "monkFocusOption" &&
        candidate.option === "patientDefense" &&
        candidate.mode === "freeDisengage",
    );
    const optionResult = resolveBattleSubject({
      state: stateWithCommandHalt(state),
      subject: optionSubject,
      fills: [],
    });
    expect(optionResult).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const activated = activateFlurryOfBlows(state);
    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
    const strikeResult = resolveBattleSubject({
      state: stateWithCommandHalt(activated.state),
      subject: strikeSubject,
      fills: [],
    });
    expect(strikeResult).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(
      flurryResourceCount(strikeResult.snapshot.turn.actionResources),
    ).toBe(2);
  });
});

function monkFocusBattle(input: {
  readonly usesRemaining: number;
  readonly classLevel?: number;
  readonly tempHp?: number;
  readonly weaponAttackAvailable?: true;
}): BattleState {
  return monkFocusBattleSession(input).state;
}

function monkFocusBattleSession(input: {
  readonly usesRemaining: number;
  readonly classLevel?: number;
  readonly tempHp?: number;
  readonly weaponAttackAvailable?: true;
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId(`battle-monk-focus-${input.usesRemaining}`),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Monk",
        initiative: 20,
        classLevels: [{ className: "monk", level: input.classLevel ?? 2 }],
        ...(input.tempHp === undefined ? {} : { tempHp: input.tempHp }),
        ...(input.weaponAttackAvailable === true ? {} : { attack: null }),
        resources: [monksFocusResource(input)],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function monkFocusSubject(
  state: BattleState,
  predicate: (subject: BattleSubject) => boolean,
): BattleSubject {
  const act = discoverBattleActCandidates(state).find((candidate) =>
    predicate(candidate.subject),
  );
  if (act === undefined) {
    throw new Error("Expected Monk Focus battle act.");
  }
  return act.subject;
}

function monkFocusResourceForSubject(
  state: BattleState,
  subject: BattleSubject,
) {
  if (subject.tag !== "monkFocusOption") {
    throw new Error("Expected a Monk Focus option subject.");
  }
  const monk = state.combatants.get(subject.actorId);
  if (monk?.origin.kind !== "character") {
    throw new Error("Expected character Monk.");
  }
  const binding = monk.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === subject.procedureRef,
  );
  const procedure = binding?.procedure;
  if (procedure?.kind !== "unitSupportProfile") {
    throw new Error("Expected a resource-backed Monk Focus procedure.");
  }
  if (
    typeof procedure.execution !== "object" ||
    procedure.execution.kind !== "monkFocusBattleOptions"
  ) {
    throw new Error("Expected a resource-backed Monk Focus procedure.");
  }
  if (
    typeof procedure.source !== "object" ||
    procedure.source.kind !== "resourcePool"
  ) {
    throw new Error("Expected a resource-backed Monk Focus procedure.");
  }
  const resourcePoolRef = procedure.source.resourcePoolRef;
  const resource = monk.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || resource.resource.kind !== "use_count") {
    throw new Error("Expected the Monk Focus use-count resource.");
  }
  return resource;
}

function withJumpMovementReplacementEffect(state: BattleState): BattleState {
  const monk = state.combatants.get(fighterId);
  if (monk === undefined) {
    throw new Error("Expected Monk combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...monk,
      activeEffects: [
        ...monk.activeEffects,
        {
          kind: "jumpMovementReplacement",
          effectRef: battleActiveEffectExecutionRefForTest("monk-jump"),
          sourceCombatantId: fighterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("jump"),
          ),
          movementCostFeet: movementFeet(10),
          maxJumpDistanceFeet: movementFeet(30),
          usedThisTurn: false,
          expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
        },
      ],
    }),
  };
}

function jumpMovementReplacementFill(
  hole: BattleHole,
  distanceFeet: number,
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [],
      jumpMovementReplacement: {
        kind: "jumpMovementReplacement",
        distanceFeet: movementFeet(distanceFeet),
        landing: {
          kind: "legalLanding",
          difficultTerrainAcrobatics: "notRequired",
        },
      },
    },
  };
}

function activateFlurryOfBlows(state: BattleState) {
  const subject = monkFocusSubject(
    state,
    (candidate) =>
      candidate.tag === "monkFocusOption" &&
      candidate.option === "flurryOfBlows",
  );
  return requireResolved(resolveBattleSubject({ state, subject, fills: [] }));
}

function stateWithIncapacitatedMonk(state: BattleState): BattleState {
  const monk = state.combatants.get(fighterId);
  if (monk === undefined) {
    throw new Error("Expected Monk combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      fighterId,
      testBattleCreatureStateWithConditions(
        monk,
        applyCondition(monk.conditions, "incapacitated"),
      ),
    ),
  };
}

function stateWithoutGoblin(state: BattleState): BattleState {
  const combatants = new Map(state.combatants);
  combatants.delete(goblinId);
  return { ...state, combatants };
}

function stateWithoutFlurryResources(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource.source !== "monkFocusFlurryOfBlows",
      ),
    },
  };
}

function stateWithoutTurnActionResource(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource.source !== "turn",
      ),
    },
  };
}

function stateWithCommandHalt(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      commandHalt: { kind: "commandHalt" },
    },
  };
}

function monkFocusUsesRemaining(
  snapshot: ReturnType<typeof resolveBattleSubject>["snapshot"],
): number | undefined {
  const monk = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (monk?.origin.kind !== "character") return undefined;
  const resource = monk.origin.resources.find(
    (resource) => resource.usage === "limited",
  );
  return resource?.usage === "limited" ? resource.usesRemaining : undefined;
}

function flurryResourceCount(
  resources: ReturnType<
    typeof resolveBattleSubject
  >["snapshot"]["turn"]["actionResources"],
): number {
  return resources.filter(
    (resource) => resource.source === "monkFocusFlurryOfBlows",
  ).length;
}
