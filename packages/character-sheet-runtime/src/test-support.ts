import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  abilityScoreAssignment,
  characterBuildSorcererMetamagicFacts,
  characterBuildResources,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  DRUID_WILD_SHAPE_UNIT_ID,
  eldritchInvocationId,
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

import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetArmorClassState,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  characterSheetCurrentHp,
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitDice,
  characterSheetHitPointMaximum as characterSheetHitPointMaximumCore,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
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

export {
  abilityScoreAssignment,
  characterBuildSorcererMetamagicFacts,
  characterBuildResources,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  currentArmorClass,
  DRUID_WILD_SHAPE_UNIT_ID,
  DieRollResult,
  Either,
  eldritchInvocationId,
  elapsedTimeTicks,
  Hp,
  MONK_MARTIAL_ARTS_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  MONK_UNCANNY_METABOLISM_UNIT_ID,
  Option,
  resourceCount,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  SORCERER_METAMAGIC_UNIT_ID,
  sorcererMetamagicOptionId,
  spellSlotLevel,
  timeSpanDuration,
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  applyCharacterSheetSpellRestBenefit,
  applyLayOnHands,
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetArmorClassState,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  characterSheetCurrentHp,
  characterSheetDruidCircleLandPreparedSpellAccess,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitDice,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
  characterSheetLongRestCalendarGate,
  characterSheetMonkUncannyMetabolismUseState,
  characterSheetMonksFocusSaveDc,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellInvocation,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  completeMagicalCunningRite,
  convertFontOfMagicSpellSlotToSorceryPoints,
  convertFontOfMagicSorceryPointsToSpellSlot,
  finishLongRest,
  finishShortRest,
  characterSheetId,
  characterSheetTempHp,
  parseCharacterSheet,
  startLongRest,
  startShortRest,
  timePassed,
  useMonkUncannyMetabolismWhenRollingInitiative,
};

export type {
  CharacterBuild,
  ElapsedTimeTicks,
  UnitCatalog,
  SpellRecord,
  UnitRecord,
  CharacterSheet,
  CharacterSheetInput,
  CharacterSheetLongRestInput,
  CharacterSheetLongRestInterruption,
  CharacterSheetLongRestStartTiming,
  CharacterSheetShortRestInterruption,
  CharacterSheetShortRestInput,
  CharacterSheetWeaponMasteryReselection,
};

export const build = armorClassBuild({ startingClass: "class_fighter" });

export const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet runtime test Unit catalog must build.");
}
export const unitLibrary = unitCatalogResult.catalog;
export const SRD_SORCERY_POINTS_POOL_ID = "sorcery_points";

export function characterSheetHitPointMaximum(sheet: CharacterSheet) {
  return requireRight(
    characterSheetHitPointMaximumCore({
      sheet,
      unitLibrary,
    }),
  );
}

export const layOnHandsSpendsHealingPoolTestName =
  "Lay On Hands spends one healing pool for HP restoration and Poisoned removal";
export const layOnHandsRejectsDivergentPoolsTestName =
  "Lay On Hands cannot split HP and Poisoned costs across divergent pools";
export const layOnHandsLongRestRecoveryTestName =
  "Long Rest restores the Lay On Hands healing pool";
export const ritualAdeptAdmitsSpellbookRitualTestName =
  "admits Wizard Ritual Adept for a ritual-tagged Spell Definition in the spellbook";
export const ritualAdeptRejectsPreparedOnlySpellTestName =
  "rejects Wizard Ritual Adept when a ritual spell is prepared but absent from the spellbook";
export const ritualAdeptRejectsNonRitualSpellTestName =
  "rejects Wizard Ritual Adept for a spellbook spell without the Ritual tag";
export const ritualAdeptRejectsMissingFeatureTestName =
  "rejects spellbook ritual invocation without a spellbook Ritual Access feature";
export const weaponMasteryLongRestReselectionTestName =
  "Long Rest reselects Weapon Mastery choices from Surface feature eligibility";
export const jackOfAllTradesAddsHalfProficiencyBonusTestName =
  "Jack of All Trades adds half Proficiency Bonus to an unproficient skill Ability Check";
export const skillProficiencyOverridesJackOfAllTradesTestName =
  "skill proficiency and Expertise determine the Ability Check Proficiency Bonus before Jack of All Trades";
export const jackOfAllTradesRequiresNoOtherProficiencyBonusTestName =
  "Jack of All Trades does not apply when another Proficiency Bonus applies";
