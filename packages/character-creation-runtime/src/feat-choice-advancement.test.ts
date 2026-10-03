// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-feat-choice
import { abilityScore } from "@dnd/shared/types";
import { characterClassLevel, unitId } from "@dnd/shared/game-facts";
import { Option, Result } from "effect";
import {
  classSpellcastingCreationAtLevel,
  isListPreparedSpellcastingCreation,
} from "./class-spellcasting.ts";
import { classLevelForUnit } from "./character-progression-types.ts";
import { expect, test } from "vitest";
import {
  advanceCharacterBuildClassLevel,
  fighterLevelGainWithFightingStyleReplacement,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  type CharacterBuild,
  type CharacterBuildClassLevelGain,
} from "./index.ts";
import { buildFor, unitLibrary } from "./repeated-feat-grants.test-support.ts";
function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const classUnitId = success(
  classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_fighter") }),
);
const base = {
  tag: "classLevelGain",
  classUnitId,
  hitPointRule: { tag: "fixedHigherLevelGain" },
} as const;
const asi = {
  kind: "feat",
  featureUnitId: unitId("fighter_ability_score_improvement_l4"),
  grantLevel: characterClassLevel(6),
  selectedFeatUnitId: unitId("feat_ability_score_improvement"),
  abilityScoreIncreaseOptionId: creationChoiceOptionId(
    "ability_score:con:+2:max20",
  ),
} as const;
function advance(
  build: CharacterBuild,
  choices: NonNullable<CharacterBuildClassLevelGain["gainedChoices"]>,
) {
  return advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: { ...base, gainedChoices: choices },
  });
}
test("Fighter repeated grant learns another independent style and rejects duplicate nonrepeatable styles", () => {
  const six = success(advance(buildFor("fighter", 5), [asi]));
  const style = {
    kind: "feat",
    featureUnitId: unitId("fighter_additional_fighting_style"),
    grantLevel: characterClassLevel(7),
    selectedFeatUnitId: unitId("feat_archery"),
  } as const;
  const seven = success(advance(six, [style]));
  expect(seven.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("feat_archery"),
    selectedFromUnitId: unitId("fighter_additional_fighting_style"),
  });
  expect(
    advance(six, [{ ...style, selectedFeatUnitId: unitId("defense") }]),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidFeatChoiceGains",
      message: "A nonrepeatable feat cannot be selected twice.",
    },
  });
  for (const invalid of [
    { ...style, selectedFeatUnitId: unitId("defense") },
    {
      ...style,
      abilityScoreIncreaseOptionId: creationChoiceOptionId(
        "ability_score:con:+2:max20",
      ),
    },
  ])
    expect(advance(six, [invalid])).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidFeatChoiceGains" },
    });
});
test("Fighter grant admission rejects forged origins, missing scores, unmet prerequisites and cap overflow", () => {
  const five = buildFor("fighter", 5);
  for (const invalid of [
    { ...asi, featureUnitId: unitId("fighter_second_wind") },
    { ...asi, grantLevel: characterClassLevel(4) },
    { ...asi, abilityScoreIncreaseOptionId: undefined },
  ]) {
    const { abilityScoreIncreaseOptionId, ...withoutScore } = invalid;
    expect(
      advance(five, [
        abilityScoreIncreaseOptionId === undefined
          ? withoutScore
          : { ...withoutScore, abilityScoreIncreaseOptionId },
      ]),
    ).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidFeatChoiceGains" },
    });
  }
  expect(
    advance(
      {
        ...five,
        abilityScores: { ...five.abilityScores, con: abilityScore(20) },
      },
      [asi],
    ),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidFeatChoiceGains",
      message: "Ability score increase exceeds the feat's maximum score.",
    },
  });
  expect(
    advance(
      {
        ...five,
        abilityScores: {
          ...five.abilityScores,
          str: abilityScore(10),
          dex: abilityScore(10),
        },
      },
      [
        {
          ...asi,
          selectedFeatUnitId: unitId("feat_grappler"),
          abilityScoreIncreaseOptionId: creationChoiceOptionId(
            "ability_score:str:+1:max20",
          ),
        },
      ],
    ),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidFeatChoiceGains",
      message: "Selected feat prerequisites are not met.",
    },
  });
});
test("new subclass choices use earned source ownership and reject missing, duplicate and forged selections", () => {
  const two = buildFor("fighter", 2);
  const choice = {
    kind: "unitChoice",
    featureUnitId: classUnitId,
    choiceKey: "class_subclass_choice",
    optionIds: [creationChoiceOptionId("subclass_fighter_champion")],
  } as const;
  const after = success(advance(two, [choice]));
  expect(after.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("subclass_fighter_champion"),
    selectedFromUnitId: classUnitId,
  });
  for (const choices of [
    [choice, choice],
    [{ ...choice, featureUnitId: unitId("class_rogue") }],
    [
      {
        ...choice,
        optionIds: [creationChoiceOptionId("subclass_rogue_thief")],
      },
    ],
    [{ ...choice, choiceKey: "wizard_spellbook_choices" as const }],
  ])
    expect(advance(two, [choices[0]!, ...choices.slice(1)])).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidClassLevelChoices" },
    });
});

