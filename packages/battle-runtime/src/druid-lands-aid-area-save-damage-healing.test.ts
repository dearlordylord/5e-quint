// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.magic-action-area-save-damage-healing
import { describe, expect, test } from "vitest";

import { DieRollResult, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";

import {
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "./index.ts";
import {
  characterSeed,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  druidLandsAidUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  battleId,
  battleMagicActionAreaSaveDamageHealingSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";

const druidWildShapeUnitId = "druid_wild_shape";
const landsAidUnit = unitLibrary.requireUnit(druidLandsAidUnitId);
const wildShapeUnit = unitLibrary.requireUnit(druidWildShapeUnitId);
const secondTargetId = combatantId("lands-aid-second-target");
const healingTargetId = combatantId("lands-aid-healing-target");

describe("Druid Land's Aid area save damage and healing", () => {
  test("discovers Land's Aid from selected identity and support profile", () => {
    const state = landsAidBattle();
    const act = landsAidAct(state);

    expect(act.subject).toMatchObject({
      tag: "unitFeature",
      actorId: spellCasterId,
      unitId: druidLandsAidUnitId,
    });
    expect(
      requireHole(act.initialHoles, "savingThrowOutcome"),
    ).toMatchObject({
      unitFeature: {
        unitId: druidLandsAidUnitId,
        label: "Land's Aid",
      },
      ability: "con",
      dc: { kind: "fixed", dc: 13 },
      targetIds: expect.arrayContaining([spellTargetId, secondTargetId]),
    });
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "rolledDice", label: "Land's Aid damage (2d6)" }),
        expect.objectContaining({ kind: "targetChoice", label: "Land's Aid healing target" }),
        expect.objectContaining({ kind: "rolledDice", label: "Land's Aid healing (2d6)" }),
      ]),
    );
  });

  test("spends Wild Shape, resolves Constitution saves, damages, and heals one creature in the Sphere", () => {
    const state = landsAidBattle({ healingTargetHp: 5 });
    const resolved = recordResolvedState(
      resolveLandsAid(state, {
        outcomes: [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
        ],
        areaTargetIds: [spellTargetId, secondTargetId, healingTargetId],
        healingTargetId,
        damageRolls: [4, 4],
        healingRolls: [3, 4],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(12);
    expect(currentHp(resolved, secondTargetId)).toBe(16);
    expect(currentHp(resolved, healingTargetId)).toBe(12);
    expect(wildShapeUsesRemaining(resolved)).toBe(1);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
  });

  test.each([
    {
      druidLevel: 3,
      damageRolls: [4, 4],
      healingRolls: [3, 4],
      expectedTargetHp: 12,
      expectedSecondTargetHp: 16,
      expectedHealingTargetHp: 12,
    },
    {
      druidLevel: 10,
      damageRolls: [4, 4, 4],
      healingRolls: [3, 4, 5],
      expectedTargetHp: 8,
      expectedSecondTargetHp: 14,
      expectedHealingTargetHp: 17,
    },
    {
      druidLevel: 14,
      damageRolls: [4, 4, 4, 4],
      healingRolls: [3, 4, 5, 6],
      expectedTargetHp: 4,
      expectedSecondTargetHp: 12,
      expectedHealingTargetHp: 20,
    },
  ])(
    "derives $druidLevel Land's Aid dice from the Druid class level",
    ({
      druidLevel,
      damageRolls,
      healingRolls,
      expectedTargetHp,
      expectedSecondTargetHp,
      expectedHealingTargetHp,
    }) => {
      const state = landsAidBattle({ druidLevel, healingTargetHp: 5 });
      const act = landsAidAct(state);

      expect(act.initialHoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "rolledDice",
            label: `Land's Aid damage (${damageRolls.length}d6)`,
          }),
          expect.objectContaining({
            kind: "rolledDice",
            label: `Land's Aid healing (${healingRolls.length}d6)`,
          }),
        ]),
      );

      const resolved = recordResolvedState(
        resolveLandsAid(state, {
          outcomes: [
            { targetId: spellTargetId, succeeded: false },
            { targetId: secondTargetId, succeeded: true },
          ],
          areaTargetIds: [spellTargetId, secondTargetId, healingTargetId],
          healingTargetId,
          damageRolls,
          healingRolls,
        }),
      );

      expect(currentHp(resolved, spellTargetId)).toBe(expectedTargetHp);
      expect(currentHp(resolved, secondTargetId)).toBe(expectedSecondTargetHp);
      expect(currentHp(resolved, healingTargetId)).toBe(expectedHealingTargetHp);
      expect(wildShapeUsesRemaining(resolved)).toBe(1);
      expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
    },
  );

  test("returns holes when fills are missing", () => {
    const state = landsAidBattle();
    const result = resolveBattleSubject({
      state,
      subject: landsAidAct(state).subject,
      fills: [],
    });

    expect(result.tag).toBe("needsHoles");
    if (result.tag === "needsHoles") {
      expect(result.holes.map((hole) => hole.kind)).toEqual([
        "savingThrowOutcome",
        "rolledDice",
        "targetChoice",
        "rolledDice",
      ]);
    }
  });

  test("rejects stale missing-fill resolution when Magic Action is unavailable", () => {
    const state = withoutActionResources(landsAidBattle());
    const result = resolveBattleSubject({
      state,
      subject: landsAidSubject(),
      fills: [],
    });

    expect(landsAidActOrUndefined(state)).toBeUndefined();
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("Magic Action"),
    });
  });

  test("rejects missing Wild Shape resource uses", () => {
    const state = landsAidBattle({ wildShapeUsesRemaining: 0 });
    const result = resolveBattleSubject({
      state,
      subject: landsAidSubject(),
      fills: [],
    });

    expect(landsAidActOrUndefined(state)).toBeUndefined();
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("resource"),
    });
  });

  test("rejects missing area membership", () => {
    const state = landsAidBattle();
    const result = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [],
      healingTargetId,
      damageRolls: [4, 4],
      healingRolls: [3, 4],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("Sphere area"),
    });
  });

  test("rejects invalid save fills and healing targets", () => {
    const state = landsAidBattle();
    const duplicateSave = resolveLandsAid(state, {
      outcomes: [
        { targetId: spellTargetId, succeeded: false },
        { targetId: spellTargetId, succeeded: true },
      ],
      areaTargetIds: [spellTargetId, healingTargetId],
      healingTargetId,
      damageRolls: [4, 4],
      healingRolls: [3, 4],
    });
    const outsideHealing = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId],
      healingTargetId,
      damageRolls: [4, 4],
      healingRolls: [3, 4],
    });

    expect(duplicateSave).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("filled twice"),
    });
    expect(outsideHealing).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("supplied Sphere"),
    });
  });

  test("rejects malformed damage and healing dice fills", () => {
    const state = landsAidBattle();
    const badDamageRoll = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, healingTargetId],
      healingTargetId,
      damageRolls: [4],
      healingRolls: [3, 4],
    });
    const badHealingRoll = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, healingTargetId],
      healingTargetId,
      damageRolls: [4, 4],
      healingRolls: [3, 7],
    });

    expect(badDamageRoll).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("dice count"),
    });
    expect(badHealingRoll).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("outside d6"),
    });
  });

  test("rejects level-10 fills that do not match the derived 3d6 dice", () => {
    const state = landsAidBattle({ druidLevel: 10 });
    const badDamageRoll = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, healingTargetId],
      healingTargetId,
      damageRolls: [4, 4],
      healingRolls: [3, 4, 5],
    });
    const badHealingRoll = resolveLandsAid(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, healingTargetId],
      healingTargetId,
      damageRolls: [4, 4, 4],
      healingRolls: [3, 4],
    });

    expect(badDamageRoll).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("dice count"),
    });
    expect(badHealingRoll).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("dice count"),
    });
  });
});

