// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.magic-action-healing-pool
import { describe, expect, test } from "vitest";

import { Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";

import {
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  battleMagicActionHealingPoolSupportForUnit,
  battleId,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";

const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = requirePreserveLifeUnitRef();
const secondTargetId = combatantId("preserve-life-second-target");

describe("Preserve Life Magic Action healing pool", () => {
  test("discovers Preserve Life from the admitted support profile", () => {
    const state = preserveLifeBattle();
    const act = preserveLifeAct(state);

    expect(act.subject).toMatchObject({
      tag: "unitFeature",
      actorId: spellCasterId,
      unitId: clericPreserveLifeUnitId,
    });
    expect(
      requireHole(act.initialHoles, "hitPointHealingDistribution"),
    ).toMatchObject({
      healingPool: {
        sourceCombatantId: spellCasterId,
        unitId: clericPreserveLifeUnitId,
        poolHitPoints: Hp(15),
        rangeFeet: movementFeet(30),
        perTargetCap: "halfHitPointMaximum",
      },
    });
  });

  test("spends Channel Divinity and distributes healing up to half Hit Point Maximum", () => {
    const state = preserveLifeBattle();
    const act = preserveLifeAct(state);
    const hole = requireHole(act.initialHoles, "hitPointHealingDistribution");
    const resolved = recordResolvedState(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          preserveLifeDistributionFill(hole, [
            { targetId: spellTargetId, hitPoints: 8 },
            { targetId: secondTargetId, hitPoints: 7 },
          ]),
        ],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(10);
    expect(currentHp(resolved, secondTargetId)).toBe(10);
    expect(channelDivinityUsesRemaining(resolved)).toBe(1);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
  });

  test("accepts self when the Cleric is Bloodied without requiring a range fact", () => {
    const state = preserveLifeBattle({ casterHp: 4, targetHp: 12 });
    const act = preserveLifeAct(state);
    const hole = requireHole(act.initialHoles, "hitPointHealingDistribution");
    const resolved = recordResolvedState(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          preserveLifeDistributionFill(hole, [
            { targetId: spellCasterId, hitPoints: 6 },
          ]),
        ],
      }),
    );

    expect(currentHp(resolved, spellCasterId)).toBe(10);
    expect(channelDivinityUsesRemaining(resolved)).toBe(1);
  });

  test("returns a distribution hole when no fill is supplied", () => {
    const state = preserveLifeBattle();
    const act = preserveLifeAct(state);
    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(result.tag).toBe("needsHoles");
    if (result.tag === "needsHoles") {
      expect(
        requireHole(result.holes, "hitPointHealingDistribution"),
      ).toBeDefined();
    }
  });

  test("rejects non-Bloodied targets", () => {
    const state = preserveLifeBattle({ targetHp: 11 });
    const result = resolvePreserveLife(state, [
      { targetId: spellTargetId, hitPoints: 1 },
    ]);

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("Bloodied"),
    });
  });

  test("rejects allocations beyond the pool", () => {
    const state = preserveLifeBattle({ targetHp: 0, secondTargetHp: 0 });
    const result = resolvePreserveLife(state, [
      { targetId: spellTargetId, hitPoints: 8 },
      { targetId: secondTargetId, hitPoints: 8 },
    ]);

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("pool"),
    });
  });

  test("rejects allocations beyond the half Hit Point Maximum cap", () => {
    const state = preserveLifeBattle();
    const result = resolvePreserveLife(state, [
      { targetId: spellTargetId, hitPoints: 9 },
    ]);

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("half"),
    });
  });

  test("rejects missing range facts for non-self targets", () => {
    const state = preserveLifeBattle();
    const act = preserveLifeAct(state);
    const hole = requireHole(act.initialHoles, "hitPointHealingDistribution");
    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          ...preserveLifeDistributionFill(hole, [
            { targetId: spellTargetId, hitPoints: 8 },
          ]),
          spatialFacts: [],
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("range"),
    });
  });

  test("rejects missing Channel Divinity uses", () => {
    const state = preserveLifeBattle({ channelDivinityUsesRemaining: 0 });
    const subject = {
      tag: "unitFeature" as const,
      actorId: spellCasterId,
      unitId: clericPreserveLifeUnitId,
    };
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [],
    });

    expect(preserveLifeActOrUndefined(state)).toBeUndefined();
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: expect.stringContaining("resource"),
    });
  });

  test("rejects when the Magic Action is no longer available", () => {
    const base = preserveLifeBattle();
    const baseAct = preserveLifeAct(base);
    const hole = requireHole(
      baseAct.initialHoles,
      "hitPointHealingDistribution",
    );
    const state = {
      ...base,
      currentTurnResources: {
        ...base.currentTurnResources,
        actionResources: [],
      },
    };
    const subject = {
      tag: "unitFeature" as const,
      actorId: spellCasterId,
      unitId: clericPreserveLifeUnitId,
    };
    const resultWithoutFill = resolveBattleSubject({
      state,
      subject,
      fills: [],
    });
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        preserveLifeDistributionFill(hole, [
          { targetId: spellTargetId, hitPoints: 8 },
        ]),
      ],
    });

    expect(preserveLifeActOrUndefined(state)).toBeUndefined();
    expect(resultWithoutFill).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });
});

