// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt armor-class-base-formula barbarian_unarmored_defense monk_unarmored_defense
// UNIT-IDENTITY-MBT-REPLAY: armor-class-base-formula barbarian_unarmored_defense doSelectBarbarianUnarmoredDefense doSelectBarbarianUnarmoredDefenseWithShield
// UNIT-IDENTITY-MBT-REPLAY: armor-class-base-formula monk_unarmored_defense doSelectMonkUnarmoredDefense
// KERNEL-COVERAGE: parity-witness SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  currentArmorClass,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { characterSheetArmorClassState } from "./index.ts";

const BARBARIAN_UNARMORED_DEFENSE_UNIT_ID = "barbarian_unarmored_defense";
const MONK_UNARMORED_DEFENSE_UNIT_ID = "monk_unarmored_defense";
const SELECTED_UNARMORED_DEFENSE_UNIT_IDS = [
  BARBARIAN_UNARMORED_DEFENSE_UNIT_ID,
  MONK_UNARMORED_DEFENSE_UNIT_ID,
] as const;
const ARMOR_FORMULA_UNIT_IDS = [
  "armor_leather",
  "armor_chain_shirt",
  "armor_chain_mail",
] as const;
type ArmorClassAbilityModifier = Extract<
  ArmorClassState["base"],
  { readonly kind: "ability_sum" }
>["abilityModifiers"][number];
type ArmorClassArmorBase = Extract<
  ArmorClassState["base"],
  { readonly kind: "armor" }
>;
const BARBARIAN_UNARMORED_DEFENSE_ABILITY_MODIFIERS = [
  "dex",
  "con",
] as const satisfies ReadonlyArray<ArmorClassAbilityModifier>;
const MONK_UNARMORED_DEFENSE_ABILITY_MODIFIERS = [
  "dex",
  "wis",
] as const satisfies ReadonlyArray<ArmorClassAbilityModifier>;
type SelectedUnarmoredDefenseUnitId =
  (typeof SELECTED_UNARMORED_DEFENSE_UNIT_IDS)[number];
type ArmorFormulaUnitId = (typeof ARMOR_FORMULA_UNIT_IDS)[number];

const armorClassBaseSelectedIdentityDriverSchema = {
  init: {},
  doSelectBarbarianUnarmoredDefense: {},
  doSelectBarbarianUnarmoredDefenseWithShield: {},
  doSelectMonkUnarmoredDefense: {},
  doProjectLightArmor: {},
  doProjectMediumArmorDexCap: {},
  doProjectHeavyArmorWithShield: {},
  step: {},
} as const;
type ArmorClassBaseSelectedIdentityDriverAction = Exclude<
  keyof typeof armorClassBaseSelectedIdentityDriverSchema,
  "init" | "step"
>;

type ArmorClassBaseSelectedIdentityProjection =
  | {
      readonly outcome: "init";
      readonly base: {
        readonly source: "default_unarmored";
        readonly baseArmorClass: number;
        readonly abilityModifiers: {
          readonly dex: true;
        };
      };
      readonly shieldBonus: 0;
      readonly armorClass: 12;
    }
  | {
      readonly outcome: "selected";
      readonly base:
        | SelectedArmorClassBaseProjection
        | ArmorFormulaBaseProjection;
      readonly shieldBonus: number;
      readonly armorClass: number;
    };
type SelectedArmorClassBaseProjection =
  | {
      readonly source: "unarmored_defense";
      readonly sourceUnitId: typeof BARBARIAN_UNARMORED_DEFENSE_UNIT_ID;
      readonly baseArmorClass: number;
      readonly abilityModifiers: {
        readonly dex: true;
        readonly con: true;
      };
    }
  | {
      readonly source: "unarmored_defense";
      readonly sourceUnitId: typeof MONK_UNARMORED_DEFENSE_UNIT_ID;
      readonly baseArmorClass: number;
      readonly abilityModifiers: {
        readonly dex: true;
        readonly wis: true;
      };
    };
