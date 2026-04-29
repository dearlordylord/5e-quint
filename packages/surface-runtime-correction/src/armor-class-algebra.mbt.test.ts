import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  defaultArmorClassState,
  statBlockArmorClassState,
  zeroAbilityModifiers,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";

type ModelState = {
  readonly baseKind: number;
  readonly baseAc: number;
  readonly dex: number;
  readonly con: number;
  readonly shieldBonus: number;
  readonly shieldTrained: boolean;
  readonly wieldingShield: boolean;
  readonly unarmoredBonus: number;
  readonly wearingArmorBonus: number;
  readonly floor: number;
  readonly currentAc: number;
};

const quintStateSchema = z.object({
  qBaseKind: z.bigint(),
  qBaseAc: z.bigint(),
  qDex: z.bigint(),
  qCon: z.bigint(),
  qShieldBonus: z.bigint(),
  qShieldTrained: z.boolean(),
  qWieldingShield: z.boolean(),
  qUnarmoredBonus: z.bigint(),
  qWearingArmorBonus: z.bigint(),
  qFloor: z.bigint(),
  qCurrentAc: z.bigint(),
});

function normalizeQuintState(raw: unknown): ModelState {
  const parsed = quintStateSchema.parse(raw);
  return {
    baseKind: Number(parsed.qBaseKind),
    baseAc: Number(parsed.qBaseAc),
    dex: Number(parsed.qDex),
    con: Number(parsed.qCon),
    shieldBonus: Number(parsed.qShieldBonus),
    shieldTrained: parsed.qShieldTrained,
    wieldingShield: parsed.qWieldingShield,
    unarmoredBonus: Number(parsed.qUnarmoredBonus),
    wearingArmorBonus: Number(parsed.qWearingArmorBonus),
    floor: Number(parsed.qFloor),
    currentAc: Number(parsed.qCurrentAc),
  };
}

function compareState(spec: ModelState, impl: ModelState): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const bracers = {
  kind: "unarmored_no_shield" as const,
  bonus: armorClassDelta(2),
  sourceUnitId: "magic_item_bracers_of_defense",
};

const defense = {
  kind: "wearing_armor" as const,
  bonus: armorClassDelta(1),
  categories: ["light", "medium", "heavy"] as const,
  sourceUnitId: "feat_defense",
};

function armorClassFixture(fixture: number): ArmorClassState {
  if (fixture === 0) return statBlockArmorClassState(15);

  if (fixture === 1) {
    return {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(2),
      },
    };
  }

  if (fixture === 2) {
    return {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(2),
        con: abilityModifier(3),
      },
      base: {
        kind: "ability_sum",
        base: armorClass(10),
        abilityModifiers: ["dex", "con"],
        source: "barbarian_unarmored_defense",
      },
      bonuses: [
        {
          kind: "shield",
          bonus: armorClassDelta(2),
          handUse: "shield",
          trainingRequired: "shield",
        },
      ],
      armorTraining: new Set(["shield"]),
      leftHandUse: "shield",
    };
  }

  if (fixture === 3) {
    return {
      ...defaultArmorClassState(),
      bonuses: [
        {
          kind: "shield",
          bonus: armorClassDelta(2),
          handUse: "shield",
          trainingRequired: "shield",
        },
      ],
      armorTraining: new Set(["shield"]),
      leftHandUse: "grapple",
    };
  }

  if (fixture === 4) {
    return {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(4),
      },
      base: {
        kind: "armor",
        category: "medium",
        formula: {
          kind: "medium_dex_max_2",
          base: 14,
        },
      },
    };
  }

  if (fixture === 5) {
    return {
      ...defaultArmorClassState(),
      bonuses: [bracers],
    };
  }

  if (fixture === 6) {
    return {
      ...defaultArmorClassState(),
      bonuses: [bracers],
      leftHandUse: "shield",
    };
  }

  if (fixture === 7) {
    return {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...zeroAbilityModifiers(),
        dex: abilityModifier(2),
      },
      base: {
        kind: "armor",
        category: "medium",
        formula: {
          kind: "medium_dex_max_2",
          base: 14,
        },
      },
      bonuses: [defense],
    };
  }

  return {
    ...defaultArmorClassState(),
    abilityModifiers: {
      ...zeroAbilityModifiers(),
      dex: abilityModifier(-1),
    },
    floors: [{ floor: armorClass(17), sourceUnitId: "barkskin" }],
  };
}

function modelState(fixture: number): ModelState {
  const fixtures = [
    {
      baseKind: 0,
      baseAc: 15,
      dex: 0,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 1,
      baseAc: 10,
      dex: 2,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 2,
      baseAc: 10,
      dex: 2,
      con: 3,
      shieldBonus: 2,
      shieldTrained: true,
      wieldingShield: true,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 1,
      baseAc: 10,
      dex: 0,
      con: 0,
      shieldBonus: 2,
      shieldTrained: true,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 3,
      baseAc: 14,
      dex: 4,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 1,
      baseAc: 10,
      dex: 0,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 2,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 1,
      baseAc: 10,
      dex: 0,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: true,
      unarmoredBonus: 2,
      wearingArmorBonus: 0,
      floor: 1,
    },
    {
      baseKind: 3,
      baseAc: 14,
      dex: 2,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 1,
      floor: 1,
    },
    {
      baseKind: 1,
      baseAc: 10,
      dex: -1,
      con: 0,
      shieldBonus: 0,
      shieldTrained: false,
      wieldingShield: false,
      unarmoredBonus: 0,
      wearingArmorBonus: 0,
      floor: 17,
    },
  ] as const;

  return {
    ...fixtures[fixture],
    currentAc: Number(currentArmorClass(armorClassFixture(fixture))),
  };
}

const driverSchema = {
  init: {},
  doStatBlock: {},
  doUnarmoredDex2: {},
  doBarbarianShield: {},
  doShieldNotWielded: {},
  doMediumDexCapped: {},
  doBracersUnarmored: {},
  doBracersWithShield: {},
  doFloorAfterBase: {},
  doDefenseMediumArmor: {},
  step: {},
} as const;

function createArmorClassDriver() {
  return defineDriver(driverSchema, () => {
    let state = modelState(0);

    const setFixture = (fixture: number) => {
      state = modelState(fixture);
    };

    return {
      init: () => setFixture(0),
      doStatBlock: () => setFixture(0),
      doUnarmoredDex2: () => setFixture(1),
      doBarbarianShield: () => setFixture(2),
      doShieldNotWielded: () => setFixture(3),
      doMediumDexCapped: () => setFixture(4),
      doBracersUnarmored: () => setFixture(5),
      doBracersWithShield: () => setFixture(6),
      doFloorAfterBase: () => setFixture(8),
      doDefenseMediumArmor: () => setFixture(7),
      step: () => {},
      getState: () => state,
    };
  });
}

const armorClassStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Armor Class Algebra MBT", () => {
  it("replays armor-class traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../armor-class-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createArmorClassDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: armorClassStateCheck,
    });
  }, 120_000);
});