export const jackOfAllTradesRequiresBardLevelTwoFeatureTestName =
  "Jack of All Trades requires the Bard level 2 feature grant";
export const druidWildShapeShortRestRecoveryTestName =
  "Short Rest partially restores the Druid Wild Shape use pool";
export const sorcererFontOfMagicLongRestRecoveryTestName =
  "Long Rest restores the Sorcerer Font of Magic Sorcery Point pool";
export const sorcererSorcerousRestorationShortRestRecoveryTestName =
  "Sorcerous Restoration recovers Sorcery Points on Short Rest once per Long Rest";
export const sorcererFontOfMagicSlotConversionTestName =
  "Font of Magic converts an ordinary Spell Slot into Sorcery Points";
export const sorcererFontOfMagicSlotConversionGateTestName =
  "Font of Magic Spell Slot conversion respects Spell Slot and Sorcery Point gates";
export const sorcererFontOfMagicSlotCreationTestName =
  "Font of Magic creates Spell Slots from Sorcery Points";
export const sorcererFontOfMagicSlotCreationGateTestName =
  "Font of Magic Spell Slot creation enforces Sorcery Point and level gates";
export const sorcererMetamagicKnownOptionsSheetParsingTestName =
  "round-trips stored Sorcerer Metamagic known options through sheet parsing";
export const sorcererMetamagicKnownOptionsGateTestName =
  "rejects stored Sorcerer Metamagic selections that do not match Sorcerer level";
export const uncannyMetabolismLongRestUseStateTestName =
  "tracks Uncanny Metabolism Long Rest use state separately from Focus Points";
export const uncannyMetabolismInitiativeRecoveryTestName =
  "uses Uncanny Metabolism when rolling Initiative to recover Focus Points and restore HP";
export const uncannyMetabolismInitiativeGatesTestName =
  "rejects Uncanny Metabolism Initiative use outside its die and Long Rest gates";
export const uncannyMetabolismRejectsUnownedUseStateTestName =
  "rejects Uncanny Metabolism use state without the retained Monk feature";
export const prayerOfHealingRestBenefitApplicationTestName =
  "Prayer of Healing spends its Spell Slot at completion and grants recipient Short Rest benefits, healing, and Long Rest lockout";
export const prayerOfHealingRestBenefitAdmissionGateTestName =
  "Prayer of Healing rest benefit rejects unsupported Surface spell shapes";
export const prayerOfHealingStoredLockoutGateTestName =
  "rejects stored Prayer of Healing recipient lockouts for unknown or unsupported spell ids";
export const subclassPreparedSpellAccessBlocksBookOfShadowsDuplicateTestName =
  "subclass always-prepared Spell Access blocks duplicate Book of Shadows selections";
export const subclassPreparedSpellAccessProgressionTestName =
  "projects subclass always-prepared Spell Access from class-level tiers";
export const druidCircleLandSpellAccessProjectionTestName =
  "projects Circle of the Land prepared Spell Access from selected land state and Druid level";
export const druidCircleLandSpellAccessSelectedLandGateTestName =
  "requires Circle of the Land selected land state before projecting prepared Spell Access";
export const druidCircleLandSpellcastingSourceGateTestName =
  "rejects Circle of the Land selected land without Druid spellcasting source";
export const druidCircleLandSpellAccessBookOfShadowsDuplicateTestName =
  "Circle of the Land prepared Spell Access blocks duplicate Book of Shadows selections";
export const draconicResilienceArmorClassProjectionTestName =
  "derives Draconic Resilience Armor Class from Dexterity and Charisma while unarmored";
export const secondStoryWorkProjectionTestName =
  "derives Second-Story Work linked Climb Speed and jump-distance ability";
export const primalKnowledgeAbilitySubstitutionProjectionTestName =
  "Primal Knowledge offers Strength for listed Ability Checks only while Rage is active";
export const druidWildShapeFixtureKnownFormStatBlockIds = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
] as const;

type CharacterSheetTestInput = Omit<
  CharacterSheetInput,
  "conditions" | "hitPointMaximumReduction" | "spellSlotExpenditures"
> &
  Partial<
    Pick<
      CharacterSheetInput,
      "conditions" | "hitPointMaximumReduction" | "spellSlotExpenditures"
    >
  >;