type ArmorFormulaBaseProjection =
  | {
      readonly source: "armor";
      readonly sourceUnitId: "armor_leather";
      readonly category: "light";
      readonly formula: "light_dex";
      readonly baseArmorClass: 11;
      readonly abilityModifiers: {
        readonly dex: true;
      };
    }
  | {
      readonly source: "armor";
      readonly sourceUnitId: "armor_chain_shirt";
      readonly category: "medium";
      readonly formula: "medium_dex_max_2";
      readonly baseArmorClass: 13;
      readonly abilityModifiers: {
        readonly dex: true;
      };
    }
  | {
      readonly source: "armor";
      readonly sourceUnitId: "armor_chain_mail";
      readonly category: "heavy";
      readonly formula: "heavy_fixed";
      readonly baseArmorClass: 16;
      readonly abilityModifiers: Record<string, never>;
    };
type SelectedBarbarianProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly outcome: "selected" }
> & {
  readonly base: Extract<
    SelectedArmorClassBaseProjection,
    { readonly sourceUnitId: typeof BARBARIAN_UNARMORED_DEFENSE_UNIT_ID }
  >;
};
type SelectedMonkProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly outcome: "selected" }
> & {
  readonly base: Extract<
    SelectedArmorClassBaseProjection,
    { readonly sourceUnitId: typeof MONK_UNARMORED_DEFENSE_UNIT_ID }
  >;
};
type SelectedUnarmoredDefenseProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly outcome: "selected" }
> & {
  readonly base: SelectedArmorClassBaseProjection;
};
type ArmorFormulaProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly outcome: "selected" }
> & {
  readonly base: ArmorFormulaBaseProjection;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ArmorClassBaseSelectedIdentityDriverAction[];
  readonly expected: ArmorClassBaseSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "armor-class-base-formula";
  readonly unitId: SelectedUnarmoredDefenseUnitId;
  readonly actions: readonly ArmorClassBaseSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};
