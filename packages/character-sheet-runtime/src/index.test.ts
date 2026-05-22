// KERNEL-COVERAGE: parity-witness SHEET.SPELL_REST_BENEFIT.APPLICATION
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  abilityScoreAssignment,
  characterBuildSorcererMetamagicFacts,
  characterBuildResources,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MARTIAL_ARTS_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  MONK_UNCANNY_METABOLISM_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  SORCERER_METAMAGIC_UNIT_ID,
  sorcererMetamagicOptionId,
} from "@dnd/character-creation-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  elapsedTimeTicks,
  timeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import {
  DieRollResult,
  Hp,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetArmorClassState,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitDice,
  characterSheetHitPointMaximum,
  characterSheetLongRestCalendarGate,
  characterSheetMonkUncannyMetabolismUseState,
  characterSheetMonksFocusSaveDc,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellInvocation,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  completeLongRest as completeLongRestCore,
  completeMagicalCunningRite,
  completeShortRest as completeShortRestCore,
  convertFontOfMagicSpellSlotToSorceryPoints,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  finishLongRest,
  finishShortRest,
  characterSheetId,
  characterSheetTempHp,
  interruptLongRest as interruptLongRestCore,
  interruptShortRest as interruptShortRestCore,
  parseCharacterSheet,
  startLongRest,
  startShortRest,
  timePassed,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheet,
  type CharacterSheetInput,
  type CharacterSheetLongRestInput,
  type CharacterSheetLongRestInterruption,
  type CharacterSheetLongRestStartTiming,
  type CharacterSheetShortRestInterruption,
  type CharacterSheetShortRestInput,
  type CharacterSheetWeaponMasteryReselection,
} from "./index.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.armor-class-base-formula
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spellbook-ritual-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.weapon-mastery-reselection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.pact-slot-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-long-rest-use-state
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-point-pool-resource
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.font-of-magic-slot-to-sorcery-points
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.font-of-magic-sorcery-points-to-spell-slot
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spell-rest-benefit-application
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B barbarian_unarmored_defense monk_unarmored_defense paladin_lay_on_hands wizard_arcane_recovery wizard_ritual_adept
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-04 fighter_weapon_mastery barbarian_weapon_mastery paladin_weapon_mastery ranger_weapon_mastery rogue_weapon_mastery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARD-JACK-OF-ALL-TRADES bard_jack_of_all_trades
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-WARLOCK-MAGICAL-CUNNING warlock_magical_cunning
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS monk_uncanny_metabolism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS sorcerer_font_of_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS sorcerer_metamagic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST prayer_of_healing

const build = armorClassBuild({ startingClass: "class_fighter" });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const SRD_SORCERY_POINTS_POOL_ID = "sorcery_points";

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
const druidWildShapeShortRestRecoveryTestName =
  "Short Rest partially restores the Druid Wild Shape use pool";
const monksFocusShortRestRecoveryTestName =
  "Short Rest restores the Monk Focus Point use pool";
const sorcererFontOfMagicLongRestRecoveryTestName =
  "Long Rest restores the Sorcerer Font of Magic Sorcery Point pool";
const sorcererFontOfMagicSlotConversionTestName =
  "Font of Magic converts an ordinary Spell Slot into Sorcery Points";
const sorcererFontOfMagicSlotConversionGateTestName =
  "Font of Magic Spell Slot conversion respects Spell Slot and Sorcery Point gates";
const sorcererFontOfMagicSlotCreationTestName =
  "Font of Magic creates Spell Slots from Sorcery Points";
const sorcererFontOfMagicSlotCreationGateTestName =
  "Font of Magic Spell Slot creation enforces Sorcery Point and level gates";
const sorcererMetamagicKnownOptionsSheetParsingTestName =
  "round-trips stored Sorcerer Metamagic known options through sheet parsing";
const sorcererMetamagicKnownOptionsGateTestName =
  "rejects stored Sorcerer Metamagic selections that do not match Sorcerer level";
const uncannyMetabolismLongRestUseStateTestName =
  "tracks Uncanny Metabolism Long Rest use state separately from Focus Points";
const uncannyMetabolismInitiativeRecoveryTestName =
  "uses Uncanny Metabolism when rolling Initiative to recover Focus Points and restore HP";
const uncannyMetabolismInitiativeGatesTestName =
  "rejects Uncanny Metabolism Initiative use outside its die and Long Rest gates";
const uncannyMetabolismRejectsUnownedUseStateTestName =
  "rejects Uncanny Metabolism use state without the retained Monk feature";
const prayerOfHealingRestBenefitApplicationTestName =
  "Prayer of Healing spends its Spell Slot at completion and grants recipient Short Rest benefits, healing, and Long Rest lockout";
const prayerOfHealingRestBenefitAdmissionGateTestName =
  "Prayer of Healing rest benefit rejects unsupported Surface spell shapes";
const prayerOfHealingStoredLockoutGateTestName =
  "rejects stored Prayer of Healing recipient lockouts for unknown or unsupported spell ids";
