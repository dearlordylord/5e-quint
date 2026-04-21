import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { decodeUnitRecordSync } from "@dnd/prototype-content-surface/surface/schema";

import {
  compileProjectedExecutable,
  compileProjectedPersistent,
  compileProjectedUnit,
  UnsupportedProjectionPatternError,
} from "#/projected-compiler.ts";

import type {
  ClassFeatureRecord,
  SpellRecord,
} from "@dnd/prototype-content-surface/surface/types";

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
  return decodeUnitRecordSync(JSON.parse(readFileSync(path, "utf8"))) as T;
}

describe("projected compiler", () => {
  it("compiles Acid Splash by surface shape rather than by a hardcoded projection fixture", () => {
    const acidSplash = loadSurfaceUnit<SpellRecord>("acid_splash");

    expect(compileProjectedExecutable(acidSplash)).toEqual({
      tag: "PEASaveGateDamage",
      source: {
        unitId: "acid_splash",
        unitKind: "PUKSpell",
        unitName: "Acid Splash",
      },
      activationCost: "PACAction",
      resourceGate: { tag: "PRGNone" },
      usageLimit: "PULNone",
      attachment: {
        tag: "PEAAreaSpherePointWithinRange",
        value: { rangeFeet: 60, radiusFeet: 5 },
      },
      ability: "dex",
      dc: "PDCSpellSaveDc",
      damageType: "acid",
      amount: {
        tag: "PAThresholdDice",
        value: {
          axis: "PLACharacterLevel",
          base: { dice: 1, dieSize: 6, flat: 0 },
          tiers: [
            { atLevel: 5, diceOverride: 2 },
            { atLevel: 11, diceOverride: 3 },
            { atLevel: 17, diceOverride: 4 },
          ],
        },
      },
    });
  });

  it("compiles Second Wind by direct-effect shape", () => {
    const secondWind = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_second_wind",
    );

    expect(compileProjectedExecutable(secondWind)).toEqual({
      tag: "PEADirectHealHp",
      source: {
        unitId: "fighter_second_wind",
        unitKind: "PUKClassFeature",
        unitName: "Second Wind",
      },
      activationCost: "PACBonusAction",
      resourceGate: {
        tag: "PRGUseCount",
        value: {
          pool: "PRPSecondWind",
          cap: {
            tag: "PRCThresholdTiers",
            value: {
              axis: "PRAClass",
              base: 2,
              tiers: [
                { atLevel: 4, value: 3 },
                { atLevel: 10, value: 4 },
              ],
            },
          },
          resetCadence: {
            tag: "PRCPartialShortFullLong",
            value: { shortRestRefill: 1 },
          },
        },
      },
      usageLimit: "PULNone",
      attachment: { tag: "PEASelf" },
      amount: {
        tag: "PALinearDicePlusLevel",
        value: {
          axis: "PLAFighterLevel",
          base: { dice: 1, dieSize: 10, flat: 1 },
          perLevelFlat: 1,
          startingAtLevel: 1,
        },
      },
    });
  });

  it("compiles Action Surge by direct-effect shape", () => {
    const actionSurge = loadSurfaceUnit<ClassFeatureRecord>(
      "fighter_action_surge_l2",
    );

    expect(compileProjectedExecutable(actionSurge)).toEqual({
      tag: "PEADirectGrantExtraAction",
      source: {
        unitId: "fighter_action_surge_l2",
        unitKind: "PUKClassFeature",
        unitName: "Action Surge",
      },
      activationCost: "PACFree",
      resourceGate: {
        tag: "PRGUseCount",
        value: {
          pool: "PRPActionSurge",
          cap: {
            tag: "PRCThresholdTiers",
            value: {
              axis: "PRAClass",
              base: 1,
              tiers: [{ atLevel: 17, value: 2 }],
            },
          },
          resetCadence: { tag: "PRCShortOrLongRest" },
        },
      },
      usageLimit: "PULOncePerTurn",
      attachment: { tag: "PEASelf" },
      restriction: "PGARExcludeMagicAction",
    });
  });

  it("compiles Mage Armor into a persistent record with authored payload", () => {
    const mageArmor = loadSurfaceUnit<SpellRecord>("mage_armor");

    expect(compileProjectedPersistent(mageArmor)).toEqual({
      tag: "PPRSetBaseAc",
      value: {
        source: {
          unitId: "mage_armor",
          unitKind: "PUKSpell",
          unitName: "Mage Armor",
        },
        attachment: "PPAChosenTarget",
        baseArmorClass: 13,
        abilityModifier: "dex",
        earlyEnds: ["PPEETargetDonsArmor"],
      },
    });
    expect(compileProjectedUnit(mageArmor).tag).toBe("CPUPersistent");
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
      unitName: "Acid Splash",
    });
    expect(secondWind.source).toEqual({
      unitId: "fighter_second_wind",
      unitKind: "PUKClassFeature",
      unitName: "Second Wind",
    });
  });

  it("is deterministic across repeated compilation of the same authored record", () => {
    const authored = loadSurfaceUnit<SpellRecord>("acid_splash");

    expect(compileProjectedExecutable(authored)).toEqual(
      compileProjectedExecutable(authored),
    );
  });

  it("fails closed for a real authored spell outside the projected shape scope", () => {
    const fireball = loadSurfaceUnit<SpellRecord>("fireball");

    expect(() => compileProjectedUnit(fireball)).toThrowError(
      /out of projected scope|out of projected persistent scope|out of projected scope/,
    );
  });
});

describe("projected compiler shape-driven widening", () => {
  it("recompiles Acid Splash when the save ability changes but the supported shape stays the same", () => {
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

    const compiled = compileProjectedExecutable(drifted);
    expect(compiled.tag).toBe("PEASaveGateDamage");
    if (compiled.tag !== "PEASaveGateDamage") {
      throw new Error("unexpected projected action tag");
    }
    expect(compiled.ability).toBe("con");
  });

  it("recompiles Acid Splash when threshold-tier values change within the supported shape", () => {
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

    const compiled = compileProjectedExecutable(drifted);
    expect(compiled.tag).toBe("PEASaveGateDamage");
    if (compiled.tag !== "PEASaveGateDamage") {
      throw new Error("unexpected projected action tag");
    }
    if (compiled.amount.tag !== "PAThresholdDice") {
      throw new Error("unexpected compiled amount kind");
    }
    expect(compiled.amount.value.tiers[0].diceOverride).toBe(5);
  });

  it("recompiles Second Wind when activation cost changes within the supported direct-heal shape", () => {
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

    expect(compileProjectedExecutable(drifted).activationCost).toBe("PACAction");
  });

  it("still rejects Action Surge when the shape leaves the supported direct-self projection subset", () => {
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

  it("recompiles Mage Armor when the authored base-AC payload changes within the supported passive-set-base-ac shape", () => {
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

    expect(compileProjectedPersistent(drifted).value.baseArmorClass).toBe(14);
  });
});
