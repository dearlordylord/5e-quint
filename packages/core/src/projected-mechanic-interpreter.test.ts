import { describe, expect, it } from "vitest";
import {
  decodeClassFeatureRecordSync,
  decodeSpellRecordSync,
} from "@dnd/surface/surface/schema";

import { compileProjectedExecutable } from "#/projected-compiler.ts";
import {
  ProjectedInterpreterError,
  interpretProjectedAction,
  type ProjectedExecutionRuntime,
} from "#/projected-mechanic-interpreter.ts";
import acidSplashSurface from "../../surface/content/acid_splash.json";
import actionSurgeSurface from "../../surface/content/fighter_action_surge_l2.json";
import secondWindSurface from "../../surface/content/fighter_second_wind.json";

const ACID_SPLASH_PROJECTED_ACTION = compileProjectedExecutable(
  decodeSpellRecordSync(acidSplashSurface),
);
const SECOND_WIND_PROJECTED_ACTION = compileProjectedExecutable(
  decodeClassFeatureRecordSync(secondWindSurface),
);
const ACTION_SURGE_PROJECTED_ACTION = compileProjectedExecutable(
  decodeClassFeatureRecordSync(actionSurgeSurface),
);

function runtimeForTests(
  overrides: Partial<ProjectedExecutionRuntime> = {},
): ProjectedExecutionRuntime {
  return {
    resolveAttachment: () => {
      throw new Error("resolveAttachment override required");
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
      ACID_SPLASH_PROJECTED_ACTION,
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
      SECOND_WIND_PROJECTED_ACTION,
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
          gate: SECOND_WIND_PROJECTED_ACTION.resourceGate,
        },
      },
      {
        tag: "PITDirect",
        value: {
          attachment: { tag: "PEASelf" },
          targetIds: ["fighter"],
        },
      },
      {
        tag: "PITHealHp",
        value: {
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
      ACTION_SURGE_PROJECTED_ACTION,
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
          gate: ACTION_SURGE_PROJECTED_ACTION.resourceGate,
        },
      },
      {
        tag: "PITMarkUsageLimit",
        value: { usageLimit: "PULOncePerTurn" },
      },
      {
        tag: "PITDirect",
        value: {
          attachment: { tag: "PEASelf" },
          targetIds: ["fighter"],
        },
      },
      {
        tag: "PITGrantExtraAction",
        value: {
          targetId: "fighter",
          restriction: "PGARExcludeMagicAction",
          pendingUntilActionSpend: true,
        },
      },
    ]);
  });

  it("fails closed when a self attachment resolves to the wrong creature", () => {
    expect(() =>
      interpretProjectedAction(
        SECOND_WIND_PROJECTED_ACTION,
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
        ACID_SPLASH_PROJECTED_ACTION,
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
        ACID_SPLASH_PROJECTED_ACTION,
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