const druidWildShapeFixtureKnownFormStatBlockIds = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
] as const;

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions" | "hitPointMaximumReduction"> &
    Partial<
      Pick<CharacterSheetInput, "conditions" | "hitPointMaximumReduction">
    >,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    hitPointMaximumReduction: Hp(0),
    ...input,
  });
}

function completeShortRest(
  input: Omit<CharacterSheetShortRestInput, "completion"> & {
    readonly sheet: CharacterSheet;
    readonly restedTicks?: ElapsedTimeTicks;
  },
) {
  const { sheet, restedTicks, ...benefits } = input;
  const rest = requireRight(startShortRest({ sheet }));
  const completion = requireRight(
    finishShortRest({
      rest,
      restedTicks: restedTicks ?? CHARACTER_SHEET_SHORT_REST_TICKS,
    }),
  );
  return completeShortRestCore({
    ...benefits,
    completion,
  });
}

function completeLongRest(
  input: Omit<CharacterSheetLongRestInput, "completion"> & {
    readonly sheet: CharacterSheet;
    readonly restedTicks?: ElapsedTimeTicks;
    readonly timing?: CharacterSheetLongRestStartTiming;
  },
) {
  const { sheet, restedTicks, timing, ...benefits } = input;
  const rest = requireRight(
    startLongRest({
      sheet,
      timing: timing ?? { tag: "noPriorLongRest" },
    }),
  );
  const completion = requireRight(
    finishLongRest({
      rest,
      restedTicks: restedTicks ?? rest.requiredRestTicks,
    }),
  );
  return completeLongRestCore({
    ...benefits,
    completion,
  });
}

function interruptShortRest(input: {
  readonly sheet: CharacterSheet;
  readonly interruption: CharacterSheetShortRestInterruption;
}) {
  return interruptShortRestCore({
    rest: requireRight(startShortRest({ sheet: input.sheet })),
    interruption: input.interruption,
  });
}

