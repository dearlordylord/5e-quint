import * as path from "node:path";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-sheet.prepared-spell-rest-replacement
// KERNEL-COVERAGE: parity-witness SHEET.SPELL_ACCESS.SHORT_REST_PREPARED_REPLACEMENT
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { unitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { expect, test } from "vitest";
import {
  fixture,
  rest,
} from "./prepared-spell-rest-replacement.test-support.ts";

const actions = {
  init: {},
  replace: {},
  rejectCantrip: {},
  rejectAbsentBook: {},
  rejectForgedSource: {},
  step: {},
} as const;
test("replays canonical Spellbook preparation replacement and rejection", async () => {
  const driver = defineDriver(actions, () => {
    const initial = fixture();
    let sheet = initial.sheet;
    let accepted = true;
    let phase = 0;
    function apply(replacement: typeof initial.replacement, nextPhase: number) {
      const result = rest(sheet, replacement);
      accepted = Result.isSuccess(result);
      if (Result.isSuccess(result)) sheet = result.success;
      phase = nextPhase;
    }
    return {
      init: () => {
        sheet = initial.sheet;
        accepted = true;
        phase = 0;
      },
      replace: () => apply(initial.replacement, 1),
      rejectCantrip: () =>
        apply(
          {
            ...initial.replacement,
            removedSpellUnitId: initial.replacement.addedSpellUnitId,
            addedSpellUnitId: initial.source.cantrips[0] ?? unitId("light"),
          },
          2,
        ),
      rejectAbsentBook: () =>
        apply(
          {
            ...initial.replacement,
            removedSpellUnitId: initial.replacement.addedSpellUnitId,
            addedSpellUnitId: unitId("wish"),
          },
          3,
        ),
      rejectForgedSource: () =>
        apply(
          {
            ...initial.replacement,
            spellcastingSourceUnitId: unitId("class_cleric"),
          },
          4,
        ),
      step: () => {},
      getState: () => {
        const source = sheet.build.spellcasting?.sources[0];
        return {
          oldPrepared:
            source?.preparedSpells.includes(
              initial.replacement.removedSpellUnitId,
            ) ?? false,
          newPrepared:
            source?.preparedSpells.includes(
              initial.replacement.addedSpellUnitId,
            ) ?? false,
          bookIntact:
            JSON.stringify(source?.spellbook) ===
            JSON.stringify(initial.source.spellbook),
          slotsIntact:
            JSON.stringify(sheet.build.spellcasting?.slotPools) ===
              JSON.stringify(initial.sheet.build.spellcasting?.slotPools) &&
            JSON.stringify(sheet.spellSlotExpenditures) ===
              JSON.stringify(initial.sheet.spellSlotExpenditures),
          accepted,
          phase,
        };
      },
    };
  });
  await run({
    spec: path.resolve(
      import.meta.dirname,
      "../character-sheet-prepared-spell-rest-replacement.mbt.qnt",
    ),
    init: "init",
    step: "step",
    driver,
    backend: "typescript",
    nTraces: 1,
    maxSteps: 4,
    stateCheck: stateCheck(
      (raw) => {
        if (typeof raw !== "object" || raw === null || !("qState" in raw))
          throw new Error("Expected QNT state");
        const state = raw.qState;
        if (typeof state !== "object" || state === null || !("phase" in state))
          throw new Error("Expected QNT preparation projection");
        return { ...state, phase: Number(state.phase) };
      },
      (spec, impl) => {
        expect(impl).toEqual(spec);
        return true;
      },
    ),
  });
}, 120_000);