function preserveLifeBattle(
  input: {
    readonly casterHp?: number;
    readonly targetHp?: number;
    readonly secondTargetHp?: number;
    readonly channelDivinityUsesRemaining?: number;
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("preserve-life-healing-pool"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: input.casterHp ?? 20,
        maxHp: 20,
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [{ unit: preserveLifeUnit }],
        resources: [
          {
            unit: channelDivinityUnit,
            usesRemaining: input.channelDivinityUsesRemaining ?? 2,
          },
        ],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp ?? 2,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Second Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: input.secondTargetHp ?? 3,
        maxHp: 20,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function preserveLifeAct(state: BattleState) {
  const act = preserveLifeActOrUndefined(state);
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeActOrUndefined(state: BattleState) {
  return discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "unitFeature" &&
      act.subject.actorId === spellCasterId &&
      act.subject.unitId === clericPreserveLifeUnitId,
  );
}

function preserveLifeDistributionFill(
  hole: BattleHitPointHealingPoolDistributionHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): Extract<BattleFill, { readonly kind: "hitPointHealingDistribution" }> {
  return {
    kind: "hitPointHealingDistribution",
    holeId: hole.holeId,
    value: {
      allocations: allocations.map((allocation) => ({
        targetId: allocation.targetId,
        hitPoints: Hp(allocation.hitPoints),
      })),
    },
    spatialFacts: allocations
      .filter((allocation) => allocation.targetId !== spellCasterId)
      .map((allocation) => ({
        kind: "magicActionHealingPoolTargetWithinRange" as const,
        actorId: spellCasterId,
        targetId: allocation.targetId,
        unitId: clericPreserveLifeUnitId,
        rangeFeet: movementFeet(30),
      })),
  };
}

function resolvePreserveLife(
  state: BattleState,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): BattleResolutionResult {
  const act = preserveLifeAct(state);
  const hole = requireHole(act.initialHoles, "hitPointHealingDistribution");
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [preserveLifeDistributionFill(hole, allocations)],
  });
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Preserve Life to resolve: ${result.tag}`);
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

function channelDivinityUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Cleric actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === clericChannelDivinityUnitId,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Cleric Channel Divinity use-count resource.");
  }
  return Number(resource.usesRemaining);
}

function requiredMagicActionHealingPoolSupportProfile(
  unit: typeof preserveLifeUnit,
) {
  const support = battleMagicActionHealingPoolSupportForUnit(unit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life healing-pool support.");
  }
  return support;
}

function requirePreserveLifeUnitRef() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: clericPreserveLifeUnitId },
    unit: preserveLifeUnit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  expect(unitRef.right.supportProfiles).toContainEqual(
    requiredMagicActionHealingPoolSupportProfile(preserveLifeUnit),
  );
  return unitRef.right;
}
