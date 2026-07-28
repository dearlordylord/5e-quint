import {
  statBlockId as authoredStatBlockId,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { SimpleActionMap, SimpleDriver } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_SHEET_SHORT_REST_TICKS,
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  applyLayOnHandsWithRoute,
  characterSheetId,
  characterSheetAbilityCheckProficiencyBonusProjection,
  characterSheetArmorClassProjection,
  characterSheetClassFeatureSelectedReferenceProjection,
  characterSheetHitPointMaximumProjection,
  characterSheetResources,
  characterSheetSpellbookRitualInvocationProjection,
  characterSheetWeaponMasterySelectedReferenceProjection,
  completeLongRestArcaneRecoveryResetWithRoute,
  completeLongRestWeaponMasteryReselectionWithRoute,
  completeShortRestArcaneRecoveryWithRoute,
  createFreshCharacterSheet,
  finishLongRest,
  finishShortRest,
  startLongRest,
  startShortRest,
  type CharacterSheetAbilityCheckOtherProficiencyBonusState,
  type CharacterSheetAbilityCheckProficiencyBonus,
  type CharacterSheet,
  type CharacterSheetArmorClassBaseChoice,
  type CharacterSheetDruidCircleLand,
  type CharacterSheetRouteEvent,
  type CharacterSheetRouteFact,
  type CharacterSheetRouteFill,
  type CharacterSheetRouteHole,
  type CharacterSheetRouteOwner,
  type CharacterSheetRouteSubject,
  type CharacterSheetWeaponMasteryReselection,
  type CharacterSheetWeaponMasterySelectedReferenceProjection,
} from "./index.ts";
import { authoredNonEmptyUnitIds } from "./test-support.test-support.ts";

const MBT_TEST_TIMEOUT_MS = 120_000;

const SUBJECT_BY_TAG = {
  SheetStateRouteSubject: "sheetState",
  SheetHitPointRouteSubject: "hitPoint",
  SheetRestRouteSubject: "rest",
  SheetFeatureResourceRouteSubject: "featureResource",
  SheetSpellResourceRouteSubject: "spellResource",
  SheetBuildFactsProjectionRouteSubject: "buildFactsProjection",
  SheetArmorClassProjectionRouteSubject: "armorClassProjection",
  SheetAbilityCheckProjectionRouteSubject: "abilityCheckProjection",
  SheetSelectedReferenceProjectionRouteSubject: "selectedReferenceProjection",
} as const satisfies Record<string, CharacterSheetRouteSubject>;

const HOLE_BY_TAG = {
  SheetHitDiceSpendHoleFamily: "hitDiceSpend",
  SheetRestBenefitChoiceHoleFamily: "restBenefitChoice",
  SheetResourceSpendHoleFamily: "resourceSpend",
  SheetRecoveryChoiceHoleFamily: "recoveryChoice",
  SheetProjectionChoiceHoleFamily: "projectionChoice",
} as const satisfies Record<string, CharacterSheetRouteHole>;

const FILL_BY_TAG = {
  SheetHitDiceSpendFill: "hitDiceSpend",
  SheetRestDurationFill: "restDuration",
  SheetResourceSpendFill: "resourceSpend",
  SheetRecoverySelectionFill: "recoverySelection",
  SheetProjectionSelectionFill: "projectionSelection",
} as const satisfies Record<string, CharacterSheetRouteFill>;

const OWNER_BY_TAG = {
  CharacterSheetStateOwner: "characterSheetState",
  CharacterSheetHitPointOwner: "hitPoint",
  CharacterSheetHitDiceOwner: "hitDice",
  CharacterSheetSpellSlotOwner: "spellSlot",
  CharacterSheetPactSlotOwner: "pactSlot",
  CharacterSheetFeatureResourceOwner: "featureResource",
  CharacterSheetBuildProjectionOwner: "buildProjection",
  CharacterSheetSelectedReferenceOwner: "selectedReference",
} as const satisfies Record<string, CharacterSheetRouteOwner>;
type CharacterSheetSpellResourceSlotOwner = Extract<
  CharacterSheetRouteOwner,
  "spellSlot" | "pactSlot"
>;

const FACT_BY_TAG = {
  SheetOrdinarySpellSlotDeltaFact: "ordinarySpellSlotDelta",
  SheetPactSlotDeltaFact: "pactSlotDelta",
  SheetCreatedSlotExpiryFact: "createdSlotExpiry",
  SheetRestBenefitWindowFact: "restBenefitWindow",
  SheetFeatureRecoveryStateFact: "featureRecoveryState",
  SheetFeatureResourceSpendFact: "featureResourceSpend",
  SheetHitPointMaximumArithmeticInputFact: "hitPointMaximumArithmeticInput",
  SheetSpellResourceRejectionFact: "spellResourceRejection",
} as const satisfies Record<string, CharacterSheetRouteFact>;

const SPELL_RESOURCE_DELTA_FACTS_BY_OWNER = {
  spellSlot: ["ordinarySpellSlotDelta"],
  pactSlot: ["pactSlotDelta"],
} as const satisfies Record<
  CharacterSheetSpellResourceSlotOwner,
  readonly CharacterSheetRouteFact[]
>;

type RouteProjection = {
  readonly route: readonly CharacterSheetRouteEvent[];
};

type RouteDriverSchema = Record<string, Record<string, never>>;
type RouteAppender = (
  route: readonly CharacterSheetRouteEvent[],
) => readonly CharacterSheetRouteEvent[];
type WeaponMasteryRouteWeaponUnitIds = readonly [string, ...string[]];
type ReadyRouteActionMap<Schema extends RouteDriverSchema> = Partial<
  Record<keyof Schema, RouteAppender>
>;
type IndexedRouteActionMap<Schema extends RouteDriverSchema> = Partial<
  Record<
    keyof Schema,
    {
      readonly replayIndex: number;
      readonly append: RouteAppender;
    }
  >
>;

