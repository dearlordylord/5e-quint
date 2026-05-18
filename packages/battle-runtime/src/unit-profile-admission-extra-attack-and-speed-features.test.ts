// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT37 fighter_extra_attack paladin_extra_attack ranger_extra_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT40 barbarian_fast_movement
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT44 ranger_roving
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-MONK-UNARMORED-MOVEMENT monk_unarmored_movement
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
import { describe, expect, test } from "vitest";
import {
  barbarianFastMovementUnitId,
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  monkUnarmoredMovementUnitId,
  paladinExtraAttackUnitId,
  rangerExtraAttackUnitId,
  rangerRovingUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  movementFill,
  requireHole,
  resolveWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  extraAttackBattle,
  extraAttackBattleUnitRef,
  fastMovementBattle,
  fastMovementSupportProfile,
  heavyArmorClassState,
  lightArmorClassState,
  monkUnarmoredMovementBattle,
  monkUnarmoredMovementSupportProfile,
  rovingBattle,
  rovingMovementHole,
  rovingSpeedBonusProfile,
  rovingSpeedKindGrants,
  rovingSupportProfile,
  shieldArmorClassState,
  shieldLoadout,
} from "./unit-profile-admission-feature-fixture-support.ts";
import {
  battlePassiveSpeedKindGrantsSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  difficultyClass,
  discoverBattleActs,
  Either,
  movementDeltaFeet,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  resolveBattleSubject,
  snapshotBattle,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleState,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT37 deterministic Extra Attack admission", () => {
  test.each([
    [fighterExtraAttackUnitId, "fighter", 5],
    [paladinExtraAttackUnitId, "paladin", 5],
    [rangerExtraAttackUnitId, "ranger", 5],
  ] as const)(
    "%s is admitted as Attack action attack-count scaling",
    (unitId, className, level) => {
      const unit = unitLibrary.requireUnit(unitId);
      const profile = parseSupportedUnitFeatureProfile(unit, [
        { className, level: classLevel(level) },
      ]);

      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Either.right({
          unitId,
          supportProfiles: [extraAttackSupportProfile],
        }),
      );
      expect(profile).toEqual(
        expect.objectContaining({
          kind: "attackActionAttackCountScaling",
          unit,
          additionalAttacks: 1,
        }),
      );
    },
  );

  test("one Attack action resolves two attack slots and spends the action once", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");

    expect(first).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            expect.objectContaining({
              source: "classFeatureExtraAttack",
              sourceUnitId: fighterExtraAttackUnitId,
            }),
          ],
        },
      },
    });
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const second = resolveWeaponAttack(first.state, "Longsword");
    expect(second).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
  });

  test("multiclass Extra Attack features do not stack into more than one added slot", () => {
    const state = extraAttackBattle([
      extraAttackBattleUnitRef(fighterExtraAttackUnitId),
      extraAttackBattleUnitRef(paladinExtraAttackUnitId),
    ]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            expect.objectContaining({
              source: "classFeatureExtraAttack",
            }),
          ],
        },
      },
    });
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const second = resolveWeaponAttack(first.state, "Longsword");
    expect(second).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (second.tag !== "resolved") {
      throw new Error("Expected second Extra Attack slot to resolve.");
    }
    expect(discoverBattleActs(second.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "attack",
          }),
        }),
      ]),
    );
  });

  test("Movement may occur between Extra Attack attack slots", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const moveAct = discoverBattleActs(first.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move" &&
        candidate.subject.actorId === spellCasterId,
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected Movement between Extra Attack slots.");
    }

    const moved = resolveBattleSubject({
      state: first.state,
      subject: moveAct.subject,
      fills: [
        movementFill(requireHole(moveAct.initialHoles, "movement"), {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Movement to resolve.");
    }

    expect(resolveWeaponAttack(moved.state, "Longsword")).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({ spentFeet: 5 }),
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("an Extra Attack slot does not pay the action cost to escape a grapple", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }
    const grappledState: BattleState = {
      ...first.state,
      grapples: [
        {
          grapplerId: spellTargetId,
          targetId: spellCasterId,
          escapeDc: difficultyClass(12),
          reachFeet: movementFeet(5),
          hand: "left",
          targetExemptFromDragCost: false,
        },
      ],
    };

    expect(discoverBattleActs(first.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );
    expect(discoverBattleActs(grappledState)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "escapeGrapple",
          }),
        }),
      ]),
    );
    expect(resolveWeaponAttack(grappledState, "Longsword")).toMatchObject({
      tag: "resolved",
    });
  });

  test("End Turn closes an unspent Extra Attack slot", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const ended = resolveBattleSubject({
      state: first.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(ended).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [{ source: "turn" }] } },
    });
  });

  test("adjacent scale_attack_count additional values stay unsupported", () => {
    const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
    expect(unit.kind).toBe("class_feature");
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected passive Fighter Extra Attack Unit.");
    }
    const adjacentUnit: UnitRecord = {
      ...unit,
      id: "test_extra_attack_additional_2",
      mechanics: {
        ...unit.mechanics,
        grants: [{ kind: "scale_attack_count", additional: 2 }],
      },
    };

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: adjacentUnit.id },
        unit: adjacentUnit,
      }),
    ).toEqual(
      Either.left({
        tag: "battleUnitSupportProfileIssue",
        message:
          "Unsupported battle Attack action attack-count scaling Unit hook: test_extra_attack_additional_2.",
      }),
    );
  });
});

