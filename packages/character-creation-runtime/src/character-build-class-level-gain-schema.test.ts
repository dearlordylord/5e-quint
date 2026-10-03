import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import { CharacterBuildClassLevelGainSchema } from "./character-build-class-level-gain-schema.ts";

test("gained choices may be omitted but cannot be supplied empty", () => {
  const gain = {
    tag: "classLevelGain",
    classUnitId: "class_fighter",
    hitPointRule: { tag: "fixedHigherLevelGain" },
  };
  const decode = Schema.decodeUnknownResult(CharacterBuildClassLevelGainSchema);
  expect(Result.isSuccess(decode(gain))).toBe(true);
  expect(Result.isFailure(decode({ ...gain, gainedChoices: [] }))).toBe(true);
  expect(
    Result.isSuccess(
      decode({
        ...gain,
        gainedChoices: [
          {
            kind: "feat",
            featureUnitId: "fighter_ability_score_improvement",
            grantLevel: 4,
            selectedFeatUnitId: "feat_ability_score_improvement",
          },
        ],
      }),
    ),
  ).toBe(true);
});
