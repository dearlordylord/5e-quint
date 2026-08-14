// KERNEL-COVERAGE: parity-witness SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  spendCharacterSheetSpellAccessFreeCast,
  type CharacterSheet,
} from "./index.ts";
import {
  characterSheetId,
  completeLongRest,
  completeShortRest,
  rebuildCharacterSheetFixture,
  requireRight,
  unitLibrary,
  wizardBuild,
} from "./test-support.test-support.ts";

const sourceUnitId = authoredUnitId("feat_magic_initiate_wizard");
const spellId = authoredUnitId("mage_armor");

type ReplayState = {
  readonly replayIndex: number;
  readonly freeCastExpended: number;
  readonly spellSlotsExpended: number;
};

function freshSheet(): CharacterSheet {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:synthetic-magic-initiate-mbt"),
      build: {
        ...wizardBuild({ wizardAdvancements: 0 }),
        background: authoredUnitId("background_sage"),
        magicInitiateSpellAccesses: [
          {
            featUnitId: sourceUnitId,
            spellcastingAbility: "int",
            cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")],
            levelOneSpell: spellId,
          },
        ],
      },
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

function runtimeState(sheet: CharacterSheet, replayIndex: number): ReplayState {
  const freeCastExpended =
    sheet.resourceExpenditures.find(
      (expenditure) =>
        expenditure.tag === "spellAccessFreeCast" &&
        expenditure.sourceUnitId === sourceUnitId &&
        expenditure.spellId === spellId,
    )?.expended ?? 0;
  const spellSlotsExpended =
    "spellSlotExpenditures" in sheet
      ? (sheet.spellSlotExpenditures?.reduce(
          (total, expenditure) => total + expenditure.expended,
          0,
        ) ?? 0)
      : 0;
  return { replayIndex, freeCastExpended, spellSlotsExpended };
}

const driverSchema = {
  init: {},
  spendFreeCast: {},
  completeShortRest: {},
  completeLongRest: {},
  step: {},
} as const;

function createDriver() {
  return defineDriver(driverSchema, () => {
    let sheet = freshSheet();
    let replayIndex = 0;
    return {
      init: () => {
        sheet = freshSheet();
        replayIndex = 0;
      },
      spendFreeCast: () => {
        sheet = requireRight(
          spendCharacterSheetSpellAccessFreeCast({
            sheet,
            unitLibrary,
            resource: { sourceUnitId, spellId },
          }),
        );
        replayIndex = 1;
      },
      completeShortRest: () => {
        sheet = requireRight(completeShortRest({ sheet, unitLibrary }));
        replayIndex = 2;
      },
      completeLongRest: () => {
        sheet = requireRight(completeLongRest({ sheet, unitLibrary }));
        replayIndex = 3;
      },
      step: () => {},
      getState: () => runtimeState(sheet, replayIndex),
    };
  });
}

describe("Character Sheet Spell Access free-cast QNT parity", () => {
  test("replays exact spend, Short Rest preservation, and Long Rest recovery", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-spell-access-free-cast.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: 3,
      stateCheck: stateCheck(normalizeQuintState, compareState),
    });
  }, 120_000);
});

function normalizeQuintState(raw: unknown): ReplayState {
  const root = record(raw, "root");
  const state = record(root["qState"], "qState");
  return {
    replayIndex: integer(state["replayIndex"], "replayIndex"),
    freeCastExpended: integer(state["freeCastExpended"], "freeCastExpended"),
    spellSlotsExpended: integer(
      state["spellSlotsExpended"],
      "spellSlotsExpended",
    ),
  };
}

function compareState(runtime: ReplayState, quint: ReplayState): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function record(
  value: unknown,
  field: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function integer(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected Quint integer ${field}.`);
}
