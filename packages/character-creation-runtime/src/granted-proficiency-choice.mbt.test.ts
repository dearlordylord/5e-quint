// KERNEL-COVERAGE: parity-witness CREATION.FEATURE.PROFICIENCY_CHOICE
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.class-feature-proficiency-choice
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
import { creationChoiceOptionId } from "./types.ts";
import { classLevelForUnit } from "./character-progression-types.ts";
const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalog.tag !== "ok") throw new Error("Expected real catalog");
const unitLibrary = catalog.catalog;
const actions = {
  init: {},
  rejectDuplicate: {},
  gainThree: {},
  step: {},
} as const;
const projection = z.object({
  classLevel: z.coerce.number(),
  addedSkillCount: z.coerce.number(),
  accepted: z.boolean(),
  phase: z.coerce.number(),
});
test("Bard2→Lore3 replays three granted proficiency choices and duplicate rejection", async () => {
  const driver = defineDriver(actions, () => {
    let build = bardCreationAtLevel(2, unitLibrary).build;
    const initialCount = build.proficiencyChoices.filter(
      (choice) => choice.kind === "skill",
    ).length;
    const three = bardCreationAtLevel(3, unitLibrary);
    const skills = three.draft.selections.choices.find(
      (choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === unitId("bard_bonus_proficiencies"),
    );
    if (skills === undefined || skills.kind !== "unitChoice")
      throw new Error("Expected granted skill choices");
    const first = skills.options[0];
    if (first === undefined) throw new Error("Expected skill option");
    let accepted = true;
    let phase = 0;
    const apply = (duplicate: boolean, nextPhase: number) => {
      const result = bardGainSpellcastingLevel({
        build,
        nextLevel: 3,
        unitLibrary,
        gainedChoices: [
          {
            kind: "unitChoice",
            featureUnitId: unitId("class_bard"),
            choiceKey: "class_subclass_choice",
            optionIds: [
              creationChoiceOptionId("subclass_bard_college_of_lore"),
            ],
          },
          {
            kind: "unitChoice",
            featureUnitId: unitId("bard_bonus_proficiencies"),
            choiceKey: "class_feature_proficiency_choice",
            optionIds: duplicate
              ? [first.optionId, first.optionId, first.optionId]
              : skills.options.map((option) => option.optionId),
          },
        ],
      });
      accepted = Result.isSuccess(result);
      if (Result.isSuccess(result)) build = result.success;
      phase = nextPhase;
    };
    return {
      init: () => {
        build = bardCreationAtLevel(2, unitLibrary).build;
        accepted = true;
        phase = 0;
      },
      rejectDuplicate: () => apply(true, 1),
      gainThree: () => apply(false, 2),
      step: () => {},
      getState: () => ({
        classLevel: classLevelForUnit(build.progression, unitId("class_bard")),
        addedSkillCount:
          build.proficiencyChoices.filter((choice) => choice.kind === "skill")
            .length - initialCount,
        accepted,
        phase,
      }),
    };
  });
  await run({
    spec: path.resolve(
      import.meta.dirname,
      "../character-creation-granted-proficiency-choice.mbt.qnt",
    ),
    init: "init",
    step: "step",
    driver,
    backend: "typescript",
    nTraces: 1,
    maxSteps: 2,
    stateCheck: stateCheck(
      (raw) => z.object({ qState: projection }).parse(raw).qState,
      (spec, impl) => {
        expect(impl).toEqual(spec);
        return true;
      },
    ),
  });
}, 120_000);