type ArmorFormulaReplaySequence = {
  readonly name: string;
  readonly actions: readonly ArmorClassBaseSelectedIdentityDriverAction[];
  readonly expected: ArmorFormulaProjection;
};
type ArmorFormulaReplay = {
  readonly taskId: "armor-class-base-formula";
  readonly unitId: ArmorFormulaUnitId;
  readonly actions: readonly ArmorClassBaseSelectedIdentityDriverAction[];
  readonly sequences: readonly ArmorFormulaReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Armor Class base selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "armor-class-base-formula",
    unitId: "barbarian_unarmored_defense",
    actions: [
      "doSelectBarbarianUnarmoredDefense",
      "doSelectBarbarianUnarmoredDefenseWithShield",
    ],
    sequences: [
      {
        name: "selected-barbarian-unarmored-defense-base-formula",
        actions: ["doSelectBarbarianUnarmoredDefense"],
        expected: selectedBarbarianProjection({
          shieldBonus: 0,
          armorClass: 13,
        }),
      },
      {
        name: "selected-barbarian-unarmored-defense-with-shield-bonus",
        actions: ["doSelectBarbarianUnarmoredDefenseWithShield"],
        expected: selectedBarbarianProjection({
          shieldBonus: 2,
          armorClass: 15,
        }),
      },
    ],
  },
  {
    taskId: "armor-class-base-formula",
    unitId: "monk_unarmored_defense",
    actions: ["doSelectMonkUnarmoredDefense"],
    sequences: [
      {
        name: "selected-monk-unarmored-defense-base-formula",
        actions: ["doSelectMonkUnarmoredDefense"],
        expected: selectedMonkProjection({
          armorClass: 15,
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const armorFormulaReplays = [
  {
    taskId: "armor-class-base-formula",
    unitId: "armor_leather",
    actions: ["doProjectLightArmor"],
    sequences: [
      {
        name: "light-armor-adds-full-dexterity-modifier",
        actions: ["doProjectLightArmor"],
        expected: armorFormulaProjection({
          sourceUnitId: "armor_leather",
          category: "light",
          formula: "light_dex",
          baseArmorClass: 11,
          shieldBonus: 0,
          armorClass: 13,
        }),
      },
    ],
  },
  {
    taskId: "armor-class-base-formula",
    unitId: "armor_chain_shirt",
    actions: ["doProjectMediumArmorDexCap"],
    sequences: [
      {
        name: "medium-armor-caps-dexterity-modifier-at-two",
        actions: ["doProjectMediumArmorDexCap"],
        expected: armorFormulaProjection({
          sourceUnitId: "armor_chain_shirt",
          category: "medium",
          formula: "medium_dex_max_2",
          baseArmorClass: 13,
          shieldBonus: 0,
          armorClass: 15,
        }),
      },
    ],
  },
  {
    taskId: "armor-class-base-formula",
    unitId: "armor_chain_mail",
    actions: ["doProjectHeavyArmorWithShield"],
    sequences: [
      {
        name: "heavy-armor-uses-fixed-ac-and-trained-shield-bonus",
        actions: ["doProjectHeavyArmorWithShield"],
        expected: armorFormulaProjection({
          sourceUnitId: "armor_chain_mail",
          category: "heavy",
          formula: "heavy_fixed",
          baseArmorClass: 16,
          shieldBonus: 2,
          armorClass: 18,
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<ArmorFormulaReplay>;

describe("Character Sheet Armor Class base selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ArmorClassBaseSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createArmorClassBaseSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet Armor Class base selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Armor Class base selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays SRD armor base formulas deterministically", async () => {
    for (const replay of armorFormulaReplays) {
      const replayedActions =
        new Set<ArmorClassBaseSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createArmorClassBaseSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet Armor Class base formula driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Armor Class base formula driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet Armor Class base selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-armor-class-base-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createArmorClassBaseSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: armorClassBaseSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createArmorClassBaseSelectedIdentityDriver() {
  return defineDriver(armorClassBaseSelectedIdentityDriverSchema, () => {
    let projection: ArmorClassBaseSelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSelectBarbarianUnarmoredDefense: () => {
        projection = selectedBarbarianUnarmoredDefenseProjection({
          shield: false,
        });
      },
      doSelectBarbarianUnarmoredDefenseWithShield: () => {
        projection = selectedBarbarianUnarmoredDefenseProjection({
          shield: true,
        });
      },
      doSelectMonkUnarmoredDefense: () => {
        projection = selectedMonkUnarmoredDefenseProjection();
      },
      doProjectLightArmor: () => {
        projection = armorFormulaProjectionForBuild({
          armor: "armor_leather",
          shield: false,
        });
      },
      doProjectMediumArmorDexCap: () => {
        projection = armorFormulaProjectionForBuild({
          armor: "armor_chain_shirt",
          shield: false,
          dexterityScore: 16,
        });
      },
      doProjectHeavyArmorWithShield: () => {
        projection = armorFormulaProjectionForBuild({
          armor: "armor_chain_mail",
          shield: true,
        });
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function selectedBarbarianUnarmoredDefenseProjection(input: {
  readonly shield: boolean;
}): SelectedBarbarianProjection {
  return projectArmorClassBaseSelectedIdentityState(
    requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
          shield: input.shield,
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: BARBARIAN_UNARMORED_DEFENSE_UNIT_ID,
        },
      }),
    ),
    BARBARIAN_UNARMORED_DEFENSE_UNIT_ID,
  );
}

function selectedMonkUnarmoredDefenseProjection(): SelectedMonkProjection {
  return projectArmorClassBaseSelectedIdentityState(
    requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
          shield: false,
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: MONK_UNARMORED_DEFENSE_UNIT_ID,
        },
      }),
    ),
    MONK_UNARMORED_DEFENSE_UNIT_ID,
  );
}

function armorFormulaProjectionForBuild(input: {
  readonly armor: ArmorFormulaUnitId;
  readonly shield: boolean;
  readonly dexterityScore?: number;
}): ArmorFormulaProjection {
  return projectArmorClassArmorFormulaState(
    requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_fighter",
          armor: input.armor,
          shield: input.shield,
          ...(input.dexterityScore === undefined
            ? {}
            : { dexterityScore: input.dexterityScore }),
        }),
        unitLibrary,
      }),
    ),
    input.armor,
  );
}

function initialProjection(): ArmorClassBaseSelectedIdentityProjection {
  return {
    outcome: "init",
    base: {
      source: "default_unarmored",
      baseArmorClass: 10,
      abilityModifiers: { dex: true },
    },
    shieldBonus: 0,
    armorClass: 12,
  };
}

function armorFormulaProjection(input: {
  readonly sourceUnitId: "armor_leather";
  readonly category: "light";
  readonly formula: "light_dex";
  readonly baseArmorClass: 11;
  readonly shieldBonus: number;
  readonly armorClass: number;
}): ArmorFormulaProjection;
function armorFormulaProjection(input: {
  readonly sourceUnitId: "armor_chain_shirt";
  readonly category: "medium";
  readonly formula: "medium_dex_max_2";
  readonly baseArmorClass: 13;
  readonly shieldBonus: number;
  readonly armorClass: number;
}): ArmorFormulaProjection;
function armorFormulaProjection(input: {
  readonly sourceUnitId: "armor_chain_mail";
  readonly category: "heavy";
  readonly formula: "heavy_fixed";
  readonly baseArmorClass: 16;
  readonly shieldBonus: number;
  readonly armorClass: number;
}): ArmorFormulaProjection;
function armorFormulaProjection(input: {
  readonly sourceUnitId: ArmorFormulaUnitId;
  readonly category: ArmorClassArmorBase["category"];
  readonly formula: ArmorClassArmorBase["formula"]["kind"];
  readonly baseArmorClass: number;
  readonly shieldBonus: number;
  readonly armorClass: number;
}): ArmorFormulaProjection {
  return {
    outcome: "selected",
    base: armorFormulaBaseProjection(input),
    shieldBonus: input.shieldBonus,
    armorClass: input.armorClass,
  };
}

function armorFormulaBaseProjection(input: {
  readonly sourceUnitId: ArmorFormulaUnitId;
  readonly category: ArmorClassArmorBase["category"];
  readonly formula: ArmorClassArmorBase["formula"]["kind"];
  readonly baseArmorClass: number;
}): ArmorFormulaBaseProjection {
  if (
    input.sourceUnitId === "armor_leather" &&
    input.category === "light" &&
    input.formula === "light_dex" &&
    input.baseArmorClass === 11
  ) {
    return {
      source: "armor",
      sourceUnitId: input.sourceUnitId,
      category: input.category,
      formula: input.formula,
      baseArmorClass: input.baseArmorClass,
      abilityModifiers: { dex: true },
    };
  }
  if (
    input.sourceUnitId === "armor_chain_shirt" &&
    input.category === "medium" &&
    input.formula === "medium_dex_max_2" &&
    input.baseArmorClass === 13
  ) {
    return {
      source: "armor",
      sourceUnitId: input.sourceUnitId,
      category: input.category,
      formula: input.formula,
      baseArmorClass: input.baseArmorClass,
      abilityModifiers: { dex: true },
    };
  }
  if (
    input.sourceUnitId === "armor_chain_mail" &&
    input.category === "heavy" &&
    input.formula === "heavy_fixed" &&
    input.baseArmorClass === 16
  ) {
    return {
      source: "armor",
      sourceUnitId: input.sourceUnitId,
      category: input.category,
      formula: input.formula,
      baseArmorClass: input.baseArmorClass,
      abilityModifiers: {},
    };
  }
  throw new Error(
    `Unexpected Armor Class armor formula projection ${input.sourceUnitId}/${input.category}/${input.formula}.`,
  );
}

function selectedBarbarianProjection(input: {
  readonly shieldBonus: number;
  readonly armorClass: number;
}): SelectedBarbarianProjection {
  return {
    outcome: "selected",
    base: {
      source: "unarmored_defense",
      sourceUnitId: BARBARIAN_UNARMORED_DEFENSE_UNIT_ID,
      baseArmorClass: 10,
      abilityModifiers: { dex: true, con: true },
    },
    shieldBonus: input.shieldBonus,
    armorClass: input.armorClass,
  };
}

function selectedMonkProjection(input: {
  readonly armorClass: number;
}): SelectedMonkProjection {
  return {
    outcome: "selected",
    base: {
      source: "unarmored_defense",
      sourceUnitId: MONK_UNARMORED_DEFENSE_UNIT_ID,
      baseArmorClass: 10,
      abilityModifiers: { dex: true, wis: true },
    },
    shieldBonus: 0,
    armorClass: input.armorClass,
  };
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: ArmorFormulaUnitId;
  readonly shield: boolean;
  readonly dexterityScore?: number;
}): CharacterBuild {
  const armorItemId =
    input.armor === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "armor",
          unitId: requireRight(characterEquipmentItemUnitId(input.armor)),
        });
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: requireRight(
            characterEquipmentItemUnitId("equipment_shield"),
          ),
        })
      : undefined;
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: input.dexterityScore ?? 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: input.armor }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function projectArmorClassBaseSelectedIdentityState(
  state: ArmorClassState,
  expectedSourceUnitId: typeof BARBARIAN_UNARMORED_DEFENSE_UNIT_ID,
): SelectedBarbarianProjection;
function projectArmorClassBaseSelectedIdentityState(
  state: ArmorClassState,
  expectedSourceUnitId: typeof MONK_UNARMORED_DEFENSE_UNIT_ID,
): SelectedMonkProjection;
function projectArmorClassBaseSelectedIdentityState(
  state: ArmorClassState,
  expectedSourceUnitId: SelectedUnarmoredDefenseUnitId,
): SelectedUnarmoredDefenseProjection;
function projectArmorClassBaseSelectedIdentityState(
  state: ArmorClassState,
  expectedSourceUnitId: SelectedUnarmoredDefenseUnitId,
): SelectedUnarmoredDefenseProjection {
  const base = requireUnarmoredDefenseBase(state.base);
  if (base.sourceUnitId !== expectedSourceUnitId) {
    throw new Error(
      `Expected selected Armor Class base source ${expectedSourceUnitId}, got ${base.sourceUnitId}.`,
    );
  }
  return {
    outcome: "selected",
    base,
    shieldBonus: projectedShieldBonus(state),
    armorClass: Number(currentArmorClass(state)),
  };
}

