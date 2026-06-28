import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { SimpleActionMap, SimpleDriver } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

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
} as const;
type CharacterSheetRouteSubject =
  (typeof SUBJECT_BY_TAG)[keyof typeof SUBJECT_BY_TAG];

const HOLE_BY_TAG = {
  SheetHitDiceSpendHoleFamily: "hitDiceSpend",
  SheetRestBenefitChoiceHoleFamily: "restBenefitChoice",
  SheetResourceSpendHoleFamily: "resourceSpend",
  SheetRecoveryChoiceHoleFamily: "recoveryChoice",
  SheetProjectionChoiceHoleFamily: "projectionChoice",
} as const;
type CharacterSheetRouteHole =
  (typeof HOLE_BY_TAG)[keyof typeof HOLE_BY_TAG];

const FILL_BY_TAG = {
  SheetHitDiceSpendFill: "hitDiceSpend",
  SheetRestDurationFill: "restDuration",
  SheetResourceSpendFill: "resourceSpend",
  SheetRecoverySelectionFill: "recoverySelection",
  SheetProjectionSelectionFill: "projectionSelection",
} as const;
type CharacterSheetRouteFill =
  (typeof FILL_BY_TAG)[keyof typeof FILL_BY_TAG];

const OWNER_BY_TAG = {
  CharacterSheetStateOwner: "characterSheetState",
  CharacterSheetHitPointOwner: "hitPoint",
  CharacterSheetHitDiceOwner: "hitDice",
  CharacterSheetSpellSlotOwner: "spellSlot",
  CharacterSheetPactSlotOwner: "pactSlot",
  CharacterSheetFeatureResourceOwner: "featureResource",
  CharacterSheetBuildProjectionOwner: "buildProjection",
  CharacterSheetSelectedReferenceOwner: "selectedReference",
} as const;
type CharacterSheetRouteOwner =
  (typeof OWNER_BY_TAG)[keyof typeof OWNER_BY_TAG];
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
} as const;
type CharacterSheetRouteFact = (typeof FACT_BY_TAG)[keyof typeof FACT_BY_TAG];

const SPELL_RESOURCE_DELTA_FACTS_BY_OWNER = {
  spellSlot: ["ordinarySpellSlotDelta"],
  pactSlot: ["pactSlotDelta"],
} as const satisfies Record<
  CharacterSheetSpellResourceSlotOwner,
  readonly CharacterSheetRouteFact[]
>;

type CharacterSheetRouteEvent =
  | {
      readonly kind: "createCharacterSheet";
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "projectCharacterSheetFacts";
      readonly subject: CharacterSheetRouteSubject;
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "retainCharacterSheetSelectedReferences";
      readonly subject: CharacterSheetRouteSubject;
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "resolveCharacterSheetSubject";
      readonly subject: CharacterSheetRouteSubject;
      readonly fill: CharacterSheetRouteFill;
      readonly holes: readonly CharacterSheetRouteHole[];
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "completeCharacterSheetRest";
      readonly subject: CharacterSheetRouteSubject;
      readonly fill: CharacterSheetRouteFill;
      readonly holes: readonly CharacterSheetRouteHole[];
      readonly owner: CharacterSheetRouteOwner;
    }
  | {
      readonly kind: "recordCharacterSheetFacts";
      readonly subject: CharacterSheetRouteSubject;
      readonly facts: readonly CharacterSheetRouteFact[];
      readonly owner: CharacterSheetRouteOwner;
    };

type RouteProjection = {
  readonly route: readonly CharacterSheetRouteEvent[];
};

