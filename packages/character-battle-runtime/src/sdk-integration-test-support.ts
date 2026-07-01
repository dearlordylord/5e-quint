import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SpellSlotProcedure,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterBuildHitPoints,
  characterDraftId,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  choiceCardinalityBounds,
  classUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  progressionOptionId,
  sorcererMetamagicOptionId,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterDraftChoicePath,
  type CharacterProgression,
  type CreationBatchFillResult,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationFinalizationResult,
  type CreationHole,
  type ChoiceCreationHoleSource,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { characterSheetBattleInit } from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("SDK integration test catalogs must build.");
}

export const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

const partySide = battleCombatantSide("party");
const monsterSide = battleCombatantSide("monsters");

type CharacterCombatantState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};
type CastActionSpellSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> & {
  readonly mode: { readonly tag: "cast" };
};
type CastActionSpellAct = AvailableBattleAct & {
  readonly subject: CastActionSpellSubject;
};

type SheetFixture = {
  readonly sheet: CharacterSheet;
  readonly combatantId: CombatantId;
  readonly initiative: number;
};

export function battleFromSheets(input: {
  readonly battleIdText: string;
  readonly characters: readonly SheetFixture[];
  readonly monsters: readonly Parameters<
    typeof battleCreatureInitFromStatBlock
  >[0][];
}): BattleState {
  const characterInits = input.characters.map((character) =>
    requireRight(
      characterSheetBattleInit({
        sheet: character.sheet,
        combatantId: character.combatantId,
        displayName: character.sheet.characterId,
        initiative: initiativeScore(character.initiative),
        side: partySide,
        unitLibrary,
        statBlockCatalog,
      }),
    ),
  );
  return requireRight(
    startBattle({
      battleId: battleId(input.battleIdText),
      combatants: [
        ...characterInits,
        ...input.monsters.map((monster) =>
          battleCreatureInitFromStatBlock(monster),
        ),
      ],
    }),
  );
}

export function characterSheet(input: {
  readonly characterIdText: string;
  readonly combatantId: CombatantId;
  readonly build: CharacterBuild;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
}): SheetFixture {
  return {
    combatantId: input.combatantId,
    initiative: input.initiative,
    sheet: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(input.characterIdText),
        build: input.build,
        hitPointMaximumReduction: Hp(0),
        ...(input.currentHp === undefined
          ? {}
          : { currentHp: Hp(input.currentHp) }),
        tempHp: Hp(0),
        conditions: [],
        unitLibrary,
        ...(input.resourceExpenditures === undefined
          ? {}
          : { resourceExpenditures: input.resourceExpenditures }),
      }),
    ),
  };
}

export type LegalSourceCharacterLevel = 1 | 2;

export type LegalSourceChoicePreference =
  | {
      readonly tag: "specific";
      readonly source: ChoiceCreationHoleSource;
      readonly optionIds: readonly [
        CreationChoiceOptionId,
        ...CreationChoiceOptionId[],
      ];
    }
  | {
      readonly tag: "anyAvailable";
      readonly source: ChoiceCreationHoleSource;
    };

export type LegalSourceCharacterDraftPlan = {
  readonly label: string;
  readonly classUnitId: UnitRecord["id"];
  readonly level: LegalSourceCharacterLevel;
  readonly backgroundUnitId: UnitRecord["id"];
  readonly speciesUnitId: UnitRecord["id"];
  readonly languageOptionIds: readonly [string, string];
  readonly alignmentOptionId: string;
  readonly abilityScores: Parameters<typeof abilityScoreAssignment>[0];
  readonly sourcePreferences: readonly LegalSourceChoicePreference[];
};

export type LegalSourceSheetHitPoints =
  | { readonly tag: "maximum" }
  | { readonly tag: "current"; readonly currentHp: number };

export type LegalSourceBattlePlan =
  | { readonly tag: "withoutBattle" }
  | {
      readonly tag: "withBattle";
      readonly battleIdText: string;
      readonly combatantId: CombatantId;
      readonly initiative: number;
      readonly monsters: readonly Parameters<
        typeof battleCreatureInitFromStatBlock
      >[0][];
    };

