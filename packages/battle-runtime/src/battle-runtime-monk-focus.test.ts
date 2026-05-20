// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS monk_monks_focus
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.monk-focus-battle-options
import { describe, expect, test } from "vitest";
import {
  applyCondition,
  attackRollFill,
  battleId,
  characterSeed,
  discoverBattleActs,
  fighterId,
  goblinId,
  grappleOutcomeFill,
  monksFocusResource,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  shoveOutcomeFill,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testBattleCreatureStateWithConditions,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Monk's Focus battle options", () => {
  test("Patient Defense can take Disengage as a Bonus Action without spending Focus", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
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
    expect(monk.origin.resources[0]?.unit.id).toBe("monk_monks_focus");
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
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
    expect(monk.origin.resources[0]?.unit.id).toBe("monk_monks_focus");
    expect(monk.origin.resources[0]?.usesRemaining).toBe(1);
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
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
    expect(monk.activeEffects).toEqual([]);
  });

  test("Step of the Wind spends Focus for Disengage and Dash", () => {
    const state = monkFocusBattle({ usesRemaining: 2 });
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
    expect(monk.origin.resources[0]?.usesRemaining).toBe(1);
    expect(monk.activeEffects).toEqual([]);
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
    expect(monkAfterActivation.origin.resources[0]?.usesRemaining).toBe(1);
    expect(
      activated.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "monkFocusFlurryOfBlows",
      ),
    ).toHaveLength(2);

    const strikeSubject = monkFocusSubject(
      activated.state,
      (candidate) => candidate.tag === "monkFocusFlurryOfBlowsStrike",
    );
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

    const weaponAttackSubject = monkFocusSubject(
      activated.state,
      (candidate) =>
        candidate.tag === "action" &&
        candidate.action === "attack" &&
        candidate.attackName !== "Unarmed Strike",
    );
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
    expect(discoverBattleActs(flurryOnly).map((act) => act.subject)).toEqual(
      expect.arrayContaining([grappleSubject]),
    );

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
    expect(discoverBattleActs(flurryOnly).map((act) => act.subject)).toEqual(
      expect.arrayContaining([shoveSubject]),
    );

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
      expect(result.snapshot.turn.bonusActionAvailable).toBe(true);
      expect(monkFocusUsesRemaining(result.snapshot)).toBe(2);
      expect(flurryResourceCount(result.snapshot.turn.actionResources)).toBe(0);
    }
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
  readonly weaponAttackAvailable?: true;
}): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-monk-focus-${input.usesRemaining}`),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Monk",
        initiative: 20,
        classLevels: [{ className: "monk", level: 2 }],
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
  const act = discoverBattleActs(state).find((candidate) =>
    predicate(candidate.subject),
  );
  if (act === undefined) {
    throw new Error("Expected Monk Focus battle act.");
  }
  return act.subject;
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
    (resource) => resource.unitId === "monk_monks_focus",
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