const abilityCheckRouteDriverSchema = {
  init: {},
  doProjectJackOfAllTradesLevelTwo: {},
  doProjectJackOfAllTradesRoundedDown: {},
  doProjectSkillProficiency: {},
  doProjectExpertise: {},
  doRejectOtherProficiencyBonus: {},
  doRejectMissingBardLevelTwo: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet route connector Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const hitPointMaximumRouteDriverSchema = {
  init: {},
  doProjectFighterLevelOne: {},
  doProjectFighterLevelTwo: {},
  doProjectWizardFighterMulticlass: {},
  doProjectMinimumHigherLevelGain: {},
  doProjectSorcererDraconicResilience: {},
  doProjectReducedEffectiveMaximum: {},
  step: {},
} as const;

const armorClassRouteDriverSchema = {
  init: {},
  doSelectBarbarianUnarmoredDefense: {},
  doSelectBarbarianUnarmoredDefenseWithShield: {},
  doSelectMonkUnarmoredDefense: {},
  doProjectLightArmor: {},
  doProjectMediumArmorDexCap: {},
  doProjectHeavyArmorWithShield: {},
  step: {},
} as const;

const classFeatureSelectedReferenceRouteDriverSchema = {
  init: {},
  doProjectBardJackOfAllTrades: {},
  doProjectClericLifeDomainSpells: {},
  doProjectDruidCircleLandSpells: {},
  doProjectPaladinOathDevotionSpells: {},
  doProjectPaladinsSmite: {},
  doProjectRangerFavoredEnemy: {},
  doProjectSorcererDraconicSpells: {},
  doProjectWarlockFiendSpells: {},
  step: {},
} as const;

const healingResourceRouteDriverSchema = {
  init: {},
  doLayOnHandsRestoreHpAndRemovePoisoned: {},
  step: {},
} as const;

const arcaneRecoveryRouteDriverSchema = {
  init: {},
  doRecoverSecondLevelSpellSlot: {},
  doResetArcaneRecoveryOnLongRest: {},
  doRejectPactSlotArcaneRecovery: {},
  step: {},
} as const;

const hpRestHitDiceRouteDriverSchema = {
  init: {},
  doRejectLongRestStartAtZeroHp: {},
  doRejectLongRestBeforeSixteenHourWait: {},
  doSpendShortRestHitPointDie: {},
  doInterruptShortRestNoBenefit: {},
  doCompleteLongRestRestoresHpHitPointDiceAndMaximum: {},
  doInterruptLongRestBeforeOneHourNoBenefit: {},
  doInterruptLongRestWithShortRestBenefits: {},
  doRejectShortRestStartAtZeroHp: {},
  doRejectShortRestDurationTooShort: {},
  doRejectLongRestDurationTooShort: {},
  doRejectLongRestPhysicalExertionTooShort: {},
  doSpendShortRestHitPointDiceSequentially: {},
  doRejectLongRestInterruptionAtRequiredDuration: {},
  step: {},
} as const;

const spellResourceRouteDriverSchema = {
  init: {},
  doRejectMismatchedOrdinarySpellSlotCapacity: {},
  doRejectPactSlotExpenditureOverCapacity: {},
  doShortRestRestoresPactSlotsOnly: {},
  doShortRestArcaneRecoveryRefundsOrdinarySpellSlot: {},
  doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots: {},
  doInterruptShortRestNoSlotBenefit: {},
  doInterruptLongRestBeforeOneHourNoSlotBenefit: {},
  doInterruptLongRestWithShortRestSlotBenefits: {},
  doMagicalCunningRecoversPactSlots: {},
  doRejectMagicalCunningWithoutExpendedPactSlots: {},
  doRejectArcaneRecoveryPactSlotRefund: {},
  step: {},
} as const;

const spellbookRitualRouteDriverSchema = {
  init: {},
  doInvokeSpellbookRitual: {},
  doRejectPreparedOnlyRitual: {},
  doRejectNonRitualSpellbookSpell: {},
  doRejectMissingRitualAccessFeature: {},
  doRejectNonLeveledRitualSpellbookSpell: {},
  step: {},
} as const;

const weaponMasteryRouteDriverSchema = {
  init: {},
  doSelectPaladinWeaponMastery: {},
  doReselectPaladinWeaponMasteryOnLongRest: {},
  doSelectRangerWeaponMastery: {},
  doReselectRangerWeaponMasteryOnLongRest: {},
  doSelectRogueWeaponMastery: {},
  doReselectRogueWeaponMasteryOnLongRest: {},
  doAcceptOneChangeWeaponMasteryReselection: {},
  doRejectTooManyChangesWeaponMasteryReselection: {},
  step: {},
} as const;

const routeStateCheck = stateCheck(
  normalizeCharacterSheetRouteQuintState,
  (spec: RouteProjection, impl: RouteProjection) => {
    expect(impl.route).toEqual(spec.route);
    return true;
  },
);

describe("character sheet reducer route connector MBT", () => {
  it(
    "routes Ability Check Proficiency Bonus projections through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-ability-check-proficiency-bonus.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          abilityCheckRouteDriverSchema,
          abilityCheckRouteActions,
        ),
        maxSteps: 6,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Hit Point Maximum projections through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName: "character-sheet-hit-point-maximum.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          hitPointMaximumRouteDriverSchema,
          hitPointMaximumRouteActions,
        ),
        maxSteps: 6,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Armor Class selected-reference projections through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-armor-class-base-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          armorClassRouteDriverSchema,
          armorClassRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes in-scope class-feature selected references through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-class-feature-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          classFeatureSelectedReferenceRouteDriverSchema,
          classFeatureSelectedReferenceRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes healing resource spending through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-healing-resource-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          healingResourceRouteDriverSchema,
          healingResourceRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes in-scope Arcane Recovery state through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-arcane-recovery-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          arcaneRecoveryRouteDriverSchema,
          arcaneRecoveryRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes HP rest and Hit Dice transitions through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName: "character-sheet-hp-rest-hit-dice.route.mbt.qnt",
        driver: createIndexedRouteDriver(
          hpRestHitDiceRouteDriverSchema,
          hpRestHitDiceRouteActions,
        ),
        maxSteps: 13,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes in-scope Spell Slot and Pact Slot transitions through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName: "character-sheet-spell-slots-pact-slots.route.mbt.qnt",
        driver: createReadyRouteDriver(
          spellResourceRouteDriverSchema,
          spellResourceRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes spellbook Ritual selected references through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          spellbookRitualRouteDriverSchema,
          spellbookRitualRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Weapon Mastery selected weapon refs through the sheet reducer surface",
    async () => {
      await runRouteMbt({
        specFileName:
          "character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt",
        driver: createReadyRouteDriver(
          weaponMasteryRouteDriverSchema,
          weaponMasteryRouteActions,
        ),
        maxSteps: 1,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

const abilityCheckRouteActions = indexedActionEntries(
  abilityCheckRouteDriverSchema,
  [
    [
      "doProjectJackOfAllTradesLevelTwo",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({ totalLevel: 2 }),
        expectedProjection: {
          tag: "jackOfAllTrades",
          sourceUnitId: authoredUnitId("bard_jack_of_all_trades"),
          skill: "performance",
          bonus: 1,
        },
      }),
    ],
    [
      "doProjectJackOfAllTradesRoundedDown",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({ totalLevel: 5 }),
        expectedProjection: {
          tag: "jackOfAllTrades",
          sourceUnitId: authoredUnitId("bard_jack_of_all_trades"),
          skill: "performance",
          bonus: 1,
        },
      }),
    ],
    [
      "doProjectSkillProficiency",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({
          totalLevel: 5,
          proficiencyChoices: [{ kind: "skill", skill: "performance" }],
        }),
        expectedProjection: {
          tag: "skillProficiency",
          skill: "performance",
          bonus: 3,
        },
      }),
    ],
    [
      "doProjectExpertise",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({
          totalLevel: 5,
          proficiencyChoices: [
            { kind: "skill_expertise", skill: "performance" },
          ],
        }),
        expectedProjection: {
          tag: "expertise",
          skill: "performance",
          bonus: 6,
        },
      }),
    ],
    [
      "doRejectOtherProficiencyBonus",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({ totalLevel: 5 }),
        otherProficiencyBonus: CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
        expectedProjection: {
          tag: "none",
          bonus: 0,
        },
      }),
    ],
    [
      "doRejectMissingBardLevelTwo",
      projectPublicAbilityCheckRoute({
        build: bardAbilityCheckBuild({ totalLevel: 1 }),
        expectedProjection: {
          tag: "none",
          bonus: 0,
        },
      }),
    ],
  ],
);