export type LegalSourceCharacterFixtureInput = {
  readonly draftIdText: string;
  readonly draftPlan: LegalSourceCharacterDraftPlan;
  readonly sheet: {
    readonly characterIdText: string;
    readonly hitPoints: LegalSourceSheetHitPoints;
    readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
  };
  readonly battle: LegalSourceBattlePlan;
};

export type LegalSourceCharacterFixture =
  | {
      readonly tag: "withoutBattle";
      readonly draft: CharacterDraft;
      readonly build: CharacterBuild;
      readonly sheet: CharacterSheet;
    }
  | {
      readonly tag: "withBattle";
      readonly draft: CharacterDraft;
      readonly build: CharacterBuild;
      readonly sheet: CharacterSheet;
      readonly state: BattleState;
      readonly combatantId: CombatantId;
    };

export type LegalSourceFinalizedCharacterDraft = {
  readonly draft: CharacterDraft;
  readonly build: CharacterBuild;
};

const legalSourceFixtureFillPassLimit = 12;

export function legalDraftChoice(
  path: CharacterDraftChoicePath,
  firstOptionId: string,
  ...restOptionIds: readonly string[]
): LegalSourceChoicePreference {
  return {
    tag: "specific",
    source: { tag: "draft", path },
    optionIds: legalSpecificOptionIds(firstOptionId, restOptionIds),
  };
}

export function legalUnitChoice(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  firstOptionId: string,
  ...restOptionIds: readonly string[]
): LegalSourceChoicePreference {
  return {
    tag: "specific",
    source: {
      tag: "unitChoice",
      unitId: requireRight(unitChoiceSourceUnitId(unitId)),
      choiceKey,
    },
    optionIds: legalSpecificOptionIds(firstOptionId, restOptionIds),
  };
}

export function legalAnyUnitChoice(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): LegalSourceChoicePreference {
  return {
    tag: "anyAvailable",
    source: {
      tag: "unitChoice",
      unitId: requireRight(unitChoiceSourceUnitId(unitId)),
      choiceKey,
    },
  };
}

export function legalLoadoutChoice(
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
  firstOptionId: string,
  ...restOptionIds: readonly string[]
): LegalSourceChoicePreference {
  return {
    tag: "specific",
    source: {
      tag: "loadout",
      equipmentUnitId: requireRight(loadoutEquipmentUnitId(equipmentUnitId)),
      slot,
    },
    optionIds: legalSpecificOptionIds(firstOptionId, restOptionIds),
  };
}

export function legalAnyLoadoutChoice(
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
): LegalSourceChoicePreference {
  return {
    tag: "anyAvailable",
    source: {
      tag: "loadout",
      equipmentUnitId: requireRight(loadoutEquipmentUnitId(equipmentUnitId)),
      slot,
    },
  };
}

export const barbarianBuildSheetDraftPlan = {
  label: "Barbarian build-sheet projection",
  classUnitId: "class_barbarian",
  level: 1,
  backgroundUnitId: "background_soldier",
  speciesUnitId: "species_orc",
  languageOptionIds: ["Dwarvish", "Goblin"],
  alignmentOptionId: "lawful_good",
  abilityScores: {
    str: 15,
    dex: 14,
    con: 13,
    int: 8,
    wis: 10,
    cha: 12,
  },
  sourcePreferences: [
    legalUnitChoice(
      "class_barbarian",
      "class_skill_proficiency_choice",
      "perception",
      "survival",
    ),
    legalUnitChoice(
      "barbarian_weapon_mastery",
      "weapon_mastery_options",
      "weapon_longsword",
      "weapon_dagger",
    ),
    legalUnitChoice(
      "background_soldier",
      "background_ability_score_increase",
      "two_and_one:str:con",
    ),
    legalUnitChoice(
      "background_soldier",
      "background_tool_choice",
      "tool_dice_set",
    ),
    legalUnitChoice("class_barbarian", "class_equipment_choice", "option_b"),
    legalUnitChoice(
      "background_soldier",
      "background_equipment_choice",
      "option_b",
    ),
    legalAnyUnitChoice("class_barbarian", "equipment_purchase"),
    legalAnyLoadoutChoice("equipment_shield", "shield"),
    legalAnyLoadoutChoice("weapon_longsword", "weapon"),
  ],
} as const satisfies LegalSourceCharacterDraftPlan;

