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
type ArmorClassAbilityModifier = Extract<
  ArmorClassState["base"],
  { readonly kind: "ability_sum" }
>["abilityModifiers"][number];
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

const armorClassBaseSelectedIdentityDriverSchema = {
  init: {},
  doSelectBarbarianUnarmoredDefense: {},
  doSelectBarbarianUnarmoredDefenseWithShield: {},
  doSelectMonkUnarmoredDefense: {},
  step: {},
} as const;
type ArmorClassBaseSelectedIdentityDriverAction = Exclude<
  keyof typeof armorClassBaseSelectedIdentityDriverSchema,
  "init" | "step"
>;

type ArmorClassBaseSelectedIdentityProjection =
  | {
      readonly lastResult: "init";
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
      readonly lastResult: "selected";
      readonly base: SelectedArmorClassBaseProjection;
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
type SelectedBarbarianProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly lastResult: "selected" }
> & {
  readonly base: Extract<
    SelectedArmorClassBaseProjection,
    { readonly sourceUnitId: typeof BARBARIAN_UNARMORED_DEFENSE_UNIT_ID }
  >;
};
type SelectedMonkProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly lastResult: "selected" }
> & {
  readonly base: Extract<
    SelectedArmorClassBaseProjection,
    { readonly sourceUnitId: typeof MONK_UNARMORED_DEFENSE_UNIT_ID }
  >;
};
type SelectedUnarmoredDefenseProjection = Extract<
  ArmorClassBaseSelectedIdentityProjection,
  { readonly lastResult: "selected" }
>;
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

function initialProjection(): ArmorClassBaseSelectedIdentityProjection {
  return {
    lastResult: "init",
    base: {
      source: "default_unarmored",
      baseArmorClass: 10,
      abilityModifiers: { dex: true },
    },
    shieldBonus: 0,
    armorClass: 12,
  };
}

function selectedBarbarianProjection(input: {
  readonly shieldBonus: number;
  readonly armorClass: number;
}): SelectedBarbarianProjection {
  return {
    lastResult: "selected",
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
    lastResult: "selected",
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
  readonly shield: boolean;
}): CharacterBuild {
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
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned:
        shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }],
      loadout: shieldItemId === undefined ? {} : { shield: shieldItemId },
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
  const shieldBonus = state.bonuses
    .filter((bonus) => bonus.kind === "shield")
    .reduce((total, bonus) => total + Number(bonus.bonus), 0);
  return {
    lastResult: "selected",
    base,
    shieldBonus,
    armorClass: Number(currentArmorClass(state)),
  };
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
  const state = quintStateRecord(raw);
  const lastResult = mbtLastResult(state["qLastResult"]);
  if (lastResult === "init") {
    assertStringField(state, "qSourceUnitId", "none");
    assertStringField(state, "qBaseSource", "default_unarmored");
    assertBooleanField(state, "qUsesDex", true);
    assertBooleanField(state, "qUsesCon", false);
    assertBooleanField(state, "qUsesWis", false);
    assertNumberField(state, "qBaseArmorClass", 10);
    assertNumberField(state, "qShieldBonus", 0);
    assertNumberField(state, "qArmorClass", 12);
    return initialProjection();
  }
  const sourceUnitId = selectedUnarmoredDefenseUnitIdField(state);
  assertStringField(state, "qBaseSource", "unarmored_defense");
  assertBooleanField(state, "qUsesDex", true);
  const usesBarbarianFormula =
    sourceUnitId === BARBARIAN_UNARMORED_DEFENSE_UNIT_ID;
  assertBooleanField(state, "qUsesCon", usesBarbarianFormula);
  assertBooleanField(state, "qUsesWis", !usesBarbarianFormula);
  const baseArmorClass = numberFromQuintInt(
    state["qBaseArmorClass"],
    "qBaseArmorClass",
  );
  const shieldBonus = numberFromQuintInt(state["qShieldBonus"], "qShieldBonus");
  const armorClass = numberFromQuintInt(state["qArmorClass"], "qArmorClass");
  if (usesBarbarianFormula) {
    return {
      lastResult,
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
    lastResult,
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
  const sourceUnitId = stringField(state, "qSourceUnitId");
  if (isSelectedUnarmoredDefenseUnitId(sourceUnitId)) return sourceUnitId;
  throw new Error(
    `Unexpected selected Unarmored Defense Unit ${sourceUnitId}.`,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
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

function mbtLastResult(
  raw: unknown,
): ArmorClassBaseSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "selected") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
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