describe("QMBT40 deterministic Fast Movement admission", () => {
  test("barbarian_fast_movement is admitted as a passive Speed bonus while not wearing Heavy armor", () => {
    const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(5) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: barbarianFastMovementUnitId,
        supportProfiles: [fastMovementSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedBonus",
        unit,
        speed: {
          deltaFeet: movementDeltaFeet(10),
          condition: {
            kind: "notWearingArmor",
            categories: ["heavy"],
          },
        },
      }),
    );
  });

  test("Fast Movement increases movement budget and Dash bonus while not wearing Heavy armor", () => {
    const state = fastMovementBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 40,
        }),
      }),
    );

    const dashed = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    });
    expect(dashed).toMatchObject({ tag: "resolved" });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Fast Movement Dash to resolve.");
    }
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(40);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 80,
        }),
      }),
    );
  });

  test("Fast Movement does not increase Speed while wearing Heavy armor", () => {
    const state = fastMovementBattle({ armorClass: heavyArmorClassState() });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
        }),
      }),
    );
  });

  test("Fast Movement support gate rejects adjacent passive Speed bonus shapes", () => {
    const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Fast Movement passive class feature.");
    }
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_speed") {
      throw new Error("Expected Fast Movement Speed modifier.");
    }
    const { condition: _condition, ...mechanicsWithoutCondition } =
      unit.mechanics;
    const adjacentSpeedUnits = [
      {
        ...unit,
        id: "test_fast_movement_wrong_delta",
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...effect, delta: 5 }],
        },
      },
      {
        ...unit,
        id: "test_fast_movement_multiple_grants",
        mechanics: {
          ...unit.mechanics,
          grants: [effect, effect],
        },
      },
      {
        ...unit,
        id: "test_fast_movement_missing_heavy_predicate",
        mechanics: mechanicsWithoutCondition,
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentSpeedUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive Speed bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(
        parseSupportedUnitFeatureProfile(adjacentUnit, [
          { className: "barbarian", level: classLevel(5) },
        ]),
      ).toBeNull();
    }
  });
});

describe("L12G-AUTHOR-MONK-UNARMORED-MOVEMENT deterministic admission", () => {
  test("monk_unarmored_movement is admitted as a passive Speed bonus while unarmored and unshielded", () => {
    const unit = unitLibrary.requireUnit(monkUnarmoredMovementUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "monk", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: monkUnarmoredMovementUnitId,
        supportProfiles: [monkUnarmoredMovementSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedBonus",
        unit,
        speed: {
          deltaFeet: movementDeltaFeet(10),
          condition: { kind: "unarmoredUnshielded" },
        },
      }),
    );
  });

  test("Unarmored Movement increases movement budget and Dash bonus while unarmored and unshielded", () => {
    const state = monkUnarmoredMovementBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 40,
        }),
      }),
    );

    const dashed = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    });
    expect(dashed).toMatchObject({ tag: "resolved" });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Unarmored Movement Dash to resolve.");
    }
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(40);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 80,
        }),
      }),
    );
  });

  test("Unarmored Movement does not increase Speed while wearing armor", () => {
    const state = monkUnarmoredMovementBattle({
      armorClass: lightArmorClassState(),
    });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
        }),
      }),
    );
  });

  test("Unarmored Movement does not increase Speed while wielding a Shield", () => {
    const state = monkUnarmoredMovementBattle({
      armorClass: shieldArmorClassState(),
      selectedLoadout: shieldLoadout(),
    });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
        }),
      }),
    );
  });

  test("Unarmored Movement support gate rejects adjacent passive Speed bonus shapes", () => {
    const unit = unitLibrary.requireUnit(monkUnarmoredMovementUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Unarmored Movement passive class feature.");
    }
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_speed") {
      throw new Error("Expected Unarmored Movement Speed modifier.");
    }
    const adjacentSpeedUnits = [
      {
        ...unit,
        id: "test_unarmored_movement_missing_shield_predicate",
        mechanics: {
          ...unit.mechanics,
          condition: {
            kind: "not_wearing_armor",
            categories: ["light", "medium", "heavy"],
          },
        },
      },
      {
        ...unit,
        id: "test_unarmored_movement_heavy_only_with_shield_predicate",
        mechanics: {
          ...unit.mechanics,
          condition: {
            kind: "all_of",
            predicates: [
              { kind: "not_wearing_armor", categories: ["heavy"] },
              { kind: "not_wielding_shield" },
            ],
          },
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentSpeedUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive Speed bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(
        parseSupportedUnitFeatureProfile(adjacentUnit, [
          { className: "monk", level: classLevel(2) },
        ]),
      ).toBeNull();
    }
  });
});

