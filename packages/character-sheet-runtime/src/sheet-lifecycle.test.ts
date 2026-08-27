// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS sorcerer_metamagic
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  Result,
  Hp,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  SORCERER_METAMAGIC_UNIT_ID,
  SRD_SORCERY_POINTS_POOL_ID,
  armorClassBuild,
  build,
  characterBuildSorcererMetamagicFacts,
  characterSheetHitPointMaximum,
  characterSheetNormalHitPointMaximum,
  characterSheetId,
  characterSheetTempHp,
  rebuildCharacterSheetFixture,
  druidLanguageBuild,
  parseCharacterSheet,
  requireSuccess,
  rogueLanguageBuild,
  sorcererFontOfMagicBuild,
  sorcererMetamagicKnownOptionsGateTestName,
  sorcererMetamagicKnownOptionsSheetParsingTestName,
  storedAvailableSheetInput,
  unitLibrary,
  warlockSpellcastingWithCantrips,
} from "./test-support.test-support.ts";
import {
  characterSheetHitPoints,
  characterSheetHitPointsCurrentHp,
  recoverCharacterSheetHitPoints,
} from "./hit-points.ts";
import { parseStoredHitPoints } from "./stored-sheet-parser.ts";

export const sorcererMetamagicKnownOptionsSheetParsingRuntimeTestName =
  sorcererMetamagicKnownOptionsSheetParsingTestName;
export const sorcererMetamagicKnownOptionsGateRuntimeTestName =
  sorcererMetamagicKnownOptionsGateTestName;