const hitPointMaximumRouteActions = indexedActionEntries(
  hitPointMaximumRouteDriverSchema,
  [
    [
      "doProjectFighterLevelOne",
      projectHitPointMaximumRoute({
        build: baseBuild({
          startingClass: "class_fighter",
          constitutionScore: 13,
        }),
        expectedNormalMaximum: 11,
        expectedEffectiveMaximum: 11,
      }),
    ],
    [
      "doProjectFighterLevelTwo",
      projectHitPointMaximumRoute({
        build: baseBuild({
          startingClass: "class_fighter",
          advancements: ["class_fighter"],
          constitutionScore: 13,
        }),
        expectedNormalMaximum: 18,
        expectedEffectiveMaximum: 18,
      }),
    ],
    [
      "doProjectWizardFighterMulticlass",
      projectHitPointMaximumRoute({
        build: baseBuild({
          startingClass: "class_wizard",
          advancements: ["class_fighter"],
          constitutionScore: 13,
        }),
        expectedNormalMaximum: 14,
        expectedEffectiveMaximum: 14,
      }),
    ],
    [
      "doProjectMinimumHigherLevelGain",
      projectHitPointMaximumRoute({
        build: baseBuild({
          startingClass: "class_wizard",
          advancements: ["class_wizard"],
          constitutionScore: 2,
        }),
        expectedNormalMaximum: 3,
        expectedEffectiveMaximum: 3,
      }),
    ],
    [
      "doProjectSorcererDraconicResilience",
      projectHitPointMaximumRoute({
        build: {
          ...baseBuild({
            startingClass: "class_sorcerer",
            advancements: ["class_sorcerer", "class_sorcerer"],
            constitutionScore: 13,
          }),
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_sorcerer"),
              unitId: authoredUnitId("subclass_sorcerer_draconic_sorcery"),
            },
          ],
        },
        expectedNormalMaximum: 20,
        expectedEffectiveMaximum: 20,
      }),
    ],
    [
      "doProjectReducedEffectiveMaximum",
      projectHitPointMaximumRoute({
        build: baseBuild({
          startingClass: "class_fighter",
          advancements: ["class_fighter"],
          constitutionScore: 13,
        }),
        hitPointMaximumReduction: 3,
        expectedNormalMaximum: 18,
        expectedEffectiveMaximum: 15,
      }),
    ],
  ],
);

const armorClassRouteActions = {
  doSelectBarbarianUnarmoredDefense: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_barbarian",
      advancements: ["class_monk"],
    }),
    baseChoice: {
      kind: "class_feature",
      unitId: authoredUnitId("barbarian_unarmored_defense"),
    },
    expectedArmorClass: 13,
  }),
  doSelectBarbarianUnarmoredDefenseWithShield: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_barbarian",
      advancements: ["class_monk"],
      shield: true,
    }),
    baseChoice: {
      kind: "class_feature",
      unitId: authoredUnitId("barbarian_unarmored_defense"),
    },
    expectedArmorClass: 15,
  }),
  doSelectMonkUnarmoredDefense: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_barbarian",
      advancements: ["class_monk"],
    }),
    baseChoice: {
      kind: "class_feature",
      unitId: authoredUnitId("monk_unarmored_defense"),
    },
    expectedArmorClass: 15,
  }),
  doProjectLightArmor: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_leather",
    }),
    expectedArmorClass: 13,
  }),
  doProjectMediumArmorDexCap: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_shirt",
      dexterityScore: 16,
    }),
    expectedArmorClass: 15,
  }),
  doProjectHeavyArmorWithShield: projectPublicArmorClassRoute({
    build: armorClassBuild({
      startingClass: "class_fighter",
      armor: "armor_chain_mail",
      shield: true,
    }),
    expectedArmorClass: 18,
  }),
} as const satisfies ReadyRouteActionMap<typeof armorClassRouteDriverSchema>;

const classFeatureSelectedReferenceRouteActions = {
  doProjectBardJackOfAllTrades: projectPublicClassFeatureSelectedReferenceRoute(
    {
      build: classFeatureBuild({ startingClass: "class_bard", totalLevel: 2 }),
      expectedClassFeatureUnitId: "bard_jack_of_all_trades",
    },
  ),
  doProjectClericLifeDomainSpells:
    projectPublicClassFeatureSelectedReferenceRoute({
      build: classFeatureBuild({
        startingClass: "class_cleric",
        totalLevel: 3,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_cleric"),
            unitId: authoredUnitId("subclass_cleric_life_domain"),
          },
        ],
      }),
      expectedClassFeatureUnitId: "cleric_life_domain_spells",
      expectedSelectedClassChoiceUnitIds: ["subclass_cleric_life_domain"],
    }),
  doProjectDruidCircleLandSpells:
    projectPublicClassFeatureSelectedReferenceRoute({
      build: druidCircleLandBuild(),
      expectedClassFeatureUnitId: "druid_circle_of_the_land_spells",
      expectedSelectedClassChoiceUnitIds: ["subclass_druid_circle_of_the_land"],
      expectedDruidLand: "temperate",
      druidWildShapeKnownFormStatBlockIds: [
        "stat_block_rat",
        "stat_block_riding_horse",
        "stat_block_spider",
        "stat_block_wolf",
      ],
      druidCircleLand: { land: "temperate" },
    }),
  doProjectPaladinOathDevotionSpells:
    projectPublicClassFeatureSelectedReferenceRoute({
      build: classFeatureBuild({
        startingClass: "class_paladin",
        totalLevel: 3,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_paladin"),
            unitId: authoredUnitId("subclass_paladin_oath_of_devotion"),
          },
        ],
      }),
      expectedClassFeatureUnitId: "paladin_oath_of_devotion_spells",
      expectedSelectedClassChoiceUnitIds: ["subclass_paladin_oath_of_devotion"],
    }),
  doProjectPaladinsSmite: projectPublicClassFeatureSelectedReferenceRoute({
    build: classFeatureBuild({ startingClass: "class_paladin", totalLevel: 2 }),
    expectedClassFeatureUnitId: "paladin_paladins_smite",
  }),
  doProjectRangerFavoredEnemy: projectPublicClassFeatureSelectedReferenceRoute({
    build: classFeatureBuild({ startingClass: "class_ranger", totalLevel: 2 }),
    expectedClassFeatureUnitId: "ranger_favored_enemy",
  }),
  doProjectSorcererDraconicSpells:
    projectPublicClassFeatureSelectedReferenceRoute({
      build: classFeatureBuild({
        startingClass: "class_sorcerer",
        totalLevel: 3,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_sorcerer"),
            unitId: authoredUnitId("subclass_sorcerer_draconic_sorcery"),
          },
        ],
      }),
      expectedClassFeatureUnitId: "sorcerer_draconic_spells",
      expectedSelectedClassChoiceUnitIds: [
        "subclass_sorcerer_draconic_sorcery",
      ],
    }),
  doProjectWarlockFiendSpells: projectPublicClassFeatureSelectedReferenceRoute({
    build: classFeatureBuild({
      startingClass: "class_warlock",
      totalLevel: 3,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId("class_warlock"),
          unitId: authoredUnitId("subclass_warlock_fiend_patron"),
        },
      ],
    }),
    expectedClassFeatureUnitId: "warlock_fiend_spells",
    expectedSelectedClassChoiceUnitIds: ["subclass_warlock_fiend_patron"],
  }),
} as const satisfies ReadyRouteActionMap<
  typeof classFeatureSelectedReferenceRouteDriverSchema
>;

const healingResourceRouteActions = {
  doLayOnHandsRestoreHpAndRemovePoisoned: spendHealingResourceRoute,
} as const satisfies ReadyRouteActionMap<
  typeof healingResourceRouteDriverSchema
>;

const arcaneRecoveryRouteActions = {
  doRecoverSecondLevelSpellSlot: recoverSecondLevelSpellSlotRoute,
  doResetArcaneRecoveryOnLongRest: resetArcaneRecoveryOnLongRestRoute,
  doRejectPactSlotArcaneRecovery: rejectPactSlotArcaneRecoveryRoute,
} as const satisfies ReadyRouteActionMap<
  typeof arcaneRecoveryRouteDriverSchema
>;

