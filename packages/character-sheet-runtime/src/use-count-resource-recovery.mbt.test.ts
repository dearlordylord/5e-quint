import path from "node:path";
// KERNEL-COVERAGE: parity-witness SHEET.FEATURE_RESOURCES.USE_COUNT_RECOVERY
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-sheet.use-count-resource-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.use-count-resource-recovery
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import {
  bardSheet,
  inspirationExpended,
} from "./use-count-resource-recovery.test-support.ts";
import {
  completeShortRest,
  requireSuccess,
  unitLibrary,
} from "./test-support.test-support.ts";
import { restoreUseCountResourceWithSpellSlot } from "./use-count-resource-recovery.ts";
import { characterSheetSpellSlots } from "./spell-slots.ts";

const actions = { init: {}, exchange: {}, shortRest: {}, step: {} } as const;
function projected(sheet: ReturnType<typeof bardSheet>, phase: number) {
  const useExpended = inspirationExpended(sheet);
  const slotExpended = characterSheetSpellSlots(sheet)?.find(
    (slot) => slot.spellLevel === 1,
  )?.expended;
  if (useExpended === undefined || slotExpended === undefined)
    throw new Error("Expected linked use and Spell Slot pools.");
  return {
    useExpended: Number(useExpended),
    slotExpended: Number(slotExpended),
    phase,
  };
}
function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected QNT record.");
  return Object.fromEntries(Object.entries(value));
}
function integer(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new Error("Expected QNT integer.");
}
test("replays linked recovery slot exchange and Short Rest against rule core", async () => {
  const driver = defineDriver(actions, () => {
    let sheet = bardSheet(5, 2);
    let phase = 0;
    return {
      init: () => {
        sheet = bardSheet(5, 2);
        phase = 0;
      },
      exchange: () => {
        sheet = requireSuccess(
          restoreUseCountResourceWithSpellSlot({
            sheet,
            unitLibrary,
            featureUnitId: unitId("bard_font_of_inspiration"),
            spellLevel: spellSlotLevel(1),
          }),
        );
        phase = 1;
      },
      shortRest: () => {
        sheet = requireSuccess(completeShortRest({ sheet, unitLibrary }));
        phase = 2;
      },
      step: () => {},
      getState: () => projected(sheet, phase),
    };
  });
  await run({
    spec: path.resolve(
      import.meta.dirname,
      "../character-sheet-use-count-resource-recovery.mbt.qnt",
    ),
    init: "init",
    step: "step",
    driver,
    backend: "typescript",
    nTraces: 1,
    maxSteps: 2,
    stateCheck: stateCheck(
      (raw: unknown) => {
        const state = record(record(raw)["qState"]);
        return {
          useExpended: integer(state["useExpended"]),
          slotExpended: integer(state["slotExpended"]),
          phase: integer(state["phase"]),
        };
      },
      (spec, impl) => {
        expect(impl).toEqual(spec);
        return true;
      },
    ),
  });
}, 120_000);