export function createFreshCharacterSheet(input: CharacterSheetTestInput) {
  return createFreshCharacterSheetCore({
    conditions: [],
    hitPointMaximumReduction: Hp(0),
    ...input,
  });
}

export function completeShortRest(
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

export function completeLongRest(
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

export function interruptShortRest(input: {
  readonly sheet: CharacterSheet;
  readonly interruption: CharacterSheetShortRestInterruption;
}) {
  return interruptShortRestCore({
    rest: requireRight(startShortRest({ sheet: input.sheet })),
    interruption: input.interruption,
  });
}

export function interruptLongRest(
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

export function stableSheet(characterIdText: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterIdText),
      build,
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

export function spellbookRitualSheet(input: {
  readonly characterIdText: string;
  readonly spellbook: readonly string[];
  readonly preparedSpells?: readonly string[];
  readonly startingClass?: string;
  readonly spellcastingSourceUnitId?: string;
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
              sourceUnitId: input.spellcastingSourceUnitId ?? "class_wizard",
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
      currentHp: Hp(8),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}

export function storedAvailableSheetInput(input: {
  readonly characterId: string;
  readonly build: unknown;
}) {
  return {
    tag: "available",
    characterId: input.characterId,
    build: input.build,
    hitPointMaximumReduction: 0,
    hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 },
    conditions: [],
    spentHitDice: [],
    resourceExpenditures: [],
    heroicInspiration: CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  };
}

export type ActivationSpellMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>;
export type DirectSpellPhase = Extract<
  ActivationSpellMechanics["phases"][number],
  { readonly kind: "direct" }
>;
export type PrayerOfHealingDirectPhase = DirectSpellPhase & {
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

export function prayerOfHealingUnitLibraryWith(
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

export function replacePrayerOfHealingDirectPhase(
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

export function prayerOfHealingDirectPhase(
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

export function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

export function weaponMasteryBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly featureUnitId: string;
  readonly selectedWeaponUnitIds: readonly string[];
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: input.startingClass,
      ...(input.advancements === undefined
        ? {}
        : { advancements: input.advancements }),
    }),
    features: input.selectedWeaponUnitIds.map((unitId) => ({
      kind: "selectedClassChoice" as const,
      selectedFromUnitId: input.featureUnitId,
      unitId,
    })),
  };
}

export function selectedClassChoiceUnitIds(
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

export function bardJackOfAllTradesBuild(input: {
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

export function druidLanguageBuild(): CharacterBuild {
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

export function druidCircleLandBuild(input: {
  readonly druidLevel: number;
}): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_druid",
      advancements: Array.from(
        { length: input.druidLevel - 1 },
        () => "class_druid",
      ),
    }),
    classFeatureLanguages: [
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "druid_druidic",
        language: "Druidic",
      },
    ],
    features: [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "class_druid",
        unitId: "subclass_druid_circle_of_the_land",
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_druid",
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

export function druidWarlockCircleLandBookBuild(): CharacterBuild {
  return {
    ...druidCircleLandBuild({ druidLevel: 3 }),
    features: [
      ...druidCircleLandBuild({ druidLevel: 3 }).features,
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: "warlock_eldritch_invocations",
        selection: {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("pact_of_the_tome"),
        },
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_druid",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
          bookOfShadows: {
            tag: "bookOfShadows",
            cantrips: ["fire_bolt", "minor_illusion", "spare_the_dying"],
            ritualSpells: ["detect_magic", "detect_poison_and_disease"],
            spellcastingFocus: "book_of_shadows",
          },
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 4 }],
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

export function rogueLanguageBuild(
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

export function armorClassBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
  readonly armor?: string;
  readonly shield?: boolean;
  readonly features?: CharacterBuild["features"];
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
    features: input.features ?? [],
    equipment: {
      owned: [
        ...(armorItemId === undefined || input.armor === undefined
          ? []
          : [{ itemId: armorItemId, unitId: input.armor, quantity: 1 }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield", quantity: 1 }]),
      ],
      loadout: {
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

export function sorcererFontOfMagicBuild(
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

export function testSorcererMetamagicOptionId(optionId: string) {
  return requireRight(sorcererMetamagicOptionId(optionId));
}

export function warlockSpellcastingWithCantrips(
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

export function warlockMagicalCunningBuild(input: {
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

export function wizardBuild(input: {
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

export function wizardWarlockBuild(): CharacterBuild {
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

export function prayerOfHealingClericBuild(): CharacterBuild {
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

export function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
