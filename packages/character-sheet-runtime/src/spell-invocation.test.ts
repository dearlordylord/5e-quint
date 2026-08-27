// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spellbook-ritual-invocation
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B wizard_ritual_adept
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  armorClassBuild,
  characterBuildHasSpellbookSpell,
  characterSheetSpellInvocation,
  characterSheetSpellbookRitualAccessesForBuild,
  characterSheetSpellbookRitualInvocationProjection,
  characterSheetSpellSlots,
  druidWarlockCircleLandBookBuild,
  druidWildShapeFixtureKnownFormStatBlockIds,
  parseCharacterSheet,
  ritualAdeptAdmitsSpellbookRitualTestName,
  ritualAdeptRejectsMissingFeatureTestName,
  ritualAdeptRejectsNonRitualSpellTestName,
  ritualAdeptRejectsPreparedOnlySpellTestName,
  requireRight,
  spellbookRitualSheet,
  storedAvailableSheetInput,
  unitLibrary,
} from "./test-support.test-support.ts";
import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";

describe("Character Sheet runtime / spell invocation", () => {
  test("a non-spellcasting build has no spellbook Ritual Access", () => {
    const build = armorClassBuild({ startingClass: "class_fighter" });
    const sheet = requireRight(
      parseCharacterSheet(
        storedAvailableSheetInput({
          characterId: "character:non-spellcaster-ritual",
          build,
        }),
        unitLibrary,
      ),
    );
    expect(
      requireRight(
        characterSheetSpellbookRitualAccessesForBuild({
          build,
          unitLibrary,
        }),
      ),
    ).toEqual([]);
    expect(
      characterBuildHasSpellbookSpell({
        build,
        spellId: authoredUnitId("synthetic_nonspellbook_spell"),
      }),
    ).toBe(false);
    expect(
      hasPreparedClassSpellAccess(
        { build },
        authoredUnitId("synthetic_unprepared_spell"),
      ),
    ).toBe(false);
    expect(
      characterSheetSpellInvocation({
        sheet,
        unitLibrary,
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Ritual spell invocation requires spellcasting Spell Access.",
      },
    });
  });

  test("invokes a Book of Shadows Ritual only while the book is on the character", () => {
    const bookSheet = (presence: "onPerson" | "notOnPerson") =>
      requireRight(
        parseCharacterSheet(
          {
            ...storedAvailableSheetInput({
              characterId: `character:book-ritual-${presence}`,
              build: druidWarlockCircleLandBookBuild(),
            }),
            druidWildShapeKnownForms: {
              statBlockIds: druidWildShapeFixtureKnownFormStatBlockIds,
            },
            druidCircleLand: { land: "temperate" },
            spellSlotExpenditures: [],
            pactSlotExpenditure: { expended: 0 },
            bookOfShadowsPresence: { tag: presence },
          },
          unitLibrary,
        ),
      );

    expect(
      characterSheetSpellInvocation({
        sheet: bookSheet("onPerson"),
        unitLibrary,
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Success",
      value: {
        tag: "bookOfShadowsRitual",
        spellId: "detect_magic",
        requiredSpellAccess: "bookOfShadows",
        requiresBookOfShadowsOnPerson: true,
      },
    });
    expect(
      characterSheetSpellInvocation({
        sheet: bookSheet("notOnPerson"),
        unitLibrary,
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Book of Shadows Ritual requires the book on your person.",
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
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Success",
      value: {
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
    expect(
      characterBuildHasSpellbookSpell({
        build: sheet.build,
        spellId: authoredUnitId("detect_magic"),
      }),
    ).toBe(true);
    expect(
      requireRight(
        characterSheetSpellbookRitualAccessesForBuild({
          build: sheet.build,
          unitLibrary,
        }),
      ),
    ).toMatchObject([
      {
        tag: "spellbookRitual",
        spell: { id: "detect_magic" },
        spellcastingSourceUnitId: "class_wizard",
        featureUnitId: "wizard_ritual_adept",
      },
    ]);
    expect(
      characterSheetSpellbookRitualInvocationProjection({
        sheet,
        unitLibrary,
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      tag: "accepted",
      invocation: { spellId: "detect_magic" },
      qRoute: [
        {
          kind: "retainCharacterSheetSelectedReferences",
          subject: "selectedReferenceProjection",
          owner: "selectedReference",
        },
        {
          kind: "resolveCharacterSheetSubject",
          subject: "spellResource",
          fill: "projectionSelection",
          holes: [],
          owner: "selectedReference",
        },
      ],
    });
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
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Wizard Ritual Adept requires the spell in the spellbook.",
      },
    });
    expect(
      characterSheetSpellbookRitualInvocationProjection({
        sheet,
        unitLibrary,
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      tag: "rejected",
      qRoute: [
        {
          kind: "retainCharacterSheetSelectedReferences",
          subject: "selectedReferenceProjection",
          owner: "selectedReference",
        },
        {
          kind: "resolveCharacterSheetSubject",
          subject: "spellResource",
          fill: "projectionSelection",
          holes: ["projectionChoice"],
          owner: "selectedReference",
        },
      ],
    });
    expect(
      requireRight(
        characterSheetSpellbookRitualAccessesForBuild({
          build: sheet.build,
          unitLibrary,
        }),
      ),
    ).toEqual([]);
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
        spellId: authoredUnitId("mage_armor"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Ritual spell invocation requires a ritual-tagged Spell Definition.",
      },
    });
    expect(
      requireRight(
        characterSheetSpellbookRitualAccessesForBuild({
          build: sheet.build,
          unitLibrary,
        }),
      ),
    ).toEqual([]);
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
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
      },
    });
    expect(
      requireRight(
        characterSheetSpellbookRitualAccessesForBuild({
          build: sheet.build,
          unitLibrary,
        }),
      ),
    ).toEqual([]);
    expect(
      characterBuildHasSpellbookSpell({
        build: sheet.build,
        spellId: authoredUnitId("mage_armor"),
      }),
    ).toBe(false);
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
        spellId: authoredUnitId("detect_magic"),
        invocation: { kind: "ritual" },
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Spellbook ritual invocation requires a spellbook Ritual Access feature for the spellbook source.",
      },
    });
  });
});
