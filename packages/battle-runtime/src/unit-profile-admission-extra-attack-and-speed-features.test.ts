// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT37 fighter_extra_attack paladin_extra_attack ranger_extra_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A01-BARBARIAN-EXTRA-ATTACK barbarian_extra_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A06-MONK-EXTRA-ATTACK monk_extra_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT40 barbarian_fast_movement
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT44 ranger_roving
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-MONK-UNARMORED-MOVEMENT monk_unarmored_movement
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection CRPI-READY-028 rogue_second_story_work
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
import { describe, expect, test } from "vitest";
import {
  barbarianExtraAttackUnitId,
  barbarianFastMovementUnitId,
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  monkExtraAttackUnitId,
  monkUnarmoredMovementUnitId,
  paladinExtraAttackUnitId,
  rangerExtraAttackUnitId,
  rangerRovingUnitId,
  rogueSecondStoryWorkUnitId,
  partySide,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  attackRollFill,
  attackTargetFill,
  movementFill,
  requireHole,
  requireResultHole,
  resolveWeaponAttack,
  weaponAttackSubject,
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
  battleId,
  classLevel,
  combatantId,
  difficultyClass,
  discoverBattleActs,
  Either,
  movementDeltaFeet,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleState,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";
import type { ClassFeatureExtraAttackActionResource } from "./battle-reducer/battle-runtime-protocol.ts";

const syntheticExtraAttackCounts = [1, 2, 3] as const;
type SyntheticExtraAttackCount = (typeof syntheticExtraAttackCounts)[number];
const secondStoryWorkActorId = combatantId("second-story-work-rogue");

describe("QMBT37 deterministic Extra Attack admission", () => {
  test.each([
    [barbarianExtraAttackUnitId, "barbarian", 5],
    [fighterExtraAttackUnitId, "fighter", 5],
    [monkExtraAttackUnitId, "monk", 5],
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

  test.each(syntheticExtraAttackCounts)(
    "one Attack action preserves %i additional attack slot(s)",
    (additionalAttacks) => {
      const state = extraAttackBattle([
        syntheticExtraAttackBattleUnitRef(additionalAttacks),
      ]);
      const first = resolveWeaponAttackMiss(state);
      expect(first).toMatchObject({ tag: "resolved" });
      if (first.tag !== "resolved") {
        throw new Error("Expected Attack action to resolve.");
      }
      expect(classFeatureExtraAttackSlotCount(first.state)).toBe(
        additionalAttacks,
      );

      let currentState = first.state;
      for (
        let expectedRemaining = additionalAttacks - 1;
        expectedRemaining >= 0;
        expectedRemaining -= 1
      ) {
        const result = resolveWeaponAttackMiss(currentState);
        expect(result).toMatchObject({ tag: "resolved" });
        if (result.tag !== "resolved") {
          throw new Error("Expected Extra Attack slot to resolve.");
        }
        expect(classFeatureExtraAttackSlotCount(result.state)).toBe(
          expectedRemaining,
        );
        currentState = result.state;
      }
      expect(discoverBattleActs(currentState)).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: expect.objectContaining({
              tag: "action",
              action: "attack",
            }),
          }),
        ]),
      );
    },
  );

  test.each(syntheticExtraAttackCounts)(
    "End Turn closes %i unspent additional attack slot(s)",
    (additionalAttacks) => {
      const state = extraAttackBattle([
        syntheticExtraAttackBattleUnitRef(additionalAttacks),
      ]);
      const first = resolveWeaponAttack(state, "Longsword");
      expect(first).toMatchObject({ tag: "resolved" });
      if (first.tag !== "resolved") {
        throw new Error("Expected Attack action to resolve.");
      }
      expect(classFeatureExtraAttackSlotCount(first.state)).toBe(
        additionalAttacks,
      );

      const ended = resolveBattleSubject({
        state: first.state,
        subject: {
          tag: "runtimeCommand",
          actorId: spellCasterId,
          command: "endTurn",
        },
        fills: [],
      });
      expect(ended).toMatchObject({ tag: "resolved" });
      if (ended.tag !== "resolved") {
        throw new Error("Expected End Turn to resolve.");
      }
      expect(classFeatureExtraAttackSlotCount(ended.state)).toBe(0);
    },
  );

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

  test.each([
    ["lower-count ref first", [1, 3]],
    ["higher-count ref first", [3, 1]],
  ] as const)(
    "mixed Extra Attack counts use the strongest profile with %s",
    (_label, additionalAttackCounts) => {
      const state = extraAttackBattle(
        additionalAttackCounts.map((additionalAttacks) =>
          syntheticExtraAttackBattleUnitRef(additionalAttacks),
        ),
      );
      const first = resolveWeaponAttackMiss(state);
      expect(first).toMatchObject({ tag: "resolved" });
      if (first.tag !== "resolved") {
        throw new Error("Expected Attack action to resolve.");
      }

      expect(classFeatureExtraAttackSlotCount(first.state)).toBe(3);
      expect(classFeatureExtraAttackSourceUnitIds(first.state)).toEqual([
        "test_synthetic_attack_count_3",
        "test_synthetic_attack_count_3",
        "test_synthetic_attack_count_3",
      ]);
    },
  );

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

  test("scale_attack_count values above the modeled SRD count stay unsupported", () => {
    const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
    expect(unit.kind).toBe("class_feature");
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected passive Fighter Extra Attack Unit.");
    }
    const adjacentUnit: UnitRecord = {
      ...unit,
      id: "test_extra_attack_additional_4",
      mechanics: {
        ...unit.mechanics,
        grants: [{ kind: "scale_attack_count", additional: 4 }],
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
          "Unsupported battle Attack action attack-count scaling Unit hook: test_extra_attack_additional_4.",
      }),
    );
  });
});

