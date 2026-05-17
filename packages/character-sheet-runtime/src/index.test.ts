import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
} from "@dnd/character-creation-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks, timeSpanDuration } from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  BARD_JACK_OF_ALL_TRADES_UNIT_ID,
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  applyLayOnHands,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetArmorClassState,
  characterSheetHitDice,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellInvocation,
  characterSheetSpellSlots,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  characterSheetId,
  characterSheetTempHp,
  parseCharacterSheet,
  timePassed,
  type CharacterSheet,
  type CharacterSheetInput,
  type CharacterSheetWeaponMasteryReselection,
} from "./index.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.armor-class-base-formula
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spellbook-ritual-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.weapon-mastery-reselection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-proficiency-bonus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B barbarian_unarmored_defense monk_unarmored_defense paladin_lay_on_hands wizard_arcane_recovery wizard_ritual_adept
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-04 fighter_weapon_mastery barbarian_weapon_mastery paladin_weapon_mastery ranger_weapon_mastery rogue_weapon_mastery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARD-JACK-OF-ALL-TRADES bard_jack_of_all_trades

const build = armorClassBuild({ startingClass: "class_fighter" });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const layOnHandsSpendsHealingPoolTestName =
  "Lay On Hands spends one healing pool for HP restoration and Poisoned removal";
const layOnHandsRejectsDivergentPoolsTestName =
  "Lay On Hands cannot split HP and Poisoned costs across divergent pools";
const layOnHandsLongRestRecoveryTestName =
  "Long Rest restores the Lay On Hands healing pool";
const ritualAdeptAdmitsSpellbookRitualTestName =
  "admits Wizard Ritual Adept for a ritual-tagged Spell Definition in the spellbook";
const ritualAdeptRejectsPreparedOnlySpellTestName =
  "rejects Wizard Ritual Adept when a ritual spell is prepared but absent from the spellbook";
const ritualAdeptRejectsNonRitualSpellTestName =
  "rejects Wizard Ritual Adept for a spellbook spell without the Ritual tag";
const ritualAdeptRejectsMissingFeatureTestName =
  "rejects spellbook ritual invocation without a spellbook Ritual Access feature";
const weaponMasteryLongRestReselectionTestName =
  "Long Rest reselects Weapon Mastery choices from Surface feature eligibility";
const jackOfAllTradesAddsHalfProficiencyBonusTestName =
  "Jack of All Trades adds half Proficiency Bonus to an unproficient skill Ability Check";
const skillProficiencyOverridesJackOfAllTradesTestName =
  "skill proficiency and Expertise determine the Ability Check Proficiency Bonus before Jack of All Trades";
const jackOfAllTradesRequiresNoOtherProficiencyBonusTestName =
  "Jack of All Trades does not apply when another Proficiency Bonus applies";
const jackOfAllTradesRequiresBardLevelTwoFeatureTestName =
  "Jack of All Trades requires the Bard level 2 feature grant";

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions"> &
    Partial<Pick<CharacterSheetInput, "conditions">>,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    ...input,
  });
}

