// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.chosen-prepared-spell-access
import * as path from "node:path";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { expect, test } from "vitest";
import { z } from "zod";
import {
  bardCreationAtLevel,
  bardGainSpellcastingLevel,
} from "./bard-feature-sdk.test-support.ts";
const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalog.tag !== "ok") throw new Error("Expected real catalog");
const unitLibrary = catalog.catalog;
const actions = {
  init: {},
  gainPair: {},
  replaceOne: {},
  rejectTwo: {},
  step: {},
} as const;
const projection = z.object({
  selected: z.set(z.coerce.number()),
  phase: z.coerce.number(),
  accepted: z.boolean(),
});
const codes = new Map([
  [unitId("fire_bolt"), 1],
  [unitId("revivify"), 2],
  [unitId("aid"), 3],
  [unitId("cure_wounds"), 4],
]);
test("real Bard level gains replay canonical chosen-access pair and one-replacement limit", async () => {
  const driver = defineDriver(actions, () => {
    let build = bardCreationAtLevel(5, unitLibrary).build;
    let phase = 0;
    let accepted = true;
    const apply = (
      nextLevel: number,
      spellIds: readonly string[],
      nextPhase: number,
    ) => {
      const result = bardGainSpellcastingLevel({
        build,
        nextLevel,
        unitLibrary,
        gainedChoices: [
          {
            kind: "preparedSpellAccess",
            featureUnitId: unitId("bard_magical_discoveries"),
            spellIds: spellIds.map(unitId),
          },
        ],
      });
      if (
        nextPhase === 2 &&
        (Result.isSuccess(result) ||
          result.failure.code !== "invalidPreparedSpellAccessGain")
      )
        throw new Error("Expected chosen-access replacement count rejection");
      accepted = Result.isSuccess(result);
      if (Result.isSuccess(result)) build = result.success;
      phase = nextPhase;
    };
    return {
      init: () => {
        build = bardCreationAtLevel(5, unitLibrary).build;
        phase = 0;
        accepted = true;
      },
      gainPair: () => apply(6, ["fire_bolt", "revivify"], 1),
      replaceOne: () => apply(7, ["fire_bolt", "aid"], 3),
      rejectTwo: () => apply(7, ["aid", "cure_wounds"], 2),
      step: () => {},
      getState: () => ({
        selected: new Set(
          build.features.flatMap((feature) =>
            feature.kind === "selectedPreparedSpellAccess"
              ? feature.spellIds.map((id) => {
                  const code = codes.get(id);
                  if (code === undefined)
                    throw new Error("Expected fixture spell code");
                  return code;
                })
              : [],
          ),
        ),
        phase,
        accepted,
      }),
    };
  });
  await run({
    spec: path.resolve(
      import.meta.dirname,
      "../character-creation-chosen-prepared-spell-access.mbt.qnt",
    ),
    init: "init",
    step: "step",
    driver,
    backend: "typescript",
    nTraces: 1,
    maxSteps: 3,
    stateCheck: stateCheck(
      (raw) => z.object({ qState: projection }).parse(raw).qState,
      (spec, impl) => {
        expect(impl).toEqual(spec);
        return true;
      },
    ),
  });
}, 120_000);