describe("QMBT44 deterministic Roving admission", () => {
  test("ranger_roving is admitted as passive Speed-kind grants", () => {
    const unit = unitLibrary.requireUnit(rangerRovingUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "ranger", level: classLevel(6) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: rangerRovingUnitId,
        supportProfiles: [rovingSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedKindGrants",
        unit,
        speedKindGrants: {
          speed: rovingSpeedBonusProfile(),
          grants: rovingSpeedKindGrants(),
        },
      }),
    );
  });

  test("Roving projects walk, Climb, and Swim Speeds equal to effective Speed", () => {
    const state = rovingBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 40,
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 40 },
            { kind: "climb", speedFeet: 40, remainingFeet: 40 },
            { kind: "swim", speedFeet: 40, remainingFeet: 40 },
          ],
        }),
      }),
    );
  });

  test("Roving special Speeds track unmodified Speed while wearing Heavy armor", () => {
    const state = rovingBattle({ armorClass: heavyArmorClassState() });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
          speedKinds: [
            { kind: "walk", speedFeet: 30, remainingFeet: 30 },
            { kind: "climb", speedFeet: 30, remainingFeet: 30 },
            { kind: "swim", speedFeet: 30, remainingFeet: 30 },
          ],
        }),
      }),
    );
  });

  test("Roving Movement can choose a represented Speed kind and subtracts distance already moved", () => {
    const state = rovingBattle();
    const firstMove = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "move",
      },
      fills: [
        movementFill(rovingMovementHole(state), {
          speedKind: "climb",
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(firstMove).toMatchObject({ tag: "resolved" });
    if (firstMove.tag !== "resolved") {
      throw new Error("Expected Roving climb Movement to resolve.");
    }
    expect(firstMove.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          spentFeet: 15,
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 25 },
            { kind: "climb", speedFeet: 40, remainingFeet: 25 },
            { kind: "swim", speedFeet: 40, remainingFeet: 25 },
          ],
        }),
      }),
    );

    const secondMove = resolveBattleSubject({
      state: firstMove.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "move",
      },
      fills: [
        movementFill(rovingMovementHole(firstMove.state), {
          speedKind: "swim",
          movementCostFeet: 25,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(secondMove).toMatchObject({ tag: "resolved" });
  });

  test("Roving Dash uses the effective Speed shared by represented Speed kinds", () => {
    const state = rovingBattle();
    const dashed = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "swim",
      },
      fills: [],
    });
    expect(dashed).toMatchObject({ tag: "resolved" });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Roving Dash to resolve.");
    }
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(40);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 80 },
            { kind: "climb", speedFeet: 40, remainingFeet: 80 },
            { kind: "swim", speedFeet: 40, remainingFeet: 80 },
          ],
        }),
      }),
    );
  });

  test("Roving support gate rejects adjacent passive Speed-kind grant shapes", () => {
    const unit = unitLibrary.requireUnit(rangerRovingUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "composite"
    ) {
      throw new Error("Expected Roving composite class feature.");
    }
    const [speedPart, specialSpeedPart] = unit.mechanics.parts;
    if (
      speedPart?.family !== "passive" ||
      specialSpeedPart?.family !== "passive"
    ) {
      throw new Error("Expected Roving passive component mechanics.");
    }
    const [speedEffect] = speedPart.grants;
    const [climbEffect, swimEffect] = specialSpeedPart.grants;
    if (
      speedEffect?.kind !== "modify_speed" ||
      climbEffect?.kind !== "grant_speed" ||
      swimEffect?.kind !== "grant_speed"
    ) {
      throw new Error("Expected Roving Speed mechanics.");
    }

    const adjacentUnits = [
      {
        ...unit,
        id: "test_roving_only_climb",
        mechanics: {
          ...unit.mechanics,
          parts: [speedPart, { ...specialSpeedPart, grants: [climbEffect] }],
        },
      },
      {
        ...unit,
        id: "test_roving_fixed_swim",
        mechanics: {
          ...unit.mechanics,
          parts: [
            speedPart,
            {
              ...specialSpeedPart,
              grants: [climbEffect, { ...swimEffect, feet: 40 }],
            },
          ],
        },
      },
      {
        ...unit,
        id: "test_roving_wrong_delta",
        mechanics: {
          ...unit.mechanics,
          parts: [
            {
              ...speedPart,
              grants: [{ ...speedEffect, delta: 5 }],
            },
            specialSpeedPart,
          ],
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentUnits) {
      expect(battlePassiveSpeedKindGrantsSupportForUnit(adjacentUnit)).toBe(
        "unsupported",
      );
    }
  });
});