const hpRestHitDiceRouteActions = indexedActionEntries(
  hpRestHitDiceRouteDriverSchema,
  [
    ["doRejectLongRestStartAtZeroHp", rejectRestRoute("hitPoint")],
    [
      "doRejectLongRestBeforeSixteenHourWait",
      rejectRestRoute("characterSheetState"),
    ],
    ["doSpendShortRestHitPointDie", spendHitDiceRoute],
    ["doInterruptShortRestNoBenefit", completeShortRestWithoutBenefitsRoute],
    [
      "doCompleteLongRestRestoresHpHitPointDiceAndMaximum",
      completeLongRestHpAndHitDiceRoute,
    ],
    [
      "doInterruptLongRestBeforeOneHourNoBenefit",
      completeShortRestWithoutBenefitsRoute,
    ],
    ["doInterruptLongRestWithShortRestBenefits", spendHitDiceRoute],
    ["doRejectShortRestStartAtZeroHp", rejectRestRoute("hitPoint")],
    [
      "doRejectShortRestDurationTooShort",
      rejectRestRoute("characterSheetState"),
    ],
    [
      "doRejectLongRestDurationTooShort",
      rejectRestRoute("characterSheetState"),
    ],
    [
      "doRejectLongRestPhysicalExertionTooShort",
      rejectRestRoute("characterSheetState"),
    ],
    ["doSpendShortRestHitPointDiceSequentially", spendHitDiceRoute],
    [
      "doRejectLongRestInterruptionAtRequiredDuration",
      rejectRestRoute("characterSheetState"),
    ],
  ],
);

const spellResourceRouteActions = {
  doRejectMismatchedOrdinarySpellSlotCapacity:
    rejectSpellResourceRoute("spellSlot"),
  doRejectPactSlotExpenditureOverCapacity: rejectSpellResourceRoute("pactSlot"),
  doShortRestRestoresPactSlotsOnly: completeRestoredSlotRoute("pactSlot"),
  doShortRestArcaneRecoveryRefundsOrdinarySpellSlot:
    arcaneRecoverySpellSlotRoute,
  doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots:
    completeLongRestSpellResourceRoute,
  doInterruptShortRestNoSlotBenefit: noSlotBenefitRestRoute,
  doInterruptLongRestBeforeOneHourNoSlotBenefit: noSlotBenefitRestRoute,
  doInterruptLongRestWithShortRestSlotBenefits:
    completeRestoredSlotRoute("pactSlot"),
  doMagicalCunningRecoversPactSlots: pactSlotRecoveryRoute,
  doRejectMagicalCunningWithoutExpendedPactSlots: rejectPactSlotRecoveryRoute,
  doRejectArcaneRecoveryPactSlotRefund: rejectPactSlotRecoveryRoute,
} as const satisfies ReadyRouteActionMap<typeof spellResourceRouteDriverSchema>;

const spellbookRitualRouteActions = {
  doInvokeSpellbookRitual: spellbookRitualRoute({
    sheet: spellbookRitualSheet({
      characterIdText: "character:wizard-ritual-route",
      spellbook: ["detect_magic"],
    }),
    spellId: "detect_magic",
    expectedTag: "accepted",
  }),
  doRejectPreparedOnlyRitual: spellbookRitualRoute({
    sheet: spellbookRitualSheet({
      characterIdText: "character:wizard-prepared-only-ritual-route",
      spellbook: [],
      preparedSpells: ["detect_magic"],
    }),
    spellId: "detect_magic",
    expectedTag: "rejected",
  }),
  doRejectNonRitualSpellbookSpell: spellbookRitualRoute({
    sheet: spellbookRitualSheet({
      characterIdText: "character:wizard-non-ritual-route",
      spellbook: ["magic_missile"],
    }),
    spellId: "magic_missile",
    expectedTag: "rejected",
  }),
  doRejectMissingRitualAccessFeature: spellbookRitualRoute({
    sheet: spellbookRitualSheet({
      characterIdText: "character:missing-ritual-feature-route",
      startingClass: "class_fighter",
      spellbook: ["detect_magic"],
    }),
    spellId: "detect_magic",
    expectedTag: "rejected",
  }),
  doRejectNonLeveledRitualSpellbookSpell: spellbookRitualRoute({
    sheet: spellbookRitualSheet({
      characterIdText: "character:non-leveled-ritual-route",
      spellbook: ["light"],
    }),
    spellId: "light",
    expectedTag: "rejected",
  }),
} as const satisfies ReadyRouteActionMap<
  typeof spellbookRitualRouteDriverSchema
>;

const weaponMasteryRouteActions = {
  doSelectPaladinWeaponMastery:
    projectPublicWeaponMasterySelectedReferenceRoute({
      classUnitId: "class_paladin",
      featureUnitId: "paladin_weapon_mastery",
      selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
      expectedChoiceCount: 2,
      expectedLongRestChangeCount: 2,
    }),
  doReselectPaladinWeaponMasteryOnLongRest:
    completePublicWeaponMasteryReselectionRoute({
      classUnitId: "class_paladin",
      featureUnitId: "paladin_weapon_mastery",
      selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
      reselectedWeaponUnitIds: ["weapon_spear", "weapon_flail"],
      expectedTag: "accepted",
    }),
  doSelectRangerWeaponMastery: projectPublicWeaponMasterySelectedReferenceRoute(
    {
      classUnitId: "class_ranger",
      featureUnitId: "ranger_weapon_mastery",
      selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
      expectedChoiceCount: 2,
      expectedLongRestChangeCount: 2,
    },
  ),
  doReselectRangerWeaponMasteryOnLongRest:
    completePublicWeaponMasteryReselectionRoute({
      classUnitId: "class_ranger",
      featureUnitId: "ranger_weapon_mastery",
      selectedWeaponUnitIds: ["weapon_longsword", "weapon_dagger"],
      reselectedWeaponUnitIds: ["weapon_spear", "weapon_flail"],
      expectedTag: "accepted",
    }),
  doSelectRogueWeaponMastery: projectPublicWeaponMasterySelectedReferenceRoute({
    classUnitId: "class_rogue",
    featureUnitId: "rogue_weapon_mastery",
    selectedWeaponUnitIds: ["weapon_dagger", "weapon_shortbow"],
    expectedChoiceCount: 2,
    expectedLongRestChangeCount: 2,
  }),
  doReselectRogueWeaponMasteryOnLongRest:
    completePublicWeaponMasteryReselectionRoute({
      classUnitId: "class_rogue",
      featureUnitId: "rogue_weapon_mastery",
      selectedWeaponUnitIds: ["weapon_dagger", "weapon_shortbow"],
      reselectedWeaponUnitIds: ["weapon_spear", "weapon_shortsword"],
      expectedTag: "accepted",
    }),
  doAcceptOneChangeWeaponMasteryReselection:
    completePublicWeaponMasteryReselectionRoute({
      classUnitId: "class_fighter",
      featureUnitId: "fighter_weapon_mastery",
      selectedWeaponUnitIds: [
        "weapon_longsword",
        "weapon_dagger",
        "weapon_shortbow",
      ],
      reselectedWeaponUnitIds: [
        "weapon_longsword",
        "weapon_dagger",
        "weapon_spear",
      ],
      expectedTag: "accepted",
    }),
  doRejectTooManyChangesWeaponMasteryReselection:
    completePublicWeaponMasteryReselectionRoute({
      classUnitId: "class_fighter",
      featureUnitId: "fighter_weapon_mastery",
      selectedWeaponUnitIds: [
        "weapon_longsword",
        "weapon_dagger",
        "weapon_shortbow",
      ],
      reselectedWeaponUnitIds: [
        "weapon_spear",
        "weapon_flail",
        "weapon_shortsword",
      ],
      expectedTag: "rejected",
    }),
} as const satisfies ReadyRouteActionMap<typeof weaponMasteryRouteDriverSchema>;

