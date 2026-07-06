// UNIT-IDENTITY-EVIDENCE: selected-identity-replay healing-stabilization paladin_lay_on_hands
// UNIT-IDENTITY-REPLAY: healing-stabilization paladin_lay_on_hands doLayOnHandsRestoreHpAndRemovePoisoned
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  applyLayOnHands,
  characterSheetId,
  characterSheetResources,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetResourceState,
} from "./index.ts";

const healingResourceSelectedIdentityDriverSchema = {
  init: {},
  doLayOnHandsRestoreHpAndRemovePoisoned: {},
  step: {},
} as const;
type HealingResourceSelectedIdentityDriverAction = Exclude<
  keyof typeof healingResourceSelectedIdentityDriverSchema,
  "init" | "step"
>;

type HealingResourceSelectedIdentityProjection = {
  readonly sourceHp: number;
  readonly targetHp: number;
  readonly targetPoisoned: boolean;
  readonly poolExpended: number;
  readonly poolRemaining: number;
  readonly outcome: "init" | "resolved";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly HealingResourceSelectedIdentityDriverAction[];
  readonly expected: HealingResourceSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "healing-stabilization";
  readonly unitId: "paladin_lay_on_hands";
  readonly actions: readonly HealingResourceSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet healing resource selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "healing-stabilization",
    unitId: "paladin_lay_on_hands",
    actions: ["doLayOnHandsRestoreHpAndRemovePoisoned"],
    sequences: [
      {
        name: "restore-hit-points-and-remove-poisoned-from-one-pool",
        actions: ["doLayOnHandsRestoreHpAndRemovePoisoned"],
        expected: expectedProjection({
          targetHp: 5,
          targetPoisoned: false,
          poolExpended: 7,
          poolRemaining: 3,
          outcome: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet healing resource selected identity replay", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<HealingResourceSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createHealingResourceSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet healing resource selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet healing resource selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet healing resource selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-healing-resource-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHealingResourceSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: healingResourceSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createHealingResourceSelectedIdentityDriver() {
  return defineDriver(healingResourceSelectedIdentityDriverSchema, () => {
    let sheets = layOnHandsSheets();
    let outcome: HealingResourceSelectedIdentityProjection["outcome"] = "init";

    function reset(): void {
      sheets = layOnHandsSheets();
      outcome = "init";
    }

    return {
      init: reset,
      doLayOnHandsRestoreHpAndRemovePoisoned: () => {
        sheets = layOnHandsSheets();
        const result = applyLayOnHands({
          source: sheets.source,
          target: sheets.target,
          unitLibrary,
          restoreHp: Hp(2),
          removePoisoned: true,
        });
        if (Either.isLeft(result)) {
          throw new Error(result.left.message);
        }
        sheets = result.right;
        outcome = "resolved";
      },
      step: () => {},
      getState: () =>
        projectHealingResourceSelectedIdentityState(sheets, outcome),
    };
  });
}

function expectedProjection(
  overrides: Partial<HealingResourceSelectedIdentityProjection> = {},
): HealingResourceSelectedIdentityProjection {
  return {
    sourceHp: 12,
    targetHp: 3,
    targetPoisoned: true,
    poolExpended: 0,
    poolRemaining: 10,
    outcome: "init",
    ...overrides,
  };
}

function layOnHandsSheets(): {
  readonly source: CharacterSheet;
  readonly target: CharacterSheet;
} {
  return {
    source: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:lay-on-hands-source"),
        build: paladinBuild({ paladinAdvancements: 1 }),
        currentHp: Hp(12),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary,
      }),
    ),
    target: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:lay-on-hands-target"),
        build: characterBuild("class_fighter"),
        currentHp: Hp(3),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    ),
  };
}

function paladinBuild(input: {
  readonly paladinAdvancements: number;
}): CharacterBuild {
  return {
    ...characterBuild("class_paladin"),
    progression: {
      startingClass: classUnitId("class_paladin"),
      advancements: Array.from({ length: input.paladinAdvancements }, () => ({
        classUnitId: classUnitId("class_paladin"),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
  };
}

function characterBuild(startingClass: string): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(startingClass),
      advancements: [],
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
    equipment: { owned: [], loadout: {} },
  };
}

function projectHealingResourceSelectedIdentityState(
  sheets: { readonly source: CharacterSheet; readonly target: CharacterSheet },
  outcome: HealingResourceSelectedIdentityProjection["outcome"],
): HealingResourceSelectedIdentityProjection {
  const pool = layOnHandsPool(sheets.source);
  return {
    sourceHp: characterSheetCurrentHp(sheets.source),
    targetHp: characterSheetCurrentHp(sheets.target),
    targetPoisoned: sheets.target.conditions.includes("poisoned"),
    poolExpended: pool.expended,
    poolRemaining: pool.count - pool.expended,
    outcome,
  };
}

function layOnHandsPool(
  sheet: CharacterSheet,
): Extract<
  CharacterSheetResourceState,
  { readonly tag: "layOnHandsHealingPool" }
> {
  const resources = characterSheetResources(sheet, unitLibrary);
  if (Either.isLeft(resources)) {
    throw new Error(resources.left.message);
  }
  const pool = resources.right.find(
    (
      resource,
    ): resource is Extract<
      CharacterSheetResourceState,
      { readonly tag: "layOnHandsHealingPool" }
    > => resource.tag === "layOnHandsHealingPool",
  );
  if (pool === undefined) {
    throw new Error("Expected Lay On Hands healing pool.");
  }
  return pool;
}

function characterSheetCurrentHp(sheet: CharacterSheet): number {
  return sheet.hitPoints.tag === "positive" ? sheet.hitPoints.currentHp : 0;
}

const qntOutcomeByVariant = {
  CharacterSheetHealingResourceSelectedIdentityInit: "init",
  CharacterSheetHealingResourceSelectedIdentityResolved: "resolved",
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

function normalizeHealingResourceSelectedIdentityQuintState(
  raw: unknown,
): HealingResourceSelectedIdentityProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  return {
    sourceHp: numberFromQuintInt(state["sourceHp"], "qState.sourceHp"),
    targetHp: numberFromQuintInt(state["targetHp"], "qState.targetHp"),
    targetPoisoned: booleanField(state, "targetPoisoned"),
    poolExpended: numberFromQuintInt(
      state["poolExpended"],
      "qState.poolExpended",
    ),
    poolRemaining: numberFromQuintInt(
      state["poolRemaining"],
      "qState.poolRemaining",
    ),
    outcome: outcomeField(state["outcome"]),
  };
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

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

const healingResourceSelectedIdentityStateCheck = stateCheck(
  normalizeHealingResourceSelectedIdentityQuintState,
  (
    spec: HealingResourceSelectedIdentityProjection,
    impl: HealingResourceSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