type RouteDriverSchema = Record<string, Record<string, never>>;
type RouteAppender = (
  route: readonly CharacterSheetRouteEvent[],
) => readonly CharacterSheetRouteEvent[];
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
  it("routes Ability Check Proficiency Bonus projections through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-ability-check-proficiency-bonus.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        abilityCheckRouteDriverSchema,
        abilityCheckRouteActions,
      ),
      maxSteps: 6,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Hit Point Maximum projections through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName: "character-sheet-hit-point-maximum.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        hitPointMaximumRouteDriverSchema,
        hitPointMaximumRouteActions,
      ),
      maxSteps: 6,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Armor Class selected-reference projections through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-armor-class-base-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        armorClassRouteDriverSchema,
        armorClassRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes in-scope class-feature selected references through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-class-feature-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        classFeatureSelectedReferenceRouteDriverSchema,
        classFeatureSelectedReferenceRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes healing resource spending through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-healing-resource-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        healingResourceRouteDriverSchema,
        healingResourceRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes in-scope Arcane Recovery state through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-arcane-recovery-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        arcaneRecoveryRouteDriverSchema,
        arcaneRecoveryRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes HP rest and Hit Dice transitions through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName: "character-sheet-hp-rest-hit-dice.route.mbt.qnt",
      driver: createIndexedRouteDriver(
        hpRestHitDiceRouteDriverSchema,
        hpRestHitDiceRouteActions,
      ),
      maxSteps: 13,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes in-scope Spell Slot and Pact Slot transitions through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName: "character-sheet-spell-slots-pact-slots.route.mbt.qnt",
      driver: createReadyRouteDriver(
        spellResourceRouteDriverSchema,
        spellResourceRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes spellbook Ritual selected references through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        spellbookRitualRouteDriverSchema,
        spellbookRitualRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Weapon Mastery selected weapon refs through the sheet reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt",
      driver: createReadyRouteDriver(
        weaponMasteryRouteDriverSchema,
        weaponMasteryRouteActions,
      ),
      maxSteps: 1,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

const abilityCheckRouteActions = indexedActions(
  abilityCheckRouteDriverSchema,
  [
    "doProjectJackOfAllTradesLevelTwo",
    "doProjectJackOfAllTradesRoundedDown",
    "doProjectSkillProficiency",
    "doProjectExpertise",
    "doRejectOtherProficiencyBonus",
    "doRejectMissingBardLevelTwo",
  ],
  projectAbilityCheckRoute,
);

const hitPointMaximumRouteActions = indexedActions(
  hitPointMaximumRouteDriverSchema,
  [
    "doProjectFighterLevelOne",
    "doProjectFighterLevelTwo",
    "doProjectWizardFighterMulticlass",
    "doProjectMinimumHigherLevelGain",
    "doProjectSorcererDraconicResilience",
    "doProjectReducedEffectiveMaximum",
  ],
  projectHitPointMaximumRoute,
);

const armorClassRouteActions = {
  doSelectBarbarianUnarmoredDefense: selectArmorClassBaseRoute,
  doSelectBarbarianUnarmoredDefenseWithShield: selectArmorClassBaseRoute,
  doSelectMonkUnarmoredDefense: selectArmorClassBaseRoute,
  doProjectLightArmor: selectArmorClassBaseRoute,
  doProjectMediumArmorDexCap: selectArmorClassBaseRoute,
  doProjectHeavyArmorWithShield: selectArmorClassBaseRoute,
} as const satisfies ReadyRouteActionMap<typeof armorClassRouteDriverSchema>;

const classFeatureSelectedReferenceRouteActions = {
  doProjectBardJackOfAllTrades: projectClassFeatureSelectedReferenceRoute,
  doProjectClericLifeDomainSpells: projectClassFeatureSelectedReferenceRoute,
  doProjectDruidCircleLandSpells: projectClassFeatureSelectedReferenceRoute,
  doProjectPaladinOathDevotionSpells: projectClassFeatureSelectedReferenceRoute,
  doProjectPaladinsSmite: projectClassFeatureSelectedReferenceRoute,
  doProjectRangerFavoredEnemy: projectClassFeatureSelectedReferenceRoute,
  doProjectSorcererDraconicSpells: projectClassFeatureSelectedReferenceRoute,
  doProjectWarlockFiendSpells: projectClassFeatureSelectedReferenceRoute,
} as const satisfies ReadyRouteActionMap<
  typeof classFeatureSelectedReferenceRouteDriverSchema
>;

const healingResourceRouteActions = {
  doLayOnHandsRestoreHpAndRemovePoisoned: spendHealingResourceRoute,
} as const satisfies ReadyRouteActionMap<typeof healingResourceRouteDriverSchema>;

const arcaneRecoveryRouteActions = {
  doRecoverSecondLevelSpellSlot: resetArcaneRecoveryRoute,
  doResetArcaneRecoveryOnLongRest: resetArcaneRecoveryRoute,
  doRejectPactSlotArcaneRecovery: rejectPactSlotArcaneRecoveryRoute,
} as const satisfies ReadyRouteActionMap<typeof arcaneRecoveryRouteDriverSchema>;

const hpRestHitDiceRouteActions = indexedActionEntries(
  hpRestHitDiceRouteDriverSchema,
  [
    ["doRejectLongRestStartAtZeroHp", rejectRestRoute("hitPoint")],
    ["doRejectLongRestBeforeSixteenHourWait", rejectRestRoute("characterSheetState")],
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
    ["doRejectShortRestDurationTooShort", rejectRestRoute("characterSheetState")],
    ["doRejectLongRestDurationTooShort", rejectRestRoute("characterSheetState")],
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
  doRejectMagicalCunningWithoutExpendedPactSlots:
    rejectPactSlotRecoveryRoute,
  doRejectArcaneRecoveryPactSlotRefund: rejectPactSlotRecoveryRoute,
} as const satisfies ReadyRouteActionMap<typeof spellResourceRouteDriverSchema>;

const spellbookRitualRouteActions = {
  doInvokeSpellbookRitual: spellbookRitualRoute([]),
  doRejectPreparedOnlyRitual: spellbookRitualRoute(["projectionChoice"]),
  doRejectNonRitualSpellbookSpell: spellbookRitualRoute(["projectionChoice"]),
  doRejectMissingRitualAccessFeature: spellbookRitualRoute(["projectionChoice"]),
  doRejectNonLeveledRitualSpellbookSpell:
    spellbookRitualRoute(["projectionChoice"]),
} as const satisfies ReadyRouteActionMap<typeof spellbookRitualRouteDriverSchema>;

const weaponMasteryRouteActions = {
  doSelectPaladinWeaponMastery: retainWeaponMasteryRoute,
  doReselectPaladinWeaponMasteryOnLongRest: reselectWeaponMasteryOnRestRoute,
  doSelectRangerWeaponMastery: retainWeaponMasteryRoute,
  doReselectRangerWeaponMasteryOnLongRest: reselectWeaponMasteryOnRestRoute,
  doSelectRogueWeaponMastery: retainWeaponMasteryRoute,
  doReselectRogueWeaponMasteryOnLongRest: reselectWeaponMasteryOnRestRoute,
  doAcceptOneChangeWeaponMasteryReselection: reselectWeaponMasteryOnRestRoute,
  doRejectTooManyChangesWeaponMasteryReselection:
    rejectWeaponMasteryReselectionRoute,
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

function projectAbilityCheckRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetFacts({
      subject: "abilityCheckProjection",
      owner: "buildProjection",
    }),
  ];
}

function projectHitPointMaximumRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    projectCharacterSheetFacts({
      subject: "hitPoint",
      owner: "hitPoint",
    }),
    recordCharacterSheetFacts({
      subject: "hitPoint",
      facts: ["hitPointMaximumArithmeticInput"],
      owner: "buildProjection",
    }),
  ];
}

function selectArmorClassBaseRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    retainCharacterSheetSelectedReferences({
      subject: "selectedReferenceProjection",
      owner: "selectedReference",
    }),
    projectCharacterSheetFacts({
      subject: "armorClassProjection",
      owner: "buildProjection",
    }),
  ];
}

function projectClassFeatureSelectedReferenceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    retainCharacterSheetSelectedReferences({
      subject: "selectedReferenceProjection",
      owner: "selectedReference",
    }),
    projectCharacterSheetFacts({
      subject: "selectedReferenceProjection",
      owner: "buildProjection",
    }),
  ];
}

function spendHealingResourceRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "featureResource",
      fill: "resourceSpend",
      holes: [],
      owner: "featureResource",
    }),
    projectCharacterSheetFacts({ subject: "hitPoint", owner: "hitPoint" }),
    recordCharacterSheetFacts({
      subject: "featureResource",
      facts: ["featureResourceSpend"],
      owner: "featureResource",
    }),
  ];
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
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "spellResource",
      fill: "recoverySelection",
      holes: ["recoveryChoice"],
      owner: "pactSlot",
    }),
  ];
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

function spellbookRitualRoute(
  holes: readonly CharacterSheetRouteHole[],
): RouteAppender {
  return (route) => [
    ...route,
    retainCharacterSheetSelectedReferences({
      subject: "selectedReferenceProjection",
      owner: "selectedReference",
    }),
    resolveCharacterSheetSubject({
      subject: "spellResource",
      fill: "projectionSelection",
      holes,
      owner: "selectedReference",
    }),
  ];
}

function retainWeaponMasteryRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    retainCharacterSheetSelectedReferences({
      subject: "selectedReferenceProjection",
      owner: "selectedReference",
    }),
  ];
}

function reselectWeaponMasteryOnRestRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...retainWeaponMasteryRoute(route),
    completeCharacterSheetRest({
      subject: "selectedReferenceProjection",
      fill: "projectionSelection",
      holes: [],
      owner: "selectedReference",
    }),
  ];
}

function rejectWeaponMasteryReselectionRoute(
  route: readonly CharacterSheetRouteEvent[],
): readonly CharacterSheetRouteEvent[] {
  return [
    ...route,
    resolveCharacterSheetSubject({
      subject: "selectedReferenceProjection",
      fill: "projectionSelection",
      holes: ["projectionChoice"],
      owner: "selectedReference",
    }),
  ];
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

function indexedActions<const Schema extends RouteDriverSchema>(
  schema: Schema,
  actionNames: readonly (keyof Schema)[],
  append: RouteAppender,
): IndexedRouteActionMap<Schema> {
  return indexedActionEntries(
    schema,
    actionNames.map((actionName) => [actionName, append] as const),
  );
}

function indexedActionEntries<const Schema extends RouteDriverSchema>(
  _schema: Schema,
  entries: readonly (readonly [keyof Schema, RouteAppender])[],
): IndexedRouteActionMap<Schema> {
  const out: Partial<
    Record<keyof Schema, { readonly replayIndex: number; readonly append: RouteAppender }>
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
>(
  raw: unknown,
  mapping: Mapping,
  label: string,
): Value {
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
  throw new Error(`Expected Quint ${expectedTag} variant value field ${field}.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
