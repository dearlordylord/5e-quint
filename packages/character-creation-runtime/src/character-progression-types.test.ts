import {
  characterClassLevel,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import { Option, Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterProgressionEntry,
  characterProgressionWithClassLevelGain,
  characterTotalLevelHitPointRule,
  classLevelForUnit,
  classUnitId,
  computeTotalLevel,
  finalAdvancementEntry,
  hitPointRuleLabel,
  hitPointRuleOptionSuffix,
  progressionClassLevels,
  progressionClassUnitIds,
  rolledHitDieResultAboveHitDie,
  rolledHitDieResultAboveHitDieMessage,
  startingClassUnitId,
  type CharacterProgression,
} from "./character-progression-types.ts";

const fighterUnitId = classUnitId(authoredUnitId("class_fighter"));
const wizardUnitId = classUnitId(authoredUnitId("class_wizard"));
const levelOneHitPoints = { tag: "levelOneMaximumHitDie" } as const;
const fixedHitPoints = { tag: "fixedHigherLevelGain" } as const;
const rolledHitPoints = (result: number) =>
  ({
    tag: "rolledHigherLevelGain",
    hitDieResult: DieRollResult(result),
  }) as const;

describe("Character progression typed boundaries", () => {
  test("pairs each total-level domain with only its legal Hit Point rule", () => {
    expect(
      characterTotalLevelHitPointRule({
        totalLevel: characterClassLevel(1),
        hitPointRule: levelOneHitPoints,
      }),
    ).toHaveProperty("_tag", "Success");
    expect(
      characterTotalLevelHitPointRule({
        totalLevel: characterClassLevel(2),
        hitPointRule: fixedHitPoints,
      }),
    ).toHaveProperty("_tag", "Success");
    expect(
      characterTotalLevelHitPointRule({
        totalLevel: characterClassLevel(2),
        hitPointRule: levelOneHitPoints,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidHitPointRuleForLevel", totalLevel: 2 },
    });
    expect(
      characterTotalLevelHitPointRule({
        totalLevel: characterClassLevel(1),
        hitPointRule: fixedHitPoints,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidHitPointRuleForLevel", totalLevel: 1 },
    });
  });

  test("constructs post-start entries and rejects a fixed level-one entry", () => {
    expect(
      characterProgressionEntry({
        classUnitId: fighterUnitId,
        characterLevel: characterClassLevel(2),
        hitPointRule: fixedHitPoints,
      }),
    ).toEqual(
      Result.succeed({
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
      }),
    );
    expect(
      characterProgressionEntry({
        classUnitId: fighterUnitId,
        characterLevel: characterClassLevel(1),
        hitPointRule: fixedHitPoints,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidHitPointRuleForLevel" },
    });
  });

  test("appends a class level and rejects progression beyond level 20", () => {
    const progression: CharacterProgression = {
      startingClass: fighterUnitId,
      advancements: [],
    };
    expect(
      characterProgressionWithClassLevelGain({
        progression,
        classUnitId: wizardUnitId,
        hitPointRule: fixedHitPoints,
      }),
    ).toEqual(
      Result.succeed({
        startingClass: fighterUnitId,
        advancements: [
          { classUnitId: wizardUnitId, hitPointRule: fixedHitPoints },
        ],
      }),
    );

    const levelTwenty: CharacterProgression = {
      startingClass: fighterUnitId,
      advancements: Array.from({ length: 19 }, () => ({
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
      })),
    };
    expect(
      characterProgressionWithClassLevelGain({
        progression: levelTwenty,
        classUnitId: fighterUnitId,
        hitPointRule: fixedHitPoints,
      }),
    ).toEqual(
      Result.fail({ code: "invalidCharacterClassLevel", classLevel: 21 }),
    );
  });

  test("projects labels, level counts, final entry, and ordered class levels", () => {
    const progression: CharacterProgression = {
      startingClass: fighterUnitId,
      advancements: [
        { classUnitId: fighterUnitId, hitPointRule: fixedHitPoints },
        { classUnitId: wizardUnitId, hitPointRule: fixedHitPoints },
        { classUnitId: wizardUnitId, hitPointRule: fixedHitPoints },
        { classUnitId: fighterUnitId, hitPointRule: fixedHitPoints },
      ],
    };

    expect(hitPointRuleOptionSuffix(levelOneHitPoints)).toBe("maximum_hit_die");
    expect(hitPointRuleOptionSuffix(fixedHitPoints)).toBe("fixed_hp_gain");
    expect(hitPointRuleLabel(levelOneHitPoints)).toBe(
      "Level 1 Hit Point maximum",
    );
    expect(hitPointRuleLabel(fixedHitPoints)).toBe(
      "Fixed higher-level HP gain",
    );
    expect(hitPointRuleOptionSuffix(rolledHitPoints(7))).toBe("rolled_hp_gain");
    expect(hitPointRuleLabel(rolledHitPoints(7))).toBe(
      "Rolled higher-level HP gain",
    );
    expect(computeTotalLevel(progression)).toBe(5);
    expect(startingClassUnitId(progression)).toBe(fighterUnitId);
    expect(finalAdvancementEntry(progression)).toEqual({
      classUnitId: fighterUnitId,
      hitPointRule: fixedHitPoints,
    });
    expect(finalAdvancementEntry({ ...progression, advancements: [] })).toBe(
      undefined,
    );
    expect(classLevelForUnit(progression, fighterUnitId)).toBe(3);
    expect(classLevelForUnit(progression, wizardUnitId)).toBe(2);
    expect(progressionClassUnitIds(progression)).toEqual([
      fighterUnitId,
      wizardUnitId,
    ]);
    expect(progressionClassLevels(progression)).toEqual([
      { classUnitId: fighterUnitId, classLevel: 3 },
      { classUnitId: wizardUnitId, classLevel: 2 },
    ]);
  });

  test("finds a rolled Hit Die result above the class's Hit Die", () => {
    const check = (
      hitPointRule: Parameters<
        typeof rolledHitDieResultAboveHitDie
      >[0]["hitPointRule"],
    ) =>
      rolledHitDieResultAboveHitDie({
        classUnitId: fighterUnitId,
        hitPointRule,
        hitPointDie: 10,
      });

    expect(check(fixedHitPoints)).toEqual(Option.none());
    expect(check(rolledHitPoints(10))).toEqual(Option.none());
    const aboveHitDie = check(rolledHitPoints(11));
    expect(aboveHitDie).toEqual(
      Option.some({
        classUnitId: fighterUnitId,
        hitDieResult: 11,
        hitDieSize: 10,
      }),
    );
    expect(
      Option.map(aboveHitDie, rolledHitDieResultAboveHitDieMessage),
    ).toEqual(
      Option.some(
        "Rolled Hit Die result 11 exceeds the d10 Hit Die of class class_fighter.",
      ),
    );
  });
});