function landsAidBattle(
  input: {
    readonly targetHp?: number;
    readonly secondTargetHp?: number;
    readonly healingTargetHp?: number;
    readonly wildShapeUsesRemaining?: number;
    readonly druidLevel?: number;
  } = {},
): BattleState {
  const druidLevel = input.druidLevel ?? 3;
  const result = startBattle({
    battleId: battleId("druid-lands-aid"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Land Druid",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "druid", level: classLevel(druidLevel) }],
        characterUnitRefs: [requireLandsAidUnitRef(druidLevel)],
        unitFeatures: [{ unit: landsAidUnit }],
        resources: [
          {
            unit: wildShapeUnit,
            usesRemaining: input.wildShapeUsesRemaining ?? 2,
          },
        ],
        spellcasting: {
          ...wizardSpellcasting(),
          sourceClassName: "druid",
        },
        attack: null,
        druidWildShapeAvailableForms: druidWildShapeAvailableForms(druidLevel),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Failed Save Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp ?? 20,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Successful Save Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: input.secondTargetHp ?? 20,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: healingTargetId,
        displayName: "Healing Target",
        initiative: 8,
        side: partySide,
        currentHp: input.healingTargetHp ?? 12,
        maxHp: 20,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function withoutActionResources(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [],
    },
  };
}

function resolveLandsAid(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
    readonly healingTargetId: CombatantId;
    readonly damageRolls: readonly number[];
    readonly healingRolls: readonly number[];
  },
): BattleResolutionResult {
  const act = landsAidAct(state);
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const target = requireHole(act.initialHoles, "targetChoice");
  const rolls = act.initialHoles.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "rolledDice" }> =>
      hole.kind === "rolledDice",
  );
  const damage = rolls.find((hole) => hole.label?.includes("damage"));
  const healing = rolls.find((hole) => hole.label?.includes("healing"));
  if (damage === undefined || healing === undefined) {
    throw new Error("Expected Land's Aid damage and healing roll holes.");
  }
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      landsAidSavingThrowFill(save, input.outcomes, input.areaTargetIds),
      rolledDiceFill(damage, input.damageRolls),
      targetChoiceFill(target, input.healingTargetId),
      rolledDiceFill(healing, input.healingRolls),
    ],
  });
}

