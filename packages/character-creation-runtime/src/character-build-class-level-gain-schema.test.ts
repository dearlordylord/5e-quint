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

test("a level gain takes the fixed value or a rolled Hit Die of at least 1", () => {
  const decode = Schema.decodeUnknownResult(CharacterBuildClassLevelGainSchema);
  const gain = (hitPointRule: unknown) => ({
    tag: "classLevelGain",
    classUnitId: "class_fighter",
    hitPointRule,
  });
  expect(
    decode(gain({ tag: "rolledHigherLevelGain", hitDieResult: 7 })),
  ).toMatchObject({
    _tag: "Success",
    success: {
      hitPointRule: { tag: "rolledHigherLevelGain", hitDieResult: 7 },
    },
  });
  for (const hitDieResult of [0, 2.5, "7"]) {
    expect(
      Result.isFailure(
        decode(gain({ tag: "rolledHigherLevelGain", hitDieResult })),
      ),
    ).toBe(true);
  }
  expect(Result.isFailure(decode(gain({ tag: "rolledHigherLevelGain" })))).toBe(
    true,
  );
  expect(Result.isFailure(decode(gain({ tag: "levelOneMaximumHitDie" })))).toBe(
    true,
  );
});