export function createLegalSourceCharacterDraft(input: {
  readonly draftIdText: string;
}): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftIdText),
  });
}

export function finalizeLegalSourceCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly plan: LegalSourceCharacterDraftPlan;
}): LegalSourceFinalizedCharacterDraft {
  let draft = input.draft;

  for (let pass = 0; pass < legalSourceFixtureFillPassLimit; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      const result = finalizeCharacterDraft({ draft, unitLibrary });
      if (result.tag !== "ready") {
        throw new Error(
          `${input.plan.label} fixture finalization failed: ${creationFinalizationResultSummary(
            result,
          )}`,
        );
      }
      return { draft, build: result.build };
    }

    draft = requireAcceptedCreationBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) => legalSourceCreationFill(hole, input.plan)),
      }),
      input.plan.label,
    );
  }

  throw new Error(
    `${input.plan.label} fixture still has creation holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map(creationHoleSummary),
    )}`,
  );
}

export function createLegalSourceCharacterSheet(input: {
  readonly characterIdText: string;
  readonly build: CharacterBuild;
  readonly hitPoints: LegalSourceSheetHitPoints;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
}): CharacterSheet {
  const maximumHp = Number(
    requireRight(characterBuildHitPoints(input.build, unitLibrary)).maximum,
  );
  const currentHp =
    input.hitPoints.tag === "maximum" ? maximumHp : input.hitPoints.currentHp;

  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterIdText),
      build: input.build,
      currentHp: Hp(currentHp),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      ...(input.druidWildShapeKnownFormStatBlockIds === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              input.druidWildShapeKnownFormStatBlockIds,
            statBlockCatalog,
          }),
    }),
  );
}

export function startLegalSourceCharacterBattle(input: {
  readonly sheet: CharacterSheet;
  readonly battle: Extract<LegalSourceBattlePlan, { readonly tag: "withBattle" }>;
}): BattleState {
  return battleFromSheets({
    battleIdText: input.battle.battleIdText,
    characters: [
      {
        sheet: input.sheet,
        combatantId: input.battle.combatantId,
        initiative: input.battle.initiative,
      },
    ],
    monsters: input.battle.monsters,
  });
}

export function createLegalSourceCharacterFixture(
  input: LegalSourceCharacterFixtureInput,
): LegalSourceCharacterFixture {
  const draft = createLegalSourceCharacterDraft({
    draftIdText: input.draftIdText,
  });
  const finalized = finalizeLegalSourceCharacterDraft({
    draft,
    plan: input.draftPlan,
  });
  const sheet = createLegalSourceCharacterSheet({
    characterIdText: input.sheet.characterIdText,
    build: finalized.build,
    hitPoints: input.sheet.hitPoints,
    ...(input.sheet.druidWildShapeKnownFormStatBlockIds === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            input.sheet.druidWildShapeKnownFormStatBlockIds,
        }),
  });

  if (input.battle.tag === "withoutBattle") {
    return {
      tag: "withoutBattle",
      draft: finalized.draft,
      build: finalized.build,
      sheet,
    };
  }

  return {
    tag: "withBattle",
    draft: finalized.draft,
    build: finalized.build,
    sheet,
    state: startLegalSourceCharacterBattle({ sheet, battle: input.battle }),
    combatantId: input.battle.combatantId,
  };
}

function levelFiveBaseBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
  readonly equipment?: CharacterBuild["equipment"];
  readonly features?: CharacterBuild["features"];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: Array.from({ length: 4 }, () => ({
        classUnitId: classUnitId(input.classUnitId),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment(
        input.abilityScores ?? {
          str: 16,
          dex: 14,
          con: 14,
          int: 10,
          wis: 10,
          cha: 10,
        },
      ),
    ),
    proficiencyChoices: [],
    features: input.features ?? [],
    ...(input.spellcasting === undefined
      ? {}
      : { spellcasting: input.spellcasting }),
    equipment: input.equipment ?? { owned: [], loadout: {} },
  };
}