function projectArmorClassArmorFormulaState(
  state: ArmorClassState,
  expectedSourceUnitId: "armor_leather",
): ArmorFormulaProjection;
function projectArmorClassArmorFormulaState(
  state: ArmorClassState,
  expectedSourceUnitId: "armor_chain_shirt",
): ArmorFormulaProjection;
function projectArmorClassArmorFormulaState(
  state: ArmorClassState,
  expectedSourceUnitId: "armor_chain_mail",
): ArmorFormulaProjection;
function projectArmorClassArmorFormulaState(
  state: ArmorClassState,
  expectedSourceUnitId: ArmorFormulaUnitId,
): ArmorFormulaProjection;
function projectArmorClassArmorFormulaState(
  state: ArmorClassState,
  expectedSourceUnitId: ArmorFormulaUnitId,
): ArmorFormulaProjection {
  const base = requireArmorBase(state.base);
  if (
    expectedSourceUnitId === "armor_leather" &&
    base.category === "light" &&
    base.formula.kind === "light_dex" &&
    base.formula.base === 11
  ) {
    return armorFormulaProjection({
      sourceUnitId: expectedSourceUnitId,
      category: base.category,
      formula: base.formula.kind,
      baseArmorClass: 11,
      shieldBonus: projectedShieldBonus(state),
      armorClass: Number(currentArmorClass(state)),
    });
  }
  if (
    expectedSourceUnitId === "armor_chain_shirt" &&
    base.category === "medium" &&
    base.formula.kind === "medium_dex_max_2" &&
    base.formula.base === 13
  ) {
    return armorFormulaProjection({
      sourceUnitId: expectedSourceUnitId,
      category: base.category,
      formula: base.formula.kind,
      baseArmorClass: 13,
      shieldBonus: projectedShieldBonus(state),
      armorClass: Number(currentArmorClass(state)),
    });
  }
  if (
    expectedSourceUnitId === "armor_chain_mail" &&
    base.category === "heavy" &&
    base.formula.kind === "heavy_fixed" &&
    base.formula.ac === 16
  ) {
    return armorFormulaProjection({
      sourceUnitId: expectedSourceUnitId,
      category: base.category,
      formula: base.formula.kind,
      baseArmorClass: 16,
      shieldBonus: projectedShieldBonus(state),
      armorClass: Number(currentArmorClass(state)),
    });
  }
  throw new Error(
    `Expected ${expectedSourceUnitId} Armor Class formula, got ${base.category}/${base.formula.kind}.`,
  );
}

