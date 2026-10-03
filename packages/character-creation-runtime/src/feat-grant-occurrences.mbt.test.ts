// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.feat-grant-occurrences
// KERNEL-COVERAGE: parity-witness CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
import * as path from "node:path";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { characterClassLevel, unitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  computeTotalLevel,
  creationChoiceOptionId,
  fighterLevelGainWithFightingStyleReplacement,
  type CharacterBuildClassLevelGain,
} from "./index.ts";
import { buildFor, unitLibrary } from "./repeated-feat-grants.test-support.ts";

const schema = {
  init: {},
  doGain6: {},
  doGain7AdditionalStyle: {},
  doGain8ReplacePrimary: {},
  doRejectMissingGain: {},
  doRejectForgedOrigin: {},
  doRejectDuplicateAdditionalStyle: {},
  doIdle: {},
  step: {},
} as const;
const projectionSchema = z.object({
  classLevel: z.coerce.number(),
  score: z.coerce.number(),
  abilityFeatGrantLevels: z.array(z.coerce.number()),
  styles: z.array(
    z.object({ grantLevel: z.coerce.number(), feat: z.string() }),
  ),
  accepted: z.boolean(),
});
function driver() {
  return defineDriver(schema, () => {
    let build = buildFor("fighter", 5);
    let accepted = true;
    const parsedClass = classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: unitId("class_fighter"),
    });
    if (Result.isFailure(parsedClass))
      throw new Error("Fighter class fixture must parse");
    const classUnitId = parsedClass.success;
    function gain(
      level: number,
      selectedFeatUnitId: string,
      forged = false,
    ): CharacterBuildClassLevelGain & {
      readonly gainedChoices: NonNullable<
        CharacterBuildClassLevelGain["gainedChoices"]
      >;
    } {
      return {
        tag: "classLevelGain",
        classUnitId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedChoices: [
          {
            kind: "feat",
            featureUnitId: unitId(
              level === 7
                ? "fighter_additional_fighting_style"
                : "fighter_ability_score_improvement_l4",
            ),
            grantLevel: characterClassLevel(forged ? level + 2 : level),
            selectedFeatUnitId: unitId(selectedFeatUnitId),
            ...(level === 7
              ? {}
              : {
                  abilityScoreIncreaseOptionId: creationChoiceOptionId(
                    "ability_score:con:+2:max20",
                  ),
                }),
          },
        ],
      };
    }
    function apply(levelGain: CharacterBuildClassLevelGain) {
      const result = advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      });
      accepted = Result.isSuccess(result);
      if (Result.isSuccess(result)) build = result.success;
    }
    return {
      init: () => {
        build = buildFor("fighter", 5);
        accepted = true;
      },
      doGain6: () => apply(gain(6, "feat_ability_score_improvement")),
      doGain7AdditionalStyle: () => apply(gain(7, "feat_archery")),
      doGain8ReplacePrimary: () => {
        const replacement = fighterLevelGainWithFightingStyleReplacement({
          unitLibrary,
          classUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
          selectedFeatUnitId: unitId("feat_great_weapon_fighting"),
        });
        if (Result.isFailure(replacement))
          throw new Error(JSON.stringify(replacement.failure));
        apply({
          ...replacement.success,
          gainedChoices: gain(8, "feat_ability_score_improvement")
            .gainedChoices,
        });
      },
      doRejectMissingGain: () =>
        apply({
          tag: "classLevelGain",
          classUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
        }),
      doRejectForgedOrigin: () =>
        apply(
          gain(
            computeTotalLevel(build.progression) + 1,
            "feat_ability_score_improvement",
            true,
          ),
        ),
      doRejectDuplicateAdditionalStyle: () => apply(gain(7, "defense")),
      doIdle: () => {},
      step: () => {},
      getState: () => ({
        classLevel: computeTotalLevel(build.progression),
        score: Number(build.abilityScores.con),
        abilityFeatGrantLevels: build.features.flatMap((feature) =>
          feature.kind === "selectedClassChoice" &&
          feature.selectedFromUnitId === "fighter_ability_score_improvement_l4"
            ? [feature.selectedFromGrantLevel ?? 4]
            : [],
        ),
        styles: build.features.flatMap((feature) =>
          feature.kind === "selectedClassChoice" &&
          (feature.selectedFromUnitId === "fighter_fighting_style" ||
            feature.selectedFromUnitId === "fighter_additional_fighting_style")
            ? [
                {
                  grantLevel:
                    feature.selectedFromUnitId === "fighter_fighting_style"
                      ? 1
                      : 7,
                  feat: feature.unitId,
                },
              ]
            : [],
        ),
        accepted,
      }),
    };
  });
}
describe("feat grant occurrence parity", () => {
  test("deterministic retained-origin and rejection replay", async () => {
    const instance = driver()();
    for (const action of [
      "init",
      "doRejectMissingGain",
      "doRejectForgedOrigin",
      "doGain6",
      "doRejectDuplicateAdditionalStyle",
      "doGain7AdditionalStyle",
      "doGain8ReplacePrimary",
    ] as const)
      await instance.actions[action]?.handler({});
    expect(instance.getState?.()).toEqual({
      classLevel: 8,
      score: 19,
      abilityFeatGrantLevels: [4, 6, 8],
      styles: [
        { grantLevel: 1, feat: "feat_great_weapon_fighting" },
        { grantLevel: 7, feat: "feat_archery" },
      ],
      accepted: true,
    });
  });
  test("Quint replays production feat ownership transitions", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-feat-grant-occurrences.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: driver(),
      backend: "typescript",
      nTraces: 5,
      maxSteps: 12,
      stateCheck: stateCheck(
        (raw) => z.object({ qState: projectionSchema }).parse(raw).qState,
        (spec, impl) => {
          expect(impl).toEqual(spec);
          return true;
        },
      ),
    });
  }, 120_000);
});