export function levelFiveMartialBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly weaponUnitId: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
}): CharacterBuild {
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: requireRight(characterEquipmentItemUnitId(input.weaponUnitId)),
  });
  return levelFiveBaseBuild({
    classUnitId: input.classUnitId,
    ...(input.abilityScores === undefined
      ? {}
      : { abilityScores: input.abilityScores }),
    equipment: {
      owned: [{ itemId: weaponItemId, unitId: input.weaponUnitId }],
      loadout: {
        weapon: { itemId: weaponItemId, grip: "one_handed" },
      },
    },
  });
}

export function levelFiveWizardBuild(input: {
  readonly preparedSpells: readonly UnitRecord["id"][];
}): CharacterBuild {
  const wizardChoices = levelFiveWizardChoices(input.preparedSpells);
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(
      `draft:l5-sdk-wizard-${input.preparedSpells.join("-")}`,
    ),
  });

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      const result = finalizeCharacterDraft({ draft, unitLibrary });
      if (result.tag !== "ready") {
        throw new Error(
          `Expected finalized level-5 Wizard build, received ${creationFinalizationResultSummary(result)}`,
        );
      }
      return result.build;
    }

    draft = requireAcceptedCreationBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) =>
          levelFiveWizardCreationFill(hole, wizardChoices),
        ),
      }),
    );
  }

  throw new Error(
    `Level-5 Wizard SDK fixture still has creation holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

type LevelFiveWizardChoices = {
  readonly classSpellbook: readonly UnitRecord["id"][];
  readonly featureSpellbook: readonly UnitRecord["id"][];
  readonly preparedSpells: readonly UnitRecord["id"][];
};

const levelFiveWizardCantrips = [
  "light",
  "fire_bolt",
  "ray_of_frost",
  "minor_illusion",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

const levelFiveWizardBaseClassSpellbook = [
  "detect_magic",
  "feather_fall",
  "false_life",
  "mage_armor",
  "magic_missile",
  "ray_of_sickness",
  "shield",
  "sleep",
  "thunderwave",
  "burning_hands",
  "chromatic_orb",
  "acid_arrow",
  "darkness",
  "misty_step",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

const levelFiveWizardBasePreparedSpells = [
  "detect_magic",
  "feather_fall",
  "false_life",
  "mage_armor",
  "magic_missile",
  "ray_of_sickness",
  "shield",
  "thunderwave",
  "burning_hands",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

const levelFiveWizardFeatureSpellbook = [
  "continual_flame",
  "shatter",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const levelFiveWizardFeatureSpellbookIds: ReadonlySet<UnitRecord["id"]> =
  new Set(levelFiveWizardFeatureSpellbook);

function levelFiveWizardChoices(
  requiredPreparedSpells: readonly UnitRecord["id"][],
): LevelFiveWizardChoices {
  if (
    requiredPreparedSpells.some((spellId) =>
      levelFiveWizardFeatureSpellbookIds.has(spellId),
    )
  ) {
    throw new Error(
      "Level-5 Wizard tracer fixture required spells must not overlap Evocation Savant feature spellbook choices.",
    );
  }
  const classSpellbook = chooseDistinctOptions(
    requiredPreparedSpells,
    levelFiveWizardBaseClassSpellbook,
    14,
  );
  return {
    classSpellbook,
    featureSpellbook: levelFiveWizardFeatureSpellbook,
    preparedSpells: chooseDistinctOptions(
      requiredPreparedSpells,
      levelFiveWizardBasePreparedSpells.filter((spellId) =>
        classSpellbook.includes(spellId),
      ),
      9,
    ),
  };
}

function chooseDistinctOptions<T>(
  required: readonly T[],
  fallback: readonly T[],
  count: number,
): readonly T[] {
  const selected: T[] = [];
  for (const option of [...required, ...fallback]) {
    if (!selected.includes(option)) {
      selected.push(option);
    }
    if (selected.length === count) return selected;
  }
  throw new Error(
    `Expected ${count} distinct Wizard fixture options, found ${selected.length}.`,
  );
}

function levelFiveWizardProgression(): CharacterProgression {
  const wizardClassUnitId = classUnitId("class_wizard");
  return {
    startingClass: wizardClassUnitId,
    advancements: Array.from({ length: 4 }, () => ({
      classUnitId: wizardClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  };
}

function legalSourceCreationFill(
  hole: CreationHole,
  plan: LegalSourceCharacterDraftPlan,
): CreationFill {
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: requireRight(abilityScoreAssignment(plan.abilityScores)),
    };
  }

  const preference = legalSourceChoicePreference(hole.source, plan);
  if (preference === undefined) {
    throw new Error(
      `${plan.label} fixture has no preference for ${creationHoleSummary(
        hole,
      )}.`,
    );
  }

  const optionIds = hole.options.map((option) => option.optionId);
  const selectedOptionIds =
    preference.tag === "anyAvailable"
      ? optionIds.slice(0, choiceCardinalityBounds(hole.cardinality).max)
      : preference.optionIds;
  const holeOptionIds = new Set(optionIds);
  const missingOptionIds = selectedOptionIds.filter(
    (optionId) => !holeOptionIds.has(optionId),
  );
  if (missingOptionIds.length > 0) {
    throw new Error(
      `${plan.label} fixture ${creationSourceSummary(
        hole.source,
      )} is missing preferred options ${JSON.stringify(missingOptionIds)}.`,
    );
  }

  const bounds = choiceCardinalityBounds(hole.cardinality);
  if (
    selectedOptionIds.length < bounds.min ||
    selectedOptionIds.length > bounds.max
  ) {
    throw new Error(
      `${plan.label} fixture ${creationSourceSummary(
        hole.source,
      )} expected ${bounds.min}-${bounds.max} options, received ${selectedOptionIds.length}.`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
}

function legalSpecificOptionIds(
  firstOptionId: string,
  restOptionIds: readonly string[],
): readonly [CreationChoiceOptionId, ...CreationChoiceOptionId[]] {
  return [
    creationChoiceOptionId(firstOptionId),
    ...restOptionIds.map(creationChoiceOptionId),
  ];
}

function legalSourceChoicePreference(
  source: ChoiceCreationHoleSource,
  plan: LegalSourceCharacterDraftPlan,
): LegalSourceChoicePreference | undefined {
  const defaultPreference = legalSourceDefaultChoicePreference(source, plan);
  if (defaultPreference !== undefined) return defaultPreference;
  return plan.sourcePreferences.find((preference) =>
    creationSourcesMatch(preference.source, source),
  );
}

function legalSourceDefaultChoicePreference(
  source: ChoiceCreationHoleSource,
  plan: LegalSourceCharacterDraftPlan,
): LegalSourceChoicePreference | undefined {
  if (source.tag !== "draft") return undefined;

  if (source.path === "draft.progression.initial") {
    return {
      tag: "specific",
      source,
      optionIds: [progressionOptionId(legalSourceProgression(plan))],
    };
  }
  if (source.path === "draft.background") {
    return {
      tag: "specific",
      source,
      optionIds: [creationChoiceOptionId(plan.backgroundUnitId)],
    };
  }
  if (source.path === "draft.species") {
    return {
      tag: "specific",
      source,
      optionIds: [creationChoiceOptionId(plan.speciesUnitId)],
    };
  }
  if (source.path === "draft.languages") {
    const [firstLanguage, secondLanguage] = plan.languageOptionIds;
    return {
      tag: "specific",
      source,
      optionIds: [
        creationChoiceOptionId(firstLanguage),
        creationChoiceOptionId(secondLanguage),
      ],
    };
  }
  if (source.path === "draft.alignment") {
    return {
      tag: "specific",
      source,
      optionIds: [creationChoiceOptionId(plan.alignmentOptionId)],
    };
  }

  return undefined;
}

function legalSourceProgression(
  plan: LegalSourceCharacterDraftPlan,
): CharacterProgression {
  const unitId = classUnitId(plan.classUnitId);
  return {
    startingClass: unitId,
    advancements:
      plan.level === 1
        ? []
        : [{ classUnitId: unitId, hitPointRule: { tag: "fixedHigherLevelGain" } }],
  };
}

function creationSourcesMatch(
  left: ChoiceCreationHoleSource,
  right: ChoiceCreationHoleSource,
): boolean {
  if (left.tag !== right.tag) return false;
  if (left.tag === "draft" && right.tag === "draft") {
    return left.path === right.path;
  }
  if (left.tag === "unitChoice" && right.tag === "unitChoice") {
    return left.unitId === right.unitId && left.choiceKey === right.choiceKey;
  }
  if (left.tag === "loadout" && right.tag === "loadout") {
    return left.equipmentUnitId === right.equipmentUnitId && left.slot === right.slot;
  }
  return false;
}

function creationHoleSummary(hole: CreationHole): string {
  return `${hole.kind}:${String(hole.holeId)}:${creationSourceSummary(
    hole.source,
  )}`;
}

function creationSourceSummary(source: CreationHole["source"]): string {
  if (source.tag === "draft") return `draft:${source.path}`;
  if (source.tag === "unitChoice") {
    return `unitChoice:${source.unitId}:${source.choiceKey}`;
  }
  return `loadout:${source.equipmentUnitId}:${source.slot}`;
}

function levelFiveWizardCreationFill(
  hole: CreationHole,
  choices: LevelFiveWizardChoices,
): CreationFill {
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: requireRight(
        abilityScoreAssignment({
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 10,
          cha: 12,
        }),
      ),
    };
  }

  const optionIds = hole.options.map((option) => option.optionId);
  const preference = levelFiveWizardChoicePreference(hole, choices);
  if (preference === undefined) {
    throw new Error(
      `No level-5 Wizard fixture preference for hole ${hole.holeId}.`,
    );
  }
  const preferredOptionIds =
    preference.kind === "any" ? optionIds : preference.optionIds;
  const holeOptionIds = new Set(optionIds);
  const missingOptionIds = preferredOptionIds.filter(
    (optionId) => !holeOptionIds.has(optionId),
  );
  if (missingOptionIds.length > 0) {
    throw new Error(
      `Level-5 Wizard fixture hole ${hole.holeId} is missing preferred options ${JSON.stringify(
        missingOptionIds,
      )}.`,
    );
  }

  const maxChoices = choiceCardinalityBounds(hole.cardinality).max;
  if (
    preference.kind === "specific" &&
    preferredOptionIds.length !== maxChoices
  ) {
    throw new Error(
      `Level-5 Wizard fixture hole ${hole.holeId} expected ${maxChoices} preferred options, received ${preferredOptionIds.length}.`,
    );
  }
  const selectedOptionIds = preferredOptionIds.slice(0, maxChoices);

  if (selectedOptionIds.length !== maxChoices) {
    throw new Error(
      `Not enough options for level-5 Wizard fixture hole ${hole.holeId}.`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
}

type LevelFiveWizardChoicePreference =
  | {
      readonly kind: "specific";
      readonly optionIds: readonly CreationChoiceOptionId[];
    }
  | { readonly kind: "any" };

function levelFiveWizardChoicePreference(
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
  choices: LevelFiveWizardChoices,
): LevelFiveWizardChoicePreference | undefined {
  const source = hole.source;
  if (source.tag === "draft") {
    if (source.path === "draft.progression.initial") {
      return {
        kind: "specific",
        optionIds: [progressionOptionId(levelFiveWizardProgression())],
      };
    }
    if (source.path === "draft.background") {
      return {
        kind: "specific",
        optionIds: [creationChoiceOptionId("background_criminal")],
      };
    }
    if (source.path === "draft.species") {
      return {
        kind: "specific",
        optionIds: [creationChoiceOptionId("species_orc")],
      };
    }
    if (source.path === "draft.languages") {
      return {
        kind: "specific",
        optionIds: [
          creationChoiceOptionId("Dwarvish"),
          creationChoiceOptionId("Goblin"),
        ],
      };
    }
    if (source.path === "draft.alignment") {
      return {
        kind: "specific",
        optionIds: [creationChoiceOptionId("lawful_good")],
      };
    }
    return undefined;
  }

  if (source.tag === "loadout") {
    return { kind: "any" };
  }

  if (source.tag !== "unitChoice") {
    return undefined;
  }

  if (
    source.unitId === "class_wizard" &&
    source.choiceKey === "equipment_purchase"
  ) {
    return { kind: "any" };
  }

  const optionIds = levelFiveWizardUnitChoicePreferredOptionIds(
    source.unitId,
    source.choiceKey,
    choices,
  )?.map(creationChoiceOptionId);
  return optionIds === undefined ? undefined : { kind: "specific", optionIds };
}

function levelFiveWizardUnitChoicePreferredOptionIds(
  unitId: UnitRecord["id"],
  choiceKey: string,
  choices: LevelFiveWizardChoices,
): readonly UnitRecord["id"][] | undefined {
  if (unitId === "class_wizard") {
    if (choiceKey === "class_skill_proficiency_choice") {
      return ["arcana", "history"];
    }
    if (choiceKey === "wizard_cantrip_choices") {
      return levelFiveWizardCantrips;
    }
    if (choiceKey === "wizard_spellbook_choices") {
      return choices.classSpellbook;
    }
    if (choiceKey === "wizard_prepared_spell_choices") {
      return choices.preparedSpells;
    }
    if (choiceKey === "class_subclass_choice") {
      return ["subclass_wizard_evoker"];
    }
    if (choiceKey === "class_equipment_choice") {
      return ["option_b"];
    }
  }

  if (
    unitId === "wizard_evocation_savant" &&
    choiceKey === "wizard_spellbook_choices"
  ) {
    return choices.featureSpellbook;
  }

  if (
    unitId === "wizard_scholar" &&
    choiceKey === "class_feature_proficiency_choice"
  ) {
    return ["arcana"];
  }

  if (unitId === "background_criminal") {
    if (choiceKey === "background_ability_score_increase") {
      return ["two_and_one:int:con"];
    }
    if (choiceKey === "background_tool_choice") {
      return ["thieves_tools"];
    }
    if (choiceKey === "background_equipment_choice") {
      return ["option_b"];
    }
  }

  if (unitId === "wizard_ability_score_improvement_l4") {
    if (choiceKey === "class_feature_feat_choice") {
      return ["feat_ability_score_improvement"];
    }
    if (choiceKey === "class_feature_ability_score_increase_choice") {
      return ["ability_score:int:+2:max20"];
    }
  }

  return undefined;
}

function requireAcceptedCreationBatch(
  result: CreationBatchFillResult,
  label = "SDK integration",
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(
      `${label} expected character-creation fill batch to be accepted, received ${creationBatchResultSummary(result)}`,
    );
  }
  return result.draft;
}

function creationBatchResultSummary(result: CreationBatchFillResult): string {
  return result.tag === "accepted"
    ? "accepted"
    : `rejected with issues ${JSON.stringify(result.issues)}`;
}

function creationFinalizationResultSummary(
  result: CreationFinalizationResult,
): string {
  if (result.tag === "ready") {
    return "ready";
  }
  if (result.tag === "incomplete") {
    return `incomplete with holes ${JSON.stringify(
      result.holes.map((hole) => hole.holeId),
    )}`;
  }
  return `invalid with issues ${JSON.stringify(result.issues)}`;
}

export function levelFiveSorcererBuild(): CharacterBuild {
  return levelFiveBaseBuild({
    classUnitId: "class_sorcerer",
    abilityScores: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
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
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  });
}

export function monsterBattleInput(
  id: CombatantId,
  initiative: number,
  statBlock: StatBlockRecord,
  input: { readonly tempHp?: number } = {},
): Parameters<typeof battleCreatureInitFromStatBlock>[0] {
  return {
    combatantId: id,
    statBlock,
    initiative: initiativeScore(initiative),
    side: monsterSide,
    ...(input.tempHp === undefined ? {} : { tempHp: Hp(input.tempHp) }),
  };
}

export function srdStatBlock(id: StatBlockRecord["id"]): StatBlockRecord {
  return statBlockCatalog.requireStatBlock(id);
}

export function attackSubject(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.attackName === attackName,
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(`Expected ${attackName} Attack action.`);
  }
  return act.subject;
}

export function spellSlotActForProcedure(
  state: BattleState,
  spellId: string,
  slotLevel: number,
  procedure: SpellSlotProcedure,
): CastActionSpellAct {
  const expectedInvocation = spellSlotInvocationRef(
    spellId,
    slotLevel,
    procedure,
  );
  if (expectedInvocation.tag !== "spellSlot") {
    throw new Error(`Expected ${spellId} spell-slot invocation.`);
  }
  const act = discoverBattleActs(state).find(
    (candidate): candidate is CastActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.mode.tag === "cast" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.slotLevel === expectedInvocation.slotLevel &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} spell action.`);
  }
  return act;
}