describe("Character Sheet runtime", () => {
  test("creates a fresh non-spellcasting Character Sheet at current HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(sheet.right.hitPoints).toEqual({
        tag: "positive",
        currentHp: 12,
        tempHp: 0,
      });
    }
  });

  test("stores Temporary Hit Points as in-play HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(5),
      unitLibrary,
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(characterSheetTempHp(sheet.right)).toBe(5);
    }
  });

  test("rejects contradictory positive and zero-HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 0, failures: 0 },
      },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects current HP above sheet maximum HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(13),
      tempHp: Hp(0),
      unitLibrary,
    });

    expect(Either.isLeft(sheet)).toBe(true);
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
        maximumHp: 12,
        hitPoints: { tag: "positive", currentHp: 12 },
        spentHitDice: [],
      },
      unitLibrary,
    );

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("preserves stored Druid class-feature language facts separately from origin languages", () => {
    const sheet = parseCharacterSheet(
      storedAvailableSheetInput({
        characterId: "character:druidic-language",
        build: druidLanguageBuild(),
      }),
      unitLibrary,
    );

    const parsed = requireRight(sheet);
    expect(parsed.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(parsed.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "druid_druidic",
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

    const parsed = requireRight(sheet);
    expect(parsed.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(parsed.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "rogue_thieves_cant",
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "rogue_thieves_cant",
        language: "Elvish",
      },
    ]);
  });

  test("creates fresh sheets without merging class-feature languages into origin languages", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rogue-language-sheet"),
        build: rogueLanguageBuild("Elvish"),
        maximumHp: Hp(12),
        currentHp: Hp(12),
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
        sourceUnitId: "rogue_thieves_cant",
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "rogue_thieves_cant",
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
      _tag: "Left",
      left: {
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
              sourceUnitId: "rogue_thieves_cant",
              language: "Thieves' Cant",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
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
              sourceUnitId: "druid_druidic",
              language: "Druidic",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
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
              selectedFromUnitId: "fighter_weapon_mastery",
              unitId: "druid_druidic",
            },
          ],
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: "druid_druidic",
              language: "Druidic",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
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
              sourceUnitId: "rogue_thieves_cant",
              language: "Thieves' Cant",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
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
              sourceUnitId: "rogue_thieves_cant",
              language: "Thieves' Cant",
            },
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: "rogue_thieves_cant",
              language: "Elvish",
            },
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: "rogue_thieves_cant",
              language: "Sylvan",
            },
          ],
        },
      }),
      unitLibrary,
    );

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
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
                selectedFromUnitId: "warlock_eldritch_invocations",
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
                selectedFromUnitId: "warlock_eldritch_invocations",
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
        pactSlotExpenditure: { slotLevel: 1, count: 1, expended: 0 },
      },
      unitLibrary,
    );

    const parsed = requireRight(sheet);
    expect(parsed.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedEldritchInvocation",
          selectedFromUnitId: "warlock_eldritch_invocations",
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
          selectedFromUnitId: "warlock_eldritch_invocations",
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
                selectedFromUnitId: "warlock_eldritch_invocations",
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
        _tag: "Left",
        left: {
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
              selectedFromUnitId: "warlock_eldritch_invocations",
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
      _tag: "Left",
      left: {
        message:
          "Character Build Eldritch Invocation repeatable choice is invalid.",
      },
    });
  });

  test("rejects stored Eldritch Invocation repeatable choices inconsistent with the invocation catalog", () => {
    const invalidFeatures = [
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: "warlock_eldritch_invocations",
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
        selectedFromUnitId: "warlock_eldritch_invocations",
        selection: {
          kind: "nonRepeatable",
          invocationId: "repelling_blast",
        },
      },
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: "warlock_eldritch_invocations",
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
        selectedFromUnitId: "warlock_eldritch_invocations",
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

      expect(Either.isLeft(sheet)).toBe(true);
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
              selectedFromUnitId: "warlock_eldritch_invocations",
              selection: {
                kind: "nonRepeatable",
                invocationId: "pact_of_the_tome",
              },
            },
          ],
          spellcasting: {
            sources: [
              {
                sourceUnitId: "class_warlock",
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
        maximumHp: 12,
        hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
        bookOfShadowsPresence: { tag: "notOnPerson" },
        conditions: [],
        spentHitDice: [],
        resourceExpenditures: [],
        spellSlotExpenditures: [],
        pactSlotExpenditure: { slotLevel: 1, count: 1, expended: 0 },
      },
      unitLibrary,
    );

    if (Either.isLeft(sheet)) {
      throw new Error(
        `Expected parsed sheet, got ${JSON.stringify(sheet.left)}`,
      );
    }
    expect(sheet.right.build.spellcasting?.sources[0]?.bookOfShadows).toEqual(
      bookOfShadows,
    );
    expect(sheet.right.bookOfShadowsPresence).toEqual({ tag: "notOnPerson" });
  });

  test("timePassed accumulates Stable recovery time before one hour can pass", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-round"),
      duration: requireRight(timeSpanDuration({ unit: "round", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      elapsedTicks: 1,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 1,
            },
          },
        },
      },
    });
  });

  test("timePassed asks for a Stable recovery roll at the one-hour boundary", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-roll"),
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
      holes: [
        {
          kind: "rolledDice",
          holeId: "character-sheet:character:stable-roll:stable-recovery-roll",
          label: "Stable recovery 1d4 hours",
        },
      ],
    });
  });

  test("timePassed reaches the Stable recovery roll boundary across multiple calls", () => {
    const firstHalfHour = timePassed({
      sheet: stableSheet("character:stable-halves"),
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });
    if (firstHalfHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHalfHour.tag}.`);
    }

    const secondHalfHour = timePassed({
      sheet: firstHalfHour.sheet,
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });

    expect(secondHalfHour).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
    });
  });

  test("timePassed rejects a Stable recovery roll before the one-hour boundary", () => {
    const sheet = stableSheet("character:stable-early-roll");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    expect(
      timePassed({
        sheet,
        duration: requireRight(
          timeSpanDuration({ unit: "minute", amount: 30 }),
        ),
        fills: [
          {
            kind: "rolledDice",
            holeId: awaitingRoll.holes[0].holeId,
            value: [{ results: [DieRollResult(1)] }],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("timePassed consumes a Stable recovery roll and recovers after the rolled duration", () => {
    const sheet = stableSheet("character:stable-recovery");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    const firstHour = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [
        {
          kind: "rolledDice",
          holeId: awaitingRoll.holes[0].holeId,
          value: [{ results: [DieRollResult(2)] }],
        },
      ],
    });

    expect(firstHour).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: { kind: "regains1HpAfter", remaining: 600 },
          },
        },
      },
    });
    if (firstHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHour.tag}.`);
    }

    expect(
      timePassed({
        sheet: firstHour.sheet,
        duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
        fills: [],
      }),
    ).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: { hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 } },
    });
  });

  test("derives default unarmored Armor Class from Dexterity", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_fighter" }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("derives Barbarian Unarmored Defense and still allows Shield bonus", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          shield: true,
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(state)).toBe(15);
  });

  test("suppresses Monk Unarmored Defense while wielding a Shield", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({ startingClass: "class_monk", shield: true }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "ability_sum",
      source: "default_unarmored",
    });
    expect(currentArmorClass(state)).toBe(12);
  });

  test("requires an Armor Class base choice when multiple class formulas apply", () => {
    const result = characterSheetArmorClassState({
      build: armorClassBuild({
        startingClass: "class_barbarian",
        advancements: ["class_monk"],
      }),
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects missing class-feature Units while deriving Armor Class base formulas", () => {
    const result = characterSheetArmorClassState({
      build: {
        ...armorClassBuild({ startingClass: "class_fighter" }),
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "class_fighter",
            unitId: "missing_unarmored_defense",
          },
        ],
      },
      unitLibrary,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { message: "Unknown Unit id: missing_unarmored_defense" },
    });
  });

  test("uses the selected Armor Class base formula for multiclass characters", () => {
    const monkState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "monk_unarmored_defense",
        },
      }),
    );
    const barbarianState = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          advancements: ["class_monk"],
        }),
        unitLibrary,
        baseChoice: {
          kind: "class_feature",
          unitId: "barbarian_unarmored_defense",
        },
      }),
    );

    expect(monkState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(monkState)).toBe(15);
    expect(barbarianState.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(barbarianState)).toBe(13);
  });

  test("uses worn armor instead of unarmored base formulas", () => {
    const state = requireRight(
      characterSheetArmorClassState({
        build: armorClassBuild({
          startingClass: "class_barbarian",
          armor: "armor_chain_mail",
        }),
        unitLibrary,
      }),
    );

    expect(state.base).toMatchObject({
      kind: "armor",
      category: "heavy",
    });
    expect(currentArmorClass(state)).toBe(16);
  });

  test(jackOfAllTradesAddsHalfProficiencyBonusTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 2 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );
    const roundedDown = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 5 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(result).toEqual({
      tag: "jackOfAllTrades",
      sourceUnitId: BARD_JACK_OF_ALL_TRADES_UNIT_ID,
      skill: "performance",
      bonus: 1,
    });
    expect(roundedDown).toMatchObject({ tag: "jackOfAllTrades", bonus: 1 });
  });

  test(skillProficiencyOverridesJackOfAllTradesTestName, () => {
    const skillProficiency = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({
          totalLevel: 5,
          proficiencyChoices: [{ kind: "skill", skill: "performance" }],
        }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );
    const expertise = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({
          totalLevel: 5,
          proficiencyChoices: [
            { kind: "skill_expertise", skill: "performance" },
          ],
        }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(skillProficiency).toEqual({
      tag: "skillProficiency",
      skill: "performance",
      bonus: 3,
    });
    expect(expertise).toEqual({
      tag: "expertise",
      skill: "performance",
      bonus: 6,
    });
  });

  test(jackOfAllTradesRequiresNoOtherProficiencyBonusTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 5 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus:
          CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
      }),
    );

    expect(result).toEqual({ tag: "none", bonus: 0 });
  });

  test(jackOfAllTradesRequiresBardLevelTwoFeatureTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 1 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(result).toEqual({ tag: "none", bonus: 0 });
  });

  test("Long Rest restores HP, Spell Slots, Pact Slots, and Arcane Recovery use", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:long-rest"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(12),
        currentHp: Hp(4),
        tempHp: Hp(3),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(2),
          },
        ],
        pactSlots: {
          slotLevel: spellSlotLevel(1),
          count: resourceCount(1),
          expended: resourceCount(1),
        },
        restFeatureUses: [
          {
            tag: "arcaneRecovery",
            usedSinceLongRest: true,
          },
        ],
      }),
    );

    const rested = requireRight(completeLongRest({ sheet }));

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 12,
      tempHp: 0,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1, spent: 0 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 0 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(rested.restFeatureUses).toEqual([]);
  });

  test(weaponMasteryLongRestReselectionTestName, () => {
    const cases = [
      {
        classUnitId: "class_fighter",
        featureUnitId: "fighter_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger", "weapon_spear"],
        after: ["weapon_longsword", "weapon_dagger", "weapon_shortsword"],
      },
      {
        classUnitId: "class_barbarian",
        featureUnitId: "barbarian_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_longsword", "weapon_shortsword"],
      },
      {
        classUnitId: "class_paladin",
        featureUnitId: "paladin_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_spear", "weapon_flail"],
      },
      {
        classUnitId: "class_ranger",
        featureUnitId: "ranger_weapon_mastery",
        before: ["weapon_longsword", "weapon_dagger"],
        after: ["weapon_spear", "weapon_flail"],
      },
      {
        classUnitId: "class_rogue",
        featureUnitId: "rogue_weapon_mastery",
        before: ["weapon_dagger", "weapon_shortbow"],
        after: ["weapon_spear", "weapon_shortsword"],
      },
    ] as const;

    for (const testCase of cases) {
      const sheet = requireRight(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            `character:${testCase.featureUnitId}:long-rest`,
          ),
          build: weaponMasteryBuild({
            startingClass: testCase.classUnitId,
            featureUnitId: testCase.featureUnitId,
            selectedWeaponUnitIds: testCase.before,
          }),
          maximumHp: Hp(12),
          currentHp: Hp(6),
          tempHp: Hp(2),
          unitLibrary,
        }),
      );
      const reselection = {
        featureUnitId: testCase.featureUnitId,
        selectedWeaponUnitIds: testCase.after,
      } satisfies CharacterSheetWeaponMasteryReselection;

      const rested = requireRight(
        completeLongRest({
          sheet,
          unitLibrary,
          weaponMasteryReselections: [reselection],
        }),
      );

      expect(
        selectedClassChoiceUnitIds(rested.build, testCase.featureUnitId),
      ).toEqual(testCase.after);
      expect(rested.hitPoints).toEqual({
        tag: "positive",
        currentHp: 12,
        tempHp: 0,
      });
    }
  });

  test("rejects Weapon Mastery Long Rest reselection above the Surface change count", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:fighter-mastery-reject"),
        build: weaponMasteryBuild({
          startingClass: "class_fighter",
          featureUnitId: "fighter_weapon_mastery",
          selectedWeaponUnitIds: [
            "weapon_longsword",
            "weapon_dagger",
            "weapon_spear",
          ],
        }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const result = completeLongRest({
      sheet,
      unitLibrary,
      weaponMasteryReselections: [
        {
          featureUnitId: "fighter_weapon_mastery",
          selectedWeaponUnitIds: [
            "weapon_longsword",
            "weapon_shortsword",
            "weapon_flail",
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Weapon Mastery Long Rest reselection changes too many weapon choices.",
      },
    });
  });

  test(layOnHandsSpendsHealingPoolTestName, () => {
    const source = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin"),
        build: armorClassBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const target = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        maximumHp: Hp(10),
        currentHp: Hp(3),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    const result = requireRight(
      applyLayOnHands({
        source,
        target,
        unitLibrary,
        restoreHp: Hp(2),
        removePoisoned: true,
      }),
    );

    expect(result.target.hitPoints).toEqual({
      tag: "positive",
      currentHp: 5,
      tempHp: 0,
    });
    expect(result.target.conditions).toEqual([]);
    expect(characterSheetResources(result.source, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "paladin_lay_on_hands",
          count: 10,
          expended: 7,
        },
      ],
    });
  });

  test(layOnHandsRejectsDivergentPoolsTestName, () => {
    const target = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-self"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        maximumHp: Hp(12),
        currentHp: Hp(6),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    expect(
      applyLayOnHands({
        source: target,
        target,
        unitLibrary,
        restoreHp: Hp(1),
        removePoisoned: true,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Lay On Hands cannot spend more healing pool than remains.",
      },
    });
  });

  test(layOnHandsLongRestRecoveryTestName, () => {
    const source = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-rest"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        maximumHp: Hp(12),
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const spent = requireRight(
      applyLayOnHands({
        source,
        target: source,
        unitLibrary,
        restoreHp: Hp(4),
        removePoisoned: false,
      }),
    ).source;

    const rested = requireRight(completeLongRest({ sheet: spent }));

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "paladin_lay_on_hands",
          count: 5,
          expended: 0,
        },
      ],
    });
  });

  test("Long Rest restores the Favored Enemy Hunter's Mark free-cast pool", () => {
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:ranger-rest"),
        build: armorClassBuild({ startingClass: "class_ranger" }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "favoredEnemyHuntersMarkFreeCasts",
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "ranger_favored_enemy",
          count: 2,
          expended: 1,
        },
      ],
    });

    const rested = requireRight(completeLongRest({ sheet: spent }));

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: [
        {
          unitId: "ranger_favored_enemy",
          count: 2,
          expended: 0,
        },
      ],
    });
  });

  test("Short Rest restores Pact Slots without touching ordinary Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-pact"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
        pactSlots: {
          slotLevel: spellSlotLevel(1),
          count: resourceCount(1),
          expended: resourceCount(1),
        },
      }),
    );

    const rested = requireRight(completeShortRest({ sheet, unitLibrary }));

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
  });

  test("Short Rest spends Hit Dice to restore HP without touching Spell Slots", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(18),
        currentHp: Hp(7),
        tempHp: Hp(2),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 12,
      tempHp: 2,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 1 },
    ]);
    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 3, expended: 1 },
    ]);
  });

  test("Short Rest applies minimum healing to each spent Hit Die", () => {
    const lowConWizardBuild: CharacterBuild = {
      ...wizardBuild({ wizardAdvancements: 1 }),
      abilityScores: expectRight(
        abilityScoreAssignment({
          str: 13,
          dex: 14,
          con: 8,
          int: 16,
          wis: 12,
          cha: 10,
        }),
      ),
    };
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-minimum-hit-dice"),
        build: lowConWizardBuild,
        maximumHp: Hp(18),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
          { classUnitId: "class_wizard", roll: DieRollResult(1) },
        ],
      }),
    );

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 9,
      tempHp: 0,
    });
    expect(requireRight(characterSheetHitDice(rested, unitLibrary))).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 2 },
    ]);
  });

  test("Short Rest rejects spending more Hit Dice than remain", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:short-rest-spent-hit-dice"),
        build: wizardBuild({ wizardAdvancements: 0 }),
        maximumHp: Hp(8),
        currentHp: Hp(4),
        tempHp: Hp(0),
        unitLibrary,
        spentHitDice: [
          { classUnitId: "class_wizard", spent: resourceCount(1) },
        ],
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Short Rest cannot spend more Hit Dice than remain." },
    });
  });

  test("Arcane Recovery refunds expended ordinary Spell Slots once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery"),
        build: wizardBuild({ wizardAdvancements: 3 }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(2),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const rested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
          ],
        },
      }),
    );

    expect(characterSheetSpellSlots(rested)).toEqual([
      { spellLevel: 1, count: 4, expended: 2 },
      { spellLevel: 2, count: 3, expended: 0 },
    ]);
    expect(rested.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(
      completeShortRest({
        sheet: rested,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery cannot be used again until a Long Rest.",
      },
    });
  });

  test("Arcane Recovery rejects refunds above its level budget", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:arcane-recovery-budget"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(1), count: resourceCount(2) },
          ],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Arcane Recovery refund exceeds half Wizard level rounded up.",
      },
    });
  });

  test("rejects Arcane Recovery use state for sheets without the feature", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:arcane-recovery-non-owner"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      restFeatureUses: [
        {
          tag: "arcaneRecovery",
          usedSinceLongRest: true,
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      },
    });
  });

  test(ritualAdeptAdmitsSpellbookRitualTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-ritual",
      spellbook: ["detect_magic"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        tag: "spellbookRitual",
        spellId: "detect_magic",
        spellLevel: 1,
        spellcastingSourceUnitId: "class_wizard",
        featureUnitId: "wizard_ritual_adept",
        spellSlotCost: { kind: "none" },
        preparationRequirement: "not_required",
        requiredSpellAccess: "spellbook",
        additionalCastingTimeMinutes: 10,
        requiresReadingSpellbook: true,
      },
    });
    expect(characterSheetSpellSlots(sheet)).toEqual([
      { spellLevel: 1, count: 2, expended: 0 },
    ]);
  });

  test(ritualAdeptRejectsPreparedOnlySpellTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-prepared-not-book",
      spellbook: [],
      preparedSpells: ["detect_magic"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Wizard Ritual Adept requires the spell in the spellbook.",
      },
    });
  });

  test(ritualAdeptRejectsNonRitualSpellTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:wizard-non-ritual",
      spellbook: ["mage_armor"],
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "mage_armor",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Ritual spell invocation requires a ritual-tagged Spell Definition.",
      },
    });
  });

  test(ritualAdeptRejectsMissingFeatureTestName, () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:no-ritual-feature",
      spellbook: ["detect_magic"],
      startingClass: "class_fighter",
    });

    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: "detect_magic",
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spellbook ritual invocation requires a spellbook Ritual Access feature.",
      },
    });
  });
});

