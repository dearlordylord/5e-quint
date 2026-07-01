#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { readJson, toRepoPath } = require("./unit-profile-coverage-io.cjs");
const { stable } = require("./unit-profile-coverage-report.cjs");

const root = process.env.SDK_RAW_INTEGRATION_ROOT ?? process.cwd();
const write = process.argv.includes("--write");

const outputDir = path.join(root, "plans/sdk-raw-integration");
const paths = {
  level1: path.join(
    root,
    "plans/unit-profile-coverage/level1-full-support.json",
  ),
  level12: path.join(
    root,
    "plans/unit-profile-coverage/level1-2-full-support.json",
  ),
  level13: path.join(
    root,
    "plans/unit-profile-coverage/level1-3-full-support.json",
  ),
  level14: path.join(
    root,
    "plans/unit-profile-coverage/level1-4-full-support.json",
  ),
  miningAudit: path.join(
    root,
    "plans/unit-profile-coverage/level1-7-mining-audit.json",
  ),
  unitClaims: path.join(root, "plans/unit-profile-coverage/unit-claims.jsonl"),
  unitEvidence: path.join(
    root,
    "plans/unit-profile-coverage/unit-evidence.jsonl",
  ),
  characterCreationOwnerEvidence: path.join(
    root,
    "plans/unit-profile-coverage/character-creation-owner-evidence.json",
  ),
  characterSheetOwnerEvidence: path.join(
    root,
    "plans/unit-profile-coverage/character-sheet-owner-evidence.json",
  ),
  seedScenarioFiles: {
    level1BattleFeatures: path.join(
      root,
      "packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts",
    ),
    level5Tracer: path.join(
      root,
      "packages/character-battle-runtime/src/level5-sdk-tracer-bullets.test.ts",
    ),
  },
  seedEvidenceFiles: {
    scalarBuffAdmission: path.join(
      root,
      "packages/battle-runtime/src/unit-profile-admission-scalar-buff-and-heroism-spells.test.ts",
    ),
    surfaceUnitCatalog: path.join(
      root,
      "packages/surface/src/surface/unit-catalog.test.ts",
    ),
  },
  plan: path.join(root, "plans/LEVEL1_5_SDK_RAW_INTEGRATION_TEST_PLAN.md"),
  json: path.join(outputDir, "level1-5-sdk-raw-inventory.json"),
  report: path.join(outputDir, "LEVEL1_5_SDK_RAW_INVENTORY.md"),
};

const levelReportInputs = [
  { key: "level1", title: "Character Level 1", path: paths.level1 },
  { key: "level1-2", title: "Character Levels 1-2", path: paths.level12 },
  { key: "level1-3", title: "Character Levels 1-3", path: paths.level13 },
  { key: "level1-4", title: "Character Levels 1-4", path: paths.level14 },
];

const levelOneFiveBands = new Set([
  "level-1",
  "level-2",
  "level-3",
  "level-4",
  "level-5",
  "spell-level-0",
  "spell-level-1",
  "spell-level-2",
  "spell-level-3",
]);
const levelOneTwoSourceHarnessBands = new Set([
  "level-1",
  "level-2",
  "spell-level-0",
  "spell-level-1",
]);
const levelOneTwoCampaignActiveDispositions = new Set([
  "sdk-scenario-needed",
  "seed-scenario-present",
  "explicit-closure-needed",
  "closure-review-needed",
]);
const expectedLevelOneTwoCampaignRows = 400;
const expectedLevelOneTwoCampaignGroups = 208;
const expectedLevelOneTwoSeedScenarioRows = 75;
const handBuiltSourceSeedRowIds = new Set([
  "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_rage",
  "srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration",
  "srd521:classes/fighter:level-1:class-feature-grant:fighter_second_wind",
  "srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts",
  "srd521:classes/rogue:level-1:class-feature-grant:rogue_sneak_attack",
  "srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery",
  "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_burning_hands",
]);

const buildSheetRowKinds = new Set([
  "class-container",
  "core-trait",
  "multiclass-entry",
  "subclass-selection",
]);
const buildBattleRowKinds = new Set(["equipment-pressure", "mastery-pressure"]);
const sheetSpellAccessRowKinds = new Set([
  "spell-access",
  "subclass-spell-access",
]);
const futureSpellClosureKinds = new Set([
  "outside-battle-runtime",
  "table-spatial-derivation",
  "companion-control-boundary",
]);
const tableOnlySpellClosureKinds = new Set(["social-knowledge-effect"]);
const characterCreationClosureKinds = new Set(["selection-grant-container"]);
const futureFeatureClosureKinds = new Set([
  "character-fact-and-runtime-detached-split",
]);
const ownerProfilePrefixes = [
  ["character-creation.", "character-creation"],
  ["character-sheet.", "character-sheet"],
  ["unit-feature.", "character-battle-to-battle"],
  ["spell.", "character-battle-to-battle"],
];
const ownerPathPrefixes = [
  ["packages/character-creation-runtime/", "character-creation"],
  ["packages/character-sheet-runtime/", "character-sheet"],
  ["packages/character-battle-runtime/", "character-battle-runtime"],
  ["packages/battle-runtime/", "character-battle-to-battle"],
];

const levelOneTwoCampaignRowFamilyByDisposition = new Map([
  ["sdk-scenario-needed", "source-row"],
  ["seed-scenario-present", "seed-row"],
  ["explicit-closure-needed", "explicit-closure-row"],
  ["closure-review-needed", "closure-review-row"],
]);