function interruptLongRest(
  input: Omit<Parameters<typeof interruptLongRestCore>[0], "rest"> & {
    readonly sheet: CharacterSheet;
    readonly timing?: CharacterSheetLongRestStartTiming;
    readonly interruptionsIncludingThisOne?: unknown;
    readonly interruption: CharacterSheetLongRestInterruption;
  },
) {
  const {
    sheet,
    timing,
    interruptionsIncludingThisOne: _unused,
    ...interruption
  } = input;
  void _unused;
  return interruptLongRestCore({
    ...interruption,
    rest: requireRight(
      startLongRest({
        sheet,
        timing: timing ?? { tag: "noPriorLongRest" },
      }),
    ),
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
        hitPointMaximumReduction: 0,
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
        pactSlotExpenditure: { expended: 0 },
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

  test(sorcererMetamagicKnownOptionsSheetParsingTestName, () => {
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

    const parsed = requireRight(sheet);
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
    const metamagicFacts = requireRight(
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

  test(sorcererMetamagicKnownOptionsGateTestName, () => {
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
      _tag: "Left",
      left: {
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
        hitPointMaximumReduction: 0,
        hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
        bookOfShadowsPresence: { tag: "notOnPerson" },
        conditions: [],
        spentHitDice: [],
        resourceExpenditures: [],
        spellSlotExpenditures: [],
        pactSlotExpenditure: { expended: 0 },
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
      sourceUnitId: "bard_jack_of_all_trades",
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
        otherProficiencyBonus: CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
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

  test("rest start gates keep calendar wait separate from rest benefits", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-start"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const zeroHp = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-start-zero"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(startShortRest({ sheet })).toMatchObject({
      _tag: "Right",
      right: {
        tag: "shortRestStarted",
        requiredRestTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      },
    });
    const shortRest = requireRight(startShortRest({ sheet }));
    expect(
      finishShortRest({
        rest: shortRest,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Short Rest requires 1 hour before benefits can be received.",
      },
    });
    expect(startShortRest({ sheet: zeroHp })).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Short Rest requires the Character Sheet to have at least 1 HP.",
      },
    });
    expect(
      startLongRest({ sheet: zeroHp, timing: { tag: "noPriorLongRest" } }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires the Character Sheet to have at least 1 HP.",
      },
    });

    const oneTickBeforeWait = elapsedTimeTicks(
      Number(CHARACTER_SHEET_LONG_REST_WAIT_TICKS) - 1,
    );
    expect(
      characterSheetLongRestCalendarGate({
        tag: "elapsedSinceLastLongRest",
        elapsedTicks: oneTickBeforeWait,
      }),
    ).toEqual({
      tag: "mustWait",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
      remainingTicks: elapsedTimeTicks(1),
    });
    expect(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: oneTickBeforeWait,
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires waiting 16 hours after finishing the previous Long Rest.",
      },
    });
    expect(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
        },
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        tag: "longRestStarted",
        requiredRestTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
        nextLongRestStartWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
      },
    });
    const longRest = requireRight(
      startLongRest({
        sheet,
        timing: {
          tag: "elapsedSinceLastLongRest",
          elapsedTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
        },
      }),
    );
    expect(
      finishLongRest({
        rest: longRest,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) - 1,
        ),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest requires the full required duration before benefits can be received.",
      },
    });
  });

  test("Long Rest restores HP, Hit Point Dice, maximum reduction, Spell Slots, Pact Slots, and Arcane Recovery use", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:long-rest"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(12),
        currentHp: Hp(4),
        tempHp: Hp(3),
        hitPointMaximumReduction: Hp(4),
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
        pactSlots: { expended: resourceCount(1) },
        restFeatureUses: [
          {
            tag: "arcaneRecovery",
            usedSinceLongRest: true,
          },
        ],
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

    expect(rested.hitPoints).toEqual({
      tag: "positive",
      currentHp: 12,
      tempHp: 0,
    });
    expect(rested.hitPointMaximumReduction).toBe(0);
    expect(characterSheetHitPointMaximum(rested)).toBe(12);
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
      right: expect.arrayContaining([
        expect.objectContaining({
          unitId: "paladin_lay_on_hands",
          count: 10,
          expended: 7,
        }),
      ]),
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

    const rested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

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

    const rested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

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

  test("Long Rest restores the Paladin's Smite Divine Smite free-cast pool", () => {
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:paladin-smite-rest"),
        build: armorClassBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        maximumHp: Hp(20),
        currentHp: Hp(20),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "paladinsSmiteDivineSmiteFreeCast",
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          unitId: "paladin_paladins_smite",
          count: 1,
          expended: 1,
        }),
      ]),
    });

    const rested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(rested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          unitId: "paladin_paladins_smite",
          count: 1,
          expended: 0,
        }),
      ]),
    });
  });

  test(druidWildShapeShortRestRecoveryTestName, () => {
    const druidBuild = armorClassBuild({
      startingClass: "class_druid",
      advancements: ["class_druid"],
    });
    expect(characterBuildResources(druidBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          resource: expect.objectContaining({ kind: "use_count" }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:druid-wild-shape-rest"),
        build: druidBuild,
        maximumHp: Hp(16),
        currentHp: Hp(16),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds:
          druidWildShapeFixtureKnownFormStatBlockIds,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: DRUID_WILD_SHAPE_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      Either.isLeft(
        createFreshCharacterSheet({
          characterId: characterSheetId(
            "character:druid-wild-shape-missing-forms",
          ),
          build: druidBuild,
          maximumHp: Hp(16),
          currentHp: Hp(16),
          tempHp: Hp(0),
          unitLibrary,
        }),
      ),
    ).toBe(true);
    expect(characterSheetDruidWildShapeKnownForms(spent)).toEqual({
      statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
    });
    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 2,
          resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 },
        }),
      ]),
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(characterSheetDruidWildShapeKnownForms(shortRested)).toEqual({
      statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
    });
    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 1,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({
        sheet: shortRested,
        unitLibrary,
        druidWildShapeKnownFormReplacement: {
          replaceStatBlockId: "stat_block_rat",
          selectedStatBlockId: "stat_block_cat",
        },
      }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetDruidWildShapeKnownForms(longRested)).toEqual({
      statBlockIds: [
        "stat_block_cat",
        "stat_block_riding_horse",
        "stat_block_spider",
        "stat_block_wolf",
      ],
    });
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: DRUID_WILD_SHAPE_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });

  test(monksFocusShortRestRecoveryTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk"],
    });
    expect(characterBuildResources(monkBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          resource: expect.objectContaining({ kind: "use_count" }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-focus-rest"),
        build: monkBuild,
        maximumHp: Hp(15),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 2,
          resetCadence: { kind: "short_or_long_rest" },
        }),
      ]),
    });
    expect(characterSheetMonksFocusSaveDc(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: { unitId: MONK_MONKS_FOCUS_UNIT_ID, dc: 13 },
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicLongRestRecoveryTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild();
    expect(characterBuildResources(sorcererBuild, unitLibrary)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          resource: expect.objectContaining({
            kind: "point_pool",
            poolId: SRD_SORCERY_POINTS_POOL_ID,
          }),
        }),
      ]),
    );

    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-rest"),
        build: sorcererBuild,
        maximumHp: Hp(14),
        currentHp: Hp(14),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          resource: expect.objectContaining({
            kind: "point_pool",
            poolId: SRD_SORCERY_POINTS_POOL_ID,
          }),
          count: 2,
          expended: 2,
          resetCadence: { kind: "long_rest" },
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(longRested.resourceExpenditures).toEqual([]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 2,
          expended: 0,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicSlotConversionTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 2,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-convert"),
        build: sorcererBuild,
        maximumHp: Hp(18),
        currentHp: Hp(18),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(3),
          },
        ],
      }),
    );

    const converted = requireRight(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    );

    expect(characterSheetSpellSlots(converted)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 2, expended: 2 },
    ]);
    expect(characterSheetResources(converted, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 3,
          expended: 1,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicSlotConversionGateTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild();
    const capped = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-capped"),
        build: sorcererBuild,
        maximumHp: Hp(14),
        currentHp: Hp(14),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
        ],
        resourceExpenditures: [],
      }),
    );

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: capped,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion would exceed the Sorcery Point maximum.",
      },
    });

    const spentSlots = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-no-slot"),
        build: sorcererBuild,
        maximumHp: Hp(14),
        currentHp: Hp(14),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(3),
            expended: resourceCount(3),
          },
        ],
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: spentSlots,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires an unexpended ordinary Spell Slot.",
      },
    });

    const wizard = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-wizard"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
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

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: wizard,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires the Sorcerer Font of Magic feature.",
      },
    });
  });

  test(sorcererFontOfMagicSlotCreationTestName, () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 4,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
        { spellLevel: 3, count: 2 },
      ],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create"),
        build: sorcererBuild,
        maximumHp: Hp(24),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(3),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
      }),
    );
    expect(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-aggregate"),
        build: sorcererBuild,
        maximumHp: Hp(24),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(3),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(3),
            count: resourceCount(3),
            expended: resourceCount(1),
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Spell Slot state does not match build capacity for level 3.",
      },
    });

    const created = requireRight(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    );

    expect(characterSheetSpellSlots(created)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 0 },
    ]);
    expect(characterSheetResources(created, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 5,
        }),
      ]),
    });

    expect(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: created,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic conversion requires a Spell Slot source when ordinary and created Spell Slots are both available.",
      },
    });

    const createdSlotConverted = requireRight(
      convertFontOfMagicSpellSlotToSorceryPoints({
        sheet: created,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
        spellSlotSource: "created",
      }),
    );
    expect(characterSheetSpellSlotSourceState(createdSlotConverted)).toEqual({
      ordinarySpellSlotExpenditures: [
        { spellLevel: 1, expended: 0 },
        { spellLevel: 2, expended: 0 },
        { spellLevel: 3, expended: 0 },
      ],
      createdSpellSlots: [{ spellLevel: 3, count: 1, expended: 1 }],
    });
    expect(characterSheetSpellSlots(createdSlotConverted)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 1 },
    ]);
    expect(
      characterSheetResources(createdSlotConverted, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 2,
        }),
      ]),
    });

    if (
      !("spellSlotExpenditures" in created) ||
      !("createdSpellSlots" in created)
    ) {
      throw new Error(
        "Expected Font of Magic sheet to carry Spell Slot state.",
      );
    }
    const parsedWithExpendedCreatedSlot = requireRight(
      parseCharacterSheet(
        {
          ...created,
          createdSpellSlots: created.createdSpellSlots.map((slot) =>
            slot.spellLevel === spellSlotLevel(3)
              ? { ...slot, expended: resourceCount(1) }
              : slot,
          ),
        },
        unitLibrary,
      ),
    );
    if (
      !("spellSlotExpenditures" in parsedWithExpendedCreatedSlot) ||
      !("createdSpellSlots" in parsedWithExpendedCreatedSlot)
    ) {
      throw new Error(
        "Expected parsed Font of Magic sheet to carry Spell Slot state.",
      );
    }
    expect(
      parsedWithExpendedCreatedSlot.spellSlotExpenditures.find(
        (slot) => slot.spellLevel === spellSlotLevel(3),
      ),
    ).toEqual({ spellLevel: 3, expended: 0 });
    expect(parsedWithExpendedCreatedSlot.createdSpellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);
    expect(characterSheetSpellSlots(parsedWithExpendedCreatedSlot)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 1 },
    ]);

    const longRested = requireRight(
      completeLongRest({ sheet: created, unitLibrary }),
    );

    expect(characterSheetSpellSlots(longRested)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 2, expended: 0 },
    ]);
    expect(characterSheetResources(longRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          count: 5,
          expended: 0,
        }),
      ]),
    });
  });

  test(sorcererFontOfMagicSlotCreationGateTestName, () => {
    const levelTwoSorcerer = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create-level"),
        build: sorcererFontOfMagicBuild(),
        maximumHp: Hp(14),
        currentHp: Hp(14),
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

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: levelTwoSorcerer,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires Sorcerer level 3 for a level 2 Spell Slot.",
      },
    });

    const lowPoints = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:sorcerer-font-create-points"),
        build: sorcererFontOfMagicBuild({
          sorcererAdvancements: 2,
          spellSlots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 2 },
          ],
        }),
        maximumHp: Hp(18),
        currentHp: Hp(18),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(1),
          },
        ],
      }),
    );

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: lowPoints,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
      },
    });

    expect(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: lowPoints,
        unitLibrary,
        spellLevel: spellSlotLevel(6),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic Spell Slot creation requires a Creating Spell Slots table entry.",
      },
    });
  });

  test(uncannyMetabolismLongRestUseStateTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk"],
    });
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-used"),
        build: monkBuild,
        maximumHp: Hp(15),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        restFeatureUses: [
          {
            tag: "uncannyMetabolism",
            usedSinceLongRest: true,
          },
        ],
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(2),
          },
        ],
      }),
    );

    expect(
      characterSheetMonkUncannyMetabolismUseState(spent, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
        trigger: "roll_initiative",
        optional: true,
        oncePerLongRestUse: {
          resetCadence: { kind: "long_rest" },
        },
        focusRecovery: {
          resourceUnitId: MONK_MONKS_FOCUS_UNIT_ID,
          recoversAllExpended: true,
        },
        healing: {
          target: "self",
          martialArtsDieSourceUnitId: MONK_MARTIAL_ARTS_UNIT_ID,
          martialArtsDie: {
            dice: 1,
            dieSize: 6,
          },
          monkLevelBonus: 2,
        },
        usedSinceLongRest: true,
      },
    });
    expect(characterSheetResources(spent, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 2,
          expended: 2,
        }),
      ]),
    });

    const shortRested = requireRight(
      completeShortRest({ sheet: spent, unitLibrary }),
    );

    expect(shortRested.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
    expect(characterSheetResources(shortRested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          expended: 0,
        }),
      ]),
    });

    const longRested = requireRight(
      completeLongRest({ sheet: shortRested, unitLibrary }),
    );

    expect(longRested.restFeatureUses).toEqual([]);
    expect(
      characterSheetMonkUncannyMetabolismUseState(longRested, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
        usedSinceLongRest: false,
      },
    });
  });

  test(uncannyMetabolismInitiativeRecoveryTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk", "class_monk", "class_monk", "class_monk"],
    });
    const spent = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-initiative"),
        build: monkBuild,
        maximumHp: Hp(30),
        currentHp: Hp(10),
        tempHp: Hp(3),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(5),
          },
        ],
      }),
    );

    const recovered = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: spent,
        unitLibrary,
        martialArtsRoll: DieRollResult(7),
      }),
    );

    expect(characterSheetCurrentHp(recovered)).toBe(22);
    expect(characterSheetTempHp(recovered)).toBe(3);
    expect(recovered.resourceExpenditures).toEqual([]);
    expect(recovered.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
    expect(
      characterSheetMonkUncannyMetabolismUseState(recovered, unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: {
        healing: {
          martialArtsDie: { dice: 1, dieSize: 8 },
          monkLevelBonus: 5,
        },
        usedSinceLongRest: true,
      },
    });
    expect(characterSheetResources(recovered, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          count: 5,
          expended: 0,
        }),
      ]),
    });

    const nearMaximum = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-cap"),
        build: monkBuild,
        maximumHp: Hp(30),
        currentHp: Hp(28),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "useCountResource",
            unitId: MONK_MONKS_FOCUS_UNIT_ID,
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const capped = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: nearMaximum,
        unitLibrary,
        martialArtsRoll: DieRollResult(8),
      }),
    );

    expect(characterSheetCurrentHp(capped)).toBe(30);
    expect(capped.resourceExpenditures).toEqual([]);
    expect(capped.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
  });

  test(uncannyMetabolismInitiativeGatesTestName, () => {
    const monkBuild = armorClassBuild({
      startingClass: "class_monk",
      advancements: ["class_monk", "class_monk", "class_monk", "class_monk"],
    });
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:monk-uncanny-gates"),
        build: monkBuild,
        maximumHp: Hp(30),
        currentHp: Hp(20),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet,
        unitLibrary,
        martialArtsRoll: DieRollResult(9),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Uncanny Metabolism Martial Arts die roll must be within d8.",
      },
    });

    const used = requireRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet,
        unitLibrary,
        martialArtsRoll: DieRollResult(4),
      }),
    );
    expect(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: used,
        unitLibrary,
        martialArtsRoll: DieRollResult(4),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Uncanny Metabolism cannot be used again until a Long Rest.",
      },
    });
  });

  test(uncannyMetabolismRejectsUnownedUseStateTestName, () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:unowned-uncanny-metabolism"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      restFeatureUses: [
        {
          tag: "uncannyMetabolism",
          usedSinceLongRest: true,
        },
      ],
    });

    expect(sheet).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Uncanny Metabolism rest feature use requires the Monk Uncanny Metabolism feature.",
      },
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
        pactSlots: { expended: resourceCount(1) },
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

  test(prayerOfHealingRestBenefitApplicationTestName, () => {
    const caster = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-caster"),
        build: prayerOfHealingClericBuild(),
        maximumHp: Hp(18),
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(1),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
      }),
    );
    const woundedWizard = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-wizard"),
        build: wizardWarlockBuild(),
        maximumHp: Hp(18),
        currentHp: Hp(3),
        tempHp: Hp(2),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(2),
            expended: resourceCount(1),
          },
        ],
        pactSlots: { expended: resourceCount(1) },
      }),
    );
    const woundedFighter = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-fighter"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        maximumHp: Hp(12),
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const result = requireRight(
      applyCharacterSheetSpellRestBenefit({
        caster,
        spellId: "prayer_of_healing",
        unitLibrary,
        castLevel: spellSlotLevel(2),
        recipients: [
          {
            sheet: woundedWizard,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            spendHitDice: [
              { classUnitId: "class_wizard", roll: DieRollResult(4) },
            ],
            healingRolls: [DieRollResult(7), DieRollResult(6)],
          },
          {
            sheet: woundedFighter,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            healingRolls: [DieRollResult(5), DieRollResult(6)],
          },
          {
            sheet: caster,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            healingRolls: [DieRollResult(4), DieRollResult(4)],
          },
        ],
      }),
    );

    expect(characterSheetSpellSlots(result.caster)).toEqual([
      { spellLevel: 1, count: 4, expended: 1 },
      { spellLevel: 2, count: 2, expended: 1 },
    ]);
    expect(characterSheetCurrentHp(result.caster)).toBe(18);
    expect(result.caster.restFeatureUses).toEqual([
      {
        tag: "spellRecipientRestLockout",
        spellId: "prayer_of_healing",
        usedSinceLongRest: true,
      },
    ]);
    expect(characterSheetCurrentHp(result.recipients[0])).toBe(18);
    expect(characterSheetTempHp(result.recipients[0])).toBe(2);
    expect(characterSheetPactSlots(result.recipients[0])).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(
      requireRight(characterSheetHitDice(result.recipients[0], unitLibrary)),
    ).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1, spent: 1 },
    ]);
    expect(characterSheetCurrentHp(result.recipients[1])).toBe(11);
    expect(
      result.recipients.map((recipient) => recipient.restFeatureUses),
    ).toEqual([
      [
        {
          tag: "spellRecipientRestLockout",
          spellId: "prayer_of_healing",
          usedSinceLongRest: true,
        },
      ],
      [
        {
          tag: "spellRecipientRestLockout",
          spellId: "prayer_of_healing",
          usedSinceLongRest: true,
        },
      ],
      [
        {
          tag: "spellRecipientRestLockout",
          spellId: "prayer_of_healing",
          usedSinceLongRest: true,
        },
      ],
    ]);
    expect(
      applyCharacterSheetSpellRestBenefit({
        caster: result.caster,
        spellId: "prayer_of_healing",
        unitLibrary,
        castLevel: spellSlotLevel(2),
        recipients: [
          {
            sheet: result.recipients[0],
            eligibility: { remainedWithinRangeForEntireCasting: true },
            healingRolls: [DieRollResult(1), DieRollResult(1)],
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spell rest benefit recipient cannot be affected by this spell again until finishing a Long Rest.",
      },
    });

    const longRestedRecipient = requireRight(
      completeLongRest({ sheet: result.recipients[0], unitLibrary }),
    );
    expect(longRestedRecipient.restFeatureUses).toEqual([]);
  });

  test(prayerOfHealingRestBenefitAdmissionGateTestName, () => {
    const caster = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-admission-caster"),
        build: prayerOfHealingClericBuild(),
        maximumHp: Hp(18),
        currentHp: Hp(18),
        tempHp: Hp(0),
        unitLibrary,
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(4),
            expended: resourceCount(0),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(2),
            expended: resourceCount(0),
          },
        ],
      }),
    );
    const recipient = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-admission-target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        maximumHp: Hp(12),
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const malformedLibraries = [
      prayerOfHealingUnitLibraryWith((spell) =>
        replacePrayerOfHealingDirectPhase(spell, (phase) => {
          const { castingRequirement: _omitted, ...selection } =
            phase.attachment.value.selection;
          return {
            ...phase,
            attachment: {
              ...phase.attachment,
              value: {
                ...phase.attachment.value,
                selection,
              },
            },
          } as PrayerOfHealingDirectPhase;
        }),
      ),
      prayerOfHealingUnitLibraryWith((spell) => ({
        ...spell,
        mechanics: {
          ...spell.mechanics,
          castingTime: { kind: "action" },
        },
      })),
      prayerOfHealingUnitLibraryWith((spell) => ({
        ...spell,
        mechanics: {
          ...spell.mechanics,
          range: { kind: "touch" },
        },
      })),
      prayerOfHealingUnitLibraryWith((spell) =>
        replacePrayerOfHealingDirectPhase(
          spell,
          (phase) =>
            ({
              ...phase,
              effects: [...phase.effects, { kind: "none" }],
            }) as unknown as PrayerOfHealingDirectPhase,
        ),
      ),
    ];

    for (const malformedUnitLibrary of malformedLibraries) {
      expect(
        applyCharacterSheetSpellRestBenefit({
          caster,
          spellId: "prayer_of_healing",
          unitLibrary: malformedUnitLibrary,
          castLevel: spellSlotLevel(2),
          recipients: [
            {
              sheet: recipient,
              eligibility: { remainedWithinRangeForEntireCasting: true },
              healingRolls: [DieRollResult(1), DieRollResult(1)],
            },
          ],
        }),
      ).toMatchObject({ _tag: "Left" });
    }
  });

  test(prayerOfHealingStoredLockoutGateTestName, () => {
    for (const spellId of ["missing_spell", "class_fighter", "cure_wounds"]) {
      expect(
        parseCharacterSheet(
          {
            ...storedAvailableSheetInput({
              characterId: `character:stored-lockout-${spellId}`,
              build: armorClassBuild({ startingClass: "class_fighter" }),
            }),
            restFeatureUses: [
              {
                tag: "spellRecipientRestLockout",
                spellId,
                usedSinceLongRest: true,
              },
            ],
          },
          unitLibrary,
        ),
      ).toMatchObject({
        _tag: "Left",
        left: {
          message:
            "Spell recipient rest lockout requires an admitted spell rest-benefit profile.",
        },
      });
    }
  });

  test("rest interruptions apply only the RAW rest benefits they grant", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:rest-interruption"),
        build: wizardBuild({ wizardAdvancements: 1 }),
        maximumHp: Hp(18),
        currentHp: Hp(7),
        tempHp: Hp(0),
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

    expect(interruptShortRest({ sheet, interruption: "takeDamage" })).toEqual({
      tag: "shortRestInterruptedNoBenefit",
      sheet,
      interruption: "takeDamage",
    });

    const earlyLongRestInterruption = requireRight(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
        interruption: "castNonCantripSpell",
        interruptionsIncludingThisOne: resourceCount(1),
      }),
    );
    expect(earlyLongRestInterruption).toMatchObject({
      tag: "longRestInterruptedNoBenefit",
      interruption: "castNonCantripSpell",
      requiredLongRestTicks: elapsedTimeTicks(
        Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) +
          Number(CHARACTER_SHEET_SHORT_REST_TICKS),
      ),
    });
    expect(earlyLongRestInterruption.rest).toMatchObject({
      tag: "longRestStarted",
      sheet,
      requiredRestTicks: earlyLongRestInterruption.requiredLongRestTicks,
    });
    expect(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: elapsedTimeTicks(
          Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
        ),
        interruption: "takeDamage",
        interruptionsIncludingThisOne: resourceCount(1),
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Interrupted Long Rest before 1 hour cannot receive Short Rest benefit inputs.",
      },
    });
    expect(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        interruption: {
          tag: "physicalExertion",
          durationTicks: elapsedTimeTicks(
            Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
          ),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Long Rest physical exertion interruption requires at least 1 hour.",
      },
    });
    for (const restedTicks of [
      CHARACTER_SHEET_LONG_REST_BASE_TICKS,
      elapsedTimeTicks(Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) + 1),
    ]) {
      expect(
        interruptLongRest({
          sheet,
          unitLibrary,
          restedTicks,
          interruption: "takeDamage",
          interruptionsIncludingThisOne: resourceCount(1),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          message:
            "Long Rest interruption requires rested time before the required Long Rest duration.",
        },
      });
    }

    const lateLongRestInterruption = requireRight(
      interruptLongRest({
        sheet,
        unitLibrary,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        interruption: {
          tag: "physicalExertion",
          durationTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
        },
        interruptionsIncludingThisOne: resourceCount(1),
        spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
      }),
    );

    expect(lateLongRestInterruption.tag).toBe(
      "longRestInterruptedWithShortRestBenefits",
    );
    expect(lateLongRestInterruption.interruption).toEqual({
      tag: "physicalExertion",
      durationTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
    });
    expect(lateLongRestInterruption.requiredLongRestTicks).toBe(
      Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) +
        Number(CHARACTER_SHEET_SHORT_REST_TICKS),
    );
    expect(lateLongRestInterruption.rest).toMatchObject({
      tag: "longRestStarted",
      requiredRestTicks: lateLongRestInterruption.requiredLongRestTicks,
    });
    expect(characterSheetCurrentHp(lateLongRestInterruption.rest.sheet)).toBe(
      12,
    );
    expect(
      requireRight(
        characterSheetHitDice(lateLongRestInterruption.rest.sheet, unitLibrary),
      ),
    ).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 2, spent: 1 },
    ]);
    expect(
      characterSheetSpellSlots(lateLongRestInterruption.rest.sheet),
    ).toEqual([{ spellLevel: 1, count: 3, expended: 1 }]);
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

  test("Magical Cunning recovers half rounded up expended Pact Slots once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 1,
          pactSlotCount: 2,
          pactSlotLevel: 1,
        }),
        maximumHp: Hp(14),
        currentHp: Hp(14),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(2) },
      }),
    );

    const recovered = requireRight(
      completeMagicalCunningRite({ sheet, unitLibrary }),
    );

    expect(characterSheetPactSlots(recovered)).toEqual({
      slotLevel: 1,
      count: 2,
      expended: 1,
    });
    expect(recovered.restFeatureUses).toEqual([
      { tag: "magicalCunning", usedSinceLongRest: true },
    ]);
    expect(
      completeMagicalCunningRite({ sheet: recovered, unitLibrary }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Magical Cunning cannot be used again until a Long Rest.",
      },
    });

    const rested = requireRight(
      completeLongRest({ sheet: recovered, unitLibrary }),
    );

    expect(characterSheetPactSlots(rested)).toEqual({
      slotLevel: 1,
      count: 2,
      expended: 0,
    });
    expect(rested.restFeatureUses).toEqual([]);
  });

  test("Magical Cunning rounds a three-slot Pact Magic maximum up", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning-round-up"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 10,
          pactSlotCount: 3,
          pactSlotLevel: 5,
        }),
        maximumHp: Hp(70),
        currentHp: Hp(70),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(3) },
      }),
    );

    const recovered = requireRight(
      completeMagicalCunningRite({ sheet, unitLibrary }),
    );

    expect(characterSheetPactSlots(recovered)).toEqual({
      slotLevel: 5,
      count: 3,
      expended: 1,
    });
  });

  test("Magical Cunning requires Warlock level 2 feature ownership", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:magical-cunning-level-one"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 0,
          pactSlotCount: 1,
          pactSlotLevel: 1,
        }),
        maximumHp: Hp(10),
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(1) },
      }),
    );

    expect(completeMagicalCunningRite({ sheet, unitLibrary })).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Magical Cunning requires the Warlock Magical Cunning feature.",
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
    hitPointMaximumReduction: 0,
    hitPoints: { tag: "positive", currentHp: 12, tempHp: 0 },
    conditions: [],
    spentHitDice: [],
    resourceExpenditures: [],
  };
}

type ActivationSpellMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>;
type DirectSpellPhase = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "direct" }
>;
type PrayerOfHealingDirectPhase = DirectSpellPhase & {
  readonly attachment: {
    readonly kind: "hole";
    readonly holeId: string;
    readonly label?: string;
    readonly value: {
      readonly kind: "target";
      readonly selection: Readonly<Record<string, unknown>>;
    };
  };
  readonly effects: readonly unknown[];
};

function prayerOfHealingUnitLibraryWith(
  transform: (spell: SpellRecord) => SpellRecord,
): UnitCatalog {
  const base = unitLibrary.requireUnit("prayer_of_healing");
  if (base.kind !== "spell") {
    throw new Error("Prayer of Healing test fixture must be a Spell.");
  }
  const replacement = transform(base);
  return {
    getUnit: (id: UnitRecord["id"]) =>
      id === replacement.id
        ? Option.some(replacement)
        : unitLibrary.getUnit(id),
    requireUnit: (id: UnitRecord["id"]) =>
      id === replacement.id ? replacement : unitLibrary.requireUnit(id),
    listUnits: () =>
      unitLibrary
        .listUnits()
        .map((unit) => (unit.id === replacement.id ? replacement : unit)),
  };
}

function replacePrayerOfHealingDirectPhase(
  spell: SpellRecord,
  transform: (phase: PrayerOfHealingDirectPhase) => PrayerOfHealingDirectPhase,
): SpellRecord {
  const phase = prayerOfHealingDirectPhase(spell);
  return {
    ...spell,
    mechanics: {
      ...spell.mechanics,
      phases: [transform(phase)],
    },
  } as SpellRecord;
}