function stableSheet(characterIdText: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterIdText),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(0),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
      },
    }),
  );
}

function spellbookRitualSheet(input: {
  readonly characterIdText: string;
  readonly spellbook: readonly string[];
  readonly preparedSpells?: readonly string[];
  readonly startingClass?: string;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterIdText),
      build: {
        ...wizardBuild({ wizardAdvancements: 0 }),
        ...(input.startingClass === undefined
          ? {}
          : {
              progression: {
                startingClass: classUnitId(input.startingClass),
                advancements: [],
              },
            }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_wizard",
              spellcastingAbility: "int",
              cantrips: [],
              spellbook: input.spellbook,
              preparedSpells: input.preparedSpells ?? [],
              spellcastingFocuses: ["spellbook"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 1, count: 2 }],
            },
          },
        },
      },
      maximumHp: Hp(8),
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

function storedAvailableSheetInput(input: {
  readonly characterId: string;
  readonly build: unknown;
}) {
  return {
    tag: "available",
    characterId: input.characterId,
    build: input.build,
    maximumHp: 12,
    hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
    conditions: [],
    spentHitDice: [],
    resourceExpenditures: [],
  };
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function weaponMasteryBuild(input: {
  readonly startingClass: string;
  readonly featureUnitId: string;
  readonly selectedWeaponUnitIds: readonly string[];
}): CharacterBuild {
  return {
    ...armorClassBuild({ startingClass: input.startingClass }),
    features: input.selectedWeaponUnitIds.map((unitId) => ({
      kind: "selectedClassChoice" as const,
      selectedFromUnitId: input.featureUnitId,
      unitId,
    })),
  };
}

function selectedClassChoiceUnitIds(
  build: CharacterBuild,
  featureUnitId: string,
): readonly string[] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}

