// KERNEL-COVERAGE: parity-witness SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.healing-resource-action
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B paladin_lay_on_hands
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-PRAYER-OF-HEALING-CHARACTER-SHEET-REST prayer_of_healing
import { describe, expect, test } from "vitest";
import {
  DieRollResult,
  Hp,
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  armorClassBuild,
  characterSheetCurrentHp,
  characterSheetHitDice,
  characterSheetId,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellSlots,
  characterSheetTempHp,
  completeLongRest,
  createFreshCharacterSheet,
  layOnHandsLongRestRecoveryTestName,
  layOnHandsRejectsDivergentPoolsTestName,
  layOnHandsSpendsHealingPoolTestName,
  parseCharacterSheet,
  prayerOfHealingClericBuild,
  prayerOfHealingRestBenefitAdmissionGateTestName,
  prayerOfHealingRestBenefitApplicationTestName,
  prayerOfHealingStoredLockoutGateTestName,
  prayerOfHealingUnitLibraryWith,
  replacePrayerOfHealingDirectPhase,
  requireRight,
  resourceCount,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  sorcererFontOfMagicBuild,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
  wizardWarlockBuild,
} from "./test-support.ts";
import type { PrayerOfHealingDirectPhase } from "./test-support.ts";

describe("Character Sheet runtime / healing and rest benefit spells", () => {
  test(layOnHandsSpendsHealingPoolTestName, () => {
    const source = requireRight(
      createFreshCharacterSheet({
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
    const target = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
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

  test(prayerOfHealingRestBenefitApplicationTestName, () => {
    const caster = requireRight(
      createFreshCharacterSheet({
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
    const woundedWizard = requireRight(
      createFreshCharacterSheet({
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
    const woundedFighter = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-fighter"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const woundedSorcerer = requireRight(
      createFreshCharacterSheet({
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
    expect(characterSheetCurrentHp(result.recipients[1])).toBe(19);
    expect(
      characterSheetResources(result.recipients[1], unitLibrary),
    ).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
          expended: 2,
        }),
      ]),
    });
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
        currentHp: Hp(18),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const recipient = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:prayer-admission-target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
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
});