test("new Hunter subclass and defensive choices advance through their source-owned unit choices", () => {
  const rangerClass = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_ranger") }),
  );
  const gain = (
    build: CharacterBuild,
    gainedChoices: NonNullable<CharacterBuildClassLevelGain["gainedChoices"]>,
  ) => {
    const record = unitLibrary.requireUnit(rangerClass);
    if (
      record.kind !== "class" ||
      !("spellcasting" in record) ||
      record.spellcasting === undefined ||
      !isListPreparedSpellcastingCreation(record.spellcasting)
    )
      throw new Error("Ranger casting");
    const level = classLevelForUnit(build.progression, rangerClass);
    const current = classSpellcastingCreationAtLevel(
        record.spellcasting,
        level,
      ),
      next = classSpellcastingCreationAtLevel(record.spellcasting, level + 1);
    const source = build.spellcasting?.sources[0];
    if (
      current === undefined ||
      next === undefined ||
      !isListPreparedSpellcastingCreation(current) ||
      !isListPreparedSpellcastingCreation(next) ||
      source === undefined
    )
      throw new Error("Ranger rows");
    const highest = Math.max(
      ...next.spellSlotProjection.slots.map((slot) => slot.spellLevel),
    );
    const gainedPreparedSpells = next.preparedAccess.spells
      .filter(
        (spell) =>
          spell.spellLevel <= highest &&
          !source.preparedSpells.includes(spell.spellId),
      )
      .slice(0, next.preparedAccess.choose - current.preparedAccess.choose)
      .map((spell) => spell.spellId);
    return advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGainWithListPreparedSpellcasting",
        classUnitId: rangerClass,
        hitPointRule: base.hitPointRule,
        gainedChoices,
        preparedSpellcasting: { gainedPreparedSpells },
      },
    });
  };
  const three = success(
    gain(buildFor("ranger", 2), [
      {
        kind: "unitChoice",
        featureUnitId: rangerClass,
        choiceKey: "class_subclass_choice",
        optionIds: [creationChoiceOptionId("subclass_ranger_hunter")],
      },
      {
        kind: "unitChoice",
        featureUnitId: unitId("ranger_hunters_prey"),
        choiceKey: "hunters_prey",
        optionIds: [creationChoiceOptionId("colossus_slayer")],
      },
    ]),
  );
  expect(three.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("ranger_hunters_prey"),
    selectedFromUnitId: unitId("ranger_hunters_prey"),
    selectedOption: {
      kind: "huntersPrey",
      selection: "woundedTargetWeaponDamage",
    },
  });
  const six = buildFor("ranger", 6);
  const seven = success(
    gain(six, [
      {
        kind: "unitChoice",
        featureUnitId: unitId("ranger_defensive_tactics"),
        choiceKey: "attack_roll_defense_choice",
        optionIds: [creationChoiceOptionId("escape_the_horde")],
      },
    ]),
  );
  expect(seven.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("ranger_defensive_tactics"),
    selectedFromUnitId: unitId("ranger_defensive_tactics"),
    selectedOption: {
      kind: "attackRollDefense",
      selection: "opportunityAttackDisadvantage",
    },
  });
});

test("plain list-prepared class gains reject an omitted newly earned spell", () => {
  const cleric = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_cleric") }),
  );
  expect(
    advanceCharacterBuildClassLevel({
      build: buildFor("cleric", 5),
      unitLibrary,
      levelGain: {
        tag: "classLevelGain",
        classUnitId: cleric,
        hitPointRule: base.hitPointRule,
      },
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: { code: "invalidListPreparedSpellGainCount" },
  });
});