const levelOneTwoCampaignLaneOwnership = new Map([
  [
    "character-creation-sdk",
    {
      taskFamily: "character-creation-sdk",
      ownerTaskIds: ["L12-SH05-CREATION-SDK-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "build-sheet-sdk",
    {
      taskFamily: "build-sheet-sdk",
      ownerTaskIds: ["L12-SH06-BUILD-SHEET-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "build-battle-sdk",
    {
      taskFamily: "build-battle-sdk",
      ownerTaskIds: ["L12-SH07-BUILD-BATTLE-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "character-sheet-sdk",
    {
      taskFamily: "character-sheet-sdk",
      ownerTaskIds: ["L12-SH08-SHEET-SDK-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "sheet-spell-access-sdk",
    {
      taskFamily: "sheet-spell-access-sdk",
      ownerTaskIds: ["L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "battle-feature-sdk",
    {
      taskFamily: "battle-feature-sdk",
      ownerTaskIds: ["L12-SH10-BATTLE-FEATURE-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "battle-spell-sdk",
    {
      taskFamily: "battle-spell-sdk",
      ownerTaskIds: ["L12-SH11-BATTLE-SPELL-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "multi-owner-feature-sdk",
    {
      taskFamily: "multi-owner-feature-sdk",
      ownerTaskIds: ["L12-SH12-MULTI-OWNER-FIRST-SLICE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "seed-present",
    {
      taskFamily: "seed-present",
      ownerTaskIds: [
        "L12-SH03-SEED-MIGRATION-AUDIT",
        "L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE",
        "L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION",
        "L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND",
        "L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS",
        "L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK",
        "L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY",
        "L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS",
      ],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "explicit-closure",
    {
      taskFamily: "explicit-closure",
      ownerTaskIds: ["L12-SH04-GROUPING-GENERATOR-GATE"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
  [
    "spell-effect-owner-review",
    {
      taskFamily: "spell-effect-owner-review",
      ownerTaskIds: ["L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY"],
      followUpTaskIds: ["L12-SH15-NEXT-BATCH-SPLIT"],
    },
  ],
]);

const barbarianBuildSheetScenarioLabel =
  "level1-sdk-raw-integration: Barbarian build-sheet projection derives level-1 class facts from legal creation and a fresh sheet";
const barbarianBuildSheetScenarioPath =
  paths.seedScenarioFiles.level1BattleFeatures;
const barbarianBuildSheetScenarioNeedles = [
  "barbarianBuildSheetDraftPlan",
  "createLegalSourceCharacterFixture({",
  "battle: { tag: \"withoutBattle\" }",
  "fixture.sheet.build",
  "readClassCreationFacts(",
  "characterBuildUnitRefs(",
  "primaryAbilities",
  "characterBuildHitPoints(",
  ".hitDice",
  "characterBuildProficiencies(",
  "savingThrowProficiencies",
  "proficiencyChoices",
  "weaponProficiencies",
  "characterBuildArmorTraining(",
  "armorTraining",
];
const barbarianBuildSheetScenarioHelperNeedles = [
  {
    anchor: "const barbarianBuildSheetDraftPlan =",
    needles: [
      'classUnitId: "class_barbarian"',
      '"class_skill_proficiency_choice"',
      '"barbarian_weapon_mastery"',
      '"weapon_mastery_options"',
      'legalUnitChoice("class_barbarian", "class_equipment_choice", "option_b")',
      'legalAnyUnitChoice("class_barbarian", "equipment_purchase")',
      'legalAnyLoadoutChoice("equipment_shield", "shield")',
      'legalAnyLoadoutChoice("weapon_longsword", "weapon")',
    ],
  },
];
const barbarianBuildBattleScenarioLabel =
  "level1-sdk-raw-integration: Barbarian build-battle handoff projects starting equipment and Weapon Mastery into a battle combatant";
const legalBuildBattleHandoffSourceProof = "legal-build-battle-handoff";
const barbarianBuildBattleScenarioNeedles = [
  "createLegalSourceCharacterFixture({",
  'draftIdText: "draft:l1-sdk-barbarian-build-battle"',
  "barbarianBuildSheetDraftPlan",
  'battleIdText: "battle:l1-sdk-barbarian-build-battle"',
  "requireCharacterCombatant(fixture.state, barbarianId)",
  "origin.selectedLoadout",
  "origin.weaponMasteries",
  "origin.attack",
  'id: "weapon_longsword"',
  'mastery: "sap"',
  "snapshotCombatant(fixture.state, barbarianId)",
  "armorClass: 16",
  'attackSubject(fixture.state, barbarianId, "Longsword")',
];
const barbarianBuildBattleScenarioRows = [
  {
    candidateUnitId: "class_barbarian",
    rowId:
      "srd521:classes/barbarian:level-1:equipment-pressure:barbarian_starting_equipment",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:13"],
  },
  {
    candidateUnitId: "barbarian_weapon_mastery",
    rowId:
      "srd521:classes/barbarian:level-1:mastery-pressure:barbarian_weapon_mastery",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:84-89"],
  },
].map((row) => ({
  className: "Barbarian",
  levelBand: "level-1",
  label: barbarianBuildBattleScenarioLabel,
  path: barbarianBuildSheetScenarioPath,
  sourceProof: legalBuildBattleHandoffSourceProof,
  tracerNeedles: barbarianBuildBattleScenarioNeedles,
  helperNeedles: barbarianBuildSheetScenarioHelperNeedles,
  ...row,
}));
const barbarianUnarmoredDefenseSheetScenarioLabel =
  "level1-sdk-raw-integration: Barbarian Unarmored Defense sheet projection derives Armor Class from legal creation and a fresh sheet";
const barbarianUnarmoredDefenseSheetScenarioNeedles = [
  "createLegalSourceCharacterFixture({",
  'draftIdText: "draft:l1-sdk-barbarian-unarmored-defense-sheet"',
  "barbarianBuildSheetDraftPlan",
  'battle: { tag: "withoutBattle" }',
  "fixture.sheet.build",
  "characterSheetArmorClassState({",
  'source: "unarmored_defense"',
  'sourceUnitId: "barbarian_unarmored_defense"',
  'abilityModifiers: ["dex", "con"]',
  "currentArmorClass(armorClassState)",
  "toBe(16)",
];
const barbarianBuildSheetScenarioRows = [
  {
    rowId:
      "srd521:classes/barbarian:level-1:class-container:barbarian_class_container",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:3"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_armor_training",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:12"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_hit_point_die",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:8"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_primary_ability",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:7"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_saving_throw_proficiencies",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:9"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_skill_proficiencies",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:10"],
  },
  {
    rowId:
      "srd521:classes/barbarian:level-1:core-trait:barbarian_weapon_proficiencies",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:11"],
  },
].map((row) => ({
  candidateUnitId: "class_barbarian",
  className: "Barbarian",
  levelBand: "level-1",
  label: barbarianBuildSheetScenarioLabel,
  path: barbarianBuildSheetScenarioPath,
  sourceProof: "legal-build-sheet-owner",
  tracerNeedles: barbarianBuildSheetScenarioNeedles,
  helperNeedles: barbarianBuildSheetScenarioHelperNeedles,
  ...row,
}));

const seededSdkScenarioRows = [
  ...barbarianBuildSheetScenarioRows,
  ...barbarianBuildBattleScenarioRows,
  {
    candidateUnitId: "barbarian_unarmored_defense",
    className: "Barbarian",
    levelBand: "level-1",
    label: barbarianUnarmoredDefenseSheetScenarioLabel,
    path: barbarianBuildSheetScenarioPath,
    rowId:
      "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_unarmored_defense",
    rawSources: [".references/srd-5.2.1/Classes/Barbarian.md:80-82"],
    sourceProof: "legal-build-sheet-owner",
    tracerNeedles: barbarianUnarmoredDefenseSheetScenarioNeedles,
    helperNeedles: barbarianBuildSheetScenarioHelperNeedles,
  },
  {
    candidateUnitId: "barbarian_rage",
    className: "Barbarian",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Barbarian Rage projects from a level-1 sheet, spends a use, and applies damage and Resistance riders",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_rage",
    tracerNeedles: ["barbarianRageUnitId"],
  },
  {
    candidateUnitId: "bard_bardic_inspiration",
    className: "Bard",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Bardic Inspiration grants a level-1 d6 die, spends a Charisma-derived use, and spends the Bonus Action",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration",
    tracerNeedles: ["bardBardicInspirationUnitId"],
  },
  {
    candidateUnitId: "fighter_second_wind",
    className: "Fighter",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Fighter Second Wind heals through sheet projection and spends one Bonus Action use",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/fighter:level-1:class-feature-grant:fighter_second_wind",
    tracerNeedles: ["fighterSecondWindUnitId"],
  },
  {
    candidateUnitId: "monk_martial_arts",
    className: "Monk",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike using the Martial Arts die and Dexterity",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId: "srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts",
    tracerNeedles: ["monkMartialArtsUnitId"],
  },
  {
    candidateUnitId: "rogue_sneak_attack",
    className: "Rogue",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Rogue Sneak Attack projects as a level-1 Dagger damage rider and records once-per-turn use",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/rogue:level-1:class-feature-grant:rogue_sneak_attack",
    tracerNeedles: ["rogueSneakAttackUnitId"],
  },
  {
    candidateUnitId: "sorcerer_innate_sorcery",
    className: "Sorcerer",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer Innate Sorcery spends a use for one minute and projects Sorcerer spell bonuses",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery",
    tracerNeedles: ["sorcererInnateSorceryUnitId", "sorcerousBurstSpellId"],
  },
  {
    candidateUnitId: "class_warlock",
    className: "Warlock",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Warlock Pact Magic creation finalizes level-1 cantrips, prepared spells, and Pact Slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    sourceProof: "legal-creation-owner",
    rawSources: [
      ".references/srd-5.2.1/Classes/Warlock.md:68-91",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:1-25",
    ],
    rowId:
      "srd521:classes/warlock:level-1:class-feature-grant:warlock_pact_magic",
    tracerNeedles: [
      "createLegalSourceCharacterFixture({",
      'draftIdText: "draft:l1-sdk-warlock-pact-magic-creation"',
      "warlockPactMagicCreationDraftPlan",
      'battle: { tag: "withoutBattle" }',
      "discoverCreationHoles({ draft: fixture.draft, unitLibrary }).length",
      'sourceUnitId: "class_warlock"',
      'spellcastingAbility: "cha"',
      "cantrips: [eldritchBlastSpellId, \"prestidigitation\"]",
      "preparedSpells: [hexSpellId, \"charm_person\"]",
      'spellcastingFocuses: ["arcane_focus"]',
      "pactMagic: {",
      'kind: "pactMagic"',
      "slotLevel: 1",
      "count: 1",
    ],
    helperNeedles: [
      {
        anchor: "const warlockPactMagicCreationDraftPlan =",
        needles: [
          'label: "Warlock Pact Magic creation"',
          'classUnitId: "class_warlock"',
          "level: 1",
          "legalUnitChoice(",
          '"class_warlock"',
          '"class_cantrip_choices"',
          "eldritchBlastSpellId",
          '"prestidigitation"',
          '"class_prepared_spell_choices"',
          "hexSpellId",
          '"charm_person"',
          '"warlock_eldritch_invocations"',
          '"eldritch_invocations"',
          '"eldritch_mind"',
        ],
      },
    ],
  },
  {
    candidateUnitId: "vicious_mockery",
    className: "Bard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Bard Vicious Mockery cantrip resolves from a level-1 sheet as a Wisdom save with Psychic damage and next Attack Roll Disadvantage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Bard.md:69-89",
      ".references/srd-5.2.1/Classes/Bard.md:143-156",
      ".references/srd-5.2.1/Spells/Descriptions-S-Z.md:1092-1103",
    ],
    rowId:
      "srd521:classes/bard:spell-level-0:spell-unit-pressure:bard_spell_list_vicious_mockery",
    tracerNeedles: [
      "const bardBuild = finalizedLevelOneBardViciousMockeryBuild();",
      'sourceUnitId: "class_bard"',
      'spellcastingAbility: "cha"',
      "cantrips: expect.arrayContaining([viciousMockerySpellId])",
      "build: bardBuild,",
      "casterId: viciousMockeryBardId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneBardViciousMockeryBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneBardBuild({",
          'draftIdText: "draft:l1-sdk-bard-vicious-mockery"',
          'expectedBuildLabel: "Bard Vicious Mockery"',
          "viciousMockerySpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneBardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_bard"',
          '"class_tool_proficiency_choice"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneViciousMockery",
        needles: [
          "cantripCastActionSpellAct(",
          "viciousMockerySpellId",
          '"saveGatedDamage"',
          "spellTargetFill(",
          "spellSaveDcForCaster(state, input.casterId)",
          'label: "Vicious Mockery Saving Throw outcome"',
          'ability: "wis"',
          'resource: { tag: "none" }',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 6 }, damageType: "psychic" }',
          'successDamage: "none"',
          "rangeFeet: 60",
          'kind: "nextAttackRollByTarget"',
          'mode: "disadvantage"',
          'expiresAt: "endOfTargetNextTurn"',
          'label: "Vicious Mockery damage (1d6-psychic)"',
          "damageRollFillWithGroups(damage, [[6]])",
          "hp: Hp(7)",
          'kind: "nextAttackRollBySelf"',
          "sourceSpellId: viciousMockerySpellId",
          "sourceCombatantId: input.casterId",
          'expiresAt: { kind: "endOfTurn", combatantId: monsterId, round: 1 }',
          "endTurn({ state: failedSave.state, actorId: input.casterId })",
          'attackSubject(monsterTurn, monsterId, "Shortsword")',
          'rollMode: "disadvantage"',
          "activeEffects",
          "succeeded: true",
          "hp: Hp(13)",
          "expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "dissonant_whispers",
    className: "Bard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard Dissonant Whispers resolves from a level-1 sheet as a Wisdom save with Psychic damage and forced Reaction movement",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Bard.md:79-89",
      ".references/srd-5.2.1/Classes/Bard.md:158-171",
      ".references/srd-5.2.1/Monsters/Monsters-P-S.md:1148-1159",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1558-1569",
    ],
    rowId:
      "srd521:classes/bard:spell-level-1:spell-unit-pressure:bard_spell_list_dissonant_whispers",
    tracerNeedles: [
      "const bardBuild = finalizedLevelOneBardDissonantWhispersBuild();",
      'sourceUnitId: "class_bard"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([dissonantWhispersSpellId])",
      "build: bardBuild,",
      "casterId: dissonantWhispersBardId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneBardDissonantWhispersBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneBardBuild({",
          'draftIdText: "draft:l1-sdk-bard-dissonant-whispers"',
          'expectedBuildLabel: "Bard Dissonant Whispers"',
          "dissonantWhispersSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneBardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_bard"',
          '"class_tool_proficiency_choice"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneDissonantWhispers",
        needles: [
          "spellSlotActForProcedure(",
          "dissonantWhispersSpellId",
          '"saveGatedDamage"',
          "spellTargetFill(",
          "spellSaveDcForCaster(state, input.casterId)",
          'label: "Dissonant Whispers Saving Throw outcome"',
          'ability: "wis"',
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 3, dieSize: 6 }, damageType: "psychic" }',
          'successDamage: "half"',
          "rangeFeet: 60",
          'kind: "forcedReactionMovement"',
          'direction: "awayFromCaster"',
          'route: "safest"',
          'distance: "asFarAsPossible"',
          'cost: "targetReactionIfAvailable"',
          'label: "Dissonant Whispers damage (3d6-psychic)"',
          "damageRollFillWithGroups(failedDamage, [[3, 4, 5]])",
          '"movement"',
          'const walkMovementBudget = requireMovementSpeedBudget(movement, "walk");',
          "movementBudgetFeet: movementFeet(30)",
          "walkMovementFill(movement,",
          "movementCostFeet: walkMovementBudget",
          "provokedOpportunityAttacks: []",
          "hp: Hp(1)",
          "reactionAvailable: false",
          "expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 1 }",
          "succeeded: true",
          "damageRollFillWithGroups(successDamage, [[3, 4, 5]])",
          "hp: Hp(7)",
          "reactionAvailable: true",
          "expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);",
        ],
      },
      {
        anchor: "function walkMovementFill",
        needles: [
          'kind: "movement"',
          "movementCostFeet: value.movementCostFeet",
          "provokedOpportunityAttacks: value.provokedOpportunityAttacks",
        ],
      },
    ],
  },
  {
    candidateUnitId: "acid_splash",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Acid Splash cantrips resolve from level-1 sheets as a point-origin Sphere Dexterity save without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_acid_splash",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererAcidSplashBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([acidSplashSpellId])",
      "build: sorcererBuild,",
      "casterId: acidSplashSorcererId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererAcidSplashBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-acid-splash"',
          "acidSplashSpellId,",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneAcidSplash",
        needles: [
          "cantripCastActionSpellAct(",
          '"saveGatedDamage"',
          'label: "Acid Splash point-origin Sphere Saving Throw outcomes"',
          'ability: "dex"',
          'targeting: { kind: "pointOriginSphere", radiusFeet: 5 }',
          'damage: { expr: { dice: 1, dieSize: 6 }, damageType: "acid" }',
          'successDamage: "none"',
          "rangeFeet: 60",
          "areaSavingThrowOutcomeFill(save, input.casterId,",
          "{ targetId: monsterId, succeeded: false }",
          "{ targetId: secondMonsterId, succeeded: true }",
          'label: "Acid Splash damage (1d6-acid)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(9));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "acid_splash",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Acid Splash cantrips resolve from level-1 sheets as a point-origin Sphere Dexterity save without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_acid_splash",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardAcidSplashBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([acidSplashSpellId])",
      "build: wizardBuild,",
      "casterId: acidSplashWizardId,",
      "expectedSpellSaveDc: 13,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardAcidSplashBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-acid-splash"',
          'cantrips: [acidSplashSpellId, fireBoltSpellId, "ray_of_frost"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneAcidSplash",
        needles: [
          "cantripCastActionSpellAct(",
          '"saveGatedDamage"',
          'label: "Acid Splash point-origin Sphere Saving Throw outcomes"',
          'ability: "dex"',
          'targeting: { kind: "pointOriginSphere", radiusFeet: 5 }',
          'damage: { expr: { dice: 1, dieSize: 6 }, damageType: "acid" }',
          'successDamage: "none"',
          "rangeFeet: 60",
          "areaSavingThrowOutcomeFill(save, input.casterId,",
          "{ targetId: monsterId, succeeded: false }",
          "{ targetId: secondMonsterId, succeeded: true }",
          'label: "Acid Splash damage (1d6-acid)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(9));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "sorcerous_burst",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer Sorcerous Burst cantrip resolves from a level-1 sheet with selected exploding Damage Type damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [".references/srd-5.2.1/Spells/Descriptions-S-Z.md:384-397"],
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_sorcerous_burst",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererSorcerousBurstBuild();",
      'sourceUnitId: "class_sorcerer"',
      'spellcastingAbility: "cha"',
      "cantrips: expect.arrayContaining([sorcerousBurstSpellId])",
      "build: sorcererBuild,",
      "casterId: sorcerousBurstSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererSorcerousBurstBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-sorcerous-burst"',
          'expectedBuildLabel: "Sorcerer Sorcerous Burst"',
          "sorcerousBurstSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneSorcerousBurst",
        needles: [
          "cantripCastActionSpellAct(",
          "sorcerousBurstSpellId",
          '"damageTypeChoice"',
          '"targetChoice"',
          '"objectTargetChoice"',
          'damageTypeChoiceFill(damageType, "thunder")',
          '"acid"',
          '"cold"',
          '"fire"',
          '"lightning"',
          '"poison"',
          '"psychic"',
          '"thunder"',
          "choices: expect.arrayContaining([monsterId])",
          "requiresTableSpatialFact: true",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCreatureOrObject" }',
          "rangeFeet: 120",
          'kind: "selectedSorcerousBurstDamage"',
          "expr: { dice: 1, dieSize: 8 }",
          'damageType: "thunder"',
          "maxDieAdditionalDiceLimit: 2",
          'label: "Sorcerous Burst damage (1d8-thunder)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[8, 3]]",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(2));",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "poison_spray",
    className: "Druid",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Druid and Warlock Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/druid:spell-level-0:spell-unit-pressure:druid_spell_list_poison_spray",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidPoisonSprayBuild();",
      'sourceUnitId: "class_druid"',
      "cantrips: expect.arrayContaining([poisonSpraySpellId])",
      "build: druidBuild,",
      "casterId: poisonSprayDruidId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneDruidPoisonSprayBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneDruidBuild({",
          'draftIdText: "draft:l1-sdk-druid-poison-spray"',
          'expectedBuildLabel: "Druid Poison Spray"',
          'cantrips: [poisonSpraySpellId, "produce_flame"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneDruidBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_druid"',
          '"class_cantrip_choices"',
          '"druid_primal_order"',
          '"primal_order"',
          '"warden"',
          "const result = finalizeCharacterDraft({ draft: afterLoadout, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOnePoisonSpray",
        needles: [
          "cantripCastActionSpellAct(",
          "poisonSpraySpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 30",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 12 }",
          'damageType: "poison"',
          "postDamageRiders: []",
          'label: "Poison Spray damage (1d12-poison)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[7]]",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "poison_spray",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_poison_spray",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererPoisonSprayBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([poisonSpraySpellId])",
      "build: sorcererBuild,",
      "casterId: poisonSpraySorcererId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererPoisonSprayBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-poison-spray"',
          'expectedBuildLabel: "Sorcerer Poison Spray"',
          "poisonSpraySpellId,",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOnePoisonSpray",
        needles: [
          "cantripCastActionSpellAct(",
          "poisonSpraySpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 30",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 12 }",
          'damageType: "poison"',
          "postDamageRiders: []",
          'label: "Poison Spray damage (1d12-poison)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[7]]",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "produce_flame",
    className: "Druid",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Druid Produce Flame cantrip resolves from a level-1 sheet as held light and a ranged hurl without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/druid:spell-level-0:spell-unit-pressure:druid_spell_list_produce_flame",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidProduceFlameBuild();",
      'sourceUnitId: "class_druid"',
      "cantrips: expect.arrayContaining([produceFlameSpellId])",
      "build: druidBuild,",
      "casterId: produceFlameDruidId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneDruidProduceFlameBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneDruidBuild({",
          'draftIdText: "draft:l1-sdk-druid-produce-flame"',
          'expectedBuildLabel: "Druid Produce Flame"',
          "cantrips: [produceFlameSpellId, poisonSpraySpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneDruidBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_druid"',
          '"class_cantrip_choices"',
          '"druid_primal_order"',
          '"primal_order"',
          '"warden"',
          "const result = finalizeCharacterDraft({ draft: afterLoadout, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneProduceFlame",
        needles: [
          "hasCantripSpellInvocationAct(",
          '"heldLightHurl"',
          ").toBe(false)",
          "cantripCastHeldLightBonusActionSpellAct(",
          "produceFlameSpellId",
          "expect(heldLightAct.initialHoles).toEqual([])",
          'kind: "heldLight"',
          "brightRadiusFeet: 20",
          "dimAdditionalFeet: 20",
          "lightEmitters",
          "bonusActionAvailable: false",
          "litCaster.origin.spellcasting?.spellSlots",
          "cantripCastActionSpellAct(",
          '"heldLightHurl"',
          '"objectTargetChoice"',
          '"Produce Flame object target"',
          "requiresTableSpatialFact: true",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCreatureOrObject" }',
          "rangeFeet: 60",
          "expr: { dice: 1, dieSize: 8 }",
          'damageType: "fire"',
          'label: "Produce Flame damage (1d8-fire)"',
          "damageRollFillWithGroups(damage, [[5]])",
          "Hp(5)",
          'effect.kind === "heldLight"',
          "expect(snapshotBattle(resolved.state).lightEmitters).toEqual([]);",
          "expect(snapshotBattle(resolved.state).turn).toMatchObject({",
          "actionResources: []",
          "bonusActionAvailable: false",
          "input.expectedSpellSlots",
        ],
      },
      {
        anchor: "function cantripCastHeldLightBonusActionSpellAct",
        needles: [
          'cantripSpellInvocationRef(spellId, "heldLight")',
          'candidate.subject.tag === "bonusActionSpell"',
          "candidate.subject.invocation.procedure === expectedInvocation.procedure",
          "return act;",
        ],
      },
      {
        anchor: "function hasCantripSpellInvocationAct",
        needles: [
          '"actorId" in candidate.subject',
          '"invocation" in candidate.subject',
          "candidate.subject.invocation.procedure === expectedInvocation.procedure",
          "return discoverBattleActs(state).some(",
        ],
      },
    ],
  },
  {
    candidateUnitId: "shillelagh",
    className: "Druid",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Druid Shillelagh cantrip resolves from a level-1 sheet as a Bonus Action Quarterstaff weapon override",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/druid:spell-level-0:spell-unit-pressure:druid_spell_list_shillelagh",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidShillelaghBuild();",
      'sourceUnitId: "class_druid"',
      "cantrips: expect.arrayContaining([shillelaghSpellId])",
      "build: druidBuild,",
      "casterId: shillelaghDruidId,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneDruidShillelaghBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneDruidBuild({",
          'draftIdText: "draft:l1-sdk-druid-shillelagh"',
          'expectedBuildLabel: "Druid Shillelagh"',
          "cantrips: [produceFlameSpellId, shillelaghSpellId]",
          "weaponPurchase: {",
          'unitId: "weapon_quarterstaff"',
          'loadout: "wielded_one_handed"',
        ],
      },
      {
        anchor: "function finalizedLevelOneDruidBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_druid"',
          '"class_cantrip_choices"',
          '"druid_primal_order"',
          '"primal_order"',
          '"warden"',
          "readonly weaponPurchase?: LevelOneDruidWeaponPurchase;",
          "defaultDruidWeaponPurchase",
          "(input.weaponPurchase ?? defaultDruidWeaponPurchase).unitId",
          'testLoadoutHoleId(weaponPurchase.unitId, "weapon")',
          "weaponPurchase.loadout",
          "const result = finalizeCharacterDraft({ draft: afterLoadout, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneShillelagh",
        needles: [
          "shillelaghBonusActionSpellAct(state, input.casterId)",
          'tag: "bonusActionSpell"',
          "spellId: shillelaghSpellId",
          'procedure: "weaponAttackOverride"',
          "componentWeaponItemId: shillelaghQuarterstaffItemId",
          'kind: "spellWeaponAttackOverride"',
          "spellcastingAbilityModifier: abilityModifier(2)",
          "attackBonus: attackBonus(4)",
          "damage: { expr: { dice: 1, dieSize: 8 } }",
          'damageTypeChoices: ["force", "bludgeoning"]',
          "durationTicks: shillelaghDurationTicks",
          "bonusActionAvailable).toBe(false)",
          "spellSlotUsesThisTurn).toEqual([])",
          "caster.concentration).toBeNull()",
          "input.expectedSpellSlots",
          '"Quarterstaff (force)"',
          "attackBonus: attackBonus(4)",
          'label: "Quarterstaff (force) damage (1d8+2-force)"',
          '"Quarterstaff (bludgeoning)"',
          "damageDice: [[5]]",
          "expect(requireCombatant(hit.state, monsterId).hp).toBe(Hp(6));",
        ],
      },
      {
        anchor: "function shillelaghBonusActionSpellAct",
        needles: [
          "cantripSpellInvocationRef(",
          "shillelaghSpellId",
          '"weaponAttackOverride"',
          'candidate.subject.tag === "bonusActionSpell"',
          "candidate.subject.componentWeaponItemId === shillelaghQuarterstaffItemId",
          "return act;",
        ],
      },
    ],
  },
  {
    candidateUnitId: "sacred_flame",
    className: "Cleric",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Cleric Sacred Flame cantrip resolves from a level-1 sheet as a Dexterity save with Radiant damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/cleric:spell-level-0:spell-unit-pressure:cleric_spell_list_sacred_flame",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericSacredFlameBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "cantrips: expect.arrayContaining([sacredFlameSpellId])",
      "build: clericBuild,",
      "casterId: sacredFlameClericId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneClericSacredFlameBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneClericBuild({",
          'draftIdText: "draft:l1-sdk-cleric-sacred-flame"',
          'expectedBuildLabel: "Cleric Sacred Flame"',
          'cantrips: ["guidance", sacredFlameSpellId, thaumaturgySpellId]',
          "blessSpellId",
          "shieldOfFaithSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneClericBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_cleric"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          '"cleric_divine_order"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneSacredFlame",
        needles: [
          "cantripCastActionSpellAct(",
          '"saveGatedDamage"',
          "spellTargetFill(",
          'label: "Sacred Flame Saving Throw outcome"',
          'ability: "dex"',
          'resource: { tag: "none" }',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 8 }, damageType: "radiant" }',
          'successDamage: "none"',
          "rangeFeet: 60",
          "savingThrowOutcomeFill(save,",
          "{ targetId: monsterId, succeeded: false }",
          "{ targetId: monsterId, succeeded: true }",
          'label: "Sacred Flame damage (1d8-radiant)"',
          "damageRollFillWithGroups(damage, [[7]])",
          "expect(requireCombatant(failedSave.state, monsterId).hp).toBe(Hp(6));",
          "expect(requireCombatant(successfulSave.state, monsterId).hp).toBe(Hp(13));",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "thaumaturgy",
    className: "Cleric",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Cleric Thaumaturgy Booming Voice cantrip resolves from a level-1 sheet with Advantage on Charisma (Intimidation) Ability Checks",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:31-35",
      ".references/srd-5.2.1/Classes/Cleric.md:56-60",
      ".references/srd-5.2.1/Classes/Cleric.md:146-156",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:40-58",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Descriptions-S-Z.md:848-861",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-0:spell-unit-pressure:cleric_spell_list_thaumaturgy",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericThaumaturgyBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "cantrips: expect.arrayContaining([thaumaturgySpellId])",
      "build: clericBuild,",
      "casterId: thaumaturgyClericId,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneClericThaumaturgyBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneClericBuild({",
          'draftIdText: "draft:l1-sdk-cleric-thaumaturgy"',
          'expectedBuildLabel: "Cleric Thaumaturgy"',
          "thaumaturgySpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneClericBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_cleric"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneThaumaturgyBoomingVoice",
        needles: [
          "cantripCastActionSpellAct(",
          "thaumaturgySpellId",
          '"thaumaturgyBoomingVoice"',
          '"thaumaturgyActiveOneMinuteEffectCount"',
          'label: "Thaumaturgy total active 1-minute effects"',
          "maximumActiveOneMinuteEffects: 3",
          "requiresTableSpellEffectCount: true",
          "noActiveThaumaturgyOneMinuteEffectsFill(countHole)",
          'kind: "thaumaturgyBoomingVoice"',
          "sourceSpellId: thaumaturgySpellId",
          "sourceCombatantId: input.casterId",
          'kind: "duration"',
          "durationTicks: thaumaturgyDurationTicks",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "expect(resolved.state.currentTurnResources.spellSlotUsesThisTurn).toEqual([]);",
          "expect(caster.concentration).toBeNull();",
          "input.expectedSpellSlots",
          "thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(",
          "difficultyClass(13)",
          'ability: "cha"',
          'skill: "intimidation"',
          'rollMode: "advantage"',
        ],
      },
      {
        anchor: "function noActiveThaumaturgyOneMinuteEffectsFill",
        needles: [
          'kind: "thaumaturgyActiveOneMinuteEffectCount"',
          "value: { activeOneMinuteEffectCount: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "guiding_bolt",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric Guiding Bolt resolves from a level-1 sheet as a ranged Spell Attack with Advantage on the next Attack Roll against the target before the caster's next turn ends",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [".references/srd-5.2.1/Spells/Descriptions-E-L.md:992-1003"],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_guiding_bolt",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericGuidingBoltBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([guidingBoltSpellId])",
      "build: clericBuild,",
      "casterId: guidingBoltClericId,",
      "allyId: guidingBoltAllyId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneClericGuidingBoltBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneClericBuild({",
          'draftIdText: "draft:l1-sdk-cleric-guiding-bolt"',
          'expectedBuildLabel: "Cleric Guiding Bolt"',
          "guidingBoltSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneClericBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_cleric"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneGuidingBolt",
        needles: [
          "spellSlotActForProcedure(",
          "guidingBoltSpellId",
          '"spellAttackDamage"',
          "choices: expect.arrayContaining([monsterId])",
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 120",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 4, dieSize: 6 }",
          'damageType: "radiant"',
          'kind: "nextAttackRollAgainstTarget"',
          'mode: "advantage"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Guiding Bolt damage (4d6-radiant)"',
          "damageRollFillWithGroups(damage, [[2, 2, 2, 2]])",
          "hp: Hp(5)",
          'kind: "nextAttackRollAgainstSelf"',
          "sourceSpellId: guidingBoltSpellId",
          'kind: "endOfTurn"',
          "combatantId: input.casterId",
          "round: 2",
          "expect(snapshotBattle(guided.state).turn.actionResources).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 1 }",
          'attackSubject(allyTurn, input.allyId, "Longsword")',
          'expect(allyAttackRoll).toMatchObject({ rollMode: "advantage" });',
          "expect(requireCombatant(consumed.state, monsterId).activeEffects).toEqual([]);",
        ],
      },
    ],
  },
  {
    candidateUnitId: "inflict_wounds",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric Inflict Wounds resolves from a level-1 sheet as a Constitution save with Necrotic damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:68-76",
      ".references/srd-5.2.1/Classes/Cleric.md:158-172",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1417-1428",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_inflict_wounds",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericInflictWoundsBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([inflictWoundsSpellId])",
      "build: clericBuild,",
      "casterId: inflictWoundsClericId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneClericInflictWoundsBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneClericBuild({",
          'draftIdText: "draft:l1-sdk-cleric-inflict-wounds"',
          'expectedBuildLabel: "Cleric Inflict Wounds"',
          "inflictWoundsSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneClericBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_cleric"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneInflictWounds",
        needles: [
          "spellSlotActForProcedure(",
          "inflictWoundsSpellId",
          '"saveGatedDamage"',
          "spellTargetFill(",
          "spellSaveDcForCaster(state, input.casterId)",
          'label: "Inflict Wounds Saving Throw outcome"',
          'ability: "con"',
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 2, dieSize: 10 }, damageType: "necrotic" }',
          'successDamage: "half"',
          "rangeFeet: 5",
          "savingThrowOutcomeFill(save,",
          "{ targetId: monsterId, succeeded: false }",
          'label: "Inflict Wounds damage (2d10-necrotic)"',
          "damageRollFillWithGroups(failedDamage, [[5, 5]])",
          "expect(requireCombatant(failedSave.state, monsterId).hp).toBe(Hp(3));",
          "expect(snapshotBattle(failedSave.state).turn.actionResources).toEqual([]);",
          "failedSaveCaster.origin.spellcasting?.spellSlots",
          "{ spellLevel: 1, count: 2, expended: 1 }",
          "{ targetId: monsterId, succeeded: true }",
          "damageRollFillWithGroups(successDamage, [[5, 5]])",
          "expect(requireCombatant(successfulSave.state, monsterId).hp).toBe(Hp(8));",
          "expect(snapshotBattle(successfulSave.state).turn.actionResources).toEqual([]);",
          "successfulSaveCaster.origin.spellcasting?.spellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "sanctuary",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric Sanctuary resolves from a level-1 sheet as a one-minute Bonus Action ward with a Wisdom save interdiction",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:31-76",
      ".references/srd-5.2.1/Classes/Cleric.md:158-175",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-100",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-118",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:142-148",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:156-176",
      ".references/srd-5.2.1/Spells/Descriptions-S-Z.md:22-31",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_sanctuary",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericSanctuaryBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([sanctuarySpellId])",
      "build: clericBuild,",
      "casterId: sanctuaryClericId,",
      "wardedId: sanctuaryWardedAllyId,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneClericSanctuaryBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneClericBuild({",
          'draftIdText: "draft:l1-sdk-cleric-sanctuary"',
          'expectedBuildLabel: "Cleric Sanctuary"',
          "sanctuarySpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneClericBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_cleric"',
          '"class_cantrip_choices"',
          '"class_prepared_spell_choices"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneSanctuary",
        needles: [
          "sanctuaryBonusActionSpellSlotAct(",
          '"sanctuaryTargetingInterdiction"',
          '"spellTargetList"',
          'label: "Sanctuary targets"',
          "minTargets: 1",
          "maxTargets: 1",
          "requiresTableSpatialFact: true",
          "choices: expect.arrayContaining([input.wardedId])",
          'access: { tag: "prepared" }',
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'actionCost: "bonusAction"',
          'targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 }',
          "rangeFeet: movementFeet(30)",
          'kind: "sanctuaryWard"',
          "sourceSpellId: sanctuarySpellId",
          "sourceCombatantId: input.casterId",
          'save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } }',
          "durationTicks: sanctuaryDurationTicks",
          "sanctuaryTargetListFill(",
          "expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(false);",
          'kind: "committed"',
          "combatantId: input.casterId",
          "expect(caster.concentration).toBeNull();",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
      {
        anchor: "function sanctuaryBonusActionSpellSlotAct",
        needles: [
          'candidate.subject.tag === "bonusActionSpell"',
          'candidate.subject.invocation.tag === "spellSlot"',
          "candidate.subject.invocation.spellId === sanctuarySpellId",
          "candidate.subject.invocation.slotLevel === 1",
          '"sanctuaryTargetingInterdiction"',
          "return act;",
        ],
      },
      {
        anchor: "function sanctuaryTargetListFill",
        needles: [
          'kind: "spellTargetList"',
          "value: { targetIds: [targetId] }",
          'kind: "spellTarget"',
          "casterId",
          "targetId",
          "spellId: sanctuarySpellId",
        ],
      },
    ],
  },
  {
    candidateUnitId: "poison_spray",
    className: "Warlock",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Druid and Warlock Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/warlock:spell-level-0:spell-unit-pressure:warlock_spell_list_poison_spray",
    tracerNeedles: [
      "const warlockBuild = finalizedLevelOneWarlockPoisonSprayBuild();",
      'sourceUnitId: "class_warlock"',
      "cantrips: expect.arrayContaining([poisonSpraySpellId])",
      'pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 }',
      "build: warlockBuild,",
      "casterId: poisonSprayWarlockId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 1, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWarlockPoisonSprayBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWarlockBuild({",
          'draftIdText: "draft:l1-sdk-warlock-poison-spray"',
          'expectedBuildLabel: "Warlock Poison Spray"',
          'cantrips: [poisonSpraySpellId, "eldritch_blast"]',
          'eldritchInvocation: "eldritch_mind"',
        ],
      },
      {
        anchor: "function finalizedLevelOneWarlockBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_warlock"',
          '"class_cantrip_choices"',
          '"warlock_eldritch_invocations"',
          '"eldritch_invocations"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOnePoisonSpray",
        needles: [
          "cantripCastActionSpellAct(",
          "poisonSpraySpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 30",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 12 }",
          'damageType: "poison"',
          "postDamageRiders: []",
          'label: "Poison Spray damage (1d12-poison)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[7]]",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "poison_spray",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Poison Spray cantrips resolve from level-1 sheets as ranged spell attacks with Poison damage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_poison_spray",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardPoisonSprayBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([poisonSpraySpellId])",
      "build: wizardBuild,",
      "casterId: poisonSprayWizardId,",
      "expectedSpellAttackBonus: 5,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardPoisonSprayBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-poison-spray"',
          'expectedBuildLabel: "Wizard Poison Spray"',
          'cantrips: [poisonSpraySpellId, fireBoltSpellId, "ray_of_frost"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOnePoisonSpray",
        needles: [
          "cantripCastActionSpellAct(",
          "poisonSpraySpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 30",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 12 }",
          'damageType: "poison"',
          "postDamageRiders: []",
          'label: "Poison Spray damage (1d12-poison)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[7]]",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(3));",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "chill_touch",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer, Warlock, and Wizard Chill Touch cantrips resolve from level-1 sheets as melee spell attacks with Hit Point regain prevention",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_chill_touch",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererChillTouchBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([chillTouchSpellId])",
      "build: sorcererBuild,",
      "casterId: chillTouchSorcererId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererChillTouchBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-chill-touch"',
          'expectedBuildLabel: "Sorcerer Chill Touch"',
          "chillTouchSpellId,",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneChillTouch",
        needles: [
          "cantripCastActionSpellAct(",
          "chillTouchSpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          '"objectTargetChoice"',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "melee_spell_attack"',
          'targeting: { kind: "singleCreatureOrObject" }',
          "requiresTableSpatialFact: true",
          "rangeFeet: 5",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "necrotic"',
          'kind: "hitPointRegainPrevented"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Chill Touch damage (1d10-necrotic)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[6]]",
          "hp: Hp(4)",
          "sourceSpellId: chillTouchSpellId",
          "sourceCombatantId: input.casterId",
          "combatantId: input.casterId",
          "round: 2",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "chill_touch",
    className: "Warlock",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer, Warlock, and Wizard Chill Touch cantrips resolve from level-1 sheets as melee spell attacks with Hit Point regain prevention",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/warlock:spell-level-0:spell-unit-pressure:warlock_spell_list_chill_touch",
    tracerNeedles: [
      "const warlockBuild = finalizedLevelOneWarlockChillTouchBuild();",
      'sourceUnitId: "class_warlock"',
      "cantrips: expect.arrayContaining([chillTouchSpellId])",
      'pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 }',
      "build: warlockBuild,",
      "casterId: chillTouchWarlockId,",
      "expectedSpellAttackBonus: 4,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 1, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWarlockChillTouchBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWarlockBuild({",
          'draftIdText: "draft:l1-sdk-warlock-chill-touch"',
          'expectedBuildLabel: "Warlock Chill Touch"',
          'cantrips: [chillTouchSpellId, "eldritch_blast"]',
          'eldritchInvocation: "eldritch_mind"',
        ],
      },
      {
        anchor: "function finalizedLevelOneWarlockBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_warlock"',
          '"class_cantrip_choices"',
          '"warlock_eldritch_invocations"',
          '"eldritch_invocations"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneChillTouch",
        needles: [
          "cantripCastActionSpellAct(",
          "chillTouchSpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          '"objectTargetChoice"',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "melee_spell_attack"',
          'targeting: { kind: "singleCreatureOrObject" }',
          "requiresTableSpatialFact: true",
          "rangeFeet: 5",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "necrotic"',
          'kind: "hitPointRegainPrevented"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Chill Touch damage (1d10-necrotic)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[6]]",
          "hp: Hp(4)",
          "sourceSpellId: chillTouchSpellId",
          "sourceCombatantId: input.casterId",
          "combatantId: input.casterId",
          "round: 2",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "chill_touch",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer, Warlock, and Wizard Chill Touch cantrips resolve from level-1 sheets as melee spell attacks with Hit Point regain prevention",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_chill_touch",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardChillTouchBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([chillTouchSpellId])",
      "build: wizardBuild,",
      "casterId: chillTouchWizardId,",
      "expectedSpellAttackBonus: 5,",
      "expectedSpellSlots: [{ spellLevel: 1, count: 2, expended: 0 }],",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardChillTouchBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-chill-touch"',
          'expectedBuildLabel: "Wizard Chill Touch"',
          'cantrips: [chillTouchSpellId, fireBoltSpellId, "ray_of_frost"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneChillTouch",
        needles: [
          "cantripCastActionSpellAct(",
          "chillTouchSpellId",
          'srdStatBlock("stat_block_goblin_warrior")',
          '"objectTargetChoice"',
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "melee_spell_attack"',
          'targeting: { kind: "singleCreatureOrObject" }',
          "requiresTableSpatialFact: true",
          "rangeFeet: 5",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "necrotic"',
          'kind: "hitPointRegainPrevented"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Chill Touch damage (1d10-necrotic)"',
          "ordinaryAttackDamageFills({",
          "damageDice: [[6]]",
          "hp: Hp(4)",
          "sourceSpellId: chillTouchSpellId",
          "sourceCombatantId: input.casterId",
          "combatantId: input.casterId",
          "round: 2",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "input.expectedSpellSlots",
        ],
      },
    ],
  },
  {
    candidateUnitId: "eldritch_blast",
    className: "Warlock",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Warlock Eldritch Blast cantrip resolves from a level-1 sheet as a ranged one-beam Spell Attack sequence without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/warlock:spell-level-0:spell-unit-pressure:warlock_spell_list_eldritch_blast",
    tracerNeedles: [
      "const warlockBuild = finalizedLevelOneWarlockEldritchBlastBuild();",
      'sourceUnitId: "class_warlock"',
      "cantrips: expect.arrayContaining([eldritchBlastSpellId])",
      'pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 }',
      "build: warlockBuild,",
      "casterId: eldritchBlastWarlockId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWarlockEldritchBlastBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWarlockBuild({",
          'draftIdText: "draft:l1-sdk-warlock-eldritch-blast"',
          'expectedBuildLabel: "Warlock Eldritch Blast"',
          "cantrips: [eldritchBlastSpellId, poisonSpraySpellId]",
          'eldritchInvocation: "eldritch_mind"',
        ],
      },
      {
        anchor: "function finalizedLevelOneWarlockBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_warlock"',
          '"class_cantrip_choices"',
          '"warlock_eldritch_invocations"',
          '"eldritch_invocations"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneEldritchBlast",
        needles: [
          "cantripCastActionSpellAct(",
          "eldritchBlastSpellId",
          '"spellAttackSequence"',
          'srdStatBlock("stat_block_goblin_warrior")',
          "expect(act.initialHoles).toHaveLength(2)",
          '"Eldritch Blast attack 1 target"',
          '"Eldritch Blast attack 1 object target"',
          "requiresTableSpatialFact: true",
          "attackBonus: input.expectedSpellAttackBonus",
          'resource: { tag: "none" }',
          'attackKind: "ranged_spell_attack"',
          'kind: "spellAttackSequenceCreatureOrObject"',
          'countSource: "characterLevel"',
          "attackCount: 1",
          "rangeFeet: 120",
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "force"',
          'label: "Eldritch Blast attack 1 damage (1d10-force)"',
          "damageRollFillWithGroups(damage, [[6]])",
          "Hp(4)",
          "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
          "{ spellLevel: 1, count: 1, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "hex",
    className: "Warlock",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Warlock Hex resolves from a level-1 sheet through Pact Magic as a marked Necrotic rider and chosen Ability Check Disadvantage",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Warlock.md:68-89",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1198-1212",
    ],
    rowId:
      "srd521:classes/warlock:spell-level-1:spell-unit-pressure:warlock_spell_list_hex",
    tracerNeedles: [
      "const warlockBuild = finalizedLevelOneWarlockHexBuild();",
      'sourceUnitId: "class_warlock"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([hexSpellId])",
      'pactMagic: { kind: "pactMagic", slotLevel: 1, count: 1 }',
      "const hexSheet = characterSheet({",
      "hexBonusActionSpellSlotAct(state, hexWarlockId)",
      'abilityChoiceFill(ability, "wis")',
      'kind: "spellMarkedDamageRider"',
      'damageType: "necrotic"',
      'retargetTiming: "laterTurn"',
      "Battle handoff while active battle effects or Concentration are present is blocked",
      "breakBattleConcentration(",
      "settleCharacterSheetFromBattle({",
      "characterSheetPactSlots(settled)",
    ],
    helperNeedles: [
      {
        anchor: "function finalizedLevelOneWarlockHexBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWarlockBuild({",
          'draftIdText: "draft:l1-sdk-warlock-hex"',
          'expectedBuildLabel: "Warlock Hex"',
          "cantrips: [eldritchBlastSpellId, poisonSpraySpellId]",
          'preparedSpells: [hexSpellId, "hellish_rebuke"]',
          'eldritchInvocation: "eldritch_mind"',
        ],
      },
      {
        anchor: "function finalizedLevelOneWarlockBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          '"class_warlock"',
          '"class_prepared_spell_choices"',
          '"warlock_eldritch_invocations"',
          '"eldritch_invocations"',
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function hexBonusActionSpellSlotAct",
        needles: [
          'candidate.subject.tag === "bonusActionSpell"',
          "candidate.subject.actorId === actorId",
          'candidate.subject.invocation.tag === "spellSlot"',
          "candidate.subject.invocation.spellId === hexSpellId",
          "candidate.subject.invocation.slotLevel === 1",
          'candidate.subject.invocation.procedure === "markedDamageRider"',
        ],
      },
      {
        anchor: "function abilityChoiceFill",
        needles: ['kind: "abilityChoice"', "holeId: hole.holeId"],
      },
    ],
  },
  {
    candidateUnitId: "animal_friendship",
    className: "Bard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Druid, and Ranger Animal Friendship resolve from level-1 spell-list choices as Beast-only Wisdom save Charmed effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Bard.md:79-89",
      ".references/srd-5.2.1/Classes/Bard.md:158-184",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:85-94",
    ],
    rowId:
      "srd521:classes/bard:spell-level-1:spell-unit-pressure:bard_spell_list_animal_friendship",
    tracerNeedles: [
      "const bardBuild = finalizedLevelOneBardAnimalFriendshipBuild();",
      'sourceUnitId: "class_bard"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([animalFriendshipSpellId])",
      "build: bardBuild,",
      "casterId: animalFriendshipBardId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: animalFriendshipSdkHelperNeedles(),
  },
  {
    candidateUnitId: "animal_friendship",
    className: "Druid",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Druid, and Ranger Animal Friendship resolve from level-1 spell-list choices as Beast-only Wisdom save Charmed effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Druid.md:67-77",
      ".references/srd-5.2.1/Classes/Druid.md:200-216",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:85-94",
    ],
    rowId:
      "srd521:classes/druid:spell-level-1:spell-unit-pressure:druid_spell_list_animal_friendship",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidAnimalFriendshipBuild();",
      'sourceUnitId: "class_druid"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([animalFriendshipSpellId])",
      "build: druidBuild,",
      "casterId: animalFriendshipDruidId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: animalFriendshipSdkHelperNeedles(),
  },
  {
    candidateUnitId: "animal_friendship",
    className: "Ranger",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Druid, and Ranger Animal Friendship resolve from level-1 spell-list choices as Beast-only Wisdom save Charmed effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Ranger.md:58-74",
      ".references/srd-5.2.1/Classes/Ranger.md:160-176",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:85-94",
    ],
    rowId:
      "srd521:classes/ranger:spell-level-1:spell-unit-pressure:ranger_spell_list_animal_friendship",
    tracerNeedles: [
      "const rangerBuild = finalizedLevelOneRangerAnimalFriendshipBuild();",
      'sourceUnitId: "class_ranger"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([animalFriendshipSpellId])",
      "build: rangerBuild,",
      "casterId: animalFriendshipRangerId,",
      "expectedSpellSaveDc: 11,",
    ],
    helperNeedles: animalFriendshipSdkHelperNeedles(),
  },
  {
    candidateUnitId: "ranger_favored_enemy",
    className: "Ranger",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Ranger Favored Enemy casts Hunter's Mark from a level-1 sheet without spending a Spell Slot and restores its free-cast pool on Long Rest",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Ranger.md:58-81",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1275-1289",
    ],
    rowId:
      "srd521:classes/ranger:level-1:class-feature-grant:ranger_favored_enemy",
    tracerNeedles: rangerFavoredEnemyHuntersMarkSdkTracerNeedles(),
    helperNeedles: rangerFavoredEnemyHuntersMarkSdkHelperNeedles(),
  },
  {
    candidateUnitId: "hunters_mark",
    className: "Ranger",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Ranger Hunter's Mark resolves from a level-1 prepared spell-list choice through a Spell Slot",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Ranger.md:58-81",
      ".references/srd-5.2.1/Classes/Ranger.md:173",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1275-1289",
    ],
    rowId:
      "srd521:classes/ranger:spell-level-1:spell-unit-pressure:ranger_spell_list_hunters_mark",
    tracerNeedles: rangerSpellListHuntersMarkSdkTracerNeedles(),
    helperNeedles: rangerSpellListHuntersMarkSdkHelperNeedles(),
  },
  {
    candidateUnitId: "bless",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric and Paladin Bless resolve from level-1 prepared spell-list choices as Concentration Attack Roll and Saving Throw active effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:33-35",
      ".references/srd-5.2.1/Classes/Cleric.md:56-78",
      ".references/srd-5.2.1/Classes/Cleric.md:158-164",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:533-544",
      ".references/srd-5.2.1/Rules-Glossary.md:239-247",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_bless",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericBlessBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([blessSpellId])",
      "build: clericBuild,",
      "casterId: blessClericId,",
      "targetId: blessTargetId,",
    ],
    helperNeedles: blessSdkHelperNeedles("Cleric"),
  },
  {
    candidateUnitId: "bless",
    className: "Paladin",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric and Paladin Bless resolve from level-1 prepared spell-list choices as Concentration Attack Roll and Saving Throw active effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Paladin.md:33-56",
      ".references/srd-5.2.1/Classes/Paladin.md:66-82",
      ".references/srd-5.2.1/Classes/Paladin.md:168-176",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:533-544",
      ".references/srd-5.2.1/Rules-Glossary.md:239-247",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/paladin:spell-level-1:spell-unit-pressure:paladin_spell_list_bless",
    tracerNeedles: [
      "const paladinBuild = finalizedLevelOnePaladinBlessBuild();",
      'sourceUnitId: "class_paladin"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([blessSpellId])",
      "build: paladinBuild,",
      "casterId: blessPaladinId,",
      "targetId: blessTargetId,",
    ],
    helperNeedles: blessSdkHelperNeedles("Paladin"),
  },
  {
    candidateUnitId: "shield_of_faith",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric and Paladin Shield of Faith resolve from level-1 prepared spell-list choices as Bonus Action Concentration Armor Class active effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:33-35",
      ".references/srd-5.2.1/Classes/Cleric.md:56-78",
      ".references/srd-5.2.1/Classes/Cleric.md:168-176",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-100",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:122-124",
      ".references/srd-5.2.1/Spells/Descriptions-S-Z.md:228-237",
      ".references/srd-5.2.1/Rules-Glossary.md:239-247",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_shield_of_faith",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericShieldOfFaithBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([shieldOfFaithSpellId])",
      "build: clericBuild,",
      "casterId: shieldOfFaithClericId,",
      "targetId: shieldOfFaithTargetId,",
    ],
    helperNeedles: shieldOfFaithSdkHelperNeedles("Cleric"),
    evidenceNeedles: shieldOfFaithSdkEvidenceNeedles(),
  },
  {
    candidateUnitId: "shield_of_faith",
    className: "Paladin",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Cleric and Paladin Shield of Faith resolve from level-1 prepared spell-list choices as Bonus Action Concentration Armor Class active effects",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Paladin.md:33-56",
      ".references/srd-5.2.1/Classes/Paladin.md:66-82",
      ".references/srd-5.2.1/Classes/Paladin.md:180-188",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-100",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:122-124",
      ".references/srd-5.2.1/Spells/Descriptions-S-Z.md:228-237",
      ".references/srd-5.2.1/Rules-Glossary.md:239-247",
    ],
    rowId:
      "srd521:classes/paladin:spell-level-1:spell-unit-pressure:paladin_spell_list_shield_of_faith",
    tracerNeedles: [
      "const paladinBuild = finalizedLevelOnePaladinShieldOfFaithBuild();",
      'sourceUnitId: "class_paladin"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([shieldOfFaithSpellId])",
      "build: paladinBuild,",
      "casterId: shieldOfFaithPaladinId,",
      "targetId: shieldOfFaithTargetId,",
    ],
    helperNeedles: shieldOfFaithSdkHelperNeedles("Paladin"),
    evidenceNeedles: shieldOfFaithSdkEvidenceNeedles(),
  },
  {
    candidateUnitId: "cure_wounds",
    className: "Bard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, Druid, Paladin, and Ranger Cure Wounds resolve from level-1 prepared spell-list choices as Magic Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Bard.md:34-36",
      ".references/srd-5.2.1/Classes/Bard.md:69-89",
      ".references/srd-5.2.1/Classes/Bard.md:158-168",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1288",
      ".references/srd-5.2.1/Rules-Glossary.md:138-140",
      ".references/srd-5.2.1/Rules-Glossary.md:562",
      ".references/srd-5.2.1/Rules-Glossary.md:810-812",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/bard:spell-level-1:spell-unit-pressure:bard_spell_list_cure_wounds",
    tracerNeedles: [
      "const bardBuild = finalizedLevelOneBardCureWoundsBuild();",
      'sourceUnitId: "class_bard"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([cureWoundsSpellId])",
      "build: bardBuild,",
      "casterId: cureWoundsBardId,",
      "targetId: cureWoundsTargetId,",
      "expectedSpellcastingAbilityModifier: 2,",
      "targetCurrentHp: 4,",
      "expectedResolvedHp: 11,",
    ],
    helperNeedles: cureWoundsSdkHelperNeedles("Bard"),
  },
  {
    candidateUnitId: "cure_wounds",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, Druid, Paladin, and Ranger Cure Wounds resolve from level-1 prepared spell-list choices as Magic Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:33-35",
      ".references/srd-5.2.1/Classes/Cleric.md:56-76",
      ".references/srd-5.2.1/Classes/Cleric.md:160-166",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1288",
      ".references/srd-5.2.1/Rules-Glossary.md:138-140",
      ".references/srd-5.2.1/Rules-Glossary.md:562",
      ".references/srd-5.2.1/Rules-Glossary.md:810-812",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_cure_wounds",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericCureWoundsBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([cureWoundsSpellId])",
      "build: clericBuild,",
      "casterId: cureWoundsClericId,",
      "targetId: cureWoundsTargetId,",
      "expectedSpellcastingAbilityModifier: 2,",
      "targetCurrentHp: 4,",
      "expectedResolvedHp: 11,",
    ],
    helperNeedles: cureWoundsSdkHelperNeedles("Cleric"),
  },
  {
    candidateUnitId: "cure_wounds",
    className: "Druid",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, Druid, Paladin, and Ranger Cure Wounds resolve from level-1 prepared spell-list choices as Magic Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Druid.md:30-32",
      ".references/srd-5.2.1/Classes/Druid.md:57-77",
      ".references/srd-5.2.1/Classes/Druid.md:200-207",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1288",
      ".references/srd-5.2.1/Rules-Glossary.md:138-140",
      ".references/srd-5.2.1/Rules-Glossary.md:562",
      ".references/srd-5.2.1/Rules-Glossary.md:810-812",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/druid:spell-level-1:spell-unit-pressure:druid_spell_list_cure_wounds",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidCureWoundsBuild();",
      'sourceUnitId: "class_druid"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([cureWoundsSpellId])",
      "build: druidBuild,",
      "casterId: cureWoundsDruidId,",
      "targetId: cureWoundsTargetId,",
      "expectedSpellcastingAbilityModifier: 2,",
      "targetCurrentHp: 8,",
      "expectedResolvedHp: 12,",
    ],
    helperNeedles: cureWoundsSdkHelperNeedles("Druid"),
  },
  {
    candidateUnitId: "cure_wounds",
    className: "Paladin",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, Druid, Paladin, and Ranger Cure Wounds resolve from level-1 prepared spell-list choices as Magic Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Paladin.md:33-56",
      ".references/srd-5.2.1/Classes/Paladin.md:66-82",
      ".references/srd-5.2.1/Classes/Paladin.md:168-184",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1288",
      ".references/srd-5.2.1/Rules-Glossary.md:138-140",
      ".references/srd-5.2.1/Rules-Glossary.md:562",
      ".references/srd-5.2.1/Rules-Glossary.md:810-812",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/paladin:spell-level-1:spell-unit-pressure:paladin_spell_list_cure_wounds",
    tracerNeedles: [
      "const paladinBuild = finalizedLevelOnePaladinCureWoundsBuild();",
      'sourceUnitId: "class_paladin"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([cureWoundsSpellId])",
      "build: paladinBuild,",
      "casterId: cureWoundsPaladinId,",
      "targetId: cureWoundsTargetId,",
      "expectedSpellcastingAbilityModifier: 2,",
      "targetCurrentHp: 4,",
      "expectedResolvedHp: 11,",
    ],
    helperNeedles: cureWoundsSdkHelperNeedles("Paladin"),
  },
  {
    candidateUnitId: "cure_wounds",
    className: "Ranger",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, Druid, Paladin, and Ranger Cure Wounds resolve from level-1 prepared spell-list choices as Magic Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Ranger.md:33-56",
      ".references/srd-5.2.1/Classes/Ranger.md:58-74",
      ".references/srd-5.2.1/Classes/Ranger.md:160-176",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-50",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:90-96",
      ".references/srd-5.2.1/Spells/Gaining-and-Casting.md:108-116",
      ".references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1288",
      ".references/srd-5.2.1/Rules-Glossary.md:138-140",
      ".references/srd-5.2.1/Rules-Glossary.md:562",
      ".references/srd-5.2.1/Rules-Glossary.md:810-812",
      ".references/srd-5.2.1/Rules-Glossary.md:698-700",
    ],
    rowId:
      "srd521:classes/ranger:spell-level-1:spell-unit-pressure:ranger_spell_list_cure_wounds",
    tracerNeedles: [
      "const rangerBuild = finalizedLevelOneRangerCureWoundsBuild();",
      'sourceUnitId: "class_ranger"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([cureWoundsSpellId])",
      "build: rangerBuild,",
      "casterId: cureWoundsRangerId,",
      "targetId: cureWoundsTargetId,",
      "expectedSpellcastingAbilityModifier: 1,",
      "targetCurrentHp: 4,",
      "expectedResolvedHp: 10,",
    ],
    helperNeedles: cureWoundsSdkHelperNeedles("Ranger"),
  },
  {
    candidateUnitId: "healing_word",
    className: "Bard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, and Druid Healing Word resolve from level-1 sheets as Bonus Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Bard.md:79-89",
      ".references/srd-5.2.1/Classes/Bard.md:174",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1121-1132",
    ],
    rowId:
      "srd521:classes/bard:spell-level-1:spell-unit-pressure:bard_spell_list_healing_word",
    tracerNeedles: [
      "const bardBuild = finalizedLevelOneBardHealingWordBuild();",
      'sourceUnitId: "class_bard"',
      'spellcastingAbility: "cha"',
      "preparedSpells: expect.arrayContaining([healingWordSpellId])",
      "build: bardBuild,",
      "casterId: healingWordBardId,",
    ],
    helperNeedles: healingWordSdkHelperNeedles(),
  },
  {
    candidateUnitId: "healing_word",
    className: "Cleric",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, and Druid Healing Word resolve from level-1 sheets as Bonus Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Cleric.md:66-76",
      ".references/srd-5.2.1/Classes/Cleric.md:171",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1121-1132",
    ],
    rowId:
      "srd521:classes/cleric:spell-level-1:spell-unit-pressure:cleric_spell_list_healing_word",
    tracerNeedles: [
      "const clericBuild = finalizedLevelOneClericHealingWordBuild();",
      'sourceUnitId: "class_cleric"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([healingWordSpellId])",
      "build: clericBuild,",
      "casterId: healingWordClericId,",
    ],
    helperNeedles: healingWordSdkHelperNeedles(),
  },
  {
    candidateUnitId: "healing_word",
    className: "Druid",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Bard, Cleric, and Druid Healing Word resolve from level-1 sheets as Bonus Action Hit Point restoration",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rawSources: [
      ".references/srd-5.2.1/Classes/Druid.md:67-77",
      ".references/srd-5.2.1/Classes/Druid.md:214",
      ".references/srd-5.2.1/Spells/Descriptions-E-L.md:1121-1132",
    ],
    rowId:
      "srd521:classes/druid:spell-level-1:spell-unit-pressure:druid_spell_list_healing_word",
    tracerNeedles: [
      "const druidBuild = finalizedLevelOneDruidHealingWordBuild();",
      'sourceUnitId: "class_druid"',
      'spellcastingAbility: "wis"',
      "preparedSpells: expect.arrayContaining([healingWordSpellId])",
      "build: druidBuild,",
      "casterId: healingWordDruidId,",
    ],
    helperNeedles: healingWordSdkHelperNeedles(),
  },
  {
    candidateUnitId: "ray_of_frost",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Ray of Frost cantrips resolve from level-1 sheets as ranged spell attacks with Cold damage and Speed reduction",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_ray_of_frost",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererRayOfFrostBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([rayOfFrostSpellId])",
      "build: sorcererBuild,",
      "casterId: rayOfFrostSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererRayOfFrostBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-ray-of-frost"',
          'expectedBuildLabel: "Sorcerer Ray of Frost"',
          "rayOfFrostSpellId,",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneRayOfFrost",
        needles: [
          "cantripCastActionSpellAct(",
          "rayOfFrostSpellId",
          "spellTargetFill(",
          "attackRollFill(attackRoll, { total: 14, naturalD20: 10 })",
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" }',
          "rangeFeet: 60",
          'label: "Ray of Frost damage (1d8-cold)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "hp: Hp(9)",
          'kind: "speedDelta"',
          "sourceSpellId: rayOfFrostSpellId",
          "deltaFeet: movementDeltaFeet(-10)",
          'kind: "startOfTurn"',
          "snapshotCombatant(resolved.state, monsterId).movement",
          "speedFeet: movementFeet(20)",
          "remainingFeet: movementFeet(20)",
          "{ spellLevel: 1, count: 2, expended: 0 }",
          "endTurn({ state: resolved.state, actorId: input.casterId })",
          "snapshotCombatant(afterCasterTurn.state, monsterId).movement",
          "endTurn({ state: afterCasterTurn.state, actorId: monsterId })",
          "activeEffects",
          "snapshotCombatant(afterSkeletonTurn.state, monsterId).movement",
          "speedFeet: movementFeet(30)",
          "remainingFeet: movementFeet(30)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "ray_of_frost",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Ray of Frost cantrips resolve from level-1 sheets as ranged spell attacks with Cold damage and Speed reduction",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_ray_of_frost",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardRayOfFrostBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([rayOfFrostSpellId])",
      "build: wizardBuild,",
      "casterId: rayOfFrostWizardId,",
      "expectedSpellAttackBonus: 5,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardRayOfFrostBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-ray-of-frost"',
          'expectedBuildLabel: "Wizard Ray of Frost"',
          "rayOfFrostSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneRayOfFrost",
        needles: [
          "cantripCastActionSpellAct(",
          "rayOfFrostSpellId",
          "spellTargetFill(",
          "attackRollFill(attackRoll, { total: 14, naturalD20: 10 })",
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" }',
          "rangeFeet: 60",
          'label: "Ray of Frost damage (1d8-cold)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "hp: Hp(9)",
          'kind: "speedDelta"',
          "sourceSpellId: rayOfFrostSpellId",
          "deltaFeet: movementDeltaFeet(-10)",
          'kind: "startOfTurn"',
          "snapshotCombatant(resolved.state, monsterId).movement",
          "speedFeet: movementFeet(20)",
          "remainingFeet: movementFeet(20)",
          "{ spellLevel: 1, count: 2, expended: 0 }",
          "endTurn({ state: resolved.state, actorId: input.casterId })",
          "snapshotCombatant(afterCasterTurn.state, monsterId).movement",
          "endTurn({ state: afterCasterTurn.state, actorId: monsterId })",
          "activeEffects",
          "snapshotCombatant(afterSkeletonTurn.state, monsterId).movement",
          "speedFeet: movementFeet(30)",
          "remainingFeet: movementFeet(30)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "shocking_grasp",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Shocking Grasp cantrips resolve from level-1 sheets as melee spell attacks with Lightning damage and Opportunity Attack denial",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_shocking_grasp",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererShockingGraspBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([shockingGraspSpellId])",
      "build: sorcererBuild,",
      "casterId: shockingGraspSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererShockingGraspBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-shocking-grasp"',
          'expectedBuildLabel: "Sorcerer Shocking Grasp"',
          "shockingGraspSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneShockingGrasp",
        needles: [
          "cantripCastActionSpellAct(",
          "shockingGraspSpellId",
          "spellTargetFill(",
          "attackRollFill(attackRoll, { total: 14, naturalD20: 10 })",
          'attackKind: "melee_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 8 }, damageType: "lightning" }',
          "rangeFeet: 5",
          'label: "Shocking Grasp damage (1d8-lightning)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "hp: Hp(9)",
          'kind: "opportunityAttackDenied"',
          "sourceSpellId: shockingGraspSpellId",
          "sourceCombatantId: input.casterId",
          'expiresAt: { kind: "startOfTurn", combatantId: monsterId }',
          "{ spellLevel: 1, count: 2, expended: 0 }",
          "endTurn({ state: resolved.state, actorId: input.casterId })",
          "afterInterveningTurnStart.state.combatants.get(monsterId)?.activeEffects",
          "state: afterInterveningTurnStart.state",
          "actorId: secondMonsterId",
          "afterTargetTurnStart.state.combatants.get(monsterId)?.activeEffects",
        ],
      },
    ],
  },
  {
    candidateUnitId: "shocking_grasp",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Shocking Grasp cantrips resolve from level-1 sheets as melee spell attacks with Lightning damage and Opportunity Attack denial",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_shocking_grasp",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardShockingGraspBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([shockingGraspSpellId])",
      "build: wizardBuild,",
      "casterId: shockingGraspWizardId,",
      "expectedSpellAttackBonus: 5,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardShockingGraspBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-shocking-grasp"',
          'expectedBuildLabel: "Wizard Shocking Grasp"',
          "shockingGraspSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneShockingGrasp",
        needles: [
          "cantripCastActionSpellAct(",
          "shockingGraspSpellId",
          "spellTargetFill(",
          "attackRollFill(attackRoll, { total: 14, naturalD20: 10 })",
          'attackKind: "melee_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          'damage: { expr: { dice: 1, dieSize: 8 }, damageType: "lightning" }',
          "rangeFeet: 5",
          'label: "Shocking Grasp damage (1d8-lightning)"',
          "damageRollFillWithGroups(damage, [[4]])",
          "hp: Hp(9)",
          'kind: "opportunityAttackDenied"',
          "sourceSpellId: shockingGraspSpellId",
          "sourceCombatantId: input.casterId",
          'expiresAt: { kind: "startOfTurn", combatantId: monsterId }',
          "{ spellLevel: 1, count: 2, expended: 0 }",
          "endTurn({ state: resolved.state, actorId: input.casterId })",
          "afterInterveningTurnStart.state.combatants.get(monsterId)?.activeEffects",
          "state: afterInterveningTurnStart.state",
          "actorId: secondMonsterId",
          "afterTargetTurnStart.state.combatants.get(monsterId)?.activeEffects",
        ],
      },
    ],
  },
  {
    candidateUnitId: "burning_hands",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer Burning Hands resolves from a level-1 sheet, applies Fire damage, and spends a spell slot",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_burning_hands",
    tracerNeedles: ["levelOneSorcererBurningHandsBuild", "burningHandsSpellId"],
  },
  {
    candidateUnitId: "burning_hands",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Wizard Burning Hands resolves from a level-1 spellbook sheet, applies Fire damage, and spends a spell slot",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_burning_hands",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardBurningHandsBuild();",
      "build: wizardBuild,",
      'sourceUnitId: "class_wizard"',
      "spellbook:",
      "preparedSpells:",
      "burningHandsSpellId",
    ],
    helperNeedles: [
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
    ],
  },
  {
    candidateUnitId: "mage_armor",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Mage Armor resolve from level-1 spell access as an 8-hour base AC effect",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_mage_armor",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererMageArmorBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([mageArmorSpellId])",
      "build: sorcererBuild,",
      "casterId: mageArmorSorcererId,",
      "expectedArmorClass: 16,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererMageArmorBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-mage-armor"',
          "preparedSpells: [mageArmorSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneMageArmor",
        needles: [
          "spellSlotActForProcedure(",
          "mageArmorSpellId",
          '"persistentArmorEffect"',
          '"targetChoice"',
          "choices: [input.casterId]",
          "spellTargetFill(",
          "snapshotCombatant(resolved.state, input.casterId)",
          "armorClass: input.expectedArmorClass",
          'kind: "spellBaseArmorClass"',
          "sourceSpellId: mageArmorSpellId",
          "sourceCombatantId: input.casterId",
          "base: 13",
          'ability: "dex"',
          "durationTicks: mageArmorDurationTicks",
          'earlyEnds: [{ kind: "targetDonsArmor" }]',
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "mage_armor",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Mage Armor resolve from level-1 spell access as an 8-hour base AC effect",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_mage_armor",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardMageArmorBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([mageArmorSpellId])",
      "preparedSpells: expect.arrayContaining([mageArmorSpellId])",
      "build: wizardBuild,",
      "casterId: mageArmorWizardId,",
      "expectedArmorClass: 15,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardMageArmorBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-mage-armor"',
          "mageArmorSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneMageArmor",
        needles: [
          "spellSlotActForProcedure(",
          "mageArmorSpellId",
          '"persistentArmorEffect"',
          '"targetChoice"',
          "choices: [input.casterId]",
          "spellTargetFill(",
          "snapshotCombatant(resolved.state, input.casterId)",
          "armorClass: input.expectedArmorClass",
          'kind: "spellBaseArmorClass"',
          "sourceSpellId: mageArmorSpellId",
          "sourceCombatantId: input.casterId",
          "base: 13",
          'ability: "dex"',
          "durationTicks: mageArmorDurationTicks",
          'earlyEnds: [{ kind: "targetDonsArmor" }]',
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "false_life",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard False Life resolve from level-1 spell access as self Temporary Hit Points",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_false_life",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererFalseLifeBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([falseLifeSpellId])",
      "build: sorcererBuild,",
      "casterId: falseLifeSorcererId,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererFalseLifeBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-false-life"',
          "preparedSpells: [falseLifeSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneFalseLife",
        needles: [
          "spellSlotActForProcedure(",
          "falseLifeSpellId",
          '"scalarBuff"',
          '"rolledDice"',
          'label: "False Life Temporary Hit Points (2d4+4)"',
          'targeting: { kind: "self" }',
          'kind: "temporaryHitPoints"',
          "amount: { expr: { dice: 2, dieSize: 4, flat: 4 } }",
          "damageRollFillWithGroups(temporaryHitPoints, [[4, 3]])",
          "tempHp: 11",
          "expect(caster.activeEffects).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "false_life",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard False Life resolve from level-1 spell access as self Temporary Hit Points",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_false_life",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardFalseLifeBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([falseLifeSpellId])",
      "preparedSpells: expect.arrayContaining([falseLifeSpellId])",
      "build: wizardBuild,",
      "casterId: falseLifeWizardId,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardFalseLifeBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-false-life"',
          "falseLifeSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneFalseLife",
        needles: [
          "spellSlotActForProcedure(",
          "falseLifeSpellId",
          '"scalarBuff"',
          '"rolledDice"',
          'label: "False Life Temporary Hit Points (2d4+4)"',
          'targeting: { kind: "self" }',
          'kind: "temporaryHitPoints"',
          "amount: { expr: { dice: 2, dieSize: 4, flat: 4 } }",
          "damageRollFillWithGroups(temporaryHitPoints, [[4, 3]])",
          "tempHp: 11",
          "expect(caster.activeEffects).toEqual([]);",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "ray_of_sickness",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Ray of Sickness resolve from level-1 spell access as Poison damage plus a turn-scoped Poisoned rider",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_ray_of_sickness",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererRayOfSicknessBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([rayOfSicknessSpellId])",
      "build: sorcererBuild,",
      "casterId: rayOfSicknessSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererRayOfSicknessBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-ray-of-sickness"',
          'expectedBuildLabel: "Sorcerer Ray of Sickness"',
          "preparedSpells: [rayOfSicknessSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneRayOfSickness",
        needles: [
          "spellSlotActForProcedure(",
          "rayOfSicknessSpellId",
          '"spellAttackDamage"',
          'srdStatBlock("stat_block_goblin_warrior")',
          "requiresTableSpatialFact: true",
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'mechanics: { duration: { kind: "instantaneous" } }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 60",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 2, dieSize: 8 }",
          'damageType: "poison"',
          'condition: "poisoned"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Ray of Sickness damage (2d8-poison)"',
          "damageRollFillWithGroups(damage, [[1, 1]])",
          "expect(poisonedTarget.hp).toBe(Hp(8));",
          'kind: "spellCondition"',
          "sourceSpellId: rayOfSicknessSpellId",
          "sourceCombatantId: input.casterId",
          "escape: null",
          "turnStartDamage: null",
          "combatantId: input.casterId",
          "{ spellLevel: 1, count: 2, expended: 1 }",
          "endTurn({ state: afterGoblinTurn, actorId: input.casterId })",
          ").toBe(false);",
        ],
      },
    ],
  },
  {
    candidateUnitId: "ray_of_sickness",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Ray of Sickness resolve from level-1 spell access as Poison damage plus a turn-scoped Poisoned rider",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_ray_of_sickness",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardRayOfSicknessBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([rayOfSicknessSpellId])",
      "preparedSpells: expect.arrayContaining([rayOfSicknessSpellId])",
      "build: wizardBuild,",
      "casterId: rayOfSicknessWizardId,",
      "expectedSpellAttackBonus: 5,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardRayOfSicknessBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-ray-of-sickness"',
          'expectedBuildLabel: "Wizard Ray of Sickness"',
          "const rayOfSicknessWizardSpellbook = [",
          "const rayOfSicknessWizardPreparedSpells = [",
          "spellbook: rayOfSicknessWizardSpellbook",
          "preparedSpells: rayOfSicknessWizardPreparedSpells",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneRayOfSickness",
        needles: [
          "spellSlotActForProcedure(",
          "rayOfSicknessSpellId",
          '"spellAttackDamage"',
          'srdStatBlock("stat_block_goblin_warrior")',
          "requiresTableSpatialFact: true",
          "spellTargetFill(",
          "attackBonus: input.expectedSpellAttackBonus",
          'mechanics: { duration: { kind: "instantaneous" } }',
          'attackKind: "ranged_spell_attack"',
          'targeting: { kind: "singleCombatant" }',
          "rangeFeet: 60",
          'kind: "fixedSpellAttackDamage"',
          "expr: { dice: 2, dieSize: 8 }",
          'damageType: "poison"',
          'condition: "poisoned"',
          'expiresAt: "endOfCasterNextTurn"',
          'label: "Ray of Sickness damage (2d8-poison)"',
          "damageRollFillWithGroups(damage, [[1, 1]])",
          "expect(poisonedTarget.hp).toBe(Hp(8));",
          'kind: "spellCondition"',
          "sourceSpellId: rayOfSicknessSpellId",
          "sourceCombatantId: input.casterId",
          "escape: null",
          "turnStartDamage: null",
          "combatantId: input.casterId",
          "{ spellLevel: 1, count: 2, expended: 1 }",
          "endTurn({ state: afterGoblinTurn, actorId: input.casterId })",
          ").toBe(false);",
        ],
      },
    ],
  },
  {
    candidateUnitId: "thunderwave",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Thunderwave resolve from level-1 spell access as a self-origin Cube Saving Throw with push and boom facts",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_thunderwave",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererThunderwaveBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([thunderwaveSpellId])",
      "build: sorcererBuild,",
      "casterId: thunderwaveSorcererId,",
      "expectedSpellSaveDc: 12,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererThunderwaveBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-thunderwave"',
          'expectedBuildLabel: "Sorcerer Thunderwave"',
          "preparedSpells: [thunderwaveSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneThunderwave",
        needles: [
          "spellSlotActForProcedure(",
          "thunderwaveSpellId",
          '"saveGatedDamage"',
          '"savingThrowOutcome"',
          "requireThunderwaveSavingThrowHole(",
          'label: "Thunderwave self-origin Cube Saving Throw outcomes"',
          'ability: "con"',
          'dc: { kind: "caster_spell_save_dc" }',
          'targeting: { kind: "selfOriginCube", sideFeet: 15 }',
          'damage: { expr: { dice: 2, dieSize: 8 }, damageType: "thunder" }',
          'successDamage: "half"',
          "rangeFeet: 0",
          "failedSavePostDamageRiders: []",
          "postSaveAreaEffect:",
          'kind: "thunderwave"',
          "creaturePush:",
          "unsecuredObjectPush:",
          'objectLocation: "entirely_within_area"',
          "audibleBoom:",
          'sound: "thunderous boom"',
          "audibleRadiusFeet: 300",
          "thunderwaveSavingThrowOutcomeFill(save, input.casterId",
          "expect(saveFill.value).toEqual({",
          "originAnchorId: input.casterId",
          "affectedTargetIds: [monsterId, secondMonsterId]",
          "objectId: thunderwaveUnsecuredObjectId",
          "audibleRadiusFeet: movementFeet(300)",
          'label: "Thunderwave damage (2d8-thunder)"',
          "damageRollFillWithGroups(damage, [[4, 4]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(5));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(9));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
      {
        anchor: "function thunderwaveSavingThrowOutcomeFill",
        needles: [
          "area: thunderwaveArea(",
          "outcomes.flatMap(",
          "originAnchorId",
        ],
      },
      {
        anchor: "function requireThunderwaveSavingThrowHole",
        needles: [
          "Expected Thunderwave spell Saving Throw outcome hole.",
          'spell.procedure !== "saveGatedDamage"',
          "spell.spell.id !== thunderwaveSpellId",
          'spell.targeting.kind !== "selfOriginCube"',
          'spell.postSaveAreaEffect?.kind !== "thunderwave"',
        ],
      },
      {
        anchor: "function thunderwaveArea",
        needles: [
          'kind: "thunderwaveArea"',
          "creaturePushes:",
          "distanceFeet: movementFeet(10)",
          "battleTablePositionId(",
          "unsecuredObjectPushes:",
          "objectId: thunderwaveUnsecuredObjectId",
          "audibleBoom:",
          "audibleRadiusFeet: movementFeet(300)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "thunderwave",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Thunderwave resolve from level-1 spell access as a self-origin Cube Saving Throw with push and boom facts",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_thunderwave",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardThunderwaveBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([thunderwaveSpellId])",
      "preparedSpells: expect.arrayContaining([thunderwaveSpellId])",
      "build: wizardBuild,",
      "casterId: thunderwaveWizardId,",
      "expectedSpellSaveDc: 13,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardThunderwaveBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-thunderwave"',
          'expectedBuildLabel: "Wizard Thunderwave"',
          "const thunderwaveWizardSpellbook = [",
          "const thunderwaveWizardPreparedSpells = [",
          "spellbook: thunderwaveWizardSpellbook",
          "preparedSpells: thunderwaveWizardPreparedSpells",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneThunderwave",
        needles: [
          "spellSlotActForProcedure(",
          "thunderwaveSpellId",
          '"saveGatedDamage"',
          '"savingThrowOutcome"',
          "requireThunderwaveSavingThrowHole(",
          'label: "Thunderwave self-origin Cube Saving Throw outcomes"',
          'ability: "con"',
          'dc: { kind: "caster_spell_save_dc" }',
          'targeting: { kind: "selfOriginCube", sideFeet: 15 }',
          'damage: { expr: { dice: 2, dieSize: 8 }, damageType: "thunder" }',
          'successDamage: "half"',
          "rangeFeet: 0",
          "failedSavePostDamageRiders: []",
          "postSaveAreaEffect:",
          'kind: "thunderwave"',
          "creaturePush:",
          "unsecuredObjectPush:",
          'objectLocation: "entirely_within_area"',
          "audibleBoom:",
          'sound: "thunderous boom"',
          "audibleRadiusFeet: 300",
          "thunderwaveSavingThrowOutcomeFill(save, input.casterId",
          "expect(saveFill.value).toEqual({",
          "originAnchorId: input.casterId",
          "affectedTargetIds: [monsterId, secondMonsterId]",
          "objectId: thunderwaveUnsecuredObjectId",
          "audibleRadiusFeet: movementFeet(300)",
          'label: "Thunderwave damage (2d8-thunder)"',
          "damageRollFillWithGroups(damage, [[4, 4]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(5));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(9));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
      {
        anchor: "function thunderwaveSavingThrowOutcomeFill",
        needles: [
          "area: thunderwaveArea(",
          "outcomes.flatMap(",
          "originAnchorId",
        ],
      },
      {
        anchor: "function requireThunderwaveSavingThrowHole",
        needles: [
          "Expected Thunderwave spell Saving Throw outcome hole.",
          'spell.procedure !== "saveGatedDamage"',
          "spell.spell.id !== thunderwaveSpellId",
          'spell.targeting.kind !== "selfOriginCube"',
          'spell.postSaveAreaEffect?.kind !== "thunderwave"',
        ],
      },
      {
        anchor: "function thunderwaveArea",
        needles: [
          'kind: "thunderwaveArea"',
          "creaturePushes:",
          "distanceFeet: movementFeet(10)",
          "battleTablePositionId(",
          "unsecuredObjectPushes:",
          "objectId: thunderwaveUnsecuredObjectId",
          "audibleBoom:",
          "audibleRadiusFeet: movementFeet(300)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "chromatic_orb",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Chromatic Orb resolve from level-1 spell access with chosen damage and one duplicate-dice leap",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_chromatic_orb",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererChromaticOrbBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([chromaticOrbSpellId])",
      "build: sorcererBuild,",
      "casterId: chromaticOrbSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererChromaticOrbBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-chromatic-orb"',
          'expectedBuildLabel: "Sorcerer Chromatic Orb"',
          "preparedSpells: [chromaticOrbSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneChromaticOrb",
        needles: [
          "spellSlotActForProcedure(",
          "chromaticOrbSpellId",
          '"chainedSpellAttackDamage"',
          '"damageTypeChoice"',
          'label: "Chromatic Orb damage type"',
          'choices: ["acid", "cold", "fire", "lightning", "poison", "thunder"]',
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'targeting: { kind: "singleCombatant" }',
          'attackKind: "ranged_spell_attack"',
          "damage: { expr: { dice: 3, dieSize: 8 } }",
          "rangeFeet: 90",
          "leapRangeFeet: 30",
          'damageTypeChoiceFill(damageType, "poison")',
          "spellTargetFill(",
          "attackRollFill(primaryAttackRoll,",
          'label: "Chromatic Orb damage 1 (3d8-poison)"',
          "damageRollFillWithGroups(primaryDamage,",
          "[4, 4, 1]",
          "requiresTableSpatialFact: true",
          "choices: expect.arrayContaining([secondMonsterId])",
          "expect(leapTarget.choices).not.toContain(monsterId);",
          "spellLeapTargetFill(",
          'label: "Chromatic Orb damage 2 (3d8-poison)"',
          "damageRollFillWithGroups(leapDamage, [[2, 2, 2]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(13));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
      {
        anchor: "function spellLeapTargetFill",
        needles: [
          'kind: "spellLeapTargetWithinRange"',
          "previousTargetId",
          "targetId",
          "spellId",
          "rangeFeet: movementFeet(30)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "chromatic_orb",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Chromatic Orb resolve from level-1 spell access with chosen damage and one duplicate-dice leap",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_chromatic_orb",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardChromaticOrbBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([chromaticOrbSpellId])",
      "preparedSpells: expect.arrayContaining([chromaticOrbSpellId])",
      "build: wizardBuild,",
      "casterId: chromaticOrbWizardId,",
      "expectedSpellAttackBonus: 5,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardChromaticOrbBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-chromatic-orb"',
          'expectedBuildLabel: "Wizard Chromatic Orb"',
          "chromaticOrbSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneChromaticOrb",
        needles: [
          "spellSlotActForProcedure(",
          "chromaticOrbSpellId",
          '"chainedSpellAttackDamage"',
          '"damageTypeChoice"',
          'label: "Chromatic Orb damage type"',
          'choices: ["acid", "cold", "fire", "lightning", "poison", "thunder"]',
          'resource: { tag: "spellSlot", slotLevel: 1 }',
          'targeting: { kind: "singleCombatant" }',
          'attackKind: "ranged_spell_attack"',
          "damage: { expr: { dice: 3, dieSize: 8 } }",
          "rangeFeet: 90",
          "leapRangeFeet: 30",
          'damageTypeChoiceFill(damageType, "poison")',
          "spellTargetFill(",
          "attackRollFill(primaryAttackRoll,",
          'label: "Chromatic Orb damage 1 (3d8-poison)"',
          "damageRollFillWithGroups(primaryDamage,",
          "[4, 4, 1]",
          "requiresTableSpatialFact: true",
          "choices: expect.arrayContaining([secondMonsterId])",
          "expect(leapTarget.choices).not.toContain(monsterId);",
          "spellLeapTargetFill(",
          'label: "Chromatic Orb damage 2 (3d8-poison)"',
          "damageRollFillWithGroups(leapDamage, [[2, 2, 2]])",
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(13));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(13));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
      {
        anchor: "function spellLeapTargetFill",
        needles: [
          'kind: "spellLeapTargetWithinRange"',
          "previousTargetId",
          "targetId",
          "spellId",
          "rangeFeet: movementFeet(30)",
        ],
      },
    ],
  },
  {
    candidateUnitId: "magic_missile",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Magic Missile resolve from level-1 spell access with split dart allocation",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_magic_missile",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererMagicMissileBuild();",
      'sourceUnitId: "class_sorcerer"',
      "preparedSpells: expect.arrayContaining([magicMissileSpellId])",
      "build: sorcererBuild,",
      "casterId: magicMissileSorcererId,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererMagicMissileBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-magic-missile"',
          "preparedSpells: [magicMissileSpellId, burningHandsSpellId]",
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneMagicMissile",
        needles: [
          "spellSlotActForProcedure(",
          '"repeatedDamageAllocation"',
          '"spellTargetAllocation"',
          "allocationCount: 3",
          "requiresTableSpatialFact: true",
          'range: { kind: "point", feet: 120 }',
          'damageType: "force"',
          "expr: { dice: 1, dieSize: 4, flat: 1 }",
          "expect(requireCombatant(state, monsterId).hp).toBe(Hp(13));",
          "expect(requireCombatant(state, secondMonsterId).hp).toBe(Hp(13));",
          "spellTargetAllocationFill(",
          "{ targetId: monsterId, count: 2 }",
          "{ targetId: secondMonsterId, count: 1 }",
          "damageRollFillWithGroups(damage,",
          "damageRollFillWithGroups(damage, [[2, 3], [4]])",
          'label: "Magic Missile damage (3d4+3-force)"',
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(6));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(8));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "magic_missile",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Magic Missile resolve from level-1 spell access with split dart allocation",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_magic_missile",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardMagicMissileBuild();",
      'sourceUnitId: "class_wizard"',
      "spellbook: expect.arrayContaining([magicMissileSpellId])",
      "preparedSpells: expect.arrayContaining([magicMissileSpellId])",
      "build: wizardBuild,",
      "casterId: magicMissileWizardId,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardMagicMissileBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-magic-missile"',
          "magicMissileSpellId",
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneMagicMissile",
        needles: [
          "spellSlotActForProcedure(",
          '"repeatedDamageAllocation"',
          '"spellTargetAllocation"',
          "allocationCount: 3",
          "requiresTableSpatialFact: true",
          'range: { kind: "point", feet: 120 }',
          'damageType: "force"',
          "expr: { dice: 1, dieSize: 4, flat: 1 }",
          "expect(requireCombatant(state, monsterId).hp).toBe(Hp(13));",
          "expect(requireCombatant(state, secondMonsterId).hp).toBe(Hp(13));",
          "spellTargetAllocationFill(",
          "{ targetId: monsterId, count: 2 }",
          "{ targetId: secondMonsterId, count: 1 }",
          "damageRollFillWithGroups(damage,",
          "damageRollFillWithGroups(damage, [[2, 3], [4]])",
          'label: "Magic Missile damage (3d4+3-force)"',
          "expect(requireCombatant(resolved.state, monsterId).hp).toBe(Hp(6));",
          "expect(requireCombatant(resolved.state, secondMonsterId).hp).toBe(Hp(8));",
          "{ spellLevel: 1, count: 2, expended: 1 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "fire_bolt",
    className: "Sorcerer",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Fire Bolt cantrips resolve from level-1 sheets as ranged spell attacks without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-0:spell-unit-pressure:sorcerer_spell_list_fire_bolt",
    tracerNeedles: [
      "const sorcererBuild = finalizedLevelOneSorcererFireBoltBuild();",
      'sourceUnitId: "class_sorcerer"',
      "cantrips: expect.arrayContaining([fireBoltSpellId])",
      "build: sorcererBuild,",
      "casterId: fireBoltSorcererId,",
      "expectedSpellAttackBonus: 4,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneSorcererFireBoltBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneSorcererBuild({",
          'draftIdText: "draft:l1-sdk-sorcerer-fire-bolt"',
          "fireBoltSpellId,",
          'preparedSpells: [burningHandsSpellId, "detect_magic"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneSorcererBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneFireBolt",
        needles: [
          "cantripCastActionSpellAct(",
          '"objectTargetChoice"',
          "attackBonus: input.expectedSpellAttackBonus",
          'targeting: { kind: "singleCreatureOrObject" }',
          'attackKind: "ranged_spell_attack"',
          "rangeFeet: 120",
          "requiresTableSpatialFact: true",
          'objectHitEffect: { kind: "igniteFlammableUnattended" }',
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "fire"',
          'label: "Fire Bolt damage (1d10-fire)"',
          "spellTargetFill(",
          "attackRollFill(",
          "ordinaryAttackDamageFills({",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "fire_bolt",
    className: "Wizard",
    levelBand: "spell-level-0",
    label:
      "level1-sdk-raw-integration: Sorcerer and Wizard Fire Bolt cantrips resolve from level-1 sheets as ranged spell attacks without spending slots",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-0:spell-unit-pressure:wizard_spell_list_fire_bolt",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardFireBoltBuild();",
      'sourceUnitId: "class_wizard"',
      "cantrips: expect.arrayContaining([fireBoltSpellId])",
      "build: wizardBuild,",
      "casterId: fireBoltWizardId,",
      "expectedSpellAttackBonus: 5,",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardFireBoltBuild(): CharacterBuild",
        needles: [
          "finalizedLevelOneWizardBuild({",
          'draftIdText: "draft:l1-sdk-wizard-fire-bolt"',
          'expectedBuildLabel: "Wizard Fire Bolt"',
          'cantrips: ["light", fireBoltSpellId, "ray_of_frost"]',
        ],
      },
      {
        anchor: "function finalizedLevelOneWizardBuild(input:",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
      {
        anchor: "function assertLevelOneFireBolt",
        needles: [
          "cantripCastActionSpellAct(",
          '"objectTargetChoice"',
          "attackBonus: input.expectedSpellAttackBonus",
          'targeting: { kind: "singleCreatureOrObject" }',
          'attackKind: "ranged_spell_attack"',
          "rangeFeet: 120",
          "requiresTableSpatialFact: true",
          'objectHitEffect: { kind: "igniteFlammableUnattended" }',
          "expr: { dice: 1, dieSize: 10 }",
          'damageType: "fire"',
          'label: "Fire Bolt damage (1d10-fire)"',
          "spellTargetFill(",
          "attackRollFill(",
          "ordinaryAttackDamageFills({",
          "{ spellLevel: 1, count: 2, expended: 0 }",
        ],
      },
    ],
  },
  {
    candidateUnitId: "monk_extra_attack",
    className: "Monk",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Extra Attack",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId: "srd521:classes/monk:level-5:class-feature-grant:monk_extra_attack",
    tracerNeedles: ["monkExtraAttackUnitId"],
  },
  {
    candidateUnitId: "monk_stunning_strike",
    className: "Monk",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Stunning Strike",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/monk:level-5:class-feature-grant:monk_stunning_strike",
    tracerNeedles: ["monkStunningStrikeUnitId"],
  },
  {
    candidateUnitId: "rogue_cunning_strike",
    className: "Rogue",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Cunning Strike",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/rogue:level-5:class-feature-grant:rogue_cunning_strike",
    tracerNeedles: ["rogueCunningStrikeUnitId"],
  },
  {
    candidateUnitId: "sorcerer_sorcerous_restoration",
    className: "Sorcerer",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Sorcerous Restoration",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/sorcerer:level-5:class-feature-grant:sorcerer_sorcerous_restoration",
    tracerNeedles: ["sorcerousRestoration"],
  },
  {
    candidateUnitId: "haste",
    className: "Wizard",
    levelBand: "spell-level-3",
    label: "level5-sdk-tracer-bullets: Haste",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/wizard:spell-level-3:spell-unit-pressure:wizard_spell_list_haste",
    tracerNeedles: ["hasteSpellId"],
  },
  {
    candidateUnitId: "protection_from_energy",
    className: "Wizard",
    levelBand: "spell-level-3",
    label: "level5-sdk-tracer-bullets: Protection from Energy",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/wizard:spell-level-3:spell-unit-pressure:wizard_spell_list_protection_from_energy",
    tracerNeedles: ["protectionFromEnergySpellId"],
  },
];

function animalFriendshipSdkHelperNeedles() {
  return [
    {
      anchor:
        "function finalizedLevelOneBardAnimalFriendshipBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneBardBuild({",
        'draftIdText: "draft:l1-sdk-bard-animal-friendship"',
        'expectedBuildLabel: "Bard Animal Friendship"',
        "animalFriendshipSpellId",
      ],
    },
    {
      anchor:
        "function finalizedLevelOneDruidAnimalFriendshipBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneDruidBuild({",
        'draftIdText: "draft:l1-sdk-druid-animal-friendship"',
        'expectedBuildLabel: "Druid Animal Friendship"',
        "animalFriendshipSpellId",
      ],
    },
    {
      anchor:
        "function finalizedLevelOneRangerAnimalFriendshipBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneRangerBuild({",
        'draftIdText: "draft:l1-sdk-ranger-animal-friendship"',
        'expectedBuildLabel: "Ranger Animal Friendship"',
        "animalFriendshipSpellId",
      ],
    },
    {
      anchor: "function assertLevelOneAnimalFriendship",
      needles: [
        'srdStatBlock("stat_block_wolf")',
        'srdStatBlock("stat_block_skeleton")',
        "spellSlotActForProcedure(",
        "animalFriendshipSpellId",
        '"saveGatedCondition"',
        "spellSaveDcForCaster(state, input.casterId)",
        "choices: expect.arrayContaining([animalFriendshipBeastId])",
        "expect(targetList.choices).not.toContain(animalFriendshipNonBeastId);",
        'targetCreatureTypes: ["beast"]',
        'condition: "charmed"',
        "durationTicks: animalFriendshipDurationTicks",
        'escape: { kind: "targetDamagedByCasterOrAlly" }',
        "rangeFeet: movementFeet(30)",
        "animalFriendshipTargetListFill(",
        'label: "Animal Friendship target-list Saving Throw outcomes"',
        "savingThrowOutcomeFill(save,",
        "{ targetId: animalFriendshipBeastId, succeeded: false }",
        'hasCondition(beast.conditions, "charmed")',
        "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
        "spellSlotUsesThisTurn",
        "{ spellLevel: 1, count: 2, expended: 1 }",
      ],
    },
    {
      anchor: "function animalFriendshipTargetListFill",
      needles: [
        'kind: "spellTargetList"',
        "value: { targetIds: [targetId] }",
        'kind: "spellTarget"',
        "spellId: animalFriendshipSpellId",
      ],
    },
  ];
}

function healingWordSdkHelperNeedles() {
  return [
    {
      anchor:
        "function finalizedLevelOneBardHealingWordBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneBardBuild({",
        'draftIdText: "draft:l1-sdk-bard-healing-word"',
        'expectedBuildLabel: "Bard Healing Word"',
        "healingWordSpellId",
      ],
    },
    {
      anchor:
        "function finalizedLevelOneClericHealingWordBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneClericBuild({",
        'draftIdText: "draft:l1-sdk-cleric-healing-word"',
        'expectedBuildLabel: "Cleric Healing Word"',
        "healingWordSpellId",
      ],
    },
    {
      anchor:
        "function finalizedLevelOneDruidHealingWordBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneDruidBuild({",
        'draftIdText: "draft:l1-sdk-druid-healing-word"',
        'expectedBuildLabel: "Druid Healing Word"',
        "healingWordSpellId",
      ],
    },
    {
      anchor: "function assertLevelOneHealingWord",
      needles: [
        "healingWordBonusActionSpellSlotAct(state, input.casterId)",
        "requiresTableSpatialFact: true",
        'label: "Healing Word healing (2d4+2)"',
        "healing: { expr: { dice: 2, dieSize: 4, flat: 2 } }",
        "rangeFeet: 60",
        'targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 }',
        "damageRollFillWithGroups(healingRoll, [[2, 3]])",
        "expect(requireCombatant(resolved.state, input.targetId).hp).toBe(Hp(10));",
        "{ spellLevel: 1, count: 2, expended: 1 }",
      ],
    },
    {
      anchor: "function healingWordBonusActionSpellSlotAct",
      needles: [
        'candidate.subject.tag === "bonusActionSpell"',
        "candidate.subject.actorId === actorId",
        'candidate.subject.invocation.tag === "spellSlot"',
        "candidate.subject.invocation.spellId === healingWordSpellId",
        "candidate.subject.invocation.slotLevel === 1",
        'candidate.subject.invocation.procedure === "directHitPointRestoration"',
      ],
    },
  ];
}

function blessSdkHelperNeedles(className) {
  return [
    blessBuildHelperNeedle(className),
    ...(className === "Paladin" ? [levelOnePaladinBuildHelperNeedle()] : []),
    blessResolutionHelperNeedle(),
    blessActiveEffectHelperNeedle(),
    blessTargetListFillHelperNeedle(),
  ];
}

function blessBuildHelperNeedle(className) {
  const specs = {
    Cleric: {
      anchor: "function finalizedLevelOneClericBlessBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneClericBuild({",
      draftIdText: "draft:l1-sdk-cleric-bless",
      expectedBuildLabel: "Cleric Bless",
      preparedNeedle: "blessSpellId",
    },
    Paladin: {
      anchor: "function finalizedLevelOnePaladinBlessBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOnePaladinBuild({",
      draftIdText: "draft:l1-sdk-paladin-bless",
      expectedBuildLabel: "Paladin Bless",
      preparedNeedle: "preparedSpells: [blessSpellId, cureWoundsSpellId]",
    },
  };
  const spec = specs[className];
  if (spec === undefined) {
    throw new Error(`Unsupported Bless seed class ${className}.`);
  }
  return {
    anchor: spec.anchor,
    needles: [
      spec.buildHelper,
      `draftIdText: "${spec.draftIdText}"`,
      `expectedBuildLabel: "${spec.expectedBuildLabel}"`,
      spec.preparedNeedle,
    ],
  };
}

function blessResolutionHelperNeedle() {
  return {
    anchor: "function assertLevelOneBless",
    needles: [
      'spellSlotActForProcedure(state, blessSpellId, 1, "rollModifier")',
      "const expectedEffect = expectedLevelOneBlessEffect(input.casterId)",
      'label: "Bless targets"',
      "maxTargets: 3",
      'procedure: "rollModifier"',
      'actionCost: "magicAction"',
      "rangeFeet: movementFeet(30)",
      "effect: expectedEffect",
      "blessTargetListFill(",
      "activeEffects",
      "toEqual([expectedEffect])",
      "caster.concentration",
      'effectKind: "spellEffect"',
      "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
      "expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(true);",
      "{ spellLevel: 1, count: 2, expended: 1 }",
    ],
  };
}

function blessActiveEffectHelperNeedle() {
  return {
    anchor: "function expectedLevelOneBlessEffect",
    needles: [
      'kind: "d20RollModifier"',
      "sourceSpellId: blessSpellId",
      'on: ["attack_roll", "saving_throw"]',
      'delta: { sign: "+", dice: 1, dieSize: 4 }',
      "skill: null",
      "expiresAt: {",
      'kind: "concentration"',
      "combatantId: casterId",
    ],
  };
}

function blessTargetListFillHelperNeedle() {
  return {
    anchor: "function blessTargetListFill",
    needles: [
      'kind: "spellTargetList"',
      "value: { targetIds: [targetId] }",
      'kind: "spellTarget"',
      "casterId",
      "targetId",
      "spellId: blessSpellId",
    ],
  };
}

function shieldOfFaithSdkHelperNeedles(className) {
  return [
    shieldOfFaithBuildHelperNeedle(className),
    ...(className === "Paladin" ? [levelOnePaladinBuildHelperNeedle()] : []),
    shieldOfFaithResolutionHelperNeedle(),
    shieldOfFaithActiveEffectHelperNeedle(),
    shieldOfFaithBonusActionSpellSlotActHelperNeedle(),
  ];
}

function shieldOfFaithBuildHelperNeedle(className) {
  const specs = {
    Cleric: {
      anchor:
        "function finalizedLevelOneClericShieldOfFaithBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneClericBuild({",
      draftIdText: "draft:l1-sdk-cleric-shield-of-faith",
      expectedBuildLabel: "Cleric Shield of Faith",
      preparedNeedle: "shieldOfFaithSpellId",
    },
    Paladin: {
      anchor:
        "function finalizedLevelOnePaladinShieldOfFaithBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOnePaladinBuild({",
      draftIdText: "draft:l1-sdk-paladin-shield-of-faith",
      expectedBuildLabel: "Paladin Shield of Faith",
      preparedNeedle: "shieldOfFaithSpellId",
    },
  };
  const spec = specs[className];
  if (spec === undefined) {
    throw new Error(`Unsupported Shield of Faith seed class ${className}.`);
  }
  return {
    anchor: spec.anchor,
    needles: [
      spec.buildHelper,
      `draftIdText: "${spec.draftIdText}"`,
      `expectedBuildLabel: "${spec.expectedBuildLabel}"`,
      spec.preparedNeedle,
    ],
  };
}

function shieldOfFaithResolutionHelperNeedle() {
  return {
    anchor: "function assertLevelOneShieldOfFaith",
    needles: [
      "shieldOfFaithBonusActionSpellSlotAct(state, input.casterId)",
      "snapshotCombatant(",
      "expectedLevelOneShieldOfFaithEffect(input.casterId)",
      'tag: "bonusActionSpell"',
      "spellId: shieldOfFaithSpellId",
      'procedure: "scalarBuff"',
      "requiresTableSpatialFact: true",
      "choices: expect.arrayContaining([input.casterId, input.targetId])",
      "spellTargetFill(",
      "activeEffects",
      "toEqual([expectedEffect])",
      "initialTargetArmorClass + 2",
      "caster.concentration",
      'effectKind: "spellEffect"',
      "expectedPreservedActionResources",
      "expect(initialActionResources).toEqual(expectedPreservedActionResources)",
      "turn.bonusActionAvailable).toBe(false)",
      "spellSlotUsesThisTurn",
      "{ spellLevel: 1, count: 2, expended: 1 }",
    ],
  };
}

function shieldOfFaithActiveEffectHelperNeedle() {
  return {
    anchor: "function expectedLevelOneShieldOfFaithEffect",
    needles: [
      'kind: "spellArmorClassBonus"',
      "sourceSpellId: shieldOfFaithSpellId",
      "bonus: 2",
      "negatedSpellIds: []",
      "expiresAt: {",
      'kind: "concentration"',
      "combatantId: casterId",
    ],
  };
}

function shieldOfFaithBonusActionSpellSlotActHelperNeedle() {
  return {
    anchor: "function shieldOfFaithBonusActionSpellSlotAct",
    needles: [
      "discoverBattleActs(state).find(",
      "CastBonusActionSpellAct",
      "actorId",
      "shieldOfFaithSpellId",
      '"scalarBuff"',
      "Expected Shield of Faith Bonus Action spell-slot act.",
    ],
  };
}

function shieldOfFaithSdkEvidenceNeedles() {
  return [
    {
      path: paths.seedEvidenceFiles.surfaceUnitCatalog,
      testTitle:
        "keeps Shield of Faith's creature target and Armor Class bonus explicit",
      needles: [
        "shieldOfFaithInput",
        'id: "shield_of_faith"',
        'targetKinds: ["creature"]',
        'kind: "modify_ac"',
      ],
    },
    {
      path: paths.seedEvidenceFiles.scalarBuffAdmission,
      testTitle:
        "scalar buff admission rejects explicit non-creature target selections",
      needles: [
        "shieldOfFaithWithObjectTarget()",
        "maybeBonusSpellAct({ state, spellId: spell.id })",
        "toBeUndefined()",
      ],
    },
  ];
}

const seededSdkScenarioRecords = seededSdkScenarioRows.map((row) => ({
  rowId: row.rowId,
  rowKey: seedScenarioRowKey(row),
  levelBand: row.levelBand,
  className: row.className,
  candidateUnitId: row.candidateUnitId,
  tracerNeedles: row.tracerNeedles,
  helperNeedles: row.helperNeedles ?? [],
  evidenceNeedles: (row.evidenceNeedles ?? []).map((evidence) => ({
    path: toRepoPath(root, evidence.path),
    testTitle: evidence.testTitle,
    needles: evidence.needles,
  })),
  existingSdkScenario: {
    label: row.label,
    path: toRepoPath(root, row.path),
    ...(row.rawSources === undefined ? {} : { rawSources: row.rawSources }),
  },
}));
const seededSdkScenarioByRowId = new Map(
  seededSdkScenarioRecords.map((row) => [row.rowId, row.existingSdkScenario]),
);

function countValues(values) {
  return Object.fromEntries(
    Array.from(
      values.reduce((counts, value) => {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        return counts;
      }, new Map()),
    ).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function md(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (text === "") return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

function indexUnitClaims(records) {
  const claimsByUnitId = new Map();
  for (const record of records) {
    if (claimsByUnitId.has(record.unitId)) {
      throw new Error(`Duplicate unit claim for ${record.unitId}`);
    }
    claimsByUnitId.set(record.unitId, record.claim);
  }
  return claimsByUnitId;
}

function indexUnitEvidence(records) {
  return records.reduce((evidenceByUnitId, record) => {
    const entries = evidenceByUnitId.get(record.unitId) ?? [];
    entries.push(record.evidence);
    evidenceByUnitId.set(record.unitId, entries);
    return evidenceByUnitId;
  }, new Map());
}

function evidenceRowsByRowId(filePath) {
  return new Map(Object.entries(readJson(filePath).rows ?? {}));
}

function cureWoundsSdkHelperNeedles(className) {
  return [
    cureWoundsBuildHelperNeedle(className),
    ...(className === "Paladin" ? [levelOnePaladinBuildHelperNeedle()] : []),
    ...(className === "Ranger" ? [levelOneRangerBuildHelperNeedle()] : []),
    cureWoundsResolutionHelperNeedle(),
  ];
}

function cureWoundsBuildHelperNeedle(className) {
  const specs = {
    Bard: {
      anchor: "function finalizedLevelOneBardCureWoundsBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneBardBuild({",
      draftIdText: "draft:l1-sdk-bard-cure-wounds",
      expectedBuildLabel: "Bard Cure Wounds",
      preparedNeedle: "cureWoundsSpellId",
    },
    Cleric: {
      anchor:
        "function finalizedLevelOneClericCureWoundsBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneClericBuild({",
      draftIdText: "draft:l1-sdk-cleric-cure-wounds",
      expectedBuildLabel: "Cleric Cure Wounds",
      preparedNeedle: "cureWoundsSpellId",
    },
    Druid: {
      anchor:
        "function finalizedLevelOneDruidCureWoundsBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneDruidBuild({",
      draftIdText: "draft:l1-sdk-druid-cure-wounds",
      expectedBuildLabel: "Druid Cure Wounds",
      preparedNeedle: "cureWoundsSpellId",
    },
    Paladin: {
      anchor:
        "function finalizedLevelOnePaladinCureWoundsBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOnePaladinBuild({",
      draftIdText: "draft:l1-sdk-paladin-cure-wounds",
      expectedBuildLabel: "Paladin Cure Wounds",
      preparedNeedle: "preparedSpells: [cureWoundsSpellId,",
    },
    Ranger: {
      anchor:
        "function finalizedLevelOneRangerCureWoundsBuild(): CharacterBuild",
      buildHelper: "finalizedLevelOneRangerBuild({",
      draftIdText: "draft:l1-sdk-ranger-cure-wounds",
      expectedBuildLabel: "Ranger Cure Wounds",
      preparedNeedle: "preparedSpells: [cureWoundsSpellId,",
    },
  };
  const spec = specs[className];
  if (spec === undefined) {
    throw new Error(`Unsupported Cure Wounds seed class ${className}.`);
  }
  return {
    anchor: spec.anchor,
    needles: [
      spec.buildHelper,
      `draftIdText: "${spec.draftIdText}"`,
      `expectedBuildLabel: "${spec.expectedBuildLabel}"`,
      spec.preparedNeedle,
    ],
  };
}

function cureWoundsResolutionHelperNeedle() {
  return {
    anchor: "function assertLevelOneCureWounds",
    needles: [
      "spellSlotActForProcedure(",
      "cureWoundsSpellId",
      '"directHitPointRestoration"',
      'tag: "actionSpell"',
      "requiresTableSpatialFact: true",
      "expectedSpellcastingAbilityModifier",
      'actionCost: "magicAction"',
      "flat: input.expectedSpellcastingAbilityModifier",
      "rangeFeet: 5",
      "targetCurrentHp",
      "expectedResolvedHp",
      "damageRollFillWithGroups(healingRoll,",
      "expect(requireCombatant(resolved.state, input.targetId).hp).toBe(",
      "Hp(input.expectedResolvedHp)",
      "expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);",
      "expect(snapshotBattle(resolved.state).turn.bonusActionAvailable).toBe(true);",
      "{ spellLevel: 1, count: 2, expended: 1 }",
    ],
  };
}

function rangerFavoredEnemyHuntersMarkSdkTracerNeedles() {
  return [
    "const rangerBuild = finalizedLevelOneRangerHuntersMarkBuild();",
    'sourceUnitId: "class_ranger"',
    'spellcastingAbility: "wis"',
    '"cure_wounds"',
    '"ensnaring_strike"',
    "expect(rangerSpellcasting?.preparedSpells).not.toContain(",
    "huntersMarkSpellId",
    "slots: [{ spellLevel: 1, count: 2 }]",
    "assertLevelOneHuntersMark({",
    "casterId: huntersMarkRangerId",
  ];
}

function rangerSpellListHuntersMarkSdkTracerNeedles() {
  return [
    "const rangerBuild = finalizedLevelOneRangerSpellListHuntersMarkBuild();",
    'sourceUnitId: "class_ranger"',
    'spellcastingAbility: "wis"',
    "huntersMarkSpellId",
    '"cure_wounds"',
    "slots: [{ spellLevel: 1, count: 2 }]",
    "assertLevelOneHuntersMarkSpellSlot({",
    "casterId: huntersMarkSpellSlotRangerId",
  ];
}

function rangerFavoredEnemyHuntersMarkSdkHelperNeedles() {
  return [
    {
      anchor:
        "function finalizedLevelOneRangerHuntersMarkBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneRangerBuild({",
        'draftIdText: "draft:l1-sdk-ranger-hunters-mark"',
        'expectedBuildLabel: "Ranger Hunter\'s Mark"',
        'preparedSpells: ["cure_wounds", "ensnaring_strike"]',
      ],
    },
    levelOneRangerBuildHelperNeedle(),
    {
      anchor: "function assertLevelOneHuntersMark",
      needles: [
        "huntersMarkFavoredEnemyBonusActionSpellAct(state, input.casterId)",
        "usesRemaining: 2",
        'tag: "classFeatureFreeCast"',
        "resourceUnitId: rangerFavoredEnemyUnitId",
        "requiresTableSpatialFact: true",
        "spellSlotUsesThisTurn).toEqual([])",
        "usesRemaining: 1",
        "expectLevelOneHuntersMarkActiveEffect({",
        "Battle handoff while active battle effects or Concentration are present is blocked",
        "breakBattleConcentration(",
        "settleCharacterSheetFromBattle({",
        "characterSheetSpellSlots(settled)",
        "favoredEnemyHuntersMarkFreeCasts",
        "characterSheetResources(settled, unitLibrary)",
        "startLongRest({",
        'timing: { tag: "noPriorLongRest" }',
        "finishLongRest({",
        "restedTicks: longRest.requiredRestTicks",
        "completeLongRest({ completion: longRestCompletion, unitLibrary })",
        "characterSheetResources(rested, unitLibrary)",
      ],
    },
    rangerHuntersMarkActiveEffectHelperNeedle(),
    {
      anchor: "function huntersMarkFavoredEnemyBonusActionSpellAct",
      needles: [
        'candidate.subject.tag === "bonusActionSpell"',
        'candidate.subject.invocation.tag === "classFeatureFreeCast"',
        "candidate.subject.invocation.spellId === huntersMarkSpellId",
        "candidate.subject.invocation.resourceUnitId ===",
        "rangerFavoredEnemyUnitId",
        'candidate.subject.invocation.procedure === "markedDamageRider"',
      ],
    },
  ];
}

function rangerSpellListHuntersMarkSdkHelperNeedles() {
  return [
    {
      anchor:
        "function finalizedLevelOneRangerSpellListHuntersMarkBuild(): CharacterBuild",
      needles: [
        "finalizedLevelOneRangerBuild({",
        'draftIdText: "draft:l1-sdk-ranger-hunters-mark-spell-slot"',
        'expectedBuildLabel: "Ranger Hunter\'s Mark Spell Slot"',
        'preparedSpells: [huntersMarkSpellId, "cure_wounds"]',
      ],
    },
    levelOneRangerBuildHelperNeedle(),
    {
      anchor: "function assertLevelOneHuntersMarkSpellSlot",
      needles: [
        'tag: "favoredEnemyHuntersMarkFreeCasts"',
        "expended: resourceCount(2)",
        "huntersMarkSpellSlotBonusActionSpellAct(state, input.casterId)",
        "usesRemaining: 0",
        'tag: "spellSlot"',
        "slotLevel: 1",
        "requiresTableSpatialFact: true",
        "spellSlotUsesThisTurn).toEqual([",
        '{ kind: "committed", combatantId: input.casterId }',
        "{ spellLevel: 1, count: 2, expended: 1 }",
        "expectLevelOneHuntersMarkActiveEffect({",
        "characterSheetSpellSlots(settled)",
        '{ tag: "favoredEnemyHuntersMarkFreeCasts", expended: 2 }',
      ],
    },
    rangerHuntersMarkActiveEffectHelperNeedle(),
    {
      anchor: "function huntersMarkSpellSlotBonusActionSpellAct",
      needles: [
        'candidate.subject.tag === "bonusActionSpell"',
        'candidate.subject.invocation.tag === "spellSlot"',
        "candidate.subject.invocation.spellId === huntersMarkSpellId",
        "candidate.subject.invocation.slotLevel === 1",
        'candidate.subject.invocation.procedure === "markedDamageRider"',
      ],
    },
  ];
}

function levelOneRangerBuildHelperNeedle() {
  return {
    anchor: "function finalizedLevelOneRangerBuild(input:",
    needles: [
      "createCharacterDraft({",
      "draftId: characterDraftId(input.draftIdText)",
      '"class_ranger"',
      '"class_prepared_spell_choices"',
      "...input.preparedSpells",
      '"ranger_weapon_mastery"',
      '"weapon_longsword"',
      '"weapon_spear"',
      '"background_criminal"',
      '"class_equipment_choice"',
      '"equipment_purchase"',
      '"wielded_one_handed"',
      "input.expectedBuildLabel",
      "return result.build;",
    ],
  };
}

function levelOnePaladinBuildHelperNeedle() {
  return {
    anchor: "function finalizedLevelOnePaladinBuild(input:",
    needles: [
      "createCharacterDraft({",
      "draftId: characterDraftId(input.draftIdText)",
      '"class_paladin"',
      '"class_prepared_spell_choices"',
      "...input.preparedSpells",
      '"paladin_weapon_mastery"',
      '"weapon_longsword"',
      '"weapon_spear"',
      '"background_criminal"',
      '"class_equipment_choice"',
      '"equipment_purchase"',
      '"wielded_one_handed"',
      "input.expectedBuildLabel",
      "return result.build;",
    ],
  };
}

function rangerHuntersMarkActiveEffectHelperNeedle() {
  return {
    anchor: "function expectLevelOneHuntersMarkActiveEffect",
    needles: [
      'kind: "spellMarkedDamageRider"',
      "sourceSpellId: huntersMarkSpellId",
      "sourceCombatantId: input.casterId",
      "targetCombatantId: monsterId",
      'kind: "findingAdvantage"',
      'skills: ["perception", "survival"]',
      'damageType: "force"',
      "durationTicks: huntersMarkDurationTicks",
      'retargetTiming: "sameTurn"',
    ],
  };
}

function writeSdkRawArtifact(filePath, text) {
  if (write) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return;
  }
  const actual = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  if (actual !== text) {
    throw new Error(
      `${toRepoPath(root, filePath)} is stale. Run node scripts/sdk-raw-integration-inventory.cjs --write.`,
    );
  }
}

function duplicateValues(values) {
  const counts = values.reduce((acc, value) => {
    acc.set(value, (acc.get(value) ?? 0) + 1);
    return acc;
  }, new Map());
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sourceRef(source) {
  return `${source.path}:${source.lineStart}`;
}

function supportSnapshotLabel(snapshot, valueKey) {
  return snapshot.state === "recorded" ? snapshot[valueKey] : snapshot.state;
}

function hasSupportedRuntimeProfile(row) {
  const unitProfile = row.supportSnapshot.unitProfile;
  if (unitProfile.state !== "recorded") return false;
  const disposition = unitProfile.disposition;
  return (
    disposition === "supported-profile" ||
    disposition === "profile-subset-supported"
  );
}

function battleReadinessStatusIs(row, status) {
  const battleReadiness = row.supportSnapshot.battleReadiness;
  return (
    battleReadiness.state === "recorded" && battleReadiness.status === status
  );
}

function battleReadinessStateIs(row, state) {
  const battleReadiness = row.supportSnapshot.battleReadiness;
  return battleReadiness.state === state;
}

function profileOwnerBoundary(profileId) {
  const matched = ownerProfilePrefixes.find(([prefix]) =>
    profileId.startsWith(prefix),
  );
  return matched?.[1];
}

function ownerPathBoundary(ownerPath) {
  const matched = ownerPathPrefixes.find(([prefix]) =>
    ownerPath.startsWith(prefix),
  );
  return matched?.[1];
}

function rowEvidenceOwnerBoundaries(row, ownerEvidence) {
  return uniqueSorted([
    ...(ownerEvidence.characterCreationRowsByRowId.has(row.rowId)
      ? ["character-creation"]
      : []),
    ...(ownerEvidence.characterSheetRowsByRowId.has(row.rowId)
      ? ["character-sheet"]
      : []),
  ]);
}

function classFeatureOwnerResult(row, ownerEvidence) {
  const claim = ownerEvidence.unitClaimsByUnitId.get(row.candidateUnitId);
  const profileIds = claim?.profileIds ?? [];
  const profileOwnerBoundaries = uniqueSorted(
    profileIds.map(profileOwnerBoundary).filter(Boolean),
  );
  const unclassifiedProfileIds = profileIds.filter(
    (profileId) => profileOwnerBoundary(profileId) === undefined,
  );
  const unitEvidence =
    ownerEvidence.unitEvidenceByUnitId.get(row.candidateUnitId) ?? [];
  const unitEvidenceOwnerPaths = uniqueSorted(
    unitEvidence.map((evidence) => evidence.ownerPath).filter(Boolean),
  );
  const unitEvidenceOwnerBoundaries = uniqueSorted(
    unitEvidenceOwnerPaths.map(ownerPathBoundary).filter(Boolean),
  );
  const rowEvidenceBoundaries = rowEvidenceOwnerBoundaries(row, ownerEvidence);
  const evidenceOwnerBoundaries = unitEvidenceOwnerBoundaries.filter(
    (boundary) => boundary !== "character-battle-runtime",
  );
  const classificationBoundaries = uniqueSorted(
    profileOwnerBoundaries.length > 0
      ? [...profileOwnerBoundaries, ...evidenceOwnerBoundaries]
      : [...rowEvidenceBoundaries, ...evidenceOwnerBoundaries],
  );
  const proposedOwnerBoundary =
    unclassifiedProfileIds.length > 0 || classificationBoundaries.length === 0
      ? "class-feature-owner-review"
      : classificationBoundaries.length === 1
        ? classificationBoundaries[0]
        : "multi-owner-sdk-split";

  return {
    proposedOwnerBoundary,
    ownerBoundaryEvidence: {
      source: "unit-profile-owner-evidence",
      claimTag: claim?.tag,
      profileIds,
      profileOwnerBoundaries,
      unclassifiedProfileIds,
      rowEvidenceOwnerBoundaries: rowEvidenceBoundaries,
      unitEvidenceOwnerBoundaries,
      unitEvidenceOwnerPaths,
      evidenceTags: uniqueSorted(
        unitEvidence.map((evidence) => evidence.tag).filter(Boolean),
      ),
      ...(claim?.selectedIdentityEvidenceDisposition === undefined
        ? {}
        : {
            selectedIdentityEvidenceDisposition:
              claim.selectedIdentityEvidenceDisposition,
          }),
    },
  };
}

function spellEffectOwnerResult(row) {
  const closure = row.supportSnapshot.battleReadinessClosure;
  if (closure?.state !== "recorded") {
    return {
      proposedOwnerBoundary: "spell-effect-owner-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closureState: closure?.state ?? "missing",
      },
    };
  }
  if (futureSpellClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "future-runtime-owner-before-sdk",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (tableOnlySpellClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "table-only-closure",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (closure.kind === "outside-runtime-presentation-exploration") {
    return {
      proposedOwnerBoundary: "spell-effect-owner-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  return {
    proposedOwnerBoundary: "spell-effect-owner-review",
    ownerBoundaryEvidence: {
      source: "battle-readiness-closure",
      closure,
    },
  };
}

function unsupportedClassFeatureOwnerResult(row, ownerEvidence) {
  const rowEvidenceBoundaries = rowEvidenceOwnerBoundaries(row, ownerEvidence);
  if (rowEvidenceBoundaries.length > 0) {
    return {
      proposedOwnerBoundary:
        rowEvidenceBoundaries.length === 1
          ? rowEvidenceBoundaries[0]
          : "multi-owner-sdk-split",
      ownerBoundaryEvidence: {
        source: "row-owner-evidence",
        rowEvidenceOwnerBoundaries: rowEvidenceBoundaries,
      },
    };
  }
  const closure = row.supportSnapshot.battleReadinessClosure;
  if (closure?.state !== "recorded") {
    return {
      proposedOwnerBoundary: "class-feature-closure-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closureState: closure?.state ?? "missing",
      },
    };
  }
  if (characterCreationClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "character-creation",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (futureFeatureClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "future-runtime-owner-before-sdk",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  return {
    proposedOwnerBoundary: "class-feature-closure-review",
    ownerBoundaryEvidence: {
      source: "battle-readiness-closure",
      closure,
    },
  };
}

function slug(value) {
  const result = String(value ?? "none")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return result === "" ? "none" : result;
}

function seedScenarioRowKey(row) {
  return `${row.levelBand}:${row.className}:${row.candidateUnitId}`;
}

function seedScenarioTitle(row) {
  return row.label.replace(/^[^:]+:\s*/, "");
}

function levelReportFrontier(report) {
  return report.frontierRows.map((row) => ({
    unitId: row.unitId,
    kind: row.kind,
    status: row.status,
    claimTag: row.claimTag,
    sourceRows: row.sourceRows ?? [],
    reason: row.reason,
  }));
}

function levelReportSummary(input) {
  const report = readJson(input.path);
  return {
    key: input.key,
    title: input.title,
    sourcePath: toRepoPath(root, input.path),
    levelBands: report.scope.levelBands,
    strictTargetClosure: report.metrics.strictTargetClosure,
    strictRuntimeProfileSupport: report.metrics.strictRuntimeProfileSupport,
    productReadiness: report.metrics.productReadiness,
    summary: report.summary,
    frontierRows: levelReportFrontier(report),
  };
}

function ownerBoundaryForMiningRow(row, ownerEvidence) {
  if (row.rowKind === "class-table-summary") return "build-progression";
  if (buildSheetRowKinds.has(row.rowKind)) return "character-build-to-sheet";
  if (buildBattleRowKinds.has(row.rowKind)) return "character-build-to-battle";
  if (sheetSpellAccessRowKinds.has(row.rowKind)) {
    return "character-sheet-spell-access";
  }
  if (row.supportSnapshot.finalDisposition === "non-runtime") {
    return "non-runtime-closure";
  }
  if (
    battleReadinessStatusIs(row, "battle-runtime-required") ||
    row.supportSnapshot.finalDisposition.endsWith("owner-evidence-required") ||
    row.supportSnapshot.finalDisposition ===
      "catalog-authored-executable-follow-up"
  ) {
    return "future-runtime-owner-before-sdk";
  }
  if (row.rowKind === "class-feature-grant") {
    if (hasSupportedRuntimeProfile(row)) {
      if (battleReadinessStatusIs(row, "accepted")) {
        return classFeatureOwnerResult(row, ownerEvidence);
      }
      if (battleReadinessStateIs(row, "not-applicable")) {
        return classFeatureOwnerResult(row, ownerEvidence);
      }
    }
    return unsupportedClassFeatureOwnerResult(row, ownerEvidence);
  }
  if (row.rowKind === "spell-unit-pressure") {
    if (battleReadinessStatusIs(row, "accepted-no-battle-effect")) {
      return spellEffectOwnerResult(row);
    }
    return battleReadinessStatusIs(row, "accepted")
      ? "character-battle-to-battle"
      : "spell-access-or-battle";
  }
  if (battleReadinessStatusIs(row, "accepted")) {
    return "character-battle-to-battle";
  }
  return "character-sheet-or-build-closure";
}

function normalizeOwnerBoundaryResult(result) {
  return typeof result === "string"
    ? { proposedOwnerBoundary: result }
    : result;
}

function ownerBoundaryStatus(boundary, disposition) {
  return boundary.endsWith("-review") || disposition === "closure-review-needed"
    ? "unresolved-review"
    : "resolved";
}

function implementationTaskForLevelBand(levelBand) {
  if (
    levelBand === "level-1" ||
    levelBand === "spell-level-0" ||
    levelBand === "spell-level-1"
  ) {
    return "L15-SDK-RAW-03";
  }
  if (levelBand === "level-2") return "L15-SDK-RAW-04";
  if (levelBand === "level-3" || levelBand === "spell-level-2") {
    return "L15-SDK-RAW-05";
  }
  if (levelBand === "level-4") return "L15-SDK-RAW-06";
  if (levelBand === "level-5" || levelBand === "spell-level-3") {
    return "L15-SDK-RAW-07";
  }
  return "L15-SDK-RAW-01";
}

function scenarioLaneForRow(row) {
  if (row.sdkInventoryDisposition === "seed-scenario-present") {
    return "seed-present";
  }
  if (row.sdkInventoryDisposition === "future-owner-before-sdk") {
    return "future-owner-before-sdk";
  }
  if (row.sdkInventoryDisposition === "explicit-closure-needed") {
    return "explicit-closure";
  }
  if (row.sdkInventoryDisposition === "sdk-scenario-or-owner-closure-needed") {
    return "owner-review";
  }
  if (row.sdkInventoryDisposition === "closure-review-needed") {
    if (row.proposedOwnerBoundary === "spell-effect-owner-review") {
      return "spell-effect-owner-review";
    }
    if (row.proposedOwnerBoundary === "class-feature-closure-review") {
      return "feature-owner-review";
    }
    return "sheet-build-closure";
  }
  if (row.sdkInventoryDisposition === "table-only-closure-needed") {
    return "table-only-closure";
  }
  if (row.proposedOwnerBoundary === "character-build-to-sheet") {
    return "build-sheet-sdk";
  }
  if (row.proposedOwnerBoundary === "character-build-to-battle") {
    return "build-battle-sdk";
  }
  if (row.proposedOwnerBoundary === "character-sheet-spell-access") {
    return "sheet-spell-access-sdk";
  }
  if (
    row.proposedOwnerBoundary === "class-feature-owner-review" ||
    row.proposedOwnerBoundary === "class-feature-closure-review"
  ) {
    return "feature-owner-review";
  }
  if (row.proposedOwnerBoundary === "character-creation") {
    return "character-creation-sdk";
  }
  if (row.proposedOwnerBoundary === "character-sheet") {
    return "character-sheet-sdk";
  }
  if (row.proposedOwnerBoundary === "multi-owner-sdk-split") {
    return "multi-owner-feature-sdk";
  }
  if (
    row.proposedOwnerBoundary === "character-battle-to-battle" &&
    row.rowKind === "spell-unit-pressure"
  ) {
    return "battle-spell-sdk";
  }
  if (row.proposedOwnerBoundary === "character-battle-to-battle") {
    return "battle-feature-sdk";
  }
  return "inventory-review";
}

function scenarioGroupParts(row) {
  const taskId = implementationTaskForLevelBand(row.levelBand);
  const lane = scenarioLaneForRow(row);
  if (lane === "seed-present") {
    return [taskId, lane, seedScenarioRowKey(row)];
  }
  if (
    lane === "battle-spell-sdk" ||
    lane === "spell-effect-owner-review" ||
    lane === "table-only-closure" ||
    lane === "future-owner-before-sdk" ||
    lane === "owner-review"
  ) {
    return [taskId, lane, row.candidateUnitId];
  }
  if (lane === "build-sheet-sdk") {
    return [taskId, lane, row.className];
  }
  if (lane === "build-battle-sdk") {
    return [taskId, lane, row.className];
  }
  if (lane === "sheet-spell-access-sdk") {
    return [taskId, lane, row.className, row.rowKind];
  }
  if (
    lane === "feature-owner-review" ||
    lane === "battle-feature-sdk" ||
    lane === "character-creation-sdk" ||
    lane === "character-sheet-sdk" ||
    lane === "multi-owner-feature-sdk" ||
    lane === "sheet-build-closure"
  ) {
    return [taskId, lane, row.candidateUnitId];
  }
  if (lane === "explicit-closure") {
    return [taskId, lane, row.className, row.rowKind, row.candidateUnitId];
  }
  return [taskId, lane, row.proposedOwnerBoundary, row.candidateUnitId];
}

function scenarioGroupRawKey(row) {
  return JSON.stringify(scenarioGroupParts(row));
}

function scenarioGroupDisplayId(row) {
  return scenarioGroupParts(row).map(slug).join(":");
}

function scenarioSuggestion(group) {
  if (group.lane === "seed-present") {
    return "Keep the existing tracer as the SDK regression and add row-specific assertions only if RAW review finds a gap.";
  }
  if (group.lane === "build-sheet-sdk") {
    return "Finalize the character build/sheet for this class slice and assert RAW-facing class, proficiency, selection, or derived sheet facts at the build/sheet owner.";
  }
  if (group.lane === "build-battle-sdk") {
    return "Finalize build and equipment/mastery choices, project to battle, and assert AC, attack, damage, or mastery facts that a user reaches through the SDK path.";
  }
  if (group.lane === "sheet-spell-access-sdk") {
    return "Create the sheet through class or subclass spell access and assert known/prepared/list/slot facts; leave spell effects to the spell-unit scenario groups.";
  }
  if (group.lane === "feature-owner-review") {
    return "Resolve the feature's real owner boundary from focused evidence before implementation: build/sheet for persistent facts and resources, or character-battle plus battle resolution only when the feature is battle-executable.";
  }
  if (group.lane === "character-creation-sdk") {
    return "Finalize the build through character creation and assert the SRD-facing selected feature, option, proficiency, or retained Unit refs without claiming sheet or battle execution.";
  }
  if (group.lane === "character-sheet-sdk") {
    return "Create the sheet through the build path and assert the SRD-facing resource, rest, recovery, derived stat, or persistent sheet projection at the sheet owner.";
  }
  if (group.lane === "multi-owner-feature-sdk") {
    return "Split the SDK coverage by profile owner: assert build/sheet facts at their owner, then add battle projection/resolution only for the executable profile facts.";
  }
  if (group.lane === "battle-feature-sdk") {
    return "Build or sheet the class at the required level, project to battle, discover/resolve the feature act or trigger, and assert RAW-facing effects and resources.";
  }
  if (group.lane === "battle-spell-sdk") {
    return "Create a level-appropriate caster for each listed access row or pair one spell execution with explicit class-access assertions, cast through battle discovery/resolution, and assert RAW-facing effects and resources.";
  }
  if (group.lane === "spell-effect-owner-review") {
    return "Resolve the missing or unfamiliar spell closure evidence before implementation; do not infer table-only or future-owner status from prose alone.";
  }
  if (group.lane === "table-only-closure") {
    return "Add or retain an explicit SDK-scope closure assertion tied to the local RAW anchor and recorded social/knowledge closure evidence.";
  }
  if (group.lane === "sheet-build-closure") {
    return "Review lower-owner evidence and either add a build/sheet SDK assertion for user-reachable state or retain an explicit closure with the local RAW anchor.";
  }
  if (group.lane === "explicit-closure") {
    return "Keep this generated non-runtime class-table closure tied to the local class table row.";
  }
  if (group.lane === "future-owner-before-sdk") {
    return "Do not write a skipped SDK test; complete or split the owning runtime/spec work first, then add the SDK scenario.";
  }
  if (group.lane === "owner-review") {
    return "Existing owner evidence is present but SDK coverage is not settled; either write the SDK scenario or document why lower-owner evidence is the durable closure.";
  }
  return "Review this group before implementation; the generator could not assign a narrower scenario lane.";
}

function buildScenarioGroups(rows) {
  const groupedRows = rows.reduce((groups, row) => {
    const key = scenarioGroupRawKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
    return groups;
  }, new Map());

  return Array.from(groupedRows.entries())
    .map(([, groupRows]) => {
      const first = groupRows[0];
      const levelBands = uniqueSorted(groupRows.map((row) => row.levelBand));
      const classNames = uniqueSorted(
        groupRows.map((row) => row.className).filter(Boolean),
      );
      const candidateUnitIds = uniqueSorted(
        groupRows.map((row) => row.candidateUnitId),
      );
      const lane = scenarioLaneForRow(first);
      const group = {
        groupId: scenarioGroupDisplayId(first),
        rawGroupKey: scenarioGroupRawKey(first),
        taskId: implementationTaskForLevelBand(first.levelBand),
        lane,
        proposedOwnerBoundaries: uniqueSorted(
          groupRows.map((row) => row.proposedOwnerBoundary),
        ),
        ownerBoundaryStatuses: uniqueSorted(
          groupRows.map((row) => row.ownerBoundaryStatus),
        ),
        sdkInventoryDispositions: uniqueSorted(
          groupRows.map((row) => row.sdkInventoryDisposition),
        ),
        levelBands,
        rowKinds: uniqueSorted(groupRows.map((row) => row.rowKind)),
        categories: uniqueSorted(groupRows.map((row) => row.category)),
        classNames,
        candidateUnitIds,
        rowCount: groupRows.length,
        sampleConcepts: uniqueSorted(groupRows.map((row) => row.concept)).slice(
          0,
          8,
        ),
        rawSources: uniqueSorted(
          groupRows.flatMap((row) => [
            sourceRef(row.source),
            ...(row.existingSdkScenario?.rawSources ?? []),
          ]),
        ),
        rows: groupRows.map((row) => ({
          rowId: row.rowId,
          levelBand: row.levelBand,
          className: row.className,
          concept: row.concept,
          candidateUnitId: row.candidateUnitId,
          source: row.source,
          sdkInventoryDisposition: row.sdkInventoryDisposition,
          proposedOwnerBoundary: row.proposedOwnerBoundary,
          ownerBoundaryStatus: row.ownerBoundaryStatus,
        })),
      };
      return {
        ...group,
        suggestedScenario: scenarioSuggestion(group),
      };
    })
    .sort((left, right) => left.groupId.localeCompare(right.groupId));
}

function levelOneTwoCampaignRowFamily(disposition) {
  const rowFamily = levelOneTwoCampaignRowFamilyByDisposition.get(disposition);
  if (rowFamily !== undefined) return rowFamily;
  throw new Error(`Unassigned L1/L2 campaign disposition ${disposition}`);
}

function levelOneTwoCampaignGroupDisposition(group) {
  if (group.sdkInventoryDispositions.length === 1) {
    return group.sdkInventoryDispositions[0];
  }
  throw new Error(
    `L1/L2 campaign group ${group.groupId} mixes SDK dispositions: ${group.sdkInventoryDispositions.join(", ")}`,
  );
}

function assertLevelOneTwoCampaignGrouping(rows, groups) {
  const rowsWithoutAssignment = rows.filter(
    (row) =>
      !levelOneTwoCampaignActiveDispositions.has(
        row.sdkInventoryDisposition,
      ) ||
      !levelOneTwoCampaignRowFamilyByDisposition.has(
        row.sdkInventoryDisposition,
      ) ||
      !levelOneTwoCampaignLaneOwnership.has(scenarioLaneForRow(row)),
  );
  if (rowsWithoutAssignment.length !== 0) {
    throw new Error(
      [
        `Unassigned L1/L2 campaign rows: ${rowsWithoutAssignment.length}`,
        ...rowsWithoutAssignment
          .slice(0, 20)
          .map(
            (row) =>
              `${row.rowId} disposition=${row.sdkInventoryDisposition} lane=${scenarioLaneForRow(row)}`,
          ),
      ].join("\n"),
    );
  }

  const groupsWithoutAssignment = groups.filter((group) => {
    const disposition = levelOneTwoCampaignGroupDisposition(group);
    return (
      !levelOneTwoCampaignActiveDispositions.has(disposition) ||
      !levelOneTwoCampaignRowFamilyByDisposition.has(disposition) ||
      !levelOneTwoCampaignLaneOwnership.has(group.lane)
    );
  });
  if (groupsWithoutAssignment.length !== 0) {
    throw new Error(
      [
        `Unassigned L1/L2 campaign groups: ${groupsWithoutAssignment.length}`,
        ...groupsWithoutAssignment
          .slice(0, 20)
          .map(
            (group) =>
              `${group.groupId} dispositions=${group.sdkInventoryDispositions.join(", ")} lane=${group.lane}`,
          ),
      ].join("\n"),
    );
  }

  if (rows.length !== expectedLevelOneTwoCampaignRows) {
    throw new Error(
      `Expected ${expectedLevelOneTwoCampaignRows} L1/L2 campaign rows, found ${rows.length}.`,
    );
  }
  if (groups.length !== expectedLevelOneTwoCampaignGroups) {
    throw new Error(
      `Expected ${expectedLevelOneTwoCampaignGroups} L1/L2 campaign groups, found ${groups.length}.`,
    );
  }
}

function buildLevelOneTwoCampaignGrouping(rows, scenarioGroups) {
  const campaignRows = rows.filter((row) =>
    levelOneTwoSourceHarnessBands.has(row.levelBand),
  );
  const campaignGroups = scenarioGroups.filter((group) =>
    group.levelBands.every((levelBand) =>
      levelOneTwoSourceHarnessBands.has(levelBand),
    ),
  );
  assertLevelOneTwoCampaignGrouping(campaignRows, campaignGroups);

  const rowCountByLane = countValues(
    campaignRows.map((row) => scenarioLaneForRow(row)),
  );
  const groupCountByLane = countValues(campaignGroups.map((group) => group.lane));
  const rowCountByFamily = countValues(
    campaignRows.map((row) =>
      levelOneTwoCampaignRowFamily(row.sdkInventoryDisposition),
    ),
  );
  const groupCountByFamily = countValues(
    campaignGroups.map((group) =>
      levelOneTwoCampaignRowFamily(
        levelOneTwoCampaignGroupDisposition(group),
      ),
    ),
  );

  const lanes = Array.from(levelOneTwoCampaignLaneOwnership.entries())
    .filter(([lane]) => rowCountByLane[lane] !== undefined)
    .map(([lane, ownership]) => {
      const laneRows = campaignRows.filter(
        (row) => scenarioLaneForRow(row) === lane,
      );
      const dispositions = uniqueSorted(
        laneRows.map((row) => row.sdkInventoryDisposition),
      );
      if (dispositions.length !== 1) {
        throw new Error(
          `L1/L2 campaign lane ${lane} mixes SDK dispositions: ${dispositions.join(", ")}`,
        );
      }
      const disposition = dispositions[0];
      return {
        lane,
        disposition,
        rowFamily: levelOneTwoCampaignRowFamily(disposition),
        rowCount: rowCountByLane[lane],
        groupCount: groupCountByLane[lane] ?? 0,
        taskFamily: ownership.taskFamily,
        ownerTaskIds: ownership.ownerTaskIds,
        followUpTaskIds: ownership.followUpTaskIds,
      };
    })
    .sort((left, right) => left.lane.localeCompare(right.lane));

  const rowFamilies = Array.from(levelOneTwoCampaignRowFamilyByDisposition)
    .map(([disposition, rowFamily]) => ({
      rowFamily,
      disposition,
      rowCount: rowCountByFamily[rowFamily] ?? 0,
      groupCount: groupCountByFamily[rowFamily] ?? 0,
      lanes: lanes
        .filter((lane) => lane.disposition === disposition)
        .map((lane) => lane.lane),
    }))
    .sort((left, right) => left.rowFamily.localeCompare(right.rowFamily));

  return {
    sourceCorpus: {
      kind: "srd-5.2.1-local-corpus",
      licenseScope: "redistributable-srd",
      sourcePathPrefix: ".references/srd-5.2.1/",
    },
    levelBands: Array.from(levelOneTwoSourceHarnessBands),
    activeDispositions: Array.from(levelOneTwoCampaignActiveDispositions),
    totals: {
      rowCount: campaignRows.length,
      groupCount: campaignGroups.length,
    },
    rowFamilies,
    lanes,
  };
}

function assertLocalRawSources(rows) {
  const invalidRows = rows.filter(
    (row) =>
      !row.source.path.startsWith(".references/srd-5.2.1/") ||
      !Number.isInteger(row.source.lineStart),
  );
  if (invalidRows.length === 0) return;
  const details = invalidRows
    .slice(0, 10)
    .map((row) => `${row.rowId} -> ${sourceRef(row.source)}`)
    .join("\n");
  throw new Error(
    `SDK RAW inventory requires local SRD 5.2.1 source anchors. Invalid rows: ${invalidRows.length}\n${details}`,
  );
}

function assertSeedScenarios(seedScenarioSources, rows) {
  const rowsById = new Map(rows.map((row) => [row.rowId, row]));
  const errors = seededSdkScenarioRows.flatMap((seed) => {
    const matchedRow = rowsById.get(seed.rowId);
    const seedErrors = [];
    if (matchedRow === undefined) {
      seedErrors.push(`${seed.rowId} is absent from mined rows`);
    } else if (seedScenarioRowKey(matchedRow) !== seedScenarioRowKey(seed)) {
      seedErrors.push(
        `${seed.rowId} no longer matches ${seedScenarioRowKey(seed)}`,
      );
    }
    const seedSourceText = seedScenarioSources.get(seed.path);
    if (seedSourceText === undefined) {
      seedErrors.push(
        `${seed.rowId} seed file ${toRepoPath(root, seed.path)} was not read`,
      );
    }
    const title = seedScenarioTitle(seed);
    if (seedSourceText !== undefined && !seedSourceText.includes(title)) {
      seedErrors.push(
        `${seed.rowId} scenario title "${title}" is absent from ${toRepoPath(root, seed.path)}`,
      );
    }
    const scenarioText =
      seedSourceText === undefined
        ? undefined
        : seedScenarioSourceText(seedSourceText, title);
    for (const needle of seed.tracerNeedles) {
      if (scenarioText === undefined || !scenarioText.includes(needle)) {
        seedErrors.push(
          `${seed.rowId} tracer needle "${needle}" is absent from scenario "${title}"`,
        );
      }
    }
    for (const helper of seed.helperNeedles ?? []) {
      const helperText =
        seedSourceText === undefined
          ? undefined
          : seedHelperSourceText(seedSourceText, helper.anchor);
      if (helperText === undefined) {
        seedErrors.push(
          `${seed.rowId} helper anchor "${helper.anchor}" is absent from ${toRepoPath(root, seed.path)}`,
        );
        continue;
      }
      for (const needle of helper.needles) {
        if (!helperText.includes(needle)) {
          seedErrors.push(
            `${seed.rowId} helper needle "${needle}" is absent from helper "${helper.anchor}"`,
          );
        }
      }
    }
    for (const evidence of seed.evidenceNeedles ?? []) {
      const evidenceSourceText = seedScenarioSources.get(evidence.path);
      if (evidenceSourceText === undefined) {
        seedErrors.push(
          `${seed.rowId} evidence file ${toRepoPath(root, evidence.path)} was not read`,
        );
        continue;
      }
      const evidenceText = seedScenarioSourceText(
        evidenceSourceText,
        evidence.testTitle,
      );
      if (evidenceText === undefined) {
        seedErrors.push(
          `${seed.rowId} evidence test "${evidence.testTitle}" is absent from ${toRepoPath(root, evidence.path)}`,
        );
        continue;
      }
      for (const needle of evidence.needles) {
        if (!evidenceText.includes(needle)) {
          seedErrors.push(
            `${seed.rowId} evidence needle "${needle}" is absent from test "${evidence.testTitle}"`,
          );
        }
      }
    }
    return seedErrors;
  });
  if (errors.length === 0) return;
  throw new Error(
    `SDK seed scenario declarations are stale:\n${errors.join("\n")}`,
  );
}

function seedScenarioEvidenceText(seed, seedScenarioSources) {
  const seedSourceText = seedScenarioSources.get(seed.path);
  if (seedSourceText === undefined) return "";
  const title = seedScenarioTitle(seed);
  const scenarioText = seedScenarioSourceText(seedSourceText, title) ?? "";
  const helperTexts = (seed.helperNeedles ?? []).map(
    (helper) => seedHelperSourceText(seedSourceText, helper.anchor) ?? "",
  );
  const calledHelperPattern = new RegExp(
    `\\b(${[
      "assertLevelOne[A-Z]\\w*",
      "finalizedLevelOne[A-Z]\\w*Build",
      "levelOne[A-Z]\\w*Build",
    ].join("|")})\\s*\\(`,
    "g",
  );
  const calledHelperTexts = Array.from(
    scenarioText.matchAll(calledHelperPattern),
  ).map(([, name]) => {
    return seedHelperSourceText(seedSourceText, `function ${name}`) ?? "";
  });
  return [scenarioText, ...helperTexts, ...calledHelperTexts].join("\n");
}

function sourceBuildPathForSeed(seed) {
  return handBuiltSourceSeedRowIds.has(seed.rowId)
    ? "direct-character-build"
    : "legal-creation-draft-finalize";
}

function seedMigrationClassification(seed, usesRealSheetBattleHandoff) {
  if (seed.sourceProof === "legal-creation-owner") {
    return "legal creation owner proof";
  }
  if (seed.sourceProof === "legal-build-sheet-owner") {
    return "legal build-sheet owner proof";
  }
  if (!usesRealSheetBattleHandoff) {
    return (seed.evidenceNeedles ?? []).length > 0
      ? "lower-level focused seed only"
      : "should remain explicit closure";
  }
  return sourceBuildPathForSeed(seed) === "direct-character-build"
    ? "hand-built build needing migration"
    : "already legal creation path";
}

function seedMigrationAuditReason(classification) {
  if (classification === "legal creation owner proof") {
    return "The represented source character build is finalized through character creation at the row owner boundary; battle handoff is not required for this owner.";
  }
  if (classification === "legal build-sheet owner proof") {
    return "The represented source character build is finalized through character creation and projected into a fresh Character Sheet at the build/sheet owner boundary.";
  }
  if (classification === "already legal creation path") {
    return "The represented source character build is finalized through character creation and then projected through sheet and battle handoff.";
  }
  if (classification === "hand-built build needing migration") {
    return "The represented source character still comes from a direct CharacterBuild helper, so this seed is legacy focused coverage until migrated.";
  }
  if (classification === "lower-level focused seed only") {
    return "The seed is useful focused evidence but does not exercise a real character sheet to battle handoff.";
  }
  return "The row should stay explicit SDK-scope closure rather than lifecycle proof.";
}

function seedMigrationNextAction(classification) {
  if (classification === "legal creation owner proof") {
    return "Keep as source creation seed; add sheet or battle assertions only for rows owned by those boundaries.";
  }
  if (classification === "legal build-sheet owner proof") {
    return "Keep as build/sheet source seed; add battle assertions only for rows owned by battle boundaries.";
  }
  if (classification === "already legal creation path") {
    return "Keep as source lifecycle seed; add row-specific assertions only when future RAW review finds a gap.";
  }
  if (classification === "hand-built build needing migration") {
    return "Create a follow-up migration task to replace the direct CharacterBuild source helper with the legal source fixture seam.";
  }
  if (classification === "lower-level focused seed only") {
    return "Retain as focused evidence; add a separate SDK lifecycle scenario before counting whole-width coverage.";
  }
  return "Retain explicit closure with its owner reason; do not count as SDK lifecycle coverage.";
}

function buildLevelOneTwoSeedMigrationAudit(seedScenarioSources, miningRows) {
  const rowsById = new Map(miningRows.map((row) => [row.rowId, row]));
  const auditRows = seededSdkScenarioRows
    .filter((seed) => levelOneTwoSourceHarnessBands.has(seed.levelBand))
    .map((seed) => {
      const evidenceText = seedScenarioEvidenceText(seed, seedScenarioSources);
      const usesRealSheetBattleHandoff =
        seed.sourceProof === legalBuildBattleHandoffSourceProof ||
        (evidenceText.includes("battleFromSheets(") &&
          evidenceText.includes("characterSheet({"));
      const classification = seedMigrationClassification(
        seed,
        usesRealSheetBattleHandoff,
      );
      const wholeWidthSourceLifecycleProof =
        classification === "already legal creation path" &&
        usesRealSheetBattleHandoff;
      const miningRow = rowsById.get(seed.rowId);
      return {
        rowId: seed.rowId,
        rowKey: seedScenarioRowKey(seed),
        levelBand: seed.levelBand,
        rowKind: miningRow?.rowKind,
        className: seed.className,
        candidateUnitId: seed.candidateUnitId,
        classification,
        sourceBuildPath: sourceBuildPathForSeed(seed),
        ...(seed.sourceProof === undefined
          ? {}
          : { sourceProof: seed.sourceProof }),
        usesRealSheetBattleHandoff,
        wholeWidthSourceLifecycleProof,
        reason: seedMigrationAuditReason(classification),
        nextAction: seedMigrationNextAction(classification),
        existingSdkScenario: {
          label: seed.label,
          path: toRepoPath(root, seed.path),
        },
      };
    })
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  assertLevelOneTwoSeedMigrationAudit(auditRows);
  return auditRows;
}

function assertLevelOneTwoSeedMigrationAudit(auditRows) {
  if (auditRows.length !== expectedLevelOneTwoSeedScenarioRows) {
    throw new Error(
      `Expected ${expectedLevelOneTwoSeedScenarioRows} L1/L2 seed migration audit rows, found ${auditRows.length}.`,
    );
  }
  const directBuildLifecycleRows = auditRows.filter(
    (row) =>
      row.sourceBuildPath === "direct-character-build" &&
      row.wholeWidthSourceLifecycleProof,
  );
  if (directBuildLifecycleRows.length > 0) {
    throw new Error(
      [
        "Direct CharacterBuild seed rows must not count as whole-width source lifecycle proof.",
        ...directBuildLifecycleRows.map((row) => `- ${row.rowId}`),
      ].join("\n"),
    );
  }
}

function spellLevelFromLevelBand(levelBand) {
  const match = /^spell-level-(\d+)$/.exec(levelBand);
  return match == null ? undefined : Number(match[1]);
}

function classContentPath(className) {
  return path.join(
    root,
    "packages/surface/content",
    `class_${slug(className).replace(/-/g, "_")}.json`,
  );
}

function spellAccessIncludesSpell(spells, spellId, spellLevel) {
  return (spells ?? []).some(
    (spell) => spell.spellId === spellId && spell.spellLevel === spellLevel,
  );
}

function surfaceClassSpellAccessCoversRow(row) {
  const spellLevel = spellLevelFromLevelBand(row.levelBand);
  if (spellLevel == null) return true;

  const className = String(row.className ?? "").toLowerCase();
  const classRecord = readJson(classContentPath(className));
  const spellcasting = classRecord.spellcasting;
  if (spellcasting == null) return false;

  if (spellLevel === 0) {
    return (spellcasting.cantripAccess?.spellIds ?? []).includes(
      row.candidateUnitId,
    );
  }

  if (spellcasting.kind === "wizard_spellcasting_creation") {
    return (
      spellAccessIncludesSpell(
        spellcasting.spellbookAccess?.spells,
        row.candidateUnitId,
        spellLevel,
      ) &&
      (spellcasting.preparedAccess?.spellIds ?? []).includes(
        row.candidateUnitId,
      )
    );
  }

  return spellAccessIncludesSpell(
    spellcasting.preparedAccess?.spells,
    row.candidateUnitId,
    spellLevel,
  );
}

function assertSurfaceClassSpellAccessCoversMinedRows(rows) {
  const missing = rows
    .filter((row) => row.rowKind === "spell-unit-pressure")
    .filter((row) => !surfaceClassSpellAccessCoversRow(row));

  if (missing.length === 0) return;

  throw new Error(
    [
      `Surface class spell access is missing ${missing.length} mined SRD level 1-5 spell-list rows.`,
      ...missing
        .slice(0, 40)
        .map(
          (row) =>
            `- ${row.className} ${row.levelBand} ${row.candidateUnitId} (${row.rowId})`,
        ),
      ...(missing.length > 40
        ? [`- ... ${missing.length - 40} more missing rows`]
        : []),
    ].join("\n"),
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function seedScenarioSourceText(tracerText, title) {
  const titlePattern = new RegExp(
    `\\btest\\(\\s*["'\`]${escapeRegExp(title)}\\b`,
  );
  const match = titlePattern.exec(tracerText);
  if (match === null) return undefined;
  const rest = tracerText.slice(match.index);
  const endMatch =
    /\n\s+test\(|\n\}\);\n\n(?:type|function|const|class)\b/.exec(
      rest.slice(1),
    );
  return endMatch === null ? rest : rest.slice(0, endMatch.index + 1);
}

function seedHelperSourceText(tracerText, anchor) {
  const anchorIndex = tracerText.indexOf(anchor);
  if (anchorIndex === -1) return undefined;
  const rest = tracerText.slice(anchorIndex);
  const endMatch =
    /\nfunction\s+\w|\ntype\s+\w|\nconst\s+\w|\nclass\s+\w|\ndescribe\(/.exec(
      rest.slice(1),
    );
  return endMatch === null ? rest : rest.slice(0, endMatch.index + 1);
}

function assertUniqueScenarioGroupIds(groups) {
  const duplicateGroupIds = duplicateValues(
    groups.map((group) => group.groupId),
  );
  if (duplicateGroupIds.length === 0) return;
  throw new Error(
    `SDK scenario group display ids must be unique. Duplicates: ${duplicateGroupIds.join(", ")}`,
  );
}

function sdkInventoryDisposition(row, proposedOwnerBoundary) {
  if (seededSdkScenarioByRowId.has(row.rowId)) {
    return "seed-scenario-present";
  }
  if (row.supportSnapshot.finalDisposition === "non-runtime") {
    return "explicit-closure-needed";
  }
  if (proposedOwnerBoundary === "future-runtime-owner-before-sdk") {
    return "future-owner-before-sdk";
  }
  if (proposedOwnerBoundary === "table-only-closure") {
    return "table-only-closure-needed";
  }
  if (proposedOwnerBoundary.endsWith("-review")) {
    return "closure-review-needed";
  }
  if (
    proposedOwnerBoundary === "character-creation" ||
    proposedOwnerBoundary === "character-sheet" ||
    proposedOwnerBoundary === "multi-owner-sdk-split"
  ) {
    return "sdk-scenario-needed";
  }
  if (
    proposedOwnerBoundary === "character-sheet-or-build-closure" &&
    row.supportSnapshot.finalDisposition ===
      "catalog-installed-owner-evidence-present"
  ) {
    return "sdk-scenario-or-owner-closure-needed";
  }
  if (battleReadinessStatusIs(row, "accepted")) {
    return "sdk-scenario-needed";
  }
  if (
    row.supportSnapshot.finalDisposition === "catalog-only/dead-for-now" ||
    battleReadinessStatusIs(row, "accepted-no-battle-effect")
  ) {
    return "closure-review-needed";
  }
  if (
    row.supportSnapshot.finalDisposition ===
    "catalog-installed-owner-evidence-present"
  ) {
    return "sdk-scenario-or-owner-closure-needed";
  }
  return "inventory-review-needed";
}

function projectMiningRow(row, ownerEvidence) {
  const seedScenario = seededSdkScenarioByRowId.get(row.rowId);
  const ownerBoundary = normalizeOwnerBoundaryResult(
    ownerBoundaryForMiningRow(row, ownerEvidence),
  );
  const { proposedOwnerBoundary } = ownerBoundary;
  const disposition = sdkInventoryDisposition(row, proposedOwnerBoundary);
  return {
    rowId: row.rowId,
    levelBand: row.levelBand,
    axis: row.axis,
    rowKind: row.rowKind,
    category: row.category,
    className: row.className,
    concept: row.concept,
    candidateUnitId: row.candidateUnitId,
    source: row.source,
    supportSnapshot: row.supportSnapshot,
    finalDisposition: row.supportSnapshot.finalDisposition,
    proposedOwnerBoundary,
    sdkInventoryDisposition: disposition,
    ownerBoundaryStatus: ownerBoundaryStatus(
      proposedOwnerBoundary,
      disposition,
    ),
    ...(ownerBoundary.ownerBoundaryEvidence === undefined
      ? {}
      : {
          ownerBoundaryEvidence: ownerBoundary.ownerBoundaryEvidence,
        }),
    ...(seedScenario === undefined
      ? {}
      : {
          existingSdkScenario: seedScenario,
        }),
    nextAction: row.nextAction,
  };
}

function buildInventory() {
  const levelReports = levelReportInputs.map(levelReportSummary);
  const miningAudit = readJson(paths.miningAudit);
  const ownerEvidence = {
    unitClaimsByUnitId: indexUnitClaims(readJsonl(paths.unitClaims)),
    unitEvidenceByUnitId: indexUnitEvidence(readJsonl(paths.unitEvidence)),
    characterCreationRowsByRowId: evidenceRowsByRowId(
      paths.characterCreationOwnerEvidence,
    ),
    characterSheetRowsByRowId: evidenceRowsByRowId(
      paths.characterSheetOwnerEvidence,
    ),
  };
  const seedScenarioSources = new Map(
    [
      ...Object.values(paths.seedScenarioFiles),
      ...Object.values(paths.seedEvidenceFiles),
    ].map((seedPath) => [seedPath, fs.readFileSync(seedPath, "utf8")]),
  );
  const miningRows = miningAudit.rows
    .filter((row) => levelOneFiveBands.has(row.levelBand))
    .map((row) => projectMiningRow(row, ownerEvidence))
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  assertLocalRawSources(miningRows);
  assertSeedScenarios(seedScenarioSources, miningRows);
  assertSurfaceClassSpellAccessCoversMinedRows(miningRows);
  const levelOneTwoSeedMigrationAuditRows =
    buildLevelOneTwoSeedMigrationAudit(seedScenarioSources, miningRows);
  const levelOneFourRows = miningRows.filter(
    (row) => row.levelBand !== "level-5" && row.levelBand !== "spell-level-3",
  );
  const level5CompletionRows = miningRows.filter(
    (row) => row.levelBand === "level-5" || row.levelBand === "spell-level-3",
  );
  const seededRows = level5CompletionRows.filter(
    (row) => row.existingSdkScenario !== undefined,
  );
  const scenarioGroups = buildScenarioGroups(miningRows);
  assertUniqueScenarioGroupIds(scenarioGroups);
  const levelOneTwoCampaignGrouping = buildLevelOneTwoCampaignGrouping(
    miningRows,
    scenarioGroups,
  );
  const level5ScenarioGroups = scenarioGroups.filter((group) =>
    group.levelBands.some(
      (levelBand) => levelBand === "level-5" || levelBand === "spell-level-3",
    ),
  );
  const level4FrontierUnits = uniqueSorted(
    levelReports.flatMap((report) =>
      report.frontierRows.map((row) => row.unitId),
    ),
  );

  return stable({
    schemaVersion: 5,
    generatedBy: "scripts/sdk-raw-integration-inventory.cjs",
    sourceArtifacts: {
      plan: toRepoPath(root, paths.plan),
      levelReports: Object.fromEntries(
        levelReportInputs.map((input) => [
          input.key,
          toRepoPath(root, input.path),
        ]),
      ),
      miningAudit: toRepoPath(root, paths.miningAudit),
      unitClaims: toRepoPath(root, paths.unitClaims),
      unitEvidence: toRepoPath(root, paths.unitEvidence),
      characterCreationOwnerEvidence: toRepoPath(
        root,
        paths.characterCreationOwnerEvidence,
      ),
      characterSheetOwnerEvidence: toRepoPath(
        root,
        paths.characterSheetOwnerEvidence,
      ),
      seedScenarioFiles: Object.values(paths.seedScenarioFiles).map(
        (seedPath) => toRepoPath(root, seedPath),
      ),
      seedEvidenceFiles: Object.values(paths.seedEvidenceFiles).map(
        (evidencePath) => toRepoPath(root, evidencePath),
      ),
    },
    scope: {
      title: "Level 1-5 SDK RAW Integration Inventory",
      levelBands: Array.from(levelOneFiveBands),
      purpose:
        "Seed and track deterministic SDK integration tests against local SRD RAW for character levels 1 through 5.",
      grain:
        "Level 1-4 source artifacts are cumulative unique-unit full-support reports. Level 5 and spell-level-3 use mined source rows so completion can target exact RAW anchors.",
    },
    metrics: {
      cumulativeReports: Object.fromEntries(
        levelReports.map((report) => [
          report.key,
          {
            strictDenominator: report.summary.strictDenominator,
            nonSupportedFrontier: report.summary.nonSupportedFrontier,
            strictTargetClosure: report.strictTargetClosure,
            productReadiness: report.productReadiness,
          },
        ]),
      ),
      level4CumulativeFrontierUnitCount: level4FrontierUnits.length,
      levelOneFiveMinedRows: miningRows.length,
      levelOneFourRows: levelOneFourRows.length,
      level5CompletionRows: level5CompletionRows.length,
      level5SeedScenarioRows: seededRows.length,
      levelOneFiveRowsByLevelBand: countValues(
        miningRows.map((row) => row.levelBand),
      ),
      levelOneFiveRowsByRowKind: countValues(
        miningRows.map((row) => row.rowKind),
      ),
      levelOneFiveRowsBySdkInventoryDisposition: countValues(
        miningRows.map((row) => row.sdkInventoryDisposition),
      ),
      levelOneFiveRowsByOwnerBoundary: countValues(
        miningRows.map((row) => row.proposedOwnerBoundary),
      ),
      levelOneFiveRowsByOwnerBoundaryStatus: countValues(
        miningRows.map((row) => row.ownerBoundaryStatus),
      ),
      levelOneTwoSeedMigrationAuditRows:
        levelOneTwoSeedMigrationAuditRows.length,
      levelOneTwoSeedMigrationAuditRowsByClassification: countValues(
        levelOneTwoSeedMigrationAuditRows.map((row) => row.classification),
      ),
      levelOneTwoSeedMigrationAuditRowsBySourceBuildPath: countValues(
        levelOneTwoSeedMigrationAuditRows.map((row) => row.sourceBuildPath),
      ),
      levelOneTwoSeedMigrationAuditRowsByRealSheetBattleHandoff: countValues(
        levelOneTwoSeedMigrationAuditRows.map((row) =>
          row.usesRealSheetBattleHandoff
            ? "real-sheet-battle"
            : "not-real-sheet-battle",
        ),
      ),
      levelOneTwoWholeWidthSourceLifecycleSeedRows:
        levelOneTwoSeedMigrationAuditRows.filter(
          (row) => row.wholeWidthSourceLifecycleProof,
        ).length,
      levelOneTwoCampaignRows:
        levelOneTwoCampaignGrouping.totals.rowCount,
      levelOneTwoCampaignGroups:
        levelOneTwoCampaignGrouping.totals.groupCount,
      levelOneTwoCampaignRowsByRowFamily: Object.fromEntries(
        levelOneTwoCampaignGrouping.rowFamilies.map((family) => [
          family.rowFamily,
          family.rowCount,
        ]),
      ),
      levelOneTwoCampaignGroupsByRowFamily: Object.fromEntries(
        levelOneTwoCampaignGrouping.rowFamilies.map((family) => [
          family.rowFamily,
          family.groupCount,
        ]),
      ),
      levelOneTwoCampaignRowsByLane: Object.fromEntries(
        levelOneTwoCampaignGrouping.lanes.map((lane) => [
          lane.lane,
          lane.rowCount,
        ]),
      ),
      levelOneTwoCampaignGroupsByLane: Object.fromEntries(
        levelOneTwoCampaignGrouping.lanes.map((lane) => [
          lane.lane,
          lane.groupCount,
        ]),
      ),
      scenarioGroups: scenarioGroups.length,
      scenarioGroupsByTask: countValues(
        scenarioGroups.map((group) => group.taskId),
      ),
      scenarioGroupsByLane: countValues(
        scenarioGroups.map((group) => group.lane),
      ),
      level5CompletionRowsByLevelBand: countValues(
        level5CompletionRows.map((row) => row.levelBand),
      ),
      level5CompletionRowsBySdkInventoryDisposition: countValues(
        level5CompletionRows.map((row) => row.sdkInventoryDisposition),
      ),
      level5CompletionRowsByOwnerBoundary: countValues(
        level5CompletionRows.map((row) => row.proposedOwnerBoundary),
      ),
      level5CompletionRowsByOwnerBoundaryStatus: countValues(
        level5CompletionRows.map((row) => row.ownerBoundaryStatus),
      ),
      level5ScenarioGroups: level5ScenarioGroups.length,
      level5ScenarioGroupsByLane: countValues(
        level5ScenarioGroups.map((group) => group.lane),
      ),
    },
    levelReports,
    level4CumulativeFrontierUnits: level4FrontierUnits,
    seededSdkScenarioRows: seededSdkScenarioRecords,
    levelOneTwoSeedMigrationAuditRows,
    levelOneTwoCampaignGrouping,
    levelOneFiveRows: miningRows,
    scenarioGroups,
    level5ScenarioGroups,
    level5CompletionRows,
  });
}

function renderMetricBlock(inventory) {
  return [
    "| Metric | Value |",
    "| --- | ---: |",
    `| Level 1-4 cumulative frontier units | ${inventory.metrics.level4CumulativeFrontierUnitCount} |`,
    `| Level 1-5 mined rows | ${inventory.metrics.levelOneFiveMinedRows} |`,
    `| Level 1-4 row-grained inventory rows | ${inventory.metrics.levelOneFourRows} |`,
    `| Level 5 completion rows | ${inventory.metrics.level5CompletionRows} |`,
    `| Existing level-5 SDK seed scenario rows | ${inventory.metrics.level5SeedScenarioRows} |`,
    `| Scenario groups | ${inventory.metrics.scenarioGroups} |`,
    `| Level 5 scenario groups | ${inventory.metrics.level5ScenarioGroups} |`,
  ];
}

function renderCountRows(counts) {
  return Object.entries(counts).map(
    ([key, count]) => `| ${md(key)} | ${count} |`,
  );
}

function renderLevelReportRows(inventory) {
  return inventory.levelReports.map((report) => {
    const strict = report.strictTargetClosure;
    const product = report.productReadiness;
    const cells = [
      report.title,
      report.levelBands.join(", "),
      report.summary.strictDenominator,
      report.summary.nonSupportedFrontier,
      `${strict.numerator}/${strict.denominator} (${strict.percent})`,
      `${product.numerator}/${product.denominator} (${product.percent})`,
      report.sourcePath,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderLevel5Rows(rows) {
  return rows.map((row) => {
    const cells = [
      row.levelBand,
      row.concept,
      `\`${row.candidateUnitId}\``,
      `\`${sourceRef(row.source)}\``,
      row.finalDisposition,
      supportSnapshotLabel(row.supportSnapshot.battleReadiness, "status"),
      row.proposedOwnerBoundary,
      row.ownerBoundaryStatus,
      row.sdkInventoryDisposition,
      row.existingSdkScenario?.label ?? "",
      row.nextAction,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderScenarioGroupRows(groups) {
  return groups.map((group) => {
    const cells = [
      group.taskId,
      group.lane,
      group.rowCount,
      group.levelBands.join(", "),
      group.classNames.join(", "),
      group.candidateUnitIds.map((unitId) => `\`${unitId}\``).join(", "),
      group.sampleConcepts.join("<br>"),
      group.suggestedScenario,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderLevelOneTwoCampaignLaneRows(grouping) {
  return grouping.lanes.map((lane) => {
    const cells = [
      lane.lane,
      lane.disposition,
      lane.rowFamily,
      lane.rowCount,
      lane.groupCount,
      lane.taskFamily,
      lane.ownerTaskIds.map((taskId) => `\`${taskId}\``).join("<br>"),
      lane.followUpTaskIds.map((taskId) => `\`${taskId}\``).join("<br>"),
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderLevelOneTwoCampaignRowFamilyRows(grouping) {
  return grouping.rowFamilies.map((family) => {
    const cells = [
      family.rowFamily,
      family.disposition,
      family.rowCount,
      family.groupCount,
      family.lanes.join(", "),
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderSeedMigrationAuditRows(rows) {
  return rows.map((row) => {
    const cells = [
      row.levelBand,
      row.className,
      `\`${row.candidateUnitId}\``,
      row.rowKind ?? "",
      row.classification,
      row.sourceBuildPath,
      row.usesRealSheetBattleHandoff ? "yes" : "no",
      row.wholeWidthSourceLifecycleProof ? "yes" : "no",
      row.nextAction,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderInventory(inventory) {
  const level5Rows = inventory.level5CompletionRows;
  const level5ScenarioGroups = inventory.level5ScenarioGroups;
  const seedMigrationAuditRows = inventory.levelOneTwoSeedMigrationAuditRows;
  const levelOneTwoCampaignGrouping = inventory.levelOneTwoCampaignGrouping;
  return `${[
    "# Level 1-5 SDK RAW Inventory",
    "",
    "Generated by `scripts/sdk-raw-integration-inventory.cjs`.",
    "",
    "This inventory is the first executable artifact for",
    "`plans/LEVEL1_5_SDK_RAW_INTEGRATION_TEST_PLAN.md`. It intentionally",
    "keeps generated report facts separate from SDK integration dispositions:",
    "the generated reports say what already has owner evidence; this inventory",
    "says what still needs SDK-level scenarios or explicit SDK-scope closure.",
    "",
    "## Metrics",
    "",
    ...renderMetricBlock(inventory),
    "",
    "### All Level 1-5 Rows by Level Band",
    "",
    "| Level band | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByLevelBand),
    "",
    "### All Level 1-5 Rows by SDK Disposition",
    "",
    "| SDK disposition | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.levelOneFiveRowsBySdkInventoryDisposition,
    ),
    "",
    "### All Level 1-5 Rows by Proposed Owner Boundary",
    "",
    "| Proposed owner boundary | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByOwnerBoundary),
    "",
    "### All Level 1-5 Rows by Owner Boundary Status",
    "",
    "| Owner boundary status | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByOwnerBoundaryStatus),
    "",
    "### Scenario Groups by Task",
    "",
    "| Task | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.scenarioGroupsByTask),
    "",
    "### Scenario Groups by Lane",
    "",
    "| Lane | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.scenarioGroupsByLane),
    "",
    "### Level 5 Completion Rows by SDK Disposition",
    "",
    "| SDK disposition | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.level5CompletionRowsBySdkInventoryDisposition,
    ),
    "",
    "### Level 5 Completion Rows by Proposed Owner Boundary",
    "",
    "| Proposed owner boundary | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.level5CompletionRowsByOwnerBoundary),
    "",
    "### Level 5 Completion Rows by Owner Boundary Status",
    "",
    "| Owner boundary status | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.level5CompletionRowsByOwnerBoundaryStatus,
    ),
    "",
    "### Level 5 Scenario Groups by Lane",
    "",
    "| Lane | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.level5ScenarioGroupsByLane),
    "",
    "## Cumulative Level 1-4 Source Reports",
    "",
    "| Report | Bands | Strict denominator | Non-supported frontier | Strict target closure | Product readiness | Source |",
    "| --- | --- | ---: | ---: | --- | --- | --- |",
    ...renderLevelReportRows(inventory),
    "",
    "## Existing SDK Seed Scenario Rows",
    "",
    ...inventory.seededSdkScenarioRows.map(
      (row) =>
        `- \`${row.rowId}\` / \`${row.rowKey}\`: ${row.existingSdkScenario.label}`,
    ),
    "",
    "## L1/L2 Campaign Grouping",
    "",
    "This grouping is generated from the inventory rows and scenario group",
    "projection. It covers only the active L1/L2 source-harness dispositions",
    "and keeps the SRD provenance/license fact at the collection boundary:",
    `\`${levelOneTwoCampaignGrouping.sourceCorpus.kind}\` / \`${levelOneTwoCampaignGrouping.sourceCorpus.licenseScope}\`.`,
    "",
    `Rows/groups assigned: ${levelOneTwoCampaignGrouping.totals.rowCount}/${levelOneTwoCampaignGrouping.totals.groupCount}.`,
    "",
    "| Row family | SDK disposition | Rows | Groups | Lanes |",
    "| --- | --- | ---: | ---: | --- |",
    ...renderLevelOneTwoCampaignRowFamilyRows(levelOneTwoCampaignGrouping),
    "",
    "| Lane | SDK disposition | Row family | Rows | Groups | Task family | Owner tasks | Follow-up tasks |",
    "| --- | --- | --- | ---: | ---: | --- | --- | --- |",
    ...renderLevelOneTwoCampaignLaneRows(levelOneTwoCampaignGrouping),
    "",
    "## L1/L2 Seed Migration Audit",
    "",
    "This section is generated from the tracked seed scenario declarations and",
    "their checked test/helper text. A seed counts as whole-width source",
    "lifecycle proof only when the represented source character is created",
    "through the legal creation path and then projected through real",
    "Character Sheet and battle handoff.",
    "",
    "| Classification | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.levelOneTwoSeedMigrationAuditRowsByClassification,
    ),
    "",
    "| Source build path | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.levelOneTwoSeedMigrationAuditRowsBySourceBuildPath,
    ),
    "",
    "| Real sheet/battle handoff | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.levelOneTwoSeedMigrationAuditRowsByRealSheetBattleHandoff,
    ),
    "",
    `Whole-width source lifecycle seed rows: ${inventory.metrics.levelOneTwoWholeWidthSourceLifecycleSeedRows}/${inventory.metrics.levelOneTwoSeedMigrationAuditRows}.`,
    "",
    "| Band | Class | Unit | Row kind | Classification | Source build path | Real sheet/battle handoff | Whole-width source lifecycle proof | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...renderSeedMigrationAuditRows(seedMigrationAuditRows),
    "",
    "## Level 5 Scenario Groups",
    "",
    "| Task | Lane | Rows | Bands | Classes | Units | Sample concepts | Suggested scenario |",
    "| --- | --- | ---: | --- | --- | --- | --- | --- |",
    ...renderScenarioGroupRows(level5ScenarioGroups),
    "",
    "## Level 5 and Spell-Level-3 Completion Rows",
    "",
    "| Band | Concept | Unit | RAW source | Generated disposition | Battle readiness | Proposed owner boundary | Owner boundary status | SDK disposition | Existing SDK scenario | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...renderLevel5Rows(level5Rows),
    "",
    "## Notes",
    "",
    "- The JSON inventory contains every projected level 1-5 row. The Markdown",
    "  report summarizes all rows and expands level-5 rows/groups for the next",
    "  implementation slice.",
    "- Scenario groups are implementation planning groups, not coverage evidence.",
    "  A row is not covered until a deterministic SDK test or explicit closure",
    "  asserts its RAW-facing obligation.",
    "- Supported class-feature owner boundaries are classified from",
    "  `unit-claims.jsonl` profile ids and unit-level owner-evidence rows.",
    "  `multi-owner-sdk-split` means the SDK scenario must assert each profile at",
    "  its real owner instead of pretending the feature has one owner. Unsupported",
    "  class-feature rows use exact row owner evidence when present; otherwise",
    "  closure rows are classified only by typed closure kind.",
    "- `table-only-closure` means a spell row has recorded social/knowledge",
    "  closure evidence that is table-owned rather than SDK-executable.",
    "  `spell-effect-owner-review` means the row lacks recorded closure evidence",
    "  or has a recorded closure kind that is not typed enough to split",
    "  future-owner from table-only closure.",
    "- `seed-scenario-present` means one of the tracked SDK seed scenario files",
    "  exercises the SDK path for that Unit, not that every row for that Unit is",
    "  exhaustively complete.",
    "",
  ].join("\n")}`;
}

const inventory = buildInventory();
writeSdkRawArtifact(paths.json, `${JSON.stringify(inventory, null, 2)}\n`);
writeSdkRawArtifact(paths.report, renderInventory(inventory));
