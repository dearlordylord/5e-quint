// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt armor-class-base-formula barbarian_unarmored_defense
// UNIT-IDENTITY-MBT-REPLAY: armor-class-base-formula barbarian_unarmored_defense doSelectBarbarianUnarmoredDefense doSelectBarbarianUnarmoredDefenseWithShield
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

const armorClassBaseSelectedIdentityDriverSchema = {
  init: {},
  doSelectBarbarianUnarmoredDefense: {},
  doSelectBarbarianUnarmoredDefenseWithShield: {},
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
      readonly base: {
        readonly source: "unarmored_defense";
        readonly sourceUnitId: "barbarian_unarmored_defense";
        readonly baseArmorClass: number;
        readonly abilityModifiers: {
          readonly dex: true;
          readonly con: true;
        };
      };
      readonly shieldBonus: number;
      readonly armorClass: number;
    };
type SelectedBarbarianProjection = Extract<
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
  readonly unitId: "barbarian_unarmored_defense";
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
          unitId: "barbarian_unarmored_defense",
        },
      }),
    ),
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
      sourceUnitId: "barbarian_unarmored_defense",
      baseArmorClass: 10,
      abilityModifiers: { dex: true, con: true },
    },
    shieldBonus: input.shieldBonus,
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
          unitId: requireRight(characterEquipmentItemUnitId("equipment_shield")),
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
      loadout:
        shieldItemId === undefined ? {} : { shield: shieldItemId },
    },
  };
}

function projectArmorClassBaseSelectedIdentityState(
  state: ArmorClassState,
): SelectedBarbarianProjection {
  const base = requireBarbarianUnarmoredDefenseBase(state.base);
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

function requireBarbarianUnarmoredDefenseBase(
  base: ArmorClassState["base"],
): SelectedBarbarianProjection["base"] {
  if (
    base.kind !== "ability_sum" ||
    base.source !== "unarmored_defense" ||
    !("sourceUnitId" in base) ||
    base.sourceUnitId !== "barbarian_unarmored_defense"
  ) {
    throw new Error(
      `Expected Barbarian Unarmored Defense ability-sum base, got ${base.kind}.`,
    );
  }
  if (
    !base.abilityModifiers.includes("dex") ||
    !base.abilityModifiers.includes("con") ||
    base.abilityModifiers.includes("wis")
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
  assertStringField(
    state,
    "qSourceUnitId",
    "barbarian_unarmored_defense",
  );
  assertStringField(state, "qBaseSource", "unarmored_defense");
  assertBooleanField(state, "qUsesDex", true);
  assertBooleanField(state, "qUsesCon", true);
  assertBooleanField(state, "qUsesWis", false);
  return {
    lastResult,
    base: {
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
      baseArmorClass: numberFromQuintInt(
        state["qBaseArmorClass"],
        "qBaseArmorClass",
      ),
      abilityModifiers: { dex: true, con: true },
    },
    shieldBonus: numberFromQuintInt(state["qShieldBonus"], "qShieldBonus"),
    armorClass: numberFromQuintInt(state["qArmorClass"], "qArmorClass"),
  };
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
    throw new Error(`Expected Quint string field ${field} to equal ${expected}.`);
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
    throw new Error(`Expected Quint boolean field ${field} to equal ${expected}.`);
  }
}

function assertNumberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = numberFromQuintInt(state[field], field);
  if (value !== expected) {
    throw new Error(`Expected Quint integer field ${field} to equal ${expected}.`);
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