function bardJackOfAllTradesBuild(input: {
  readonly totalLevel: 1 | 2 | 5;
  readonly proficiencyChoices?: CharacterBuild["proficiencyChoices"];
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_bard",
      advancements: Array.from(
        { length: input.totalLevel - 1 },
        () => "class_bard",
      ),
    }),
    proficiencyChoices: input.proficiencyChoices ?? [],
  };
}

function druidLanguageBuild(): CharacterBuild {
  return {
    ...armorClassBuild({ startingClass: "class_druid" }),
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "druid_druidic",
        language: "Druidic",
      },
    ],
  };
}

function rogueLanguageBuild(
  extraLanguage: "Elvish" | "Sylvan",
): CharacterBuild {
  return {
    ...armorClassBuild({ startingClass: "class_rogue" }),
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "rogue_thieves_cant",
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "rogue_thieves_cant",
        language: extraLanguage,
      },
    ],
  };
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: string;
  readonly shield?: boolean;
}): CharacterBuild {
  const armorItemId =
    input.armor === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "armor",
          unitId: expectRight(characterEquipmentItemUnitId(input.armor)),
        });
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: expectRight(characterEquipmentItemUnitId("equipment_shield")),
        })
      : undefined;
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: input.armor }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function warlockSpellcastingWithCantrips(
  cantrips: readonly string[],
): NonNullable<CharacterBuild["spellcasting"]> {
  return {
    sources: [
      {
        sourceUnitId: "class_warlock",
        spellcastingAbility: "cha",
        cantrips,
        spellbook: [],
        preparedSpells: [],
        spellcastingFocuses: ["arcane_focus"],
      },
    ],
    slotPools: {
      pactMagic: {
        kind: "pactMagic",
        slotLevel: 1,
        count: 1,
      },
    },
  };
}

function wizardBuild(input: {
  readonly wizardAdvancements: number;
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_wizard",
      advancements: Array.from(
        { length: input.wizardAdvancements },
        () => "class_wizard",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots:
            input.wizardAdvancements >= 3
              ? [
                  { spellLevel: 1, count: 4 },
                  { spellLevel: 2, count: 3 },
                ]
              : [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    ...wizardBuild({ wizardAdvancements: 0 }),
    spellcasting: {
      ...wizardBuild({ wizardAdvancements: 0 }).spellcasting!,
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