describe("Character Sheet runtime / sheet lifecycle and stored parsing", () => {
  test("projects Knocked Out HP and treats zero healing as an identity operation", () => {
    const knockedOut = requireSuccess(
      characterSheetHitPoints({
        currentHp: Hp(1),
        tempHp: Hp(0),
        positiveHpUnconscious: { tag: "knockedOut" },
      }),
    );
    expect(knockedOut).toEqual({ tag: "knockedOut", tempHp: Hp(0) });
    expect(characterSheetHitPointsCurrentHp(knockedOut)).toBe(Hp(1));

    const sheet = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:synthetic-zero-healing"),
        build,
        currentHp: Hp(5),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    expect(
      requireSuccess(
        recoverCharacterSheetHitPoints({
          sheet,
          unitLibrary,
          healing: Hp(0),
          overflow: { tag: "capAtMaximum" },
          deadCharacterMessage: "Synthetic zero healing cannot revive.",
        }),
      ),
    ).toBe(sheet);
  });

  test("retains nondefault stored sheet state", () => {
    const parsed = requireSuccess(
      parseCharacterSheet(
        {
          ...storedAvailableSheetInput({
            characterId: "character:synthetic-retained-state",
            build,
          }),
          heroicInspiration: CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
          exhaustionLevel: 2,
          conditions: ["charmed", "poisoned"],
          spentHitDice: [{ classUnitId: "class_fighter", spent: 1 }],
        },
        unitLibrary,
      ),
    );

    expect(parsed).toMatchObject({
      heroicInspiration: CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
      exhaustionLevel: 2,
      conditions: ["charmed", "poisoned"],
      spentHitDice: [{ classUnitId: "class_fighter", spent: 1 }],
    });
  });

  test.each([
    {
      characterId: "character:stored-knocked-out",
      hitPoints: { tag: "knockedOut", tempHp: 0 },
      expectedTag: "knockedOut",
    },
    {
      characterId: "character:stored-zero-hp",
      hitPoints: {
        tag: "zero",
        tempHp: 0,
        lifecycle: {
          tag: "unstable",
          deathSaves: { successes: 1, failures: 1 },
        },
      },
      expectedTag: "zero",
    },
  ] as const)(
    "retains $expectedTag Hit Point state through full sheet parsing",
    ({ characterId, hitPoints, expectedTag }) => {
      const parsed = requireSuccess(
        parseCharacterSheet(
          {
            ...storedAvailableSheetInput({ characterId, build }),
            hitPoints,
          },
          unitLibrary,
        ),
      );

      expect(parsed.hitPoints.tag).toBe(expectedTag);
    },
  );

  test.each([
    { value: null, expectedTag: "Failure" },
    { value: {}, expectedTag: "Failure" },
    {
      value: { tag: "positive", currentHp: "not-hp" },
      expectedTag: "Failure",
    },
    {
      value: { tag: "positive", currentHp: 2, tempHp: "not-hp" },
      expectedTag: "Failure",
    },
    { value: { tag: "positive", currentHp: 2 }, expectedTag: "Success" },
    { value: { tag: "knockedOut", tempHp: 1 }, expectedTag: "Success" },
    { value: { tag: "zero", lifecycle: null }, expectedTag: "Failure" },
    {
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: {
            kind: "regains1HpAfter1d4Hours",
            elapsedBeforeRecoveryRoll: 0,
          },
        },
      },
      expectedTag: "Success",
    },
    {
      value: {
        tag: "zero",
        lifecycle: { tag: "stable", recovery: null },
      },
      expectedTag: "Failure",
    },
    {
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: { kind: "unsupportedRecovery" },
        },
      },
      expectedTag: "Failure",
    },
    {
      value: {
        tag: "zero",
        lifecycle: {
          tag: "stable",
          recovery: { kind: "regains1HpAfter", remaining: 1 },
        },
      },
      expectedTag: "Success",
    },
    {
      value: {
        tag: "zero",
        lifecycle: {
          tag: "unstable",
          deathSaves: { successes: 1, failures: 2 },
        },
      },
      expectedTag: "Success",
    },
    {
      value: {
        tag: "zero",
        lifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 4 },
        },
      },
      expectedTag: "Failure",
    },
    {
      value: {
        tag: "zero",
        lifecycle: { tag: "unstable", deathSaves: null },
      },
      expectedTag: "Failure",
    },
  ])("parses stored Hit Point boundary case %#", ({ value, expectedTag }) => {
    expect(parseStoredHitPoints(value)._tag).toBe(expectedTag);
  });

  test("creates a fresh non-spellcasting Character Sheet at current HP", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:test"),
      build,
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Result.isSuccess(sheet)).toBe(true);
    if (Result.isSuccess(sheet)) {
      expect(sheet.success.hitPoints).toEqual({
        tag: "positive",
        currentHp: 8,
        tempHp: 0,
      });
    }
  });

  test("stores Temporary Hit Points as in-play HP state", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:test"),
      build,
      currentHp: Hp(8),
      tempHp: Hp(5),
      unitLibrary,
    });

    expect(Result.isSuccess(sheet)).toBe(true);
    if (Result.isSuccess(sheet)) {
      expect(characterSheetTempHp(sheet.success)).toBe(5);
    }
  });

  test("rejects contradictory positive and zero-HP state", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:test"),
      build,
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 0, failures: 0 },
      },
    });

    expect(Result.isFailure(sheet)).toBe(true);
  });

  test("rejects current HP above sheet maximum HP", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:test"),
      build,
      currentHp: Hp(13),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Result.isFailure(sheet)).toBe(true);
  });

  test("defaults omitted current HP to the derived effective maximum", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:derived-current-hp"),
      build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(3),
      unitLibrary,
    });

    expect(Result.isSuccess(sheet)).toBe(true);
    if (Result.isSuccess(sheet)) {
      expect("maximumHp" in sheet.success).toBe(false);
      expect(sheet.success.hitPoints).toEqual({
        tag: "positive",
        currentHp: 8,
        tempHp: 0,
      });
      expect(characterSheetHitPointMaximum(sheet.success)).toBe(8);
      expect(
        requireSuccess(
          characterSheetNormalHitPointMaximum({
            sheet: sheet.success,
            unitLibrary,
          }),
        ),
      ).toBe(11);
    }
  });

  test("rejects stale stored sheets with build-derived maximum HP", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-maximum-hp",
          build,
        }),
        maximumHp: 50,
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Stored Character Sheet must not carry build-derived maximum HP.",
      },
    });
  });

  test("rejects stale stored sheets with ordinary Spell Slot capacity", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-ordinary-spell-slots",
          build,
        }),
        spellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Stored Character Sheet must not carry build-derived ordinary Spell Slot capacity.",
      },
    });
  });

  test("rejects stale stored sheets with Pact Slot capacity", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-pact-slots",
          build,
        }),
        pactSlots: { slotLevel: 1, count: 1, expended: 0 },
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Stored Character Sheet must not carry build-derived Pact Slot capacity.",
      },
    });
  });

  test("rejects stored Pact Slot expenditure records with stale capacity keys", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-pact-slot-expenditure",
          build: {
            ...armorClassBuild({ startingClass: "class_warlock" }),
            spellcasting: warlockSpellcastingWithCantrips(["eldritch_blast"]),
          },
        }),
        pactSlotExpenditure: { slotLevel: 1, count: 1, expended: 0 },
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Pact Slot expenditure state must contain exactly expended count.",
      },
    });
  });

  test("rejects stored spent Hit Dice records with extra keys", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:stale-hit-dice",
          build,
        }),
        spentHitDice: [{ classUnitId: "class_fighter", spent: 0, count: 1 }],
      },
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Spent Hit Dice state must contain exactly class Unit id and spent count.",
      },
    });
  });

  test("rejects stored sheets with malformed Character Build shape", () => {
    const sheet = parseCharacterSheet(
      {
        tag: "available",
        characterId: "character:test",
        build: {
          progression: {},
          background: "background_soldier",
          species: "species_orc",
          abilityScores: {},
          proficiencyChoices: [],
          features: [],
          equipment: {},
        },
        hitPointMaximumReduction: 0,
        hitPoints: { tag: "positive", currentHp: 12 },
        spentHitDice: [],
      },
      unitLibrary,
    );

    expect(Result.isFailure(sheet)).toBe(true);
  });

  test("preserves stored Druid class-feature language facts separately from origin languages", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:druidic-language",
        build: druidLanguageBuild(),
      }),
      unitLibrary,
    );

    const parsed = requireSuccess(sheet);
    expect(parsed.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(parsed.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: authoredUnitId("druid_druidic"),
        language: "Druidic",
      },
    ]);
  });

  test("preserves stored Rogue fixed and chosen class-feature language facts", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:rogue-thieves-cant-language",
        build: rogueLanguageBuild("Elvish"),
      }),
      unitLibrary,
    );

    const parsed = requireSuccess(sheet);
    expect(parsed.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(parsed.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: authoredUnitId("rogue_thieves_cant"),
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: authoredUnitId("rogue_thieves_cant"),
        language: "Elvish",
      },
    ]);
  });

  test("creates fresh sheets without merging class-feature languages into origin languages", () => {
    const sheet = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:rogue-language-sheet"),
        build: rogueLanguageBuild("Elvish"),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(sheet.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(sheet.build.originLanguages).not.toContain("Thieves' Cant");
    expect(sheet.build.originLanguages).not.toContain("Elvish");
    expect(sheet.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: authoredUnitId("rogue_thieves_cant"),
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: authoredUnitId("rogue_thieves_cant"),
        language: "Elvish",
      },
    ]);
  });

  test("rejects stored Druid builds that omit required Druidic language facts", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:missing-druidic-language",
        build: {
          ...druidLanguageBuild(),
          classFeatureLanguages: [],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message:
          "Character Build class-feature language projection is incomplete for source Unit druid_druidic.",
      },
    });
  });

  test("rejects stored Rogue builds that omit the extra Thieves' Cant language choice", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:missing-rogue-language-choice",
        build: {
          ...rogueLanguageBuild("Elvish"),
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: authoredUnitId("rogue_thieves_cant"),
              language: "Thieves' Cant",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message:
          "Character Build class-feature language choices for source Unit rogue_thieves_cant must match the source choice count.",
      },
    });
  });

  test("rejects stored class-feature language facts from unowned source Units", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:unowned-druidic-language",
        build: {
          ...armorClassBuild({ startingClass: "class_fighter" }),
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: authoredUnitId("druid_druidic"),
              language: "Druidic",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message:
          "Character Build class-feature language source Unit druid_druidic is not owned by the build.",
      },
    });
  });

  test("rejects stored class-feature language facts spoofed through selected features", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:spoofed-druidic-language",
        build: {
          ...armorClassBuild({ startingClass: "class_fighter" }),
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
              unitId: authoredUnitId("druid_druidic"),
            },
          ],
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: authoredUnitId("druid_druidic"),
              language: "Druidic",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message:
          "Character Build class-feature language source Unit druid_druidic is not owned by the build.",
      },
    });
  });

  test("rejects stored class-feature language choices that duplicate fixed class languages", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:duplicate-thieves-cant-choice",
        build: {
          ...armorClassBuild({ startingClass: "class_rogue" }),
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: authoredUnitId("rogue_thieves_cant"),
              language: "Thieves' Cant",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message: "Duplicate Character Build language Thieves' Cant.",
      },
    });
  });

  test("rejects stored class-feature language choices above the source count", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:too-many-rogue-language-choices",
        build: {
          ...rogueLanguageBuild("Elvish"),
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: authoredUnitId("rogue_thieves_cant"),
              language: "Thieves' Cant",
            },
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: authoredUnitId("rogue_thieves_cant"),
              language: "Elvish",
            },
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: authoredUnitId("rogue_thieves_cant"),
              language: "Sylvan",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message:
          "Character Build class-feature language choices for source Unit rogue_thieves_cant must match the source choice count.",
      },
    });
  });

  test("round-trips stored Eldritch Invocation repeatable choices through sheet parsing", () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:repeatable-invocation",
          build: {
            ...armorClassBuild({ startingClass: "class_warlock" }),
            spellcasting: warlockSpellcastingWithCantrips(["eldritch_blast"]),
            features: [
              {
                kind: "selectedEldritchInvocation",
                selectedFromUnitId: authoredUnitId(
                  "warlock_eldritch_invocations",
                ),
                selection: {
                  kind: "repeatable",
                  invocationId: "repelling_blast",
                  repeatableChoice: {
                    kind: "knownWarlockCantrip",
                    cantripId: "eldritch_blast",
                  },
                },
              },
              {
                kind: "selectedEldritchInvocation",
                selectedFromUnitId: authoredUnitId(
                  "warlock_eldritch_invocations",
                ),
                selection: {
                  kind: "repeatable",
                  invocationId: "lessons_of_the_first_ones",
                  repeatableChoice: {
                    kind: "originFeat",
                    featUnitId: "feat_savage_attacker",
                  },
                },
              },
            ],
          },
        }),
        spellSlotExpenditures: [],
        pactSlotExpenditure: { expended: 0 },
      },
      unitLibrary,
    );

    const parsed = requireSuccess(sheet);
    expect(parsed.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
          selection: {
            kind: "repeatable",
            invocationId: "repelling_blast",
            repeatableChoice: {
              kind: "knownWarlockCantrip",
              cantripId: "eldritch_blast",
            },
          },
        },
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
          selection: {
            kind: "repeatable",
            invocationId: "lessons_of_the_first_ones",
            repeatableChoice: {
              kind: "originFeat",
              featUnitId: "feat_savage_attacker",
            },
          },
        },
      ]),
    );
  });

  test(sorcererMetamagicKnownOptionsSheetParsingRuntimeTestName, () => {
    const sheet = parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: "character:sorcerer-metamagic",
          build: sorcererFontOfMagicBuild(),
        }),
        spellSlotExpenditures: [{ spellLevel: 1, expended: 0 }],
      },
      unitLibrary,
    );

    const parsed = requireSuccess(sheet);
    expect(parsed.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedSorcererMetamagicOption",
          selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
          optionId: "sorcerer_empowered_spell",
        },
        {
          kind: "selectedSorcererMetamagicOption",
          selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
          optionId: "sorcerer_heightened_spell",
        },
      ]),
    );
    const metamagicFacts = requireSuccess(
      characterBuildSorcererMetamagicFacts({
        build: parsed.build,
        unitLibrary,
      }),
    );
    expect(
      metamagicFacts?.knownOptions.map((option) => option.optionId),
    ).toEqual(["sorcerer_empowered_spell", "sorcerer_heightened_spell"]);
    expect(metamagicFacts?.sorceryPointResource).toEqual({
      resourceUnitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
      poolId: SRD_SORCERY_POINTS_POOL_ID,
    });
  });

  test(sorcererMetamagicKnownOptionsGateRuntimeTestName, () => {
    const build = sorcererFontOfMagicBuild();
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:sorcerer-metamagic-missing-option",
        build: {
          ...build,
          features: build.features.slice(0, 1),
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSheetIssue",
        message: "Metamagic known option count must match the Sorcerer level.",
      },
    });
  });

  test("rejects stored Eldritch Invocation cantrip choices absent from known Warlock cantrips", () => {
    const invalidBuilds = [
      {
        characterId: "character:unknown-warlock-cantrip",
        repeatableChoiceCantripId: "eldritch_blast",
        knownCantrips: ["poison_spray"],
      },
      {
        characterId: "character:non-warlock-cantrip",
        repeatableChoiceCantripId: "fire_bolt",
        knownCantrips: ["fire_bolt"],
      },
    ] as const;

    for (const input of invalidBuilds) {
      const sheet = parseCharacterSheet(
        storedAvailableSheetInput({
          characterId: input.characterId,
          build: {
            ...armorClassBuild({ startingClass: "class_warlock" }),
            spellcasting: warlockSpellcastingWithCantrips(input.knownCantrips),
            features: [
              {
                kind: "selectedEldritchInvocation",
                selectedFromUnitId: authoredUnitId(
                  "warlock_eldritch_invocations",
                ),
                selection: {
                  kind: "repeatable",
                  invocationId: "repelling_blast",
                  repeatableChoice: {
                    kind: "knownWarlockCantrip",
                    cantripId: input.repeatableChoiceCantripId,
                  },
                },
              },
            ],
          },
        }),
        unitLibrary,
      );

      expect(sheet).toMatchObject({
        _tag: "Failure",
        failure: {
          message:
            "Character Build Eldritch Invocation repeatable known cantrip choice must be a known Warlock cantrip.",
        },
      });
    }
  });

  test("rejects malformed stored Eldritch Invocation repeatable choices", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:bad-repeatable-invocation",
        build: {
          ...armorClassBuild({ startingClass: "class_warlock" }),
          features: [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: authoredUnitId(
                "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "repeatable",
                invocationId: "repelling_blast",
                repeatableChoice: {
                  kind: "knownWarlockCantrip",
                },
              },
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Character Build Eldritch Invocation repeatable choice is invalid.",
      },
    });
  });

  test("rejects stored Eldritch Invocation repeatable choices inconsistent with the invocation catalog", () => {
    const invalidFeatures = [
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        selection: {
          kind: "repeatable",
          invocationId: "armor_of_shadows",
          repeatableChoice: {
            kind: "knownWarlockCantrip",
            cantripId: "eldritch_blast",
          },
        },
      },
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        selection: {
          kind: "nonRepeatable",
          invocationId: "repelling_blast",
        },
      },
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        selection: {
          kind: "repeatable",
          invocationId: "lessons_of_the_first_ones",
          repeatableChoice: {
            kind: "knownWarlockCantrip",
            cantripId: "eldritch_blast",
          },
        },
      },
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        selection: {
          kind: "repeatable",
          invocationId: "repelling_blast",
          repeatableChoice: {
            kind: "knownWarlockCantrip",
            cantripId: "minor_illusion",
          },
        },
      },
    ] as const;

    for (const feature of invalidFeatures) {
      const sheet = parseCharacterSheet(
        storedAvailableSheetInput({
          characterId: `character:invalid-${feature.selection.invocationId}`,
          build: {
            ...armorClassBuild({ startingClass: "class_warlock" }),
            features: [feature],
          },
        }),
        unitLibrary,
      );

      expect(Result.isFailure(sheet)).toBe(true);
    }
  });

  test("round-trips stored Book of Shadows Spell Access through sheet parsing", () => {
    const bookOfShadows = {
      tag: "bookOfShadows",
      cantrips: ["fire_bolt", "spare_the_dying", "minor_illusion"],
      ritualSpells: ["detect_magic", "detect_poison_and_disease"],
      spellcastingFocus: "book_of_shadows",
    };
    const sheet = parseCharacterSheet(
      {
        tag: "available",
        characterId: "character:test",
        build: {
          ...armorClassBuild({ startingClass: "class_warlock" }),
          features: [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: authoredUnitId(
                "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "nonRepeatable",
                invocationId: "pact_of_the_tome",
              },
            },
          ],
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_warlock"),
                spellcastingAbility: "cha",
                cantrips: [],
                spellbook: [],
                preparedSpells: [],
                spellcastingFocuses: ["arcane_focus"],
                bookOfShadows,
              },
            ],
            slotPools: {
              pactMagic: {
                kind: "pactMagic",
                slotLevel: 1,
                count: 1,
              },
            },
          },
        },
        hitPointMaximumReduction: 0,
        hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 },
        bookOfShadowsPresence: { tag: "notOnPerson" },
        conditions: [],
        spentHitDice: [],
        resourceExpenditures: [],
        heroicInspiration: CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
        companion: { tag: "none" },
        spellSlotExpenditures: [],
        pactSlotExpenditure: { expended: 0 },
      },
      unitLibrary,
    );

    if (Result.isFailure(sheet)) {
      throw new Error(
        `Expected parsed sheet, got ${JSON.stringify(sheet.failure)}`,
      );
    }
    expect(sheet.success.build.spellcasting?.sources[0]?.bookOfShadows).toEqual(
      bookOfShadows,
    );
    expect(sheet.success.bookOfShadowsPresence).toEqual({ tag: "notOnPerson" });
  });
});