function requireArmorBase(base: ArmorClassState["base"]): ArmorClassArmorBase {
  if (base.kind === "armor") return base;
  throw new Error(`Expected armor Armor Class base, got ${base.kind}.`);
}

function projectedShieldBonus(state: ArmorClassState): number {
  return state.bonuses
    .filter((bonus) => bonus.kind === "shield")
    .reduce((total, bonus) => total + Number(bonus.bonus), 0);
}

function requireUnarmoredDefenseBase(
  base: ArmorClassState["base"],
): SelectedArmorClassBaseProjection {
  if (
    base.kind !== "ability_sum" ||
    base.source !== "unarmored_defense" ||
    !("sourceUnitId" in base) ||
    !isSelectedUnarmoredDefenseUnitId(base.sourceUnitId)
  ) {
    throw new Error(
      `Expected selected Unarmored Defense ability-sum base, got ${base.kind}.`,
    );
  }
  if (base.sourceUnitId === BARBARIAN_UNARMORED_DEFENSE_UNIT_ID) {
    if (
      !hasOnlyAbilityModifiers(
        base.abilityModifiers,
        BARBARIAN_UNARMORED_DEFENSE_ABILITY_MODIFIERS,
      )
    ) {
      throw new Error(
        `Expected Barbarian Unarmored Defense to use Dexterity and Constitution modifiers, got ${base.abilityModifiers.join(",")}.`,
      );
    }
    return {
      source: "unarmored_defense",
      sourceUnitId: base.sourceUnitId,
      baseArmorClass: Number(base.base),
      abilityModifiers: { dex: true, con: true },
    };
  }
  if (
    !hasOnlyAbilityModifiers(
      base.abilityModifiers,
      MONK_UNARMORED_DEFENSE_ABILITY_MODIFIERS,
    )
  ) {
    throw new Error(
      `Expected Monk Unarmored Defense to use Dexterity and Wisdom modifiers, got ${base.abilityModifiers.join(",")}.`,
    );
  }
  return {
    source: "unarmored_defense",
    sourceUnitId: base.sourceUnitId,
    baseArmorClass: Number(base.base),
    abilityModifiers: { dex: true, wis: true },
  };
}

