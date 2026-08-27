// KERNEL-COVERAGE: parity-witness SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B paladin_lay_on_hands
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST prayer_of_healing
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  DieRollResult,
  Hp,
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  applyLayOnHandsWithRoute,
  armorClassBuild,
  characterSheetCurrentHp,
  characterSheetHitDice,
  characterSheetId,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellSlots,
  characterSheetTempHp,
  completeLongRest,
  convertFontOfMagicSorceryPointsToSpellSlot,
  rebuildCharacterSheetFixture,
  layOnHandsLongRestRecoveryTestName,
  layOnHandsRejectsDivergentPoolsTestName,
  layOnHandsSpendsHealingPoolTestName,
  parseCharacterSheet,
  prayerOfHealingClericBuild,
  prayerOfHealingRestBenefitAdmissionGateTestName,
  prayerOfHealingRestBenefitApplicationTestName,
  prayerOfHealingStoredLockoutGateTestName,
  prayerOfHealingUnitLibraryWith,
  requireSuccess,
  resourceCount,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  sorcererFontOfMagicBuild,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
  wizardBuild,
  wizardWarlockBuild,
} from "./test-support.test-support.ts";
import { completeShortRestBenefits } from "./healing-rest-benefit.ts";
import { isCharacterSheetWithSpellSlots } from "./spell-slots.ts";

