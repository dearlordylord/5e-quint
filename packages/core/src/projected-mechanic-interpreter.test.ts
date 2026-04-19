import { describe, expect, it } from "vitest";

import {
  ACID_SPLASH_PROJECTION,
  FIGHTER_ACTION_SURGE_L2_PROJECTION,
  FIGHTER_SECOND_WIND_PROJECTION,
} from "#/projected-compiler-fixtures.ts";
import {
  ProjectedInterpreterError,
  interpretProjectedAction,
  type ProjectedExecutionRuntime,
} from "#/projected-mechanic-interpreter.ts";
import type { ProjectedExecutableAction } from "#/projected-executable.ts";

function runtimeForTests(
  overrides: Partial<ProjectedExecutionRuntime> = {},
): ProjectedExecutionRuntime {
  return {
    resolveAttachment: () => {
      throw new Error("resolveAttachment override required");
    },
    resolveAttackRoll: () => {
      throw new Error("resolveAttackRoll override required");
    },
    resolveSaveGate: () => {
      throw new Error("resolveSaveGate override required");
    },
    resolveAmount: () => {
      throw new Error("resolveAmount override required");
    },
    ...overrides,
  };
}

describe("projected mechanic interpreter", () => {
  it("interprets Acid Splash into spend, save-gate, and damage transitions", () => {
    const interpreted = interpretProjectedAction(
      ACID_SPLASH_PROJECTION,
      {
        actorId: "caster",
        characterLevel: 11,
        fighterLevel: 0,
        spellSaveDc: 15,
      },
      runtimeForTests({
        resolveAttachment: () => ["goblin", "bugbear"],
        resolveSaveGate: ({ targetIds }) =>
          targetIds.map((targetId) => ({
            targetId,
            outcome:
              targetId === "goblin" ? ("fail" as const) : ("success" as const),
          })),
        resolveAmount: ({ targetIds, amount }) =>
          targetIds.map((targetId) => ({
            targetId,
            total: amount.dice * amount.dieSize,
            rolledTotal: amount.dice * amount.dieSize,
          })),
      }),
    );

    expect(interpreted.transitions).toEqual([
      {
        tag: "PITSpendActivation",
        value: { cost: "PACAction" },
      },
      {
        tag: "PITSaveGate",
        value: {
          nodeId: 0,
          attachment: {
            tag: "PEAAreaSpherePointWithinRange",
            value: { rangeFeet: 60, radiusFeet: 5 },
          },
          ability: "dex",
          dc: 15,
          dcSource: "PDCSpellSaveDc",
          targetIds: ["goblin", "bugbear"],
          outcomes: [
            { targetId: "goblin", outcome: "fail" },
            { targetId: "bugbear", outcome: "success" },
          ],
        },
      },
      {
        tag: "PITDamage",
        value: {
          nodeId: 1,
          damageType: "acid",
          targetId: "goblin",
          amount: { dice: 3, dieSize: 6, flat: 0 },
          total: 18,
          rolledTotal: 18,
        },
      },
    ]);
  });

  it("interprets Second Wind into spend, resource, self, and heal transitions", () => {
    const interpreted = interpretProjectedAction(
      FIGHTER_SECOND_WIND_PROJECTION,
      {
        actorId: "fighter",
        characterLevel: 5,
        fighterLevel: 5,
        spellSaveDc: null,
      },
      runtimeForTests({
        resolveAttachment: () => ["fighter"],
        resolveAmount: ({ targetIds, amount }) =>
          targetIds.map((targetId) => ({
            targetId,
            total: amount.dice + amount.flat,
            rolledTotal: amount.dice,
          })),
      }),
    );

    expect(interpreted.transitions).toEqual([
      {
        tag: "PITSpendActivation",
        value: { cost: "PACBonusAction" },
      },
      {
        tag: "PITSpendResourceUse",
        value: {
          gate: FIGHTER_SECOND_WIND_PROJECTION.resourceGate,
        },
      },
      {
        tag: "PITDirect",
        value: {
          nodeId: 0,
          attachment: { tag: "PEASelf" },
          targetIds: ["fighter"],
        },
      },
      {
        tag: "PITHealHp",
        value: {
          nodeId: 1,
          targetId: "fighter",
          amount: { dice: 1, dieSize: 10, flat: 5 },
          total: 6,
          rolledTotal: 1,
        },
      },
    ]);
  });

  it("interprets Action Surge into reducer-consumable extra-action transitions", () => {
    const interpreted = interpretProjectedAction(
      FIGHTER_ACTION_SURGE_L2_PROJECTION,
      {
        actorId: "fighter",
        characterLevel: 2,
        fighterLevel: 2,
        spellSaveDc: null,
      },
      runtimeForTests({
        resolveAttachment: () => ["fighter"],
      }),
    );

    expect(interpreted.transitions).toEqual([
      {
        tag: "PITSpendResourceUse",
        value: {
          gate: FIGHTER_ACTION_SURGE_L2_PROJECTION.resourceGate,
        },
      },
      {
        tag: "PITMarkUsageLimit",
        value: { usageLimit: "PULOncePerTurn" },
      },
      {
        tag: "PITDirect",
        value: {
          nodeId: 0,
          attachment: { tag: "PEASelf" },
          targetIds: ["fighter"],
        },
      },
      {
        tag: "PITGrantExtraAction",
        value: {
          nodeId: 1,
          targetId: "fighter",
          restriction: "PGARExcludeMagicAction",
          pendingUntilActionSpend: true,
        },
      },
    ]);
  });

  it("walks future attack-roll shapes generically without unit-id-specific branching", () => {
    const attackProjection: ProjectedExecutableAction = {
      source: { unitId: "synthetic_attack", unitKind: "PUKSpell" },
      activationCost: "PACAction",
      resourceGate: { tag: "PRGNone" },
      usageLimit: "PULNone",
      entryNode: 0,
      nodes: [
        {
          tag: "PENAttackRoll",
          value: {
            nodeId: 0,
            attachment: { tag: "PEAOneTarget" },
            attackKind: "PAKWeaponAttack",
            onHit: { tag: "PCNode", value: 1 },
            onMiss: { tag: "PCNode", value: 2 },
          },
        },
        {
          tag: "PENDamage",
          value: {
            nodeId: 1,
            damageType: "acid",
            amount: {
              tag: "PAThresholdDice",
              value: {
                axis: "PLACharacterLevel",
                base: { dice: 1, dieSize: 8, flat: 0 },
                tiers: [],
              },
            },
            next: { tag: "PCDone" },
          },
        },
        {
          tag: "PENGrantExtraAction",
          value: {
            nodeId: 2,
            restriction: "PGARExcludeMagicAction",
            next: { tag: "PCDone" },
          },
        },
      ],
    };

    const interpreted = interpretProjectedAction(
      attackProjection,
      {
        actorId: "caster",
        characterLevel: 1,
        fighterLevel: 0,
        spellSaveDc: 12,
      },
      runtimeForTests({
        resolveAttachment: () => ["target"],
        resolveAttackRoll: () => [{ targetId: "target", outcome: "miss" }],
        resolveAmount: () => [{ targetId: "target", total: 4 }],
      }),
    );

    expect(interpreted.transitions).toEqual([
      {
        tag: "PITSpendActivation",
        value: { cost: "PACAction" },
      },
      {
        tag: "PITAttackRoll",
        value: {
          nodeId: 0,
          attachment: { tag: "PEAOneTarget" },
          attackKind: "PAKWeaponAttack",
          targetIds: ["target"],
          outcomes: [{ targetId: "target", outcome: "miss" }],
        },
      },
      {
        tag: "PITGrantExtraAction",
        value: {
          nodeId: 2,
          targetId: "target",
          restriction: "PGARExcludeMagicAction",
          pendingUntilActionSpend: true,
        },
      },
    ]);
  });

  it("fails closed when a self attachment resolves to the wrong creature", () => {
    expect(() =>
      interpretProjectedAction(
        FIGHTER_SECOND_WIND_PROJECTION,
        {
          actorId: "fighter",
          characterLevel: 1,
          fighterLevel: 1,
          spellSaveDc: null,
        },
        runtimeForTests({
          resolveAttachment: () => ["other"],
          resolveAmount: () => [{ targetId: "other", total: 4 }],
        }),
      ),
    ).toThrow(ProjectedInterpreterError);
  });

  it("fails closed when runtime omits a required spell save DC", () => {
    expect(() =>
      interpretProjectedAction(
        ACID_SPLASH_PROJECTION,
        {
          actorId: "caster",
          characterLevel: 1,
          fighterLevel: 0,
          spellSaveDc: null,
        },
        runtimeForTests({
          resolveAttachment: () => ["goblin"],
          resolveSaveGate: () => [{ targetId: "goblin", outcome: "fail" }],
          resolveAmount: () => [{ targetId: "goblin", total: 3 }],
        }),
      ),
    ).toThrow(ProjectedInterpreterError);
  });

  it("fails closed when runtime omits an amount resolution for a failed Acid Splash target", () => {
    expect(() =>
      interpretProjectedAction(
        ACID_SPLASH_PROJECTION,
        {
          actorId: "caster",
          characterLevel: 5,
          fighterLevel: 0,
          spellSaveDc: 14,
        },
        runtimeForTests({
          resolveAttachment: () => ["goblin"],
          resolveSaveGate: () => [{ targetId: "goblin", outcome: "fail" }],
          resolveAmount: () => [],
        }),
      ),
    ).toThrow(ProjectedInterpreterError);
  });
});