function hasOnlyAbilityModifiers(
  actual: readonly ArmorClassAbilityModifier[],
  expected: readonly ArmorClassAbilityModifier[],
): boolean {
  return (
    actual.length === expected.length &&
    expected.every((modifier) => actual.includes(modifier))
  );
}

function isSelectedUnarmoredDefenseUnitId(
  unitId: string,
): unitId is SelectedUnarmoredDefenseUnitId {
  return SELECTED_UNARMORED_DEFENSE_UNIT_IDS.some(
    (selectedUnitId) => selectedUnitId === unitId,
  );
}

const qntOutcomeByVariant = {
  CharacterSheetArmorClassBaseSelectedIdentityInit: "init",
  CharacterSheetArmorClassBaseSelectedIdentitySelected: "selected",
} as const;

function outcomeField(
  raw: unknown,
): (typeof qntOutcomeByVariant)[keyof typeof qntOutcomeByVariant] {
  const tag = nullaryVariantTag(raw, "qState.outcome");
  const outcome = Object.entries(qntOutcomeByVariant).find(
    ([variant]) => variant === tag,
  )?.[1];
  if (outcome !== undefined) return outcome;
  throw new Error(`Unknown Quint outcome variant ${tag}.`);
}

function nullaryVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const record = Object.fromEntries(Object.entries(raw));
    const tag = record["tag"];
    if (typeof tag === "string") return tag;
  }
  throw new Error(`Expected Quint variant field ${field}.`);
}

function requireRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isRight(result)) return result.right;
  const left = result.left;
  if (
    left !== null &&
    typeof left === "object" &&
    "message" in left &&
    typeof left.message === "string"
  ) {
    throw new Error(left.message);
  }
  throw new Error(JSON.stringify(left));
}