describe("Character Sheet runtime / healing and rest benefit spells", () => {
  test(layOnHandsSpendsHealingPoolTestName, () => {
    const source = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:paladin"),
        build: armorClassBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const target = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(3),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    const result = requireSuccess(
      applyLayOnHandsWithRoute({
        source,
        target,
        unitLibrary,
        restoreHp: Hp(2),
        removePoisoned: true,
      }),
    );

    expect(result.qRoute).toEqual([
      {
        kind: "resolveCharacterSheetSubject",
        subject: "featureResource",
        fill: "resourceSpend",
        holes: [],
        owner: "featureResource",
      },
      {
        kind: "projectCharacterSheetFacts",
        subject: "hitPoint",
        owner: "hitPoint",
      },
      {
        kind: "recordCharacterSheetFacts",
        subject: "featureResource",
        facts: ["featureResourceSpend"],
        owner: "featureResource",
      },
    ]);
    expect(result.target.hitPoints).toEqual({
      tag: "positive",
      currentHp: 5,
      tempHp: 0,
    });
    expect(result.target.conditions).toEqual([]);
    expect(
      requireSuccess(characterSheetResources(result.source, unitLibrary)),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: authoredUnitId("paladin_lay_on_hands"),
          count: 10,
          expended: 7,
        }),
      ]),
    );
  });

  test("Lay On Hands can spend only for Poisoned removal without restoring HP", () => {
    const source = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-paladin-poison-removal",
        ),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const target = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-poisoned-no-healing",
        ),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(5),
        tempHp: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    );

    const result = requireSuccess(
      applyLayOnHands({
        source,
        target,
        unitLibrary,
        restoreHp: Hp(0),
        removePoisoned: true,
      }),
    );

    expect(result.target.conditions).toEqual([]);
    expect(characterSheetCurrentHp(result.target)).toBe(Hp(5));
  });

  test("Short Rest benefit composition propagates an Arcane Recovery rejection", () => {
    const fighter = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-arcane-recovery-rejection",
        ),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      completeShortRestBenefits({
        sheet: fighter,
        unitLibrary,
        hpGate: "requiresShortRestStartHp",
        arcaneRecovery: { refundSpellSlots: [] },
      }),
    ).toMatchObject({ _tag: "Failure" });
  });

  test("Short Rest benefit composition returns an accepted Arcane Recovery sheet", () => {
    const wizard = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-arcane-recovery-accepted",
        ),
        build: wizardBuild({ wizardAdvancements: 3 }),
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(2), expended: resourceCount(1) },
        ],
      }),
    );

    const result = requireSuccess(
      completeShortRestBenefits({
        sheet: wizard,
        unitLibrary,
        hpGate: "requiresShortRestStartHp",
        arcaneRecovery: {
          refundSpellSlots: [
            { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
          ],
        },
      }),
    );

    expect(characterSheetSpellSlots(result)).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
    ]);
  });

  test(layOnHandsRejectsDivergentPoolsTestName, () => {
    const target = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:paladin-self"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
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
      _tag: "Failure",
      failure: {
        message: "Lay On Hands cannot spend more healing pool than remains.",
      },
    });
  });

  test(layOnHandsLongRestRecoveryTestName, () => {
    const source = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:paladin-rest"),
        build: armorClassBuild({ startingClass: "class_paladin" }),
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const spent = requireSuccess(
      applyLayOnHands({
        source,
        target: source,
        unitLibrary,
        restoreHp: Hp(4),
        removePoisoned: false,
      }),
    ).source;

    const rested = requireSuccess(
      completeLongRest({ sheet: spent, unitLibrary }),
    );

    expect(rested.resourceExpenditures).toEqual([]);
    expect(
      requireSuccess(characterSheetResources(rested, unitLibrary)),
    ).toEqual([
      expect.objectContaining({
        unitId: authoredUnitId("paladin_lay_on_hands"),
        count: 5,
        expended: 0,
      }),
    ]);
  });

  test(prayerOfHealingRestBenefitApplicationTestName, () => {
    const caster = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-caster"),
        build: prayerOfHealingClericBuild(),
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
        ],
      }),
    );
    const woundedWizard = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-wizard"),
        build: wizardWarlockBuild(),
        currentHp: Hp(3),
        tempHp: Hp(2),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
        ],
        pactSlots: { expended: resourceCount(1) },
      }),
    );
    const woundedFighter = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-fighter"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const woundedSorcerer = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-sorcerer"),
        build: sorcererFontOfMagicBuild({ sorcererAdvancements: 4 }),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
            expended: resourceCount(4),
          },
        ],
      }),
    );

    const result = requireSuccess(
      applyCharacterSheetSpellRestBenefit({
        caster,
        spellId: authoredUnitId("prayer_of_healing"),
        unitLibrary,
        castLevel: spellSlotLevel(2),
        recipients: [
          {
            sheet: woundedWizard,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            spendHitDice: [
              {
                classUnitId: authoredUnitId("class_wizard"),
                roll: DieRollResult(4),
              },
            ],
            healingRolls: [DieRollResult(7), DieRollResult(6)],
          },
          {
            sheet: woundedSorcerer,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            sorcerousRestoration: {
              recoverSorceryPoints: resourceCount(2),
            },
            healingRolls: [DieRollResult(3), DieRollResult(4)],
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
    expect(characterSheetCurrentHp(result.recipients[0])).toBe(7);
    expect(characterSheetTempHp(result.recipients[0])).toBe(2);
    expect(characterSheetPactSlots(result.recipients[0])).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(
      requireSuccess(characterSheetHitDice(result.recipients[0], unitLibrary)),
    ).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1, spent: 1 },
    ]);
    expect(characterSheetCurrentHp(result.recipients[1])).toBe(19);
    expect(
      requireSuccess(
        characterSheetResources(result.recipients[1], unitLibrary),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          expended: 2,
        }),
      ]),
    );
    expect(characterSheetCurrentHp(result.recipients[2])).toBe(11);
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
        { tag: "sorcerousRestoration", usedSinceLongRest: true },
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
        spellId: authoredUnitId("prayer_of_healing"),
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
      _tag: "Failure",
      failure: {
        message:
          "Spell rest benefit recipient cannot be affected by this spell again until finishing a Long Rest.",
      },
    });

    const longRestedRecipient = requireSuccess(
      completeLongRest({ sheet: result.recipients[0], unitLibrary }),
    );
    expect(longRestedRecipient.restFeatureUses).toEqual([]);
  });

  test("Prayer of Healing can spend a Font of Magic-created Spell Slot", () => {
    const sorcererBuild = sorcererFontOfMagicBuild({
      sorcererAdvancements: 4,
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 3 },
      ],
    });
    const clericBuild = prayerOfHealingClericBuild();
    const clericAdvancement = clericBuild.progression.advancements[0];
    const sorcererSource = sorcererBuild.spellcasting?.sources[0];
    const clericSource = clericBuild.spellcasting?.sources[0];
    if (
      clericAdvancement === undefined ||
      sorcererSource === undefined ||
      clericSource === undefined
    ) {
      throw new Error(
        "Synthetic multiclass fixture requires both spellcasting sources and a Cleric advancement.",
      );
    }
    const multiclassBuild = {
      ...sorcererBuild,
      progression: {
        ...sorcererBuild.progression,
        advancements: [
          ...sorcererBuild.progression.advancements,
          ...clericBuild.progression.advancements,
          clericAdvancement,
        ],
      },
      spellcasting: {
        sources: [sorcererSource, clericSource] as const,
        slotPools: {
          spellcasting: {
            kind: "spellcasting" as const,
            slots: [
              { spellLevel: 1, count: 4 },
              { spellLevel: 2, count: 3 },
            ],
          },
        },
      },
    };
    const caster = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-created-slot-prayer-caster",
        ),
        build: multiclassBuild,
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const recipient = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-created-slot-prayer-recipient",
        ),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(5),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const ordinaryResult = requireSuccess(
      applyCharacterSheetSpellRestBenefit({
        caster,
        spellId: authoredUnitId("prayer_of_healing"),
        unitLibrary,
        castLevel: spellSlotLevel(2),
        spellSlotSource: "ordinary",
        recipients: [
          {
            sheet: recipient,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            healingRolls: [DieRollResult(1), DieRollResult(1)],
          },
        ],
      }),
    );
    expect(ordinaryResult.caster.spellSlotExpenditures).toEqual([
      { spellLevel: 2, expended: 1 },
    ]);

    const casterWithFirstCreatedSlot = requireSuccess(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: caster,
        unitLibrary,
        spellLevel: spellSlotLevel(1),
      }),
    );
    const casterWithCreatedSlot = requireSuccess(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: casterWithFirstCreatedSlot,
        unitLibrary,
        spellLevel: spellSlotLevel(2),
      }),
    );
    if (!isCharacterSheetWithSpellSlots(casterWithCreatedSlot)) {
      throw new Error(
        "Synthetic created-slot caster must retain ordinary Spell Slot state.",
      );
    }

    const result = requireSuccess(
      applyCharacterSheetSpellRestBenefit({
        caster: {
          ...casterWithCreatedSlot,
          spellSlotExpenditures: [
            { spellLevel: spellSlotLevel(2), expended: resourceCount(3) },
          ],
        },
        spellId: authoredUnitId("prayer_of_healing"),
        unitLibrary,
        castLevel: spellSlotLevel(2),
        recipients: [
          {
            sheet: recipient,
            eligibility: { remainedWithinRangeForEntireCasting: true },
            healingRolls: [DieRollResult(1), DieRollResult(1)],
          },
        ],
      }),
    );

    expect(result.caster.createdSpellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test(prayerOfHealingRestBenefitAdmissionGateTestName, () => {
    const caster = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-admission-caster"),
        build: prayerOfHealingClericBuild(),
        currentHp: Hp(18),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const recipient = requireSuccess(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:prayer-admission-target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(6),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const malformedLibraries = [
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
    ];

    for (const malformedUnitLibrary of malformedLibraries) {
      expect(
        applyCharacterSheetSpellRestBenefit({
          caster,
          spellId: authoredUnitId("prayer_of_healing"),
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
      ).toMatchObject({ _tag: "Failure" });
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
        _tag: "Failure",
        failure: {
          message:
            "Spell recipient rest lockout requires an admitted spell rest-benefit profile.",
        },
      });
    }
  });
});