export function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
  extraSpatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName,
      },
      ...extraSpatialFacts,
    ],
  };
}

export function knownWillingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
    },
  };
}

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  input: {
    readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    readonly cunningStrikeOption?: Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >["cunningStrikeOption"];
  } = {},
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
    ...(input.selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : {
          selectedAttackDamageRiderUnitIds:
            input.selectedAttackDamageRiderUnitIds,
        }),
    ...(input.cunningStrikeOption === undefined
      ? {}
      : { cunningStrikeOption: input.cunningStrikeOption }),
  };
}

export function ordinaryAttackDamageFills(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly damageDice: readonly (readonly number[])[];
  readonly selectedAttackDamageRiderUnitIds?: readonly string[];
  readonly cunningStrikeOption?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["cunningStrikeOption"];
}): readonly BattleFill[] {
  const throughDamage = [
    ...input.prefixFills,
    damageRollFillWithGroups(input.damage, input.damageDice, {
      ...(input.selectedAttackDamageRiderUnitIds === undefined
        ? {}
        : {
            selectedAttackDamageRiderUnitIds:
              input.selectedAttackDamageRiderUnitIds,
          }),
      ...(input.cunningStrikeOption === undefined
        ? {}
        : { cunningStrikeOption: input.cunningStrikeOption }),
    }),
  ];
  const next = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: throughDamage,
  });
  const disposition =
    next.tag === "needsHoles"
      ? next.holes.find((hole) => hole.kind === "attackDamageDisposition")
      : undefined;
  return disposition === undefined
    ? throughDamage
    : [
        ...throughDamage,
        {
          kind: "attackDamageDisposition",
          holeId: disposition.holeId,
          value: { kind: "ordinaryDamage" },
        },
      ];
}