function landsAidAct(state: BattleState) {
  const act = landsAidActOrUndefined(state);
  if (act === undefined) {
    throw new Error("Expected Land's Aid act.");
  }
  return act;
}

function landsAidActOrUndefined(state: BattleState) {
  return discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "unitFeature" &&
      act.subject.actorId === spellCasterId &&
      act.subject.unitId === druidLandsAidUnitId,
  );
}

function landsAidSubject() {
  return {
    tag: "unitFeature" as const,
    actorId: spellCasterId,
    unitId: druidLandsAidUnitId,
  };
}

function landsAidSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  areaTargetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
    spatialFacts:
      areaTargetIds.length === 0
        ? []
        : [landsAidAreaFact(areaTargetIds)],
  };
}

function landsAidAreaFact(
  targetIds: readonly CombatantId[],
): BattleTargetSpatialFact {
  return {
    kind: "magicActionAreaSaveDamageHealingTargetsInSphere",
    actorId: spellCasterId,
    unitId: druidLandsAidUnitId,
    originWithinRangeFeet: movementFeet(60),
    radiusFeet: movementFeet(10),
    targetIds,
  };
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  rolls: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = rolls;
  if (first === undefined) {
    throw new Error("Expected at least one die roll.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(first), ...rest.map(DieRollResult)],
      },
    ],
  };
}

function druidWildShapeAvailableForms(druidLevel: number) {
  const forms = [
    statBlockCatalog.requireStatBlock("stat_block_rat"),
    statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
    statBlockCatalog.requireStatBlock("stat_block_lizard"),
    statBlockCatalog.requireStatBlock("stat_block_cat"),
    statBlockCatalog.requireStatBlock("stat_block_bat"),
    statBlockCatalog.requireStatBlock("stat_block_frog"),
    statBlockCatalog.requireStatBlock("stat_block_hawk"),
    statBlockCatalog.requireStatBlock("stat_block_owl"),
  ];
  const knownFormCount = druidLevel >= 8 ? 8 : druidLevel >= 4 ? 6 : 4;
  return forms.slice(0, knownFormCount);
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Land's Aid to resolve: ${result.tag}`);
  }
  return result.state;
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function wildShapeUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Druid actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === druidWildShapeUnitId,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape use-count resource.");
  }
  return Number(resource.usesRemaining);
}

function requireLandsAidUnitRef(druidLevel = 3) {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: druidLandsAidUnitId },
    unit: landsAidUnit,
    classLevels: [{ className: "druid", level: classLevel(druidLevel) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const support = battleMagicActionAreaSaveDamageHealingSupportForUnit(
    landsAidUnit,
    [{ className: "druid", level: classLevel(druidLevel) }],
  );
  if (support === null || support === "unsupported") {
    throw new Error("Expected Land's Aid damage/healing support.");
  }
  expect(unitRef.right.supportProfiles).toContainEqual(support);
  return unitRef.right;
}