function normalizeArmorClassBaseSelectedIdentityQuintState(
  raw: unknown,
): ArmorClassBaseSelectedIdentityProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  const outcome = outcomeField(state["outcome"]);
  if (outcome === "init") {
    assertStringField(state, "sourceUnitId", "none");
    assertStringField(state, "baseSource", "default_unarmored");
    assertBooleanField(state, "usesDex", true);
    assertBooleanField(state, "usesCon", false);
    assertBooleanField(state, "usesWis", false);
    assertNumberField(state, "baseArmorClass", 10);
    assertNumberField(state, "shieldBonus", 0);
    assertNumberField(state, "armorClass", 12);
    return initialProjection();
  }
  const baseSource = stringField(state, "baseSource");
  if (baseSource === "armor") {
    const sourceUnitId = armorFormulaUnitIdField(state);
    const baseArmorClass = numberFromQuintInt(
      state["baseArmorClass"],
      "qState.baseArmorClass",
    );
    const shieldBonus = numberFromQuintInt(
      state["shieldBonus"],
      "qState.shieldBonus",
    );
    const armorClass = numberFromQuintInt(
      state["armorClass"],
      "qState.armorClass",
    );
    if (sourceUnitId === "armor_leather" && baseArmorClass === 11) {
      assertBooleanField(state, "usesDex", true);
      assertBooleanField(state, "usesCon", false);
      assertBooleanField(state, "usesWis", false);
      return armorFormulaProjection({
        sourceUnitId,
        category: "light",
        formula: "light_dex",
        baseArmorClass,
        shieldBonus,
        armorClass,
      });
    }
    if (sourceUnitId === "armor_chain_shirt" && baseArmorClass === 13) {
      assertBooleanField(state, "usesDex", true);
      assertBooleanField(state, "usesCon", false);
      assertBooleanField(state, "usesWis", false);
      return armorFormulaProjection({
        sourceUnitId,
        category: "medium",
        formula: "medium_dex_max_2",
        baseArmorClass,
        shieldBonus,
        armorClass,
      });
    }
    if (sourceUnitId === "armor_chain_mail" && baseArmorClass === 16) {
      assertBooleanField(state, "usesDex", false);
      assertBooleanField(state, "usesCon", false);
      assertBooleanField(state, "usesWis", false);
      return armorFormulaProjection({
        sourceUnitId,
        category: "heavy",
        formula: "heavy_fixed",
        baseArmorClass,
        shieldBonus,
        armorClass,
      });
    }
    throw new Error(
      `Unexpected Armor Class armor formula ${sourceUnitId}/${baseArmorClass}.`,
    );
  }
  const sourceUnitId = selectedUnarmoredDefenseUnitIdField(state);
  assertStringField(state, "baseSource", "unarmored_defense");
  assertBooleanField(state, "usesDex", true);
  const usesBarbarianFormula =
    sourceUnitId === BARBARIAN_UNARMORED_DEFENSE_UNIT_ID;
  assertBooleanField(state, "usesCon", usesBarbarianFormula);
  assertBooleanField(state, "usesWis", !usesBarbarianFormula);
  const baseArmorClass = numberFromQuintInt(
    state["baseArmorClass"],
    "qState.baseArmorClass",
  );
  const shieldBonus = numberFromQuintInt(
    state["shieldBonus"],
    "qState.shieldBonus",
  );
  const armorClass = numberFromQuintInt(
    state["armorClass"],
    "qState.armorClass",
  );
  if (usesBarbarianFormula) {
    return {
      outcome,
      base: {
        source: "unarmored_defense",
        sourceUnitId,
        baseArmorClass,
        abilityModifiers: { dex: true, con: true },
      },
      shieldBonus,
      armorClass,
    };
  }
  return {
    outcome,
    base: {
      source: "unarmored_defense",
      sourceUnitId,
      baseArmorClass,
      abilityModifiers: { dex: true, wis: true },
    },
    shieldBonus,
    armorClass,
  };
}

function selectedUnarmoredDefenseUnitIdField(
  state: Readonly<Record<string, unknown>>,
): SelectedUnarmoredDefenseUnitId {
  const sourceUnitId = stringField(state, "sourceUnitId");
  if (isSelectedUnarmoredDefenseUnitId(sourceUnitId)) return sourceUnitId;
  throw new Error(
    `Unexpected selected Unarmored Defense Unit ${sourceUnitId}.`,
  );
}

function armorFormulaUnitIdField(
  state: Readonly<Record<string, unknown>>,
): ArmorFormulaUnitId {
  const sourceUnitId = stringField(state, "sourceUnitId");
  if (isArmorFormulaUnitId(sourceUnitId)) return sourceUnitId;
  throw new Error(`Unexpected Armor Class armor Unit ${sourceUnitId}.`);
}

function isArmorFormulaUnitId(unitId: string): unitId is ArmorFormulaUnitId {
  return ARMOR_FORMULA_UNIT_IDS.some(
    (armorFormulaUnitId) => armorFormulaUnitId === unitId,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function stringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const value = state[field];
  if (typeof value === "string") return value;
  throw new Error(`Expected Quint string field ${field}.`);
}

function assertStringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: string,
): void {
  const value = stringField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint string field ${field} to equal ${expected}.`,
    );
  }
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function assertBooleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: boolean,
): void {
  const value = booleanField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint boolean field ${field} to equal ${expected}.`,
    );
  }
}

function assertNumberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = numberFromQuintInt(state[field], field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint integer field ${field} to equal ${expected}.`,
    );
  }
}

const armorClassBaseSelectedIdentityStateCheck = stateCheck(
  normalizeArmorClassBaseSelectedIdentityQuintState,
  (
    spec: ArmorClassBaseSelectedIdentityProjection,
    impl: ArmorClassBaseSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