function syntheticExtraAttackBattleUnitRef(
  additionalAttacks: SyntheticExtraAttackCount,
): Parameters<typeof extraAttackBattle>[0][number] {
  const unit = syntheticExtraAttackUnit(additionalAttacks);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: unit.id,
      supportProfiles: [{ ...extraAttackSupportProfile, additionalAttacks }],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function syntheticExtraAttackUnit(
  additionalAttacks: SyntheticExtraAttackCount,
): UnitRecord {
  const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
  expect(unit.kind).toBe("class_feature");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    throw new Error("Expected passive Fighter Extra Attack Unit.");
  }
  return {
    ...unit,
    id: `test_synthetic_attack_count_${additionalAttacks}`,
    name: `Synthetic Attack Count ${additionalAttacks}`,
    description: `Synthetic fixture for ${additionalAttacks} additional Attack action attack(s).`,
    provenance: {
      kind: "srd-5.2.1",
      section: fighterExtraAttackProvenanceSection(additionalAttacks),
    },
    mechanics: {
      ...unit.mechanics,
      grants: [{ kind: "scale_attack_count", additional: additionalAttacks }],
    },
  };
}

function fighterExtraAttackProvenanceSection(
  additionalAttacks: SyntheticExtraAttackCount,
): string {
  if (additionalAttacks === 1) return "Classes/Fighter#Extra Attack";
  if (additionalAttacks === 2) return "Classes/Fighter#Two Extra Attacks";
  return "Classes/Fighter#Three Extra Attacks";
}

function classFeatureExtraAttackSlotCount(state: BattleState): number {
  return snapshotBattle(state).turn.actionResources.filter(
    (resource) =>
      resource.source === "classFeatureExtraAttack" &&
      resource.sourceOwnerId === spellCasterId,
  ).length;
}

function classFeatureExtraAttackSourceUnitIds(
  state: BattleState,
): readonly string[] {
  return snapshotBattle(state)
    .turn.actionResources.filter(isSpellCasterClassFeatureExtraAttackResource)
    .map((resource) => resource.sourceUnitId);
}

function isSpellCasterClassFeatureExtraAttackResource(
  resource: ReturnType<
    typeof snapshotBattle
  >["turn"]["actionResources"][number],
): resource is ClassFeatureExtraAttackActionResource {
  return (
    resource.source === "classFeatureExtraAttack" &&
    resource.sourceOwnerId === spellCasterId
  );
}

function resolveWeaponAttackMiss(
  state: BattleState,
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
      ],
    }),
    "attackRoll",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
      attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
    ],
  });
}

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

describe("CRPI-READY-028 deterministic Second-Story Work admission", () => {
  test("rogue_second_story_work is admitted as a linked Climb Speed grant", () => {
    const unit = unitLibrary.requireUnit(rogueSecondStoryWorkUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(3) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: rogueSecondStoryWorkUnitId,
        supportProfiles: [secondStoryWorkSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedKindGrants",
        unit,
        speedKindGrants: {
          grants: secondStoryWorkSpeedKindGrants(),
        },
      }),
    );
  });

  test("Second-Story Work projects Climb Speed from current Speed without storing a second speed value", () => {
    const state = secondStoryWorkBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: secondStoryWorkActorId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
          speedKinds: [
            { kind: "walk", speedFeet: 30, remainingFeet: 30 },
            { kind: "climb", speedFeet: 30, remainingFeet: 30 },
          ],
        }),
      }),
    );

    const moved = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: secondStoryWorkActorId,
        command: "move",
      },
      fills: [
        movementFill(secondStoryWorkMovementHole(state), {
          speedKind: "climb",
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Second-Story Work climb Movement to resolve.");
    }
    expect(moved.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: secondStoryWorkActorId,
        movement: expect.objectContaining({
          spentFeet: 15,
          speedKinds: [
            { kind: "walk", speedFeet: 30, remainingFeet: 15 },
            { kind: "climb", speedFeet: 30, remainingFeet: 15 },
          ],
        }),
      }),
    );
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

function secondStoryWorkSupportProfile() {
  return {
    kind: PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
    grants: secondStoryWorkSpeedKindGrants(),
  } as const;
}

function secondStoryWorkSpeedKindGrants() {
  return [{ speedKind: "climb", feet: { kind: "walkSpeed" } }] as const;
}

function secondStoryWorkBattle(): BattleState {
  const unit = unitLibrary.requireUnit(rogueSecondStoryWorkUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rogueSecondStoryWorkUnitId,
      supportProfiles: [secondStoryWorkSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }

  const result = startBattle({
    battleId: battleId("unit-profile-second-story-work-admission"),
    combatants: [
      characterCreature({
        combatantId: secondStoryWorkActorId,
        displayName: "Second-Story Work Rogue",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [unitRef.right],
        classLevels: [{ className: "rogue", level: classLevel(3) }],
        unitFeatures: [{ unit }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: partySide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function secondStoryWorkMovementHole(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === secondStoryWorkActorId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Second-Story Work Movement act.");
  }
  return requireHole(act.initialHoles, "movement");
}