test("repeated feat occurrence gains require one selection and an admitted score option", () => {
  const five = buildFor("fighter", 5);
  for (const choices of [
    [asi, asi],
    [
      {
        ...asi,
        abilityScoreIncreaseOptionId: creationChoiceOptionId(
          "synthetic_unavailable_score_option",
        ),
      },
    ],
    [{ ...asi, selectedFeatUnitId: unitId("aid") }],
    [{ ...asi, selectedFeatUnitId: unitId("synthetic_absent_feat") }],
  ] as const) {
    expect(advance(five, choices)).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidFeatChoiceGains" },
    });
  }
});

test("new class choices reject an owning build whose background reference is no longer installed", () => {
  const two = buildFor("fighter", 2);
  const missingBackground = {
    ...unitLibrary,
    getUnit: (id: Parameters<typeof unitLibrary.getUnit>[0]) =>
      id === two.background ? Option.none() : unitLibrary.getUnit(id),
    listUnits: () =>
      unitLibrary.listUnits().filter((unit) => unit.id !== two.background),
  };
  expect(
    advanceCharacterBuildClassLevel({
      build: two,
      unitLibrary: missingBackground,
      levelGain: {
        ...base,
        gainedChoices: [
          {
            kind: "unitChoice",
            featureUnitId: classUnitId,
            choiceKey: "class_subclass_choice",
            optionIds: [creationChoiceOptionId("subclass_fighter_champion")],
          },
        ],
      },
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidClassLevelChoices",
      message: "Owning build proficiencies could not be projected.",
    },
  });
});

test("plain Warlock level four retains the already complete invocation roster before requiring its new cantrip", () => {
  const three = buildFor("warlock", 3);
  const warlock = success(
    classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: unitId("class_warlock"),
    }),
  );
  expect(
    advanceCharacterBuildClassLevel({
      build: three,
      unitLibrary,
      levelGain: {
        ...base,
        classUnitId: warlock,
        gainedChoices: [
          {
            ...asi,
            featureUnitId: unitId("warlock_ability_score_improvement_l4"),
            grantLevel: characterClassLevel(4),
          },
        ],
      },
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: { code: "invalidWarlockPactMagicCantripGainCount" },
  });
});

test("a newly gained subclass cannot authorize Prepared Spell Access for a class without that grant", () => {
  expect(
    advance(buildFor("fighter", 2), [
      {
        kind: "unitChoice",
        featureUnitId: classUnitId,
        choiceKey: "class_subclass_choice",
        optionIds: [creationChoiceOptionId("subclass_fighter_champion")],
      },
      {
        kind: "preparedSpellAccess",
        featureUnitId: unitId("bard_magical_discoveries"),
        spellIds: [unitId("aid"), unitId("bless")],
      },
    ]),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "invalidPreparedSpellAccessGain",
      message:
        "Prepared Spell Access must originate from an earned feature of the gained class.",
    },
  });
});

test("Fighter replacement reads an authored category-set feat grant without changing its owner", () => {
  const style = unitLibrary.requireUnit("fighter_fighting_style");
  if (style.kind !== "class_feature") throw new Error("Style source required");
  const replacement = {
    ...style,
    mechanics: {
      family: "passive",
      grants: [{ kind: "grant_feat", categories: ["fighting_style"] }],
    },
  } as const;
  const library = {
    ...unitLibrary,
    getUnit: (id: Parameters<typeof unitLibrary.getUnit>[0]) =>
      id === style.id ? Option.some(replacement) : unitLibrary.getUnit(id),
    listUnits: () =>
      unitLibrary
        .listUnits()
        .map((unit) => (unit.id === style.id ? replacement : unit)),
    requireUnit: (id: Parameters<typeof unitLibrary.requireUnit>[0]) =>
      id === style.id ? replacement : unitLibrary.requireUnit(id),
  };
  const gain = success(
    fighterLevelGainWithFightingStyleReplacement({
      unitLibrary: library,
      classUnitId,
      hitPointRule: base.hitPointRule,
      selectedFeatUnitId: unitId("feat_archery"),
    }),
  );
  const two = success(
    advanceCharacterBuildClassLevel({
      build: buildFor("fighter", 1),
      unitLibrary: library,
      levelGain: gain,
    }),
  );
  expect(two.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("feat_archery"),
    selectedFromUnitId: style.id,
  });
  expect(
    two.features.some(
      (feature) =>
        feature.kind === "selectedClassChoice" && feature.unitId === "defense",
    ),
  ).toBe(false);
});
