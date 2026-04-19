import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACID_SPLASH_PROJECTION,
  FIGHTER_ACTION_SURGE_L2_PROJECTION,
  FIGHTER_SECOND_WIND_PROJECTION,
  MAGE_ARMOR_PROJECTION,
} from "#/projected-compiler-fixtures.ts";
import {
  compileProjectedExecutable,
  compileProjectedPersistent,
  compileProjectedUnit,
  UnsupportedProjectionPatternError,
} from "#/projected-compiler.ts";

import type {
  ClassFeatureRecord,
  SpellRecord,
} from "../../prototype-content-surface/src/surface/types.ts";

function loadSurfaceUnit<T extends SpellRecord | ClassFeatureRecord>(
  name: string,
): T {
  const path = join(
    import.meta.dirname,
    "..",
    "..",
    "prototype-content-surface",
    "content",
    `${name}.json`,
  );
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("projected compiler", () => {
  it("deterministically compiles acid_splash into the frozen executable projection", () => {
    const acidSplash = loadSurfaceUnit<SpellRecord>("acid_splash");

    expect(compileProjectedExecutable(acidSplash)).toEqual(
      ACID_SPLASH_PROJECTION,
    );
  });

  it("deterministically compiles fighter_second_wind into the frozen executable projection", () => {
    const secondWind = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_second_wind",
    );

    expect(compileProjectedExecutable(secondWind)).toEqual(
      FIGHTER_SECOND_WIND_PROJECTION,
    );
  });

  it("deterministically compiles fighter_action_surge_l2 into the frozen executable projection", () => {
    const actionSurge = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_action_surge_l2",
    );

    expect(compileProjectedExecutable(actionSurge)).toEqual(
      FIGHTER_ACTION_SURGE_L2_PROJECTION,
    );
  });

  it("deterministically compiles mage_armor into the frozen persistent projection", () => {
    const mageArmor = loadSurfaceUnit<SpellRecord>("mage_armor");

    expect(compileProjectedPersistent(mageArmor)).toEqual(
      MAGE_ARMOR_PROJECTION,
    );
    expect(compileProjectedUnit(mageArmor)).toEqual({
      tag: "CPUPersistent",
      value: MAGE_ARMOR_PROJECTION,
    });
  });

  it("preserves authored source identity for the in-scope units", () => {
    const acidSplash = compileProjectedExecutable(
      loadSurfaceUnit<SpellRecord>("acid_splash"),
    );
    const secondWind = compileProjectedExecutable(
      loadSurfaceUnit<ClassFeatureRecord>("fighter_second_wind"),
    );

    expect(acidSplash.source).toEqual({
      unitId: "acid_splash",
      unitKind: "PUKSpell",
    });
    expect(secondWind.source).toEqual({
      unitId: "fighter_second_wind",
      unitKind: "PUKClassFeature",
    });
  });

  it("is deterministic across repeated compilation of the same authored record", () => {
    const authored = loadSurfaceUnit<SpellRecord>("acid_splash");

    expect(compileProjectedExecutable(authored)).toEqual(
      compileProjectedExecutable(authored),
    );
  });

  it("fails closed for a real authored spell outside the first-slice scope", () => {
    const fireball = loadSurfaceUnit<SpellRecord>("fireball");

    expect(() => compileProjectedUnit(fireball)).toThrowError(
      /spell is not in the first-slice scope/,
    );
  });
});

describe("projected compiler preserved-fact guards", () => {
  it("rejects Acid Splash save ability drift", () => {
    const acidSplash = loadSurfaceUnit<SpellRecord>("acid_splash");
    if (acidSplash.mechanics.family !== "activation")
      throw new Error("unexpected acid_splash");
    const phase = acidSplash.mechanics.phases[0];
    if (phase.kind !== "save_gate")
      throw new Error("unexpected acid_splash phase");

    const drifted: SpellRecord = {
      ...acidSplash,
      mechanics: {
        ...acidSplash.mechanics,
        phases: [{ ...phase, ability: "con" }],
      },
    };

    expect(() => compileProjectedUnit(drifted)).toThrow(
      UnsupportedProjectionPatternError,
    );
  });

  it("rejects Acid Splash threshold-tier damage drift", () => {
    const acidSplash = loadSurfaceUnit<SpellRecord>("acid_splash");
    if (acidSplash.mechanics.family !== "activation")
      throw new Error("unexpected acid_splash");
    const phase = acidSplash.mechanics.phases[0];
    if (
      phase.kind !== "save_gate" ||
      phase.onFail.kind !== "damage" ||
      phase.onFail.amount.kind !== "threshold_tiers"
    ) {
      throw new Error("unexpected acid_splash damage shape");
    }

    const drifted: SpellRecord = {
      ...acidSplash,
      mechanics: {
        ...acidSplash.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              amount: {
                ...phase.onFail.amount,
                tiers: [
                  {
                    ...phase.onFail.amount.tiers[0],
                    override: {
                      ...phase.onFail.amount.tiers[0].override,
                      dice: 5,
                    },
                  },
                  ...phase.onFail.amount.tiers.slice(1),
                ],
              },
            },
          },
        ],
      },
    };

    expect(() => compileProjectedUnit(drifted)).toThrow(
      UnsupportedProjectionPatternError,
    );
  });

  it("rejects Second Wind activation-cost drift", () => {
    const secondWind = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_second_wind",
    );
    if (secondWind.mechanics.family !== "activation")
      throw new Error("unexpected second wind");

    const drifted: ClassFeatureRecord = {
      ...secondWind,
      mechanics: {
        ...secondWind.mechanics,
        activationCost: { kind: "action" },
      },
    };

    expect(() => compileProjectedUnit(drifted)).toThrow(
      UnsupportedProjectionPatternError,
    );
  });

  it("rejects Action Surge attachment drift", () => {
    const actionSurge = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_action_surge_l2",
    );
    if (actionSurge.mechanics.family !== "activation")
      throw new Error("unexpected action surge");
    const phase = actionSurge.mechanics.phases[0];
    if (phase.kind !== "direct")
      throw new Error("unexpected action surge phase");

    const drifted: ClassFeatureRecord = {
      ...actionSurge,
      mechanics: {
        ...actionSurge.mechanics,
        phases: [
          {
            ...phase,
            attachment: { kind: "target", selection: { mode: "one" } },
          },
        ],
      },
    };

    expect(() => compileProjectedUnit(drifted)).toThrow(
      UnsupportedProjectionPatternError,
    );
  });

  it("rejects Mage Armor base-AC drift", () => {
    const mageArmor = loadSurfaceUnit<SpellRecord>("mage_armor");
    if (mageArmor.mechanics.family !== "ongoing_effect")
      throw new Error("unexpected mage armor");
    const operation = mageArmor.mechanics.operations[0];
    if (operation.effect.kind !== "modify_ac_set_base")
      throw new Error("unexpected mage armor effect");

    const drifted: SpellRecord = {
      ...mageArmor,
      mechanics: {
        ...mageArmor.mechanics,
        operations: [
          {
            ...operation,
            effect: { ...operation.effect, const: 14 },
          },
        ],
      },
    };

    expect(() => compileProjectedUnit(drifted)).toThrow(
      UnsupportedProjectionPatternError,
    );
  });

  it("rejects the authored fighter_action_surge variant outside the frozen level-2 slice", () => {
    const actionSurge = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_action_surge",
    );

    expect(() => compileProjectedUnit(actionSurge)).toThrowError(
      /class feature is not in the first-slice scope/,
    );
  });
});