function initialCharacterSheetRoute(): readonly CharacterSheetRouteEvent[] {
  return [
    createCharacterSheet("characterSheetState"),
    projectCharacterSheetFacts({
      subject: "buildFactsProjection",
      owner: "buildProjection",
    }),
  ];
}

function projectPublicAbilityCheckRoute(input: {
  readonly build: CharacterBuild;
  readonly otherProficiencyBonus?: CharacterSheetAbilityCheckOtherProficiencyBonusState;
  readonly expectedProjection: CharacterSheetAbilityCheckProficiencyBonus;
}): RouteAppender {
  return (route) => {
    const projectedRoute = requireRight(
      characterSheetAbilityCheckProficiencyBonusProjection({
        build: input.build,
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus:
          input.otherProficiencyBonus ??
          CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );
    expect(projectedRoute.proficiencyBonus).toEqual(input.expectedProjection);
    return [...route, ...projectedRoute.qRoute];
  };
}

function projectHitPointMaximumRoute(input: {
  readonly build: CharacterBuild;
  readonly hitPointMaximumReduction?: number;
  readonly expectedNormalMaximum: number;
  readonly expectedEffectiveMaximum: number;
}): RouteAppender {
  return (route) => {
    const hitPointMaximumReduction = input.hitPointMaximumReduction ?? 0;
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:route-hit-point-maximum"),
        build: input.build,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(hitPointMaximumReduction),
        conditions: [],
        unitLibrary,
      }),
    );
    const projection = requireRight(
      characterSheetHitPointMaximumProjection({ sheet, unitLibrary }),
    );
    expect(Number(projection.normalHitPointMaximum)).toBe(
      input.expectedNormalMaximum,
    );
    expect(Number(projection.effectiveHitPointMaximum)).toBe(
      input.expectedEffectiveMaximum,
    );
    expect(Number(projection.hitPointMaximumReduction)).toBe(
      hitPointMaximumReduction,
    );
    return [...route, ...projection.qRoute];
  };
}

function bardAbilityCheckBuild(input: {
  readonly totalLevel: 1 | 2 | 5;
  readonly proficiencyChoices?: CharacterBuild["proficiencyChoices"];
}): CharacterBuild {
  return {
    ...baseBuild({
      startingClass: "class_bard",
      advancements: Array.from(
        { length: input.totalLevel - 1 },
        () => "class_bard",
      ),
    }),
    proficiencyChoices: input.proficiencyChoices ?? [],
  };
}

function baseBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly constitutionScore?: number;
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId(input.startingClass)),
      advancements: (input.advancements ?? []).map((classId) => ({
        classUnitId: classUnitId(authoredUnitId(classId)),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: input.constitutionScore ?? 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function projectPublicArmorClassRoute(input: {
  readonly build: CharacterBuild;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
  readonly expectedArmorClass: number;
}): RouteAppender {
  return (route) => {
    const projected = requireRight(
      characterSheetArmorClassProjection({
        build: input.build,
        unitLibrary,
        ...(input.baseChoice === undefined
          ? {}
          : { baseChoice: input.baseChoice }),
      }),
    );
    expect(Number(projected.armorClass)).toBe(input.expectedArmorClass);
    return [...route, ...projected.qRoute];
  };
}

function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: string;
  readonly shield?: boolean;
  readonly dexterityScore?: number;
}): CharacterBuild {
  const armorItemId =
    input.armor === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "armor",
          unitId: requireRight(
            characterEquipmentItemUnitId(authoredUnitId(input.armor)),
          ),
        });
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: requireRight(
            characterEquipmentItemUnitId(authoredUnitId("equipment_shield")),
          ),
        })
      : undefined;
  return {
    ...baseBuild({
      startingClass: input.startingClass,
      ...(input.advancements === undefined
        ? {}
        : { advancements: input.advancements }),
    }),
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: input.dexterityScore ?? 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: authoredUnitId(input.armor) }]),
        ...(shieldItemId === undefined
          ? []
          : [
              {
                itemId: shieldItemId,
                unitId: authoredUnitId("equipment_shield"),
              },
            ]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function projectPublicClassFeatureSelectedReferenceRoute(input: {
  readonly build: CharacterBuild;
  readonly expectedClassFeatureUnitId: string;
  readonly expectedSelectedClassChoiceUnitIds?: readonly string[];
  readonly expectedDruidLand?: CharacterSheetDruidCircleLand["land"];
  readonly druidWildShapeKnownFormStatBlockIds?: readonly string[];
  readonly druidCircleLand?: CharacterSheetDruidCircleLand;
}): RouteAppender {
  return (route) => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          `character:route-${input.expectedClassFeatureUnitId}`,
        ),
        build: input.build,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary,
        ...(input.druidWildShapeKnownFormStatBlockIds === undefined
          ? {}
          : {
              druidWildShapeKnownFormStatBlockIds:
                input.druidWildShapeKnownFormStatBlockIds.map(
                  authoredStatBlockId,
                ),
            }),
        ...(input.druidCircleLand === undefined
          ? {}
          : { druidCircleLand: input.druidCircleLand }),
      }),
    );
    if (input.expectedDruidLand !== undefined) {
      expect(sheet.druidCircleLand?.land).toBe(input.expectedDruidLand);
    }
    const projected = characterSheetClassFeatureSelectedReferenceProjection({
      sheet,
      unitLibrary,
    });
    expect(projected.classFeatureUnitIds).toContain(
      input.expectedClassFeatureUnitId,
    );
    for (const selectedChoiceUnitId of input.expectedSelectedClassChoiceUnitIds ??
      []) {
      expect(projected.selectedClassChoiceUnitIds).toContain(
        selectedChoiceUnitId,
      );
    }
    return [...route, ...projected.qRoute];
  };
}

function classFeatureBuild(input: {
  readonly startingClass: string;
  readonly totalLevel: 2 | 3;
  readonly features?: CharacterBuild["features"];
}): CharacterBuild {
  return {
    ...baseBuild({
      startingClass: input.startingClass,
      advancements: Array.from(
        { length: input.totalLevel - 1 },
        () => input.startingClass,
      ),
    }),
    features: input.features ?? [],
  };
}

function druidCircleLandBuild(): CharacterBuild {
  return {
    ...classFeatureBuild({
      startingClass: "class_druid",
      totalLevel: 3,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId("class_druid"),
          unitId: authoredUnitId("subclass_druid_circle_of_the_land"),
        },
      ],
    }),
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: authoredUnitId("druid_druidic"),
        language: "Druidic",
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_druid"),
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 4 }],
        },
      },
    },
  };
}

function spendHealingResourceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  const sheets = layOnHandsRouteSheets();
  const projected = requireRight(
    applyLayOnHandsWithRoute({
      source: sheets.source,
      target: sheets.target,
      unitLibrary,
      restoreHp: Hp(2),
      removePoisoned: true,
    }),
  );
  expect(currentHp(projected.source)).toBe(12);
  expect(currentHp(projected.target)).toBe(5);
  expect(projected.target.conditions).not.toContain("poisoned");
  const pool = requireRight(
    characterSheetResources(projected.source, unitLibrary),
  ).find((resource) => resource.tag === "layOnHandsHealingPool");
  expect(pool).toMatchObject({ count: 10, expended: 7 });
  return [...route, ...projected.qRoute];
}

function layOnHandsRouteSheets(): {
  readonly source: CharacterSheet;
  readonly target: CharacterSheet;
} {
  return {
    source: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:route-lay-on-hands-source"),
        build: baseBuild({
          startingClass: "class_paladin",
          advancements: ["class_paladin"],
        }),
        currentHp: Hp(12),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary,
      }),
    ),
    target: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:route-lay-on-hands-target"),
        build: baseBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(3),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: ["poisoned"],
        unitLibrary,
      }),
    ),
  };
}