function prayerOfHealingDirectPhase(
  spell: SpellRecord,
): PrayerOfHealingDirectPhase {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Prayer of Healing test fixture must be an activation.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase === undefined ||
    phase.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects === undefined
  ) {
    throw new Error("Prayer of Healing test fixture must have target effects.");
  }
  return phase as PrayerOfHealingDirectPhase;
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

function sorcererFontOfMagicBuild(
  input: {
    readonly sorcererAdvancements?: number;
    readonly spellSlots?: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  } = {},
): CharacterBuild {
  const build = armorClassBuild({
    startingClass: "class_sorcerer",
    advancements: Array.from(
      { length: input.sorcererAdvancements ?? 1 },
      () => "class_sorcerer",
    ),
  });

  return {
    ...build,
    features: [
      ...build.features,
      {
        kind: "selectedSorcererMetamagicOption" as const,
        selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
        optionId: testSorcererMetamagicOptionId("sorcerer_empowered_spell"),
      },
      {
        kind: "selectedSorcererMetamagicOption" as const,
        selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
        optionId: testSorcererMetamagicOptionId("sorcerer_heightened_spell"),
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: ["light", "prestidigitation", "shocking_grasp"],
          spellbook: [],
          preparedSpells: ["burning_hands", "detect_magic"],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: input.spellSlots ?? [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function testSorcererMetamagicOptionId(optionId: string) {
  return requireRight(sorcererMetamagicOptionId(optionId));
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

function warlockMagicalCunningBuild(input: {
  readonly warlockAdvancements: number;
  readonly pactSlotCount: number;
  readonly pactSlotLevel: number;
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_warlock",
      advancements: Array.from(
        { length: input.warlockAdvancements },
        () => "class_warlock",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        pactMagic: {
          kind: "pactMagic",
          slotLevel: input.pactSlotLevel,
          count: input.pactSlotCount,
        },
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

function prayerOfHealingClericBuild(): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_cleric",
      advancements: ["class_cleric", "class_cleric"],
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: ["prayer_of_healing"],
          spellcastingFocuses: ["holy_symbol"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 2 },
          ],
        },
      },
    },
  };
}

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
