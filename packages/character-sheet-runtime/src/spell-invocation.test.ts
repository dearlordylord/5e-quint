// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spellbook-ritual-invocation
import { describe, expect, test } from "vitest";
import {
  characterSheetSpellInvocation,
  characterSheetSpellSlots,
  ritualAdeptAdmitsSpellbookRitualTestName,
  ritualAdeptRejectsMissingFeatureTestName,
  ritualAdeptRejectsNonRitualSpellTestName,
  ritualAdeptRejectsPreparedOnlySpellTestName,
  spellbookRitualSheet,
  unitLibrary
} from "./test-support.ts";

describe("Character Sheet runtime / spell invocation", () => {
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
          "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
      },
    });
  });

  test("rejects spellbook Ritual access when the feature is not granted by the spellbook source", () => {
    const sheet = spellbookRitualSheet({
      characterIdText: "character:ritual-feature-wrong-source",
      spellbook: ["detect_magic"],
      spellcastingSourceUnitId: "class_fighter",
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
          "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
      },
    });
  });
});