function currentHp(sheet: CharacterSheet): number {
  return sheet.hitPoints.tag === "positive" ? sheet.hitPoints.currentHp : 0;
}

function recoverSecondLevelSpellSlotRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 2,
    secondLevelSpellSlotsExpended: 1,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: false,
  });
  const rest = requireRight(startShortRest({ sheet }));
  const completion = requireRight(
    finishShortRest({ rest, restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS }),
  );
  const projected = completeShortRestArcaneRecoveryWithRoute({
    completion,
    unitLibrary,
    arcaneRecovery: {
      refundSpellSlots: [
        { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
      ],
    },
  });
  expect(projected.tag).toBe("accepted");
  if (projected.tag !== "accepted") {
    throw new Error(projected.issue.message);
  }
  expect(
    projected.sheet.restFeatureUses.some(
      (use) => use.tag === "arcaneRecovery" && use.usedSinceLongRest,
    ),
  ).toBe(true);
  return [...route, ...projected.qRoute];
}

function resetArcaneRecoveryOnLongRestRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 1,
    secondLevelSpellSlotsExpended: 1,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: true,
  });
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const completion = requireRight(
    finishLongRest({ rest, restedTicks: rest.requiredRestTicks }),
  );
  const projected = completeLongRestArcaneRecoveryResetWithRoute({
    completion,
    unitLibrary,
  });
  expect(projected.tag).toBe("accepted");
  if (projected.tag !== "accepted") {
    throw new Error(projected.issue.message);
  }
  expect(
    projected.sheet.restFeatureUses.some(
      (use) => use.tag === "arcaneRecovery" && use.usedSinceLongRest,
    ),
  ).toBe(false);
  return [...route, ...projected.qRoute];
}

function arcaneRecoverySheet(input: {
  readonly firstLevelSpellSlotsExpended: number;
  readonly secondLevelSpellSlotsExpended: number;
  readonly pactSlotsExpended: number;
  readonly arcaneRecoveryUsedSinceLongRest: boolean;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:route-arcane-recovery"),
      build: arcaneRecoveryBuildWithPactSlots(),
      currentHp: Hp(18),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlotExpenditures: [
        {
          spellLevel: spellSlotLevel(1),
          expended: resourceCount(input.firstLevelSpellSlotsExpended),
        },
        {
          spellLevel: spellSlotLevel(2),
          expended: resourceCount(input.secondLevelSpellSlotsExpended),
        },
      ],
      pactSlots: { expended: resourceCount(input.pactSlotsExpended) },
      restFeatureUses: input.arcaneRecoveryUsedSinceLongRest
        ? [{ tag: "arcaneRecovery", usedSinceLongRest: true }]
        : [],
    }),
  );
}

function arcaneRecoveryBuildWithPactSlots(): CharacterBuild {
  return {
    ...baseBuild({
      startingClass: "class_wizard",
      advancements: ["class_wizard", "class_wizard", "class_wizard"],
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_wizard"),
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
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
          ],
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

function resetArcaneRecoveryRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    completeCharacterSheetRest({
      subject: "spellResource",
      fill: "recoverySelection",
      holes: [],
      owner: "spellSlot",
    }),
  ];
}

function arcaneRecoverySpellSlotRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...resetArcaneRecoveryRoute(route),
    recordCharacterSheetFacts({
      subject: "featureResource",
      facts: ["featureRecoveryState"],
      owner: "featureResource",
    }),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: ["ordinarySpellSlotDelta"],
      owner: "spellSlot",
    }),
  ];
}

function rejectPactSlotArcaneRecoveryRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 0,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: false,
  });
  const rest = requireRight(startShortRest({ sheet }));
  const completion = requireRight(
    finishShortRest({ rest, restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS }),
  );
  const projected = completeShortRestArcaneRecoveryWithRoute({
    completion,
    unitLibrary,
    arcaneRecovery: {
      refundSpellSlots: [
        { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
      ],
    },
  });
  expect(projected.tag).toBe("rejected");
  if (projected.tag !== "rejected") {
    throw new Error("Expected Arcane Recovery Pact Slot route rejection.");
  }
  return [...route, ...projected.qRoute];
}

function rejectRestRoute(owner: CharacterSheetRouteOwner): RouteAppender {
  return (route) => [
    ...route,
    resolveCharacterSheetSubject({
      subject: "rest",
      fill: "restDuration",
      holes: ["restBenefitChoice"],
      owner,
    }),
  ];
}

function spendHitDiceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "hitPoint",
      fill: "hitDiceSpend",
      holes: [],
      owner: "hitDice",
    }),
  ];
}

function completeShortRestWithoutBenefitsRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    completeCharacterSheetRest({
      subject: "rest",
      fill: "restDuration",
      holes: ["restBenefitChoice"],
      owner: "hitDice",
    }),
  ];
}

function completeLongRestHpAndHitDiceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    completeCharacterSheetRest({
      subject: "rest",
      fill: "restDuration",
      holes: [],
      owner: "hitPoint",
    }),
    completeCharacterSheetRest({
      subject: "rest",
      fill: "restDuration",
      holes: [],
      owner: "hitDice",
    }),
  ];
}

function rejectSpellResourceRoute(
  owner: CharacterSheetSpellResourceSlotOwner,
): RouteAppender {
  return (route) => [
    ...route,
    resolveCharacterSheetSubject({
      subject: "spellResource",
      fill: "resourceSpend",
      holes: ["resourceSpend"],
      owner,
    }),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: ["spellResourceRejection"],
      owner,
    }),
  ];
}

function completeRestoredSlotRoute(
  owner: CharacterSheetSpellResourceSlotOwner,
): RouteAppender {
  return (route) => [
    ...route,
    completeCharacterSheetRest({
      subject: "spellResource",
      fill: "restDuration",
      holes: [],
      owner,
    }),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: spellResourceDeltaFacts(owner),
      owner,
    }),
  ];
}

function spellResourceDeltaFacts(
  owner: CharacterSheetSpellResourceSlotOwner,
): readonly CharacterSheetRouteFact[] {
  return SPELL_RESOURCE_DELTA_FACTS_BY_OWNER[owner];
}

function completeLongRestSpellResourceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...completeRestoredSlotRoute("pactSlot")(
      completeRestoredSlotRoute("spellSlot")(route),
    ),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: ["createdSlotExpiry"],
      owner: "spellSlot",
    }),
  ];
}

function noSlotBenefitRestRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    completeCharacterSheetRest({
      subject: "rest",
      fill: "restDuration",
      holes: ["restBenefitChoice"],
      owner: "spellSlot",
    }),
    recordCharacterSheetFacts({
      subject: "rest",
      facts: ["restBenefitWindow"],
      owner: "spellSlot",
    }),
  ];
}

function pactSlotRecoveryRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "featureResource",
      fill: "recoverySelection",
      holes: [],
      owner: "featureResource",
    }),
    resolveCharacterSheetSubject({
      subject: "spellResource",
      fill: "recoverySelection",
      holes: [],
      owner: "pactSlot",
    }),
    recordCharacterSheetFacts({
      subject: "featureResource",
      facts: ["featureRecoveryState"],
      owner: "featureResource",
    }),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: ["pactSlotDelta"],
      owner: "pactSlot",
    }),
  ];
}

function rejectPactSlotRecoveryRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "spellResource",
      fill: "recoverySelection",
      holes: ["recoveryChoice"],
      owner: "pactSlot",
    }),
    recordCharacterSheetFacts({
      subject: "spellResource",
      facts: ["spellResourceRejection"],
      owner: "pactSlot",
    }),
  ];
}