export function unitFeatureDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "unitFeatureDecision" }>,
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return { kind: "unitFeatureDecision", holeId: hole.holeId, value };
}

export function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

export function areaSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  originAnchorId: CombatantId,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (
    !("spell" in hole) ||
    hole.spell.procedure === "rollModifier" ||
    hole.spell.targeting.kind === "singleCombatant" ||
    hole.spell.targeting.kind === "targetList"
  ) {
    throw new Error("Expected area Saving Throw outcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

export function requireHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole.`);
  }
  return requireHoleFromList(result.holes, kind);
}

export function requireHoleFromList<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }
  return result;
}

export function requireCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantIdValue}.`);
  }
  return combatant;
}

export function requireCharacterCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): CharacterCombatantState {
  const combatant = requireCombatant(state, combatantIdValue);
  if (!isCharacterCombatant(combatant)) {
    throw new Error(`Expected character combatant ${combatantIdValue}.`);
  }
  return combatant;
}

export function characterResources(combatant: CharacterCombatantState) {
  return combatant.origin.resources;
}

export function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(first), ...rest.map((die) => DieRollResult(die))],
  };
}

function isCharacterCombatant(
  combatant: BattleCreatureState,
): combatant is CharacterCombatantState {
  return combatant.origin.kind === "character";
}