function spellbookRitualRoute(input: {
  readonly sheet: CharacterSheet;
  readonly spellId: string;
  readonly expectedTag: "accepted" | "rejected";
}): RouteAppender {
  return (route) => {
    const projection = characterSheetSpellbookRitualInvocationProjection({
      sheet: input.sheet,
      unitLibrary,
      spellId: authoredUnitId(input.spellId),
      invocation: { kind: "ritual" },
    });
    expect(projection.tag).toBe(input.expectedTag);
    return [...route, ...projection.qRoute];
  };
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
        ...baseBuild({ startingClass: input.startingClass ?? "class_wizard" }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_wizard"),
              spellcastingAbility: "int",
              cantrips: [],
              spellbook: input.spellbook.map(authoredUnitId),
              preparedSpells: (input.preparedSpells ?? []).map(authoredUnitId),
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
      currentHp: Hp(7),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function projectPublicWeaponMasterySelectedReferenceRoute(input: {
  readonly classUnitId: string;
  readonly featureUnitId: string;
  readonly selectedWeaponUnitIds: WeaponMasteryRouteWeaponUnitIds;
  readonly expectedChoiceCount: number;
  readonly expectedLongRestChangeCount: number;
}): RouteAppender {
  return (route) => {
    const projection = requireRight(
      characterSheetWeaponMasterySelectedReferenceProjection({
        sheet: weaponMasteryRouteSheet(input),
        unitLibrary,
        featureUnitId: authoredUnitId(input.featureUnitId),
      }),
    );
    expectWeaponMasterySelectionProjection(projection, input);
    return [...route, ...projection.qRoute];
  };
}

function completePublicWeaponMasteryReselectionRoute(input: {
  readonly classUnitId: string;
  readonly featureUnitId: string;
  readonly selectedWeaponUnitIds: WeaponMasteryRouteWeaponUnitIds;
  readonly reselectedWeaponUnitIds: WeaponMasteryRouteWeaponUnitIds;
  readonly expectedTag: "accepted" | "rejected";
}): RouteAppender {
  return (route) => {
    const sheet = weaponMasteryRouteSheet(input);
    const rest = requireRight(
      startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
    );
    const completion = requireRight(
      finishLongRest({ rest, restedTicks: rest.requiredRestTicks }),
    );
    const reselection = {
      featureUnitId: authoredUnitId(input.featureUnitId),
      selectedWeaponUnitIds: authoredNonEmptyUnitIds(
        input.reselectedWeaponUnitIds,
      ),
    } satisfies CharacterSheetWeaponMasteryReselection;
    const projected = completeLongRestWeaponMasteryReselectionWithRoute({
      completion,
      unitLibrary,
      weaponMasteryReselections: [reselection],
    });
    expect(projected.tag).toBe(input.expectedTag);
    if (projected.tag === "accepted") {
      const projection = requireRight(
        characterSheetWeaponMasterySelectedReferenceProjection({
          sheet: projected.sheet,
          unitLibrary,
          featureUnitId: authoredUnitId(input.featureUnitId),
        }),
      );
      expect(projection.selectedWeaponUnitIds).toEqual(
        input.reselectedWeaponUnitIds,
      );
    }
    return [...route, ...projected.qRoute];
  };
}

function weaponMasteryRouteSheet(input: {
  readonly classUnitId: string;
  readonly featureUnitId: string;
  readonly selectedWeaponUnitIds: WeaponMasteryRouteWeaponUnitIds;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(`character:route-${input.featureUnitId}`),
      build: {
        ...baseBuild({ startingClass: input.classUnitId }),
        features: input.selectedWeaponUnitIds.map((unitId) => ({
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId(input.featureUnitId),
          unitId: authoredUnitId(unitId),
        })),
      },
      currentHp: Hp(8),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function expectWeaponMasterySelectionProjection(
  projection: CharacterSheetWeaponMasterySelectedReferenceProjection,
  expected: {
    readonly classUnitId: string;
    readonly featureUnitId: string;
    readonly selectedWeaponUnitIds: WeaponMasteryRouteWeaponUnitIds;
    readonly expectedChoiceCount: number;
    readonly expectedLongRestChangeCount: number;
  },
): void {
  expect(projection.classUnitId).toBe(expected.classUnitId);
  expect(projection.featureUnitId).toBe(expected.featureUnitId);
  expect(projection.selectedWeaponUnitIds).toEqual(
    expected.selectedWeaponUnitIds,
  );
  expect(projection.choiceCount).toBe(expected.expectedChoiceCount);
  expect(projection.longRestChangeCount).toBe(
    expected.expectedLongRestChangeCount,
  );
  for (const selectedWeaponUnitId of expected.selectedWeaponUnitIds) {
    expect(projection.eligibleWeaponUnitIds).toContain(selectedWeaponUnitId);
  }
}

function createCharacterSheet(
  owner: CharacterSheetRouteOwner,
): CharacterSheetRouteEvent {
  return { kind: "createCharacterSheet", owner };
}

function projectCharacterSheetFacts(input: {
  readonly subject: CharacterSheetRouteSubject;
  readonly owner: CharacterSheetRouteOwner;
}): CharacterSheetRouteEvent {
  return {
    kind: "projectCharacterSheetFacts",
    subject: input.subject,
    owner: input.owner,
  };
}

function retainCharacterSheetSelectedReferences(input: {
  readonly subject: CharacterSheetRouteSubject;
  readonly owner: CharacterSheetRouteOwner;
}): CharacterSheetRouteEvent {
  return {
    kind: "retainCharacterSheetSelectedReferences",
    subject: input.subject,
    owner: input.owner,
  };
}

function resolveCharacterSheetSubject(input: {
  readonly subject: CharacterSheetRouteSubject;
  readonly fill: CharacterSheetRouteFill;
  readonly holes: readonly CharacterSheetRouteHole[];
  readonly owner: CharacterSheetRouteOwner;
}): CharacterSheetRouteEvent {
  return {
    kind: "resolveCharacterSheetSubject",
    subject: input.subject,
    fill: input.fill,
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function completeCharacterSheetRest(input: {
  readonly subject: CharacterSheetRouteSubject;
  readonly fill: CharacterSheetRouteFill;
  readonly holes: readonly CharacterSheetRouteHole[];
  readonly owner: CharacterSheetRouteOwner;
}): CharacterSheetRouteEvent {
  return {
    kind: "completeCharacterSheetRest",
    subject: input.subject,
    fill: input.fill,
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function recordCharacterSheetFacts(input: {
  readonly subject: CharacterSheetRouteSubject;
  readonly facts: readonly CharacterSheetRouteFact[];
  readonly owner: CharacterSheetRouteOwner;
}): CharacterSheetRouteEvent {
  return {
    kind: "recordCharacterSheetFacts",
    subject: input.subject,
    facts: uniqueSorted(input.facts),
    owner: input.owner,
  };
}

function indexedActionEntries<const Schema extends RouteDriverSchema>(
  _schema: Schema,
  entries: readonly (readonly [keyof Schema, RouteAppender])[],
): IndexedRouteActionMap<Schema> {
  const out: Partial<
    Record<
      keyof Schema,
      { readonly replayIndex: number; readonly append: RouteAppender }
    >
  > = {};
  entries.forEach(([actionName, append], replayIndex) => {
    out[actionName] = { replayIndex, append };
  });
  return out;
}

function createReadyRouteDriver<const Schema extends RouteDriverSchema>(
  schema: Schema,
  actionRoutes: ReadyRouteActionMap<Schema>,
) {
  return defineDriver(schema, () => {
    let ready = true;
    let route = initialCharacterSheetRoute();
    const handlers: Partial<Record<keyof Schema, () => void>> = {};

    for (const actionName of Object.keys(schema) as Array<keyof Schema>) {
      if (actionName === "init") {
        handlers[actionName] = () => {
          ready = true;
          route = initialCharacterSheetRoute();
        };
        continue;
      }
      if (actionName === "step") {
        handlers[actionName] = () => {};
        continue;
      }
      const routeForAction = actionRoutes[actionName];
      handlers[actionName] =
        routeForAction === undefined
          ? () => {}
          : () => {
              if (!ready) return;
              route = routeForAction(route);
              ready = false;
            };
    }

    return {
      ...(handlers as Record<keyof Schema, () => void>),
      getState: (): RouteProjection => ({ route }),
    };
  });
}

function createIndexedRouteDriver<const Schema extends RouteDriverSchema>(
  schema: Schema,
  actionRoutes: IndexedRouteActionMap<Schema>,
) {
  return defineDriver(schema, () => {
    let replayIndex = 0;
    let route = initialCharacterSheetRoute();
    const handlers: Partial<Record<keyof Schema, () => void>> = {};

    for (const actionName of Object.keys(schema) as Array<keyof Schema>) {
      if (actionName === "init") {
        handlers[actionName] = () => {
          replayIndex = 0;
          route = initialCharacterSheetRoute();
        };
        continue;
      }
      if (actionName === "step") {
        handlers[actionName] = () => {};
        continue;
      }
      const routeForAction = actionRoutes[actionName];
      handlers[actionName] =
        routeForAction === undefined
          ? () => {}
          : () => {
              if (replayIndex !== routeForAction.replayIndex) return;
              route = routeForAction.append(route);
              replayIndex += 1;
            };
    }

    return {
      ...(handlers as Record<keyof Schema, () => void>),
      getState: (): RouteProjection => ({ route }),
    };
  });
}

async function runRouteMbt<Actions extends SimpleActionMap>(input: {
  readonly specFileName: string;
  readonly driver: () => SimpleDriver<RouteProjection, Actions>;
  readonly maxSteps: number;
}): Promise<void> {
  await run({
    spec: path.resolve(import.meta.dirname, "..", input.specFileName),
    init: "init",
    step: "step",
    driver: input.driver,
    backend: "typescript",
    nTraces: mbtTraceCount(),
    maxSteps: input.maxSteps,
    stateCheck: routeStateCheck,
  });
}

function mbtTraceCount(): number {
  return numberFromEnv("MBT_TRACES", 1);
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requireRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isRight(result)) return result.right;
  const left = result.left;
  if (
    left !== null &&
    typeof left === "object" &&
    "message" in left &&
    typeof left.message === "string"
  ) {
    throw new Error(left.message);
  }
  throw new Error(JSON.stringify(left));
}

function normalizeCharacterSheetRouteQuintState(raw: unknown): RouteProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  return {
    route: decodeCharacterSheetRoute(quintField(state, "qRoute")),
  };
}

function decodeCharacterSheetRoute(
  raw: unknown,
): readonly CharacterSheetRouteEvent[] {
  return quintList(raw, "qRoute").map(decodeCharacterSheetRouteEvent);
}

function decodeCharacterSheetRouteEvent(
  raw: unknown,
): CharacterSheetRouteEvent {
  const tag = quintVariantTag(raw, "qRoute[]");
  if (tag === "RouteCreateCharacterSheet") {
    const payload = routePayload(raw, tag);
    return createCharacterSheet(routeOwner(quintField(payload, "owner")));
  }
  if (tag === "RouteProjectCharacterSheetFacts") {
    const payload = routePayload(raw, tag);
    return projectCharacterSheetFacts({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteRetainCharacterSheetSelectedReferences") {
    const payload = routePayload(raw, tag);
    return retainCharacterSheetSelectedReferences({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteResolveCharacterSheetSubject") {
    const payload = routePayload(raw, tag);
    return resolveCharacterSheetSubject({
      subject: routeSubject(quintField(payload, "subject")),
      fill: routeFill(quintField(payload, "fill")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteCompleteCharacterSheetRest") {
    const payload = routePayload(raw, tag);
    return completeCharacterSheetRest({
      subject: routeSubject(quintField(payload, "subject")),
      fill: routeFill(quintField(payload, "fill")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteRecordCharacterSheetFacts") {
    const payload = routePayload(raw, tag);
    return recordCharacterSheetFacts({
      subject: routeSubject(quintField(payload, "subject")),
      facts: routeFacts(quintField(payload, "facts")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  throw new Error(`Unknown character-sheet route event: ${tag}.`);
}

function routePayload(
  raw: unknown,
  expectedTag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, expectedTag, "qRoute[]");
  if (isRecord(value)) return value;
  throw new Error(`Expected character-sheet route ${expectedTag} payload.`);
}

function routeSubject(raw: unknown): CharacterSheetRouteSubject {
  return mappedVariant(raw, SUBJECT_BY_TAG, "character-sheet route subject");
}

function routeOwner(raw: unknown): CharacterSheetRouteOwner {
  return mappedVariant(raw, OWNER_BY_TAG, "character-sheet route owner");
}

function routeFact(raw: unknown): CharacterSheetRouteFact {
  return mappedVariant(raw, FACT_BY_TAG, "character-sheet route fact");
}

function routeFacts(raw: unknown): readonly CharacterSheetRouteFact[] {
  return uniqueSorted(quintSet(raw, "qRoute[].facts").map(routeFact));
}

function routeHole(raw: unknown): CharacterSheetRouteHole {
  return mappedVariant(raw, HOLE_BY_TAG, "character-sheet route hole");
}

function routeHoles(raw: unknown): readonly CharacterSheetRouteHole[] {
  return uniqueSorted(quintSet(raw, "qRoute[].holes").map(routeHole));
}

function routeFill(raw: unknown): CharacterSheetRouteFill {
  return mappedVariant(raw, FILL_BY_TAG, "character-sheet route fill");
}

function mappedVariant<
  const Value extends string,
  const Mapping extends Readonly<Record<string, Value>>,
>(raw: unknown, mapping: Mapping, label: string): Value {
  const tag = quintVariantTag(raw, label);
  if (hasOwnKey(mapping, tag)) {
    return mapping[tag];
  }
  throw new Error(`Unknown ${label}: ${tag}.`);
}

function hasOwnKey<T extends object>(
  value: T,
  key: PropertyKey,
): key is keyof T {
  return Object.hasOwn(value, key);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (isRecord(raw)) return raw;
  throw new Error("Expected Quint state to be an object.");
}

function quintField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  if (Object.hasOwn(state, field)) return state[field];
  throw new Error(`Expected Quint state field ${field}.`);
}

function quintRecordField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintField(state, field);
  if (isRecord(value)) return value;
  throw new Error(`Expected Quint state field ${field} to be a record.`);
}

function quintList(raw: unknown, field: string): readonly unknown[] {
  if (Array.isArray(raw)) return raw;
  throw new Error(`Expected Quint list field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error(`Expected Quint set field ${field}.`);
}

function quintVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  throw new Error(`Expected Quint variant tag field ${field}.`);
}

function quintVariantValue(
  raw: unknown,
  expectedTag: string,
  field: string,
): unknown {
  if (
    isRecord(raw) &&
    raw["tag"] === expectedTag &&
    Object.hasOwn(raw, "value")
  ) {
    return raw["value"];
  }
  throw new Error(
    `Expected Quint ${expectedTag} variant value field ${field}.`,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
