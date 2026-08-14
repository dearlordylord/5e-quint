// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.martial-arts-attack-projection unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master spell.invocation-marked-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.font-of-magic-sorcery-points-to-spell-slot
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.monk-focus-battle-options
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.hunters-prey
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-damage-resistance
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-saving-throw-roll-mode
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV91B mastery_sap mastery_topple mastery_cleave
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-05-FIGHTER-TACTICAL-MASTER fighter_tactical_master mastery_push mastery_sap mastery_slow
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ALERT-INITIATIVE-RUNTIME alert
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-RUNTIME monk_uncanny_metabolism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-FONT-BONUS-ACTION-BATTLE-SOURCE sorcerer_font_of_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MCHAR-07-FONT-OF-MAGIC-BATTLE-SLOT-SOURCE sorcerer_font_of_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME ranger_hunters_prey
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MSPEC-06-DWARVEN-RESILIENCE-SAVE-MODE dwarf_dwarven_resilience
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME species_halfling_brave
import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import type {
  BattleFill,
  BattleCreatureState,
  BattleHole,
  BattleSubject,
  BattleRuntimeContext,
  BattleRuntimeSession,
  BattleState,
  BattleCompanionState,
  RetainedCompanionBattleSelection,
  CharacterBattleClassLevels,
  CharacterBattleResourceOwnership,
  CharacterBattleResourceState,
  CharacterBattleSpellcastingExecutionState,
} from "@dnd/battle-runtime";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "@dnd/battle-runtime/test-support";
import {
  ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  battleActDruidWildShapePresentation,
  battleActSpellPresentation,
  battleActUnitPresentation,
  battleCreatureInitFromStatBlock as parseBattleCreatureInitFromStatBlock,
  battleCreaturePresentationDisplayName,
  battleAmmunitionStock,
  battleId,
  characterBattleResourceIsPointPool,
  characterBattleResourceForUnit,
  characterId,
  combatantId,
  castFindFamiliar,
  castRetainedFindFamiliarRuntime,
  discoverBattleActs,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  parseCharacterBattleClassLevels,
  resolveBattleSubject,
  spendCharacterPointPoolResource,
  startBattle,
} from "@dnd/battle-runtime";
import { findFamiliarFormEligibilityForSpell } from "@dnd/surface/surface/find-familiar-forms";
import { battleResourcePoolExecutionRefForTest } from "./sdk-integration.test-support.ts";
import { characterUnarmoredArmorClassBases } from "./battle-character-build-projection.ts";
import {
  abilityScoreAssignment,
  characterBuildCatalogEquipmentItem,
  characterDraconicAncestrySelection,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  eldritchInvocationId,
  MONK_MONKS_FOCUS_UNIT_ID,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCurrentHp,
  characterSheetCompanion,
  characterSheetPactSlots,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximum,
  characterSheetResources,
  parseCharacterSheetRetainedCompanionId,
  parseCharacterSheetRetainedCompanionCurrentHitPoints,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetId,
  characterSheetTempHp,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createRetainedFamiliarLikeCompanion,
  rebuildCharacterSheet as rebuildCharacterSheetCore,
  parseCharacterSheet,
  replaceCharacterSheetCompanion,
  replaceCharacterSheetSpellSlotSourceState,
  useMonkUncannyMetabolismWhenRollingInitiative,
  type CharacterSheet,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRebuildInput,
  type CharacterSheetRetainedCompanionManifestation,
} from "@dnd/character-sheet-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  Hp,
  abilityModifier,
  classLevel,
  DieRollResult,
  difficultyClass,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  admitCharacterSheetCompanionToBattle,
  battleCreatureInitFromCharacterBuild as battleCreatureInitFromCharacterBuildRuntime,
  battleCreatureInitFromCharacterBuildWithRoute as battleCreatureInitFromCharacterBuildWithRouteRuntime,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleSupportProjection,
  characterSheetBattleInit,
  characterSheetBattleInitWithRoute,
  characterArmorClassState,
  characterBattleInitiativeScore,
  characterBattleResourceInitsFromBuild,
  characterBattleLoadoutFromBuild,
  characterOffHandAttackActionOption,
  characterSpellcasting as characterSpellcastingRuntime,
  settleCharacterSheetFromBattle,
  startBattleFromCharacterBuildAndStatBlock as startBattleFromCharacterBuildAndStatBlockRuntime,
  startBattleFromCharacterSheetAndStatBlock,
  characterBattleRuntimeIssueMessage,
} from "./index.ts";
import { characterBattleDruidWildShapeProjection } from "./battle-creature-init.ts";
import { characterPactBladeBondedWeaponItemId } from "./battle-character-build-projection.ts";
import {
  battleSupportProfileSourceFactsForBuild,
  characterBattleWeaponMasterySelections,
} from "./battle-support-profiles.ts";
import { characterBattleOriginFeatSelectedReferenceProjection } from "./origin-feat-selected-reference-projection.ts";
import { settleCompanionFromBattle } from "./companion-handoff.ts";

import { testAmmunitionStocksForStatBlock } from "./ammunition-stock.test-support.ts";

function battleCreatureInitFromStatBlock(
  input: Omit<
    Parameters<typeof parseBattleCreatureInitFromStatBlock>[0],
    "ammunitionStocks"
  >,
) {
  return expectRight(
    parseBattleCreatureInitFromStatBlock({
      ...input,
      ammunitionStocks: testAmmunitionStocksForStatBlock(input.statBlock),
    }),
  );
}

type WithoutResourceExpenditures<
  T extends { readonly resourceExpenditures: unknown },
> = Omit<T, "resourceExpenditures"> & Partial<Pick<T, "resourceExpenditures">>;

function battleCreatureInitFromCharacterBuild(
  input: WithoutResourceExpenditures<
    Parameters<typeof battleCreatureInitFromCharacterBuildRuntime>[0]
  >,
) {
  return battleCreatureInitFromCharacterBuildRuntime({
    ...input,
    resourceExpenditures: input.resourceExpenditures ?? [],
  });
}

function battleCreatureInitFromCharacterBuildWithRoute(
  input: WithoutResourceExpenditures<
    Parameters<typeof battleCreatureInitFromCharacterBuildWithRouteRuntime>[0]
  >,
) {
  return battleCreatureInitFromCharacterBuildWithRouteRuntime({
    ...input,
    resourceExpenditures: input.resourceExpenditures ?? [],
  });
}

function characterSpellcasting(
  input: WithoutResourceExpenditures<
    Parameters<typeof characterSpellcastingRuntime>[0]
  >,
) {
  return characterSpellcastingRuntime({
    ...input,
    resourceExpenditures: input.resourceExpenditures ?? [],
  });
}

function startBattleFromCharacterBuildAndStatBlock(
  input: Omit<
    Parameters<typeof startBattleFromCharacterBuildAndStatBlockRuntime>[0],
    "character"
  > & {
    readonly character: WithoutResourceExpenditures<
      Parameters<
        typeof startBattleFromCharacterBuildAndStatBlockRuntime
      >[0]["character"]
    >;
  },
) {
  return startBattleFromCharacterBuildAndStatBlockRuntime({
    ...input,
    character: {
      ...input.character,
      resourceExpenditures: input.character.resourceExpenditures ?? [],
    },
  });
}

const build = defenseBuild({ wearingArmor: false });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const DRUID_WILD_SHAPE_KNOWN_FORM_IDS = [
  authoredStatBlockId("stat_block_rat"),
  authoredStatBlockId("stat_block_riding_horse"),
  authoredStatBlockId("stat_block_lizard"),
  authoredStatBlockId("stat_block_cat"),
] as const;

type CharacterSheetTestInput = Omit<
  CharacterSheetRebuildInput,
  | "companion"
  | "conditions"
  | "hitPointMaximumReduction"
  | "spellSlotExpenditures"
> &
  Partial<
    Pick<
      CharacterSheetRebuildInput,
      | "companion"
      | "conditions"
      | "hitPointMaximumReduction"
      | "spellSlotExpenditures"
    >
  >;

function rebuildCharacterSheetFixture(input: CharacterSheetTestInput) {
  return rebuildCharacterSheetCore({
    companion: { tag: "none" },
    conditions: [],
    hitPointMaximumReduction: Hp(0),
    ...input,
  });
}

describe("Character Sheet battle handoff", () => {
  test("projects Magic Initiate for a non-class caster without inventing slots", () => {
    const magicInitiateMonk = magicInitiateMonkBuild();
    const projection = expectRight(
      characterSpellcasting({
        build: magicInitiateMonk,
        unitLibrary,
        resourceExpenditures: [],
      }),
    );

    expect(projection).toMatchObject({
      spellcastingSource: { tag: "spellAccessOnly" },
      spellSlots: [],
      spellAccesses: [
        expect.objectContaining({
          cantrips: [
            expect.objectContaining({ id: "fire_bolt" }),
            expect.objectContaining({ id: "light" }),
          ],
          levelOneSpell: expect.objectContaining({ id: "burning_hands" }),
          spellcastingAbilityModifier: 0,
          source: expect.objectContaining({ tag: "feat" }),
        }),
      ],
    });

    const battle = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("magic-initiate-noncaster"),
        character: {
          combatantId: combatantId("magic-initiate-monk"),
          characterId: characterId("character:magic-initiate-monk"),
          displayName: "Magic Initiate Monk",
          build: magicInitiateMonk,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: combatantId("magic-initiate-target"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const invocationRefs = new Set(
      discoverBattleActs(battle).flatMap((act) => {
        const invocation = battleActSpellPresentation(act)?.invocation;
        return invocation === undefined ? [] : [JSON.stringify(invocation)];
      }),
    );
    expect([...invocationRefs].map((ref) => JSON.parse(ref).spellId)).toEqual(
      expect.arrayContaining(["fire_bolt", "light", "burning_hands"]),
    );
    expect(
      [...invocationRefs].filter(
        (ref) => JSON.parse(ref).tag === "spellAccessFreeCast",
      ),
    ).toHaveLength(1);
  });

  test("settles the exact Magic Initiate source and spell free-cast expenditure", () => {
    const magicInitiateMonk = magicInitiateMonkBuild();
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:magic-initiate-settlement"),
        build: magicInitiateMonk,
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const sourceUnit = unitLibrary.requireUnit("feat_magic_initiate_wizard");
    const resourcePoolRef = battleResourcePoolExecutionRefForTest(
      "magic-initiate-free-cast",
    );
    const settled = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: sourceUnit,
            purpose: {
              tag: "spellAccessFreeCast",
              spellId: authoredUnitId("burning_hands"),
            },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:magic-initiate-settlement"),
            classLevels: parsedClassLevelsForTest("monk", 1),
            resources: [
              {
                resourcePoolRef,
                resource: {
                  kind: "use_count",
                  cap: { kind: "fixed", uses: resourceCount(1) },
                },
                usedThisTurn: false,
                usesRemaining: resourceCount(0),
              },
            ],
          },
          hp: Hp(8),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );
    expect(settled.resourceExpenditures).toEqual([
      {
        tag: "spellAccessFreeCast",
        sourceUnitId: authoredUnitId("feat_magic_initiate_wizard"),
        spellId: authoredUnitId("burning_hands"),
        expended: 1,
      },
    ]);

    const slottedBuild = {
      ...wizardSpellcastingBuild(),
      magicInitiateSpellAccesses: magicInitiateMonk.magicInitiateSpellAccesses,
    };
    const slottedSheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:magic-initiate-slot-cast"),
        build: slottedBuild,
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const slotSettled = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet: slottedSheet,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: sourceUnit,
            purpose: {
              tag: "spellAccessFreeCast",
              spellId: authoredUnitId("burning_hands"),
            },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:magic-initiate-slot-cast"),
            classLevels: parsedClassLevelsForTest("wizard", 1),
            spellcasting: handoffSpellcastingState({
              spellSlots: [
                {
                  spellLevel: spellSlotLevel(1),
                  count: resourceCount(2),
                  expended: resourceCount(1),
                },
              ],
            }),
            resources: [
              {
                resourcePoolRef,
                resource: {
                  kind: "use_count",
                  cap: { kind: "fixed", uses: resourceCount(1) },
                },
                usedThisTurn: false,
                usesRemaining: resourceCount(1),
              },
            ],
          },
          hp: Hp(7),
          maxHp: sheetMaximumHp(slottedSheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );
    expect(slotSettled.resourceExpenditures).toEqual([]);
    expect(characterSheetSpellSlots(slotSettled)).toEqual([
      { spellLevel: 1, count: 2, expended: 1 },
    ]);
  });

  test("formats both character projection and battle-state initialization issues", () => {
    expect(
      characterBattleRuntimeIssueMessage({
        tag: "battleCreatureInitIssue",
        message: "Synthetic character projection issue.",
      }),
    ).toBe("Synthetic character projection issue.");
    expect(
      characterBattleRuntimeIssueMessage({
        tag: "battleStateInitIssue",
        message: "Synthetic battle-state issue.",
      }),
    ).toBe("Synthetic battle-state issue.");
  });

  test("reports unreadable Origin feat selected-reference sources", () => {
    expect(
      characterBattleOriginFeatSelectedReferenceProjection({
        build,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: { originFeatUnitIds: ["feat_savage_attacker"] },
    });
    expect(
      characterBattleOriginFeatSelectedReferenceProjection({
        build: {
          ...build,
          background: authoredUnitId("synthetic:missing-background"),
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "battleCreatureInitIssue",
        message: expect.stringContaining("readable background Origin feat"),
      },
    });
    expect(
      characterBattleOriginFeatSelectedReferenceProjection({
        build: {
          ...build,
          background: authoredUnitId("class_fighter"),
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "battleCreatureInitIssue",
        message: expect.stringContaining("readable background Origin feat"),
      },
    });
  });

  test("reports invalid Draconic Ancestry source facts", () => {
    const dragonborn = dragonbornFighterBuild();
    expect(
      battleSupportProfileSourceFactsForBuild(
        {
          ...dragonborn,
          species: authoredUnitId("synthetic:missing-species"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("Unknown Character Build species"),
      },
    });
    expect(
      battleSupportProfileSourceFactsForBuild(
        {
          ...dragonborn,
          species: authoredUnitId("species_orc"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "requires a species with a Draconic Ancestry source",
        ),
      },
    });
    expect(
      battleSupportProfileSourceFactsForBuild(
        {
          ...dragonborn,
          speciesChoiceFacts: {
            draconicAncestry: {
              kind: "draconicAncestry",
              ancestorId: characterDraconicAncestrySelection(
                "synthetic:ancestor" as never,
              ),
            },
          },
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "must reference the selected species source table",
        ),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("invalid-ancestry-init"),
        characterId: characterId("character:invalid-ancestry-init"),
        displayName: "Invalid Ancestry",
        build: {
          ...dragonborn,
          species: authoredUnitId("species_orc"),
        },
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "requires a species with a Draconic Ancestry source",
        ),
      },
    });
  });

  test("reports malformed Weapon Mastery selections and deduplicates valid selections", () => {
    const malformed = characterBattleWeaponMasterySelections(
      {
        ...build,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId(
              "synthetic:missing-mastery-source",
            ),
            unitId: authoredUnitId("weapon_longsword"),
          },
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
            unitId: authoredUnitId("synthetic:missing-mastery-weapon"),
          },
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
            unitId: authoredUnitId("class_fighter"),
          },
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
            unitId: authoredUnitId("weapon_longsword"),
          },
        ],
      },
      unitLibrary,
    );
    expect(malformed).toMatchObject({
      _tag: "Left",
      left: [
        { message: expect.stringContaining("Unknown Character Build Unit") },
        {
          message: expect.stringContaining(
            "Unknown selected Weapon Mastery Unit",
          ),
        },
        {
          message: expect.stringContaining(
            "Expected selected Weapon Mastery option to be a weapon Unit",
          ),
        },
      ],
    });

    const selected = {
      kind: "selectedClassChoice",
      selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
      unitId: authoredUnitId("weapon_longsword"),
    } as const;
    expect(
      characterBattleWeaponMasterySelections(
        {
          ...build,
          features: [selected, selected],
        },
        unitLibrary,
      ),
    ).toEqual(
      Either.right([{ weaponUnitId: authoredUnitId("weapon_longsword") }]),
    );
  });

  test("ignores invalid and unsupported supplied mastery weapon refs", () => {
    const refs = characterBattleSupportProjection(build, unitLibrary, [
      { weaponUnitId: authoredUnitId("synthetic:missing-weapon") },
      { weaponUnitId: authoredUnitId("class_fighter") },
      { weaponUnitId: authoredUnitId("weapon_dagger") },
    ]);

    expect(refs).toMatchObject({ _tag: "Right" });
  });

  test("propagates support-profile selection, source-fact, and catalog failures", () => {
    const initBuild = (candidateBuild: CharacterBuild, catalog = unitLibrary) =>
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("support-profile-propagation"),
        characterId: characterId("character:support-profile-propagation"),
        displayName: "Support profile propagation",
        build: candidateBuild,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary: catalog,
      });
    const malformedMasteryBuild = {
      ...build,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId(
            "synthetic:missing-mastery-source",
          ),
          unitId: authoredUnitId("weapon_longsword"),
        },
      ],
    } satisfies CharacterBuild;
    expect(
      characterBattleSupportProjection(malformedMasteryBuild, unitLibrary),
    ).toMatchObject({ _tag: "Left" });
    expect(initBuild(malformedMasteryBuild)).toMatchObject({ _tag: "Left" });
    expect(
      characterBattleInitiativeScore({
        build: malformedMasteryBuild,
        unitLibrary,
        rollTotal: 10,
        proficiencyBonusChoice: "add",
      }),
    ).toMatchObject({ _tag: "Left" });

    const invalidAncestryBuild = {
      ...dragonbornFighterBuild(),
      speciesChoiceFacts: {
        draconicAncestry: {
          kind: "draconicAncestry",
          ancestorId: characterDraconicAncestrySelection(
            "synthetic:ancestor" as never,
          ),
        },
      },
    } satisfies CharacterBuild;
    expect(
      characterBattleSupportProjection(invalidAncestryBuild, unitLibrary, []),
    ).toMatchObject({ _tag: "Left" });
    expect(initBuild(invalidAncestryBuild)).toMatchObject({ _tag: "Left" });

    const missingBuildRefIds = [
      authoredUnitId("synthetic:missing-build-ref"),
      authoredUnitId("synthetic:missing-build-ref-two"),
    ] as const;
    const missingBuildRefCatalog: UnitCatalog = {
      getUnit: (id) =>
        missingBuildRefIds.some((missingId) => missingId === id)
          ? Option.none()
          : unitLibrary.getUnit(id),
      listUnits: () => unitLibrary.listUnits(),
      requireUnit: (id) => unitLibrary.requireUnit(id),
    };
    const missingBuildRefBuild = {
      ...build,
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
          unitId: authoredUnitId("synthetic:missing-build-ref"),
        },
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
          unitId: authoredUnitId("synthetic:missing-build-ref-two"),
        },
      ],
    };
    expect(
      characterBattleSupportProjection(
        missingBuildRefBuild,
        missingBuildRefCatalog,
        [],
      ),
    ).toMatchObject({ _tag: "Left" });
    expect(
      characterBattleResourceInitsFromBuild(
        missingBuildRefBuild,
        missingBuildRefCatalog,
        [],
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Unknown Character Build Unit for battle initialization: synthetic:missing-build-ref.; Unknown Character Build Unit for battle initialization: synthetic:missing-build-ref-two.",
      },
    });
    const missingRefsAndInvalidWildShapeBuild = {
      ...missingBuildRefBuild,
      features: [
        ...missingBuildRefBuild.features,
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("class_fighter"),
          unitId: authoredUnitId("druid_wild_shape"),
        },
      ],
    };
    const resourceProjection = characterBattleResourceInitsFromBuild(
      missingRefsAndInvalidWildShapeBuild,
      missingBuildRefCatalog,
      [],
    );
    expect(resourceProjection).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Unknown Character Build Unit for battle initialization: synthetic:missing-build-ref.; Unknown Character Build Unit for battle initialization: synthetic:missing-build-ref-two.",
      },
    });

    const missingMasteryProfileCatalog: UnitCatalog = {
      getUnit: (id) =>
        id === authoredUnitId("mastery_sap")
          ? Option.none()
          : unitLibrary.getUnit(id),
      listUnits: () => unitLibrary.listUnits(),
      requireUnit: (id) => unitLibrary.requireUnit(id),
    };
    expect(
      characterBattleSupportProjection(build, missingMasteryProfileCatalog, [
        { weaponUnitId: authoredUnitId("weapon_longsword") },
      ]),
    ).toMatchObject({ _tag: "Left" });
    expect(
      initBuild(
        weaponMasteryLongswordFighterBuild(),
        missingMasteryProfileCatalog,
      ),
    ).toMatchObject({ _tag: "Left" });
  });

  test("composes sheet and stat block participants into battle runtime entry", () => {
    const characterCombatantId = combatantId("combatant:sheet-entry");
    const monsterCombatantId = combatantId("combatant:stat-block-entry");
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sheet-entry"),
      build,
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const entry = startBattleFromCharacterSheetAndStatBlock({
      battleId: battleId("battle:sheet-entry"),
      character: {
        sheet: sheet.right,
        unitLibrary,
        statBlockCatalog,
        combatantId: characterCombatantId,
        displayName: "Character",
        initiative: initiativeScore(20),
        ammunitionStocks: [],
      },
      statBlockBattleInput: {
        combatantId: monsterCombatantId,
        statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        initiative: initiativeScore(10),
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      },
    });

    expect(Either.isRight(entry)).toBe(true);
    if (Either.isLeft(entry)) return;

    expect([...entry.right.session.state.combatants.keys()]).toEqual([
      characterCombatantId,
      monsterCombatantId,
    ]);
    expect(
      entry.right.session.state.combatants.get(characterCombatantId),
    ).not.toHaveProperty("side");
    expect(
      entry.right.session.state.combatants.get(monsterCombatantId),
    ).not.toHaveProperty("side");
    expect(
      entry.right.session.state.initiative.stillToAct.map(
        (turn) => turn.creature,
      ),
    ).toEqual([characterCombatantId, monsterCombatantId]);
    expect(entry.right.session.state.initiative.stillToAct[0]?.creature).toBe(
      characterCombatantId,
    );
    expect(entry.right.encounterCompositionRouteEvents).toEqual([
      {
        kind: "projectCharacterSheetToBattle",
        subject: "sheetToBattleInit",
        owner: "characterBattleInitProjection",
      },
      {
        kind: "composeBattleEncounter",
        subject: "handoffParticipantMembership",
        facts: [
          "nonSheetParticipantMembership",
          "sheetDerivedParticipantCandidate",
        ],
        owner: "characterBattleEncounterSetup",
      },
      {
        kind: "composeBattleEncounter",
        subject: "handoffSubjectProfileAvailability",
        facts: ["subjectProfileAvailabilityOwnership"],
        owner: "characterBattleSubjectProfile",
      },
      {
        kind: "composeBattleEncounter",
        subject: "handoffInitiativeCurrentActor",
        facts: [
          "currentActorOwnership",
          "initiativeCountOwnership",
          "stableInitiativeOrderOwnership",
        ],
        owner: "characterBattleInitiative",
      },
      {
        kind: "enterBattleRuntime",
        subject: "handoffEncounterComposition",
        owner: "characterBattleRuntime",
      },
    ]);

    expect(
      startBattleFromCharacterSheetAndStatBlock({
        battleId: battleId("battle:duplicate-participant"),
        character: {
          sheet: sheet.right,
          unitLibrary,
          statBlockCatalog,
          combatantId: characterCombatantId,
          displayName: "Character",
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: characterCombatantId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        issue: {
          message: expect.stringContaining("Duplicate combatant id"),
        },
      },
    });

    const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
    expect(
      startBattleFromCharacterSheetAndStatBlock({
        battleId: battleId("battle:unsupported-stat-block"),
        character: {
          sheet: sheet.right,
          unitLibrary,
          statBlockCatalog,
          combatantId: characterCombatantId,
          displayName: "Character",
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: monsterCombatantId,
          statBlock: {
            ...skeleton,
            statBlock: {
              ...skeleton.statBlock,
              hp: {
                kind: "caster_derived",
                source: "proficiency_bonus",
              },
            },
          },
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        issue: {
          message: expect.stringContaining(
            "requires literal Stat Block maximum HP",
          ),
        },
      },
    });
  });

  test("routes Character Sheet initialization failures from caller catalog drift", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:init-catalog-drift"),
        build,
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const input = {
      sheet,
      statBlockCatalog,
      combatantId: combatantId("init-catalog-drift"),
      displayName: "Catalog Drift Fighter",
      initiative: initiativeScore(10),
      ammunitionStocks: [],
    } as const;

    expect(
      characterSheetBattleInitWithRoute({
        ...input,
        unitLibrary: unitCatalogWithoutUnitIds("class_fighter"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        routeEvents: [
          {
            kind: "rejectCharacterBattleHandoff",
            holes: ["hitPointProjection"],
          },
        ],
      },
    });
    expect(
      characterSheetBattleInitWithRoute({
        ...input,
        unitLibrary: unitCatalogWithoutUnitIds("species_orc"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        issue: {
          message: expect.stringContaining(
            "Cannot find species Unit: species_orc",
          ),
        },
      },
    });
    expect(
      characterSheetBattleInitWithRoute({
        ...input,
        unitLibrary: unitCatalogWithoutUnitIds("background_soldier"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        issue: {
          message: expect.stringContaining("readable background Origin feat"),
        },
      },
    });
  });

  test("projects Alert Proficiency Bonus into the character Initiative score", () => {
    const result = characterBattleInitiativeScore({
      build: {
        ...defenseBuild({ wearingArmor: false }),
        background: authoredUnitId("background_criminal"),
      },
      unitLibrary,
      rollTotal: 14,
      proficiencyBonusChoice: "add",
    });

    expect(result).toEqual(Either.right(initiativeScore(16)));
  });

  test("rejects non-integer Initiative totals and unreadable class projections", () => {
    expect(
      characterBattleInitiativeScore({
        build,
        unitLibrary,
        rollTotal: 10,
        proficiencyBonusChoice: "omit",
      }),
    ).toEqual(Either.right(initiativeScore(10)));
    expect(
      characterBattleInitiativeScore({
        build,
        unitLibrary,
        rollTotal: 10.5,
        proficiencyBonusChoice: "omit",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("must be an integer") },
    });
    expect(
      characterBattleInitiativeScore({
        build: {
          ...build,
          progression: {
            startingClass: classUnitId(
              authoredUnitId("synthetic:missing-class"),
            ),
            advancements: [],
          },
        },
        unitLibrary,
        rollTotal: 10,
        proficiencyBonusChoice: "add",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
  });

  test("rejects Initiative Proficiency Bonus when no admitted profile is present", () => {
    const result = characterBattleInitiativeScore({
      build: defenseBuild({ wearingArmor: false }),
      unitLibrary,
      rollTotal: 14,
      proficiencyBonusChoice: "add",
    });

    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects mismatched battle character identity", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sheet"),
      build,
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:battle"),
        },
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:sheet"),
          },
          hp: Hp(sheetMaximumHp(sheet.right) + 1),
          maxHp: sheetMaximumHp(sheet.right),
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff current HP exceeds Character Sheet maximum HP.",
      },
    });
  });

  test("rejects non-character and ownership-context-free settlement inputs", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:settlement-owner-boundary"),
        build,
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const characterCombatantId = combatantId("settlement-owner-boundary");
    const statBlockCombatantId = combatantId("settlement-stat-block-boundary");
    const session = expectRight(
      startBattle({
        battleId: battleId("settlement-owner-boundaries"),
        combatants: [
          expectRight(
            characterSheetBattleInit({
              sheet,
              unitLibrary,
              statBlockCatalog,
              combatantId: characterCombatantId,
              displayName: "Settlement Owner",
              initiative: initiativeScore(12),
              ammunitionStocks: [],
            }),
          ),
          battleCreatureInitFromStatBlock({
            combatantId: statBlockCombatantId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(10),
          }),
        ],
      }),
    );
    const statBlockCombatant = requireCombatant(
      session.state,
      statBlockCombatantId,
    );
    expect(
      settleCharacterSheetFromBattle({
        sheet,
        state: session.state,
        context: session.context,
        combatant: statBlockCombatant,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Battle handoff combatant is not a character." },
    });

    const characterCombatant = requireCombatant(
      session.state,
      characterCombatantId,
    );
    expect(
      settleCharacterSheetFromBattle({
        sheet,
        state: session.state,
        context: battleRuntimeContextForTest(new Map()),
        combatant: characterCombatant,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff character has no authored runtime ownership context.",
      },
    });
  });

  test("rejects inconsistent battle resource ownership context", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:resource-ownership"),
        build: monkBuild({ level: 2, str: 12, dex: 16 }),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const focusUnit = unitLibrary.requireUnit(MONK_MONKS_FOCUS_UNIT_ID);
    const focusResource = characterBattleResourceForUnit(focusUnit);
    if (!hasLimitedCharacterBattleResourceCap(focusResource)) {
      throw new Error("Expected finite Monk Focus resource.");
    }
    const firstRef = battleResourcePoolExecutionRefForTest("ownership:first");
    const secondRef = battleResourcePoolExecutionRefForTest("ownership:second");
    const resourceState = (resourcePoolRef: typeof firstRef) => ({
      resourcePoolRef,
      resource: focusResource,
      usedThisTurn: false,
      usesRemaining: resourceCount(1),
    });
    const ownership = (resourcePoolRef: typeof firstRef) => ({
      resourcePoolRef,
      unit: focusUnit,
      purpose: { tag: "unitResource" as const },
    });
    const settle = (
      resources: readonly ReturnType<typeof resourceState>[],
      resourceOwnership: readonly CharacterBattleResourceOwnership[],
    ) =>
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        resourceOwnership,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:resource-ownership"),
            classLevels: parsedClassLevelsForTest("monk", 2),
            resources,
          },
          hp: Hp(15),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      });

    expect(settle([resourceState(firstRef)], [])).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "ownership must cover every mechanical resource",
        ),
      },
    });
    expect(
      settle(
        [resourceState(firstRef), resourceState(secondRef)],
        [ownership(firstRef), ownership(firstRef)],
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "ownership contains a duplicate resource pool reference",
        ),
      },
    });
    expect(
      settle(
        [resourceState(firstRef), resourceState(firstRef)],
        [ownership(firstRef), ownership(secondRef)],
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "duplicate mechanical resource pool reference",
        ),
      },
    });
    expect(
      settle([resourceState(firstRef)], [ownership(secondRef)]),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("no authored ownership context"),
      },
    });
  });

  test("rejects handoff maximum HP drift from the existing Character Sheet", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sheet"),
      build,
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(10),
        maxHp: Hp(12),
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary: unitCatalogWithoutUnitIds("class_fighter"),
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:sheet"),
          },
          hp: Hp(10),
          maxHp: Hp(10),
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Cannot find class Unit") },
    });
  });

  test("preserves reduced Hit Point maximum during battle handoff", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sheet-reduced-maximum"),
      build,
      hitPointMaximumReduction: Hp(3),
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;
    const expectedMaximumHp = sheetMaximumHp(sheet.right);

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet-reduced-maximum"),
        },
        hp: Hp(6),
        maxHp: expectedMaximumHp,
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isLeft(handoff)) return;
    expect(handoff.right.hitPointMaximumReduction).toBe(3);
    expect(
      expectRight(
        characterSheetHitPointMaximum({
          sheet: handoff.right,
          unitLibrary,
        }),
      ),
    ).toBe(expectedMaximumHp);
    expect(characterSheetCurrentHp(handoff.right)).toBe(6);
  });

  test("preserves remaining Temporary Hit Points from battle handoff", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sheet"),
      build,
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(8),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(4),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetTempHp(handoff.right)).toBe(4);
    }
  });

  test("preserves Druid Wild Shape known forms during battle handoff", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:druid-wild-shape-handoff"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:druid-wild-shape-handoff"),
        },
        hp: Hp(12),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetDruidWildShapeKnownForms(handoff.right)).toEqual({
        statBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      });
    }
  });

  test("creates retained Wild Companion state and spends a Wild Shape use", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:wild-companion-retained"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
        statBlockCatalog,
      }),
    );

    const retained = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:wild-cat"),
        source: {
          tag: "classFeatureSpellCast",
          featureUnitId: authoredUnitId("druid_wild_companion"),
          spend: {
            tag: "useCountResource",
            resourceUnitId: authoredUnitId("druid_wild_shape"),
          },
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
      }),
    );

    expect(characterSheetCompanion(retained)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        protocol: { tag: "ownerLongRestFamiliarLikeOneAtATime" },
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverride: "fey",
          resolvedStatBlockId: "stat_block_cat",
        },
      },
    });
    expect(
      expectRight(characterSheetResources(retained, unitLibrary)),
    ).toContainEqual(
      expect.objectContaining({
        tag: "useCountResource",
        unitId: "druid_wild_shape",
        expended: resourceCount(1),
      }),
    );
  });

  test("creates retained ordinary companion state and spends a Spell Slot", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:slot-familiar-retained"),
        build: {
          ...trueStrikeWizardBuild(),
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_wizard"),
                spellcastingAbility: "int",
                cantrips: [authoredUnitId("true_strike")],
                spellbook: [authoredUnitId("find_familiar")],
                preparedSpells: [authoredUnitId("find_familiar")],
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
        unitLibrary,
      }),
    );

    const retained = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:slot-cat"),
        source: {
          tag: "spellSlotSpellCast",
          spellId: authoredUnitId("find_familiar"),
          spellLevel: spellSlotLevel(1),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(retained)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverride: "fey",
          resolvedStatBlockId: "stat_block_cat",
        },
      },
    });
    expect(characterSheetSpellSlots(retained)).toEqual([
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(1),
      },
    ]);
  });

  test("rejects absent and incomplete retained companion admissions", () => {
    const ownerId = combatantId("companion-admission-owner");
    const started = expectRight(
      startBattle({
        battleId: battleId("companion-admission-boundaries"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: ownerId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(12),
          }),
        ],
      }),
    );
    const state = started.state;
    const sheetWithoutCompanion = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:no-companion"),
        build,
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const admissionBase = {
      state,
      unitLibrary,
      ownerCombatantId: ownerId,
      ammunitionStocks: [],
      initialCombatantOrder: new Map([[ownerId, 0]]),
      statBlockCatalog,
    } as const;

    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: sheetWithoutCompanion,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Character Sheet has no retained companion to admit." },
    });

    const embodied = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:incomplete-companion-admission",
      companionIdValue: "companion:incomplete-admission",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: embodied,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Present companion admission requires combatant id, Initiative, and placement.",
      },
    });

    const dismissed = retainedCompanionSheetWithManifestation(
      embodied,
      (manifestation) => {
        if (manifestation.tag === "disappearedAtZeroHitPoints") {
          throw new Error("Expected embodied retained companion fixture.");
        }
        return { ...manifestation, tag: "temporarilyDismissed" };
      },
    );
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: dismissed,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Temporarily dismissed companion admission requires a reappearance combatant id.",
      },
    });

    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: dismissed,
        companionCombatantId: combatantId("dismissed-companion"),
      }),
    ).toMatchObject({ _tag: "Right" });

    const disappeared = retainedCompanionSheetWithManifestation(
      embodied,
      (manifestation) => {
        if (manifestation.tag === "disappearedAtZeroHitPoints") {
          throw new Error("Expected embodied retained companion fixture.");
        }
        const { hitPoints: _hitPoints, ...proof } = manifestation;
        return { ...proof, tag: "disappearedAtZeroHitPoints" };
      },
    );
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: disappeared,
      }),
    ).toMatchObject({ _tag: "Right" });
    expect(
      admitCharacterSheetCompanionToBattle({
        session: started,
        sheet: disappeared,
        unitLibrary,
        ownerCombatantId: ownerId,
        ammunitionStocks: [],
        initialCombatantOrder: new Map([[ownerId, 0]]),
        statBlockCatalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "owner has no authored runtime context",
        ),
      },
    });

    const unitLibraryWithoutFamiliarCatalog: UnitCatalog = {
      getUnit: (id) => unitLibrary.getUnit(id),
      listUnits: () =>
        unitLibrary
          .listUnits()
          .filter((unit) => unit.id !== authoredUnitId("find_familiar")),
      requireUnit: (id) => unitLibrary.requireUnit(id),
    };
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: embodied,
        unitLibrary: unitLibraryWithoutFamiliarCatalog,
        companionCombatantId: combatantId("missing-catalog-companion"),
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "requires a familiar-like form catalog",
        ),
      },
    });
  });

  test("admits Pact of the Chain special forms in embodied and stored states", () => {
    const ownerId = combatantId("pact-chain-companion-owner");
    const companionId = combatantId("pact-chain-companion");
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pact-chain-companion"),
        build: warlockInvocationBuild({ pactOfTheChain: true }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const retained = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:pact-chain-skeleton"),
        source: {
          tag: "invocationSpellAccess",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: {
          tag: "pactOfTheChainSpecialForm",
          formId: "skeleton",
        },
        creatureTypeOverrideChoiceId: "fiend",
      }),
    );
    const ownerInit = expectRight(
      characterSheetBattleInit({
        sheet: retained,
        unitLibrary,
        statBlockCatalog,
        combatantId: ownerId,
        displayName: "Pact Companion Owner",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    const started = expectRight(
      startBattle({
        battleId: battleId("pact-chain-companion-admission"),
        combatants: [ownerInit],
      }),
    );
    const admissionBase = {
      sheet: retained,
      unitLibrary,
      ownerCombatantId: ownerId,
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      companionCombatantId: companionId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" as const },
      initialCombatantOrder: new Map([
        [ownerId, 0],
        [companionId, 1],
      ]),
      statBlockCatalog,
    };
    const admitted = expectRight(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        state: started.state,
      }),
    );
    expect(admitted.companions.get(ownerId)).toMatchObject({
      status: "present",
      formAccess: "pactOfTheChain",
    });

    const dismissed = retainedCompanionSheetWithManifestation(
      retained,
      (manifestation) => {
        if (manifestation.tag === "disappearedAtZeroHitPoints") {
          throw new Error("Expected embodied Pact companion fixture.");
        }
        return { ...manifestation, tag: "temporarilyDismissed" };
      },
    );
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: dismissed,
        session: started,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        state: {
          companions: expect.any(Map),
        },
      },
    });
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: dismissed,
        state: admitted,
      }),
    ).toMatchObject({ _tag: "Left" });

    const ordinaryRetained = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:ordinary-protocol-special-form",
      companionIdValue: "companion:ordinary-protocol-special-form",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    const ordinaryCompanion = characterSheetCompanion(ordinaryRetained);
    const pactCompanion = characterSheetCompanion(retained);
    if (
      ordinaryCompanion.tag !== "retainedOneAtATime" ||
      pactCompanion.tag !== "retainedOneAtATime"
    ) {
      throw new Error("Expected retained companion fixtures.");
    }
    const incompatibleProtocolAndSelection = expectRight(
      replaceCharacterSheetCompanion({
        sheet: ordinaryRetained,
        companion: {
          tag: "retainedOneAtATime",
          companion: {
            ...ordinaryCompanion.companion,
            manifestation: pactCompanion.companion.manifestation,
          },
        },
      }),
    );
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionBase,
        sheet: incompatibleProtocolAndSelection,
        state: started.state,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Special retained companion forms require an attack-exception protocol.",
      },
    });
  });

  test("reports retained companion settlement identity and manifestation conflicts", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:companion-settlement-boundaries",
      companionIdValue: "companion:settlement-boundaries",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    const ownerId = combatantId("companion-settlement-owner");
    const companionId = combatantId("companion-settlement-companion");
    const ownerInit = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: ownerId,
        displayName: "Companion Owner",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    const started = expectRight(
      startBattle({
        battleId: battleId("companion-settlement-boundaries"),
        combatants: [ownerInit],
      }),
    );
    const embodiedAdmission = {
      sheet,
      unitLibrary,
      ownerCombatantId: ownerId,
      ammunitionStocks: [],
      companionCombatantId: companionId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" as const },
      initialCombatantOrder: new Map<ReturnType<typeof combatantId>, number>(),
      statBlockCatalog,
    };
    expect(
      admitCharacterSheetCompanionToBattle({
        ...embodiedAdmission,
        state: started.state,
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      admitCharacterSheetCompanionToBattle({
        ...embodiedAdmission,
        session: started,
      }),
    ).toMatchObject({ _tag: "Left" });
    const admitted = expectRight(
      admitCharacterSheetCompanionToBattle({
        ...embodiedAdmission,
        state: started.state,
        initialCombatantOrder: new Map([
          [ownerId, 0],
          [companionId, 1],
        ]),
      }),
    );
    const selection = {
      formAccess: "findFamiliar",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
    } as const;
    const settle = (
      state: BattleState,
      selectedSheet: CharacterSheet = sheet,
      retainedCompanionSelection:
        | RetainedCompanionBattleSelection
        | undefined = selection,
    ) =>
      settleCompanionFromBattle({
        sheet: selectedSheet,
        state,
        ownerCombatantId: ownerId,
        unitLibrary,
        statBlockCatalog,
        ...(retainedCompanionSelection === undefined
          ? {}
          : { retainedCompanionSelection }),
      });

    expect(
      settleCompanionFromBattle({
        sheet,
        state: admitted,
        ownerCombatantId: ownerId,
        unitLibrary,
        retainedCompanionSelection: selection,
      }),
    ).toMatchObject({ _tag: "Right" });
    expect(
      settleCompanionFromBattle({
        sheet,
        state: admitted,
        ownerCombatantId: ownerId,
        unitLibrary,
        statBlockCatalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "no battle-owned authored form selection",
        ),
      },
    });
    expect(
      settle(admitted, sheet, {
        ...selection,
        formAccess: "pactOfTheChain",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("form access does not match") },
    });

    const noCompanionSheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:no-settlement-companion"),
        build,
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    expect(settle(admitted, noCompanionSheet)).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("no Character Sheet companion slot"),
      },
    });
    const otherCompanionSheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:other-settlement-companion",
      companionIdValue: "companion:other-settlement-companion",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    expect(settle(admitted, otherCompanionSheet)).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("durable identity does not match"),
      },
    });

    const companion = admitted.companions.get(ownerId);
    if (companion === undefined) {
      throw new Error("Expected admitted retained companion fixture.");
    }
    const dismissedForever = {
      ...admitted,
      companions: new Map([
        [ownerId, { ...companion, status: "dismissedForever" as const }],
      ]),
    };
    expect(settle(dismissedForever)).toMatchObject({
      _tag: "Right",
      right: { companion: { tag: "none" } },
    });

    const missingCombatant = {
      ...admitted,
      combatants: new Map(
        [...admitted.combatants].filter(
          ([combatantKey]) => combatantKey !== companionId,
        ),
      ),
    };
    expect(settle(missingCombatant)).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("combatant is missing") },
    });

    if (companion.status !== "present") {
      throw new Error("Expected present admitted companion fixture.");
    }
    const companionCombatant = admitted.combatants.get(companionId);
    const ownerCombatant = admitted.combatants.get(ownerId);
    if (companionCombatant === undefined || ownerCombatant === undefined) {
      throw new Error("Expected owner and companion combatant fixtures.");
    }
    const zeroHpCompanionState = expectRight(
      startBattle({
        battleId: battleId("companion-settlement-zero-hp"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: companionId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_cat"),
            initiative: initiativeScore(14),
            currentHp: Hp(0),
          }),
        ],
      }),
    ).state;
    const zeroHpCompanion = zeroHpCompanionState.combatants.get(companionId);
    if (zeroHpCompanion === undefined) {
      throw new Error("Expected zero-HP companion combatant fixture.");
    }
    expect(
      settle({
        ...admitted,
        combatants: new Map(admitted.combatants).set(
          companionId,
          zeroHpCompanion,
        ),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("must have positive HP") },
    });
    expect(
      settle({
        ...admitted,
        combatants: new Map(admitted.combatants).set(companionId, {
          ...ownerCombatant,
          combatantId: companionId,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Present companion Stat Block combatant is missing",
        ),
      },
    });
    const ratState = expectRight(
      startBattle({
        battleId: battleId("companion-settlement-rat-proof"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: companionId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_rat"),
            initiative: initiativeScore(14),
          }),
        ],
      }),
    ).state;
    const ratCombatant = ratState.combatants.get(companionId);
    if (ratCombatant === undefined) {
      throw new Error("Expected Rat combatant fixture.");
    }
    expect(
      settle({
        ...admitted,
        combatants: new Map(admitted.combatants).set(companionId, ratCombatant),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "cannot be joined to its retained authored selection",
        ),
      },
    });
    expect(
      settle(
        {
          ...admitted,
          companions: new Map([
            [
              ownerId,
              {
                ...companion,
                formAccess: "pactOfTheChain",
              },
            ],
          ]),
        },
        sheet,
        {
          formAccess: "pactOfTheChain",
          selectedForm: {
            tag: "pactOfTheChainSpecialForm",
            formId: "sprite",
          },
        },
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "does not match its resolved Stat Block id",
        ),
      },
    });

    const retained = characterSheetCompanion(sheet);
    if (
      retained.tag !== "retainedOneAtATime" ||
      retained.companion.manifestation.tag !== "embodiedOutsideBattle"
    ) {
      throw new Error("Expected embodied retained companion fixture.");
    }
    if (companion.formAccess !== "findFamiliar") {
      throw new Error("Expected Find Familiar companion fixture.");
    }
    const storedCompanionBase = {
      ownerId: companion.ownerId,
      identity: companion.identity,
      protocol: companion.protocol,
      creatureTypeOverride: companion.creatureTypeOverride,
      formAccess: companion.formAccess,
      resolvedStatBlockId: authoredStatBlockId("stat_block_cat"),
      reactionAvailable: true,
    } as const;
    const temporarilyDismissed = {
      ...storedCompanionBase,
      status: "temporarilyDismissed",
      reappearanceCombatantId: companionId,
      hitPoints: retained.companion.manifestation.hitPoints,
      ammunitionStocks: [],
    } as const satisfies BattleCompanionState;
    expect(
      settle({
        ...admitted,
        companions: new Map([[ownerId, temporarilyDismissed]]),
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        companion: {
          companion: { manifestation: { tag: "temporarilyDismissed" } },
        },
      },
    });
    const disappeared = {
      ...storedCompanionBase,
      status: "disappearedAtZeroHitPoints",
    } as const satisfies BattleCompanionState;
    expect(
      settle({
        ...admitted,
        companions: new Map([[ownerId, disappeared]]),
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        companion: {
          companion: { manifestation: { tag: "disappearedAtZeroHitPoints" } },
        },
      },
    });
    expect(
      settleCompanionFromBattle({
        sheet,
        state: {
          ...admitted,
          companions: new Map([[ownerId, disappeared]]),
        },
        ownerCombatantId: ownerId,
        unitLibrary,
        retainedCompanionSelection: {
          formAccess: "findFamiliar",
          selectedForm: {
            tag: "challengeRatingZeroBeast",
            statBlockId: authoredStatBlockId("stat_block_cat"),
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("requires a Stat Block catalog"),
      },
    });
    expect(
      settle({
        ...admitted,
        companions: new Map([
          [
            ownerId,
            {
              ...temporarilyDismissed,
              resolvedStatBlockId: authoredStatBlockId("stat_block_rat"),
            },
          ],
        ]),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "cannot be joined to its retained authored selection",
        ),
      },
    });
  });

  test("recasting an embodied retained companion keeps identity and clamps carried Hit Points (A47)", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-recast-embodied",
      companionIdValue: "companion:recast-embodied",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(1),
    });

    const recast = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:recast-embodied"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "bat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(recast)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:recast-embodied",
        protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "bat" },
          resolvedStatBlockId: "stat_block_bat",
          hitPoints: { currentHp: 1, tempHp: 1 },
        },
      },
    });
  });

  test("recasting an admitted retained cat as a rat settles the battle-owned selection", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-battle-recast",
      companionIdValue: "companion:retained-battle-recast",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    const ownerId = combatantId("retained-battle-recast-owner");
    const companionId = combatantId("retained-battle-recast-companion");
    const ownerInit = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: ownerId,
        displayName: "Owner",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    const started = expectRight(
      startBattle({
        battleId: battleId("retained-battle-recast"),
        combatants: [ownerInit],
      }),
    );
    const admitted = expectRight(
      admitCharacterSheetCompanionToBattle({
        sheet,
        session: started,
        unitLibrary,
        ownerCombatantId: ownerId,
        ammunitionStocks: [],
        companionCombatantId: companionId,
        initiative: initiativeScore(14),
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
        initialCombatantOrder: new Map([
          [ownerId, 0],
          [companionId, 1],
        ]),
        statBlockCatalog,
      }),
    );
    expect(admitted.state.combatants.get(companionId)).not.toHaveProperty(
      "displayName",
    );
    expect(
      battleCreaturePresentationDisplayName(
        admitted.state,
        admitted.context,
        companionId,
      ),
    ).toBe("Cat");
    const findFamiliarUnit = unitLibrary.requireUnit("find_familiar");
    if (findFamiliarUnit.kind !== "spell") {
      throw new Error("Find Familiar fixture must be a Spell.");
    }
    const eligibility = findFamiliarFormEligibilityForSpell(findFamiliarUnit);
    if (eligibility === null) {
      throw new Error("Find Familiar fixture must expose form eligibility.");
    }
    const recast = castRetainedFindFamiliarRuntime({
      session: admitted,
      casterId: ownerId,
      familiarId: companionId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility,
      selection: { tag: "normalNamedForm", formId: "rat" },
      creatureTypeOverrideChoiceId: "fey",
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.session.state.combatants.get(companionId)).not.toHaveProperty(
      "displayName",
    );
    expect(
      recast.snapshot.combatants.find(
        (combatant) => combatant.combatantId === companionId,
      ),
    ).not.toHaveProperty("displayName");
    expect(
      battleCreaturePresentationDisplayName(
        recast.session.state,
        recast.session.context,
        companionId,
      ),
    ).toBe("Rat");

    const settled = expectRight(
      settleCharacterSheetFromBattle({
        sheet,
        state: recast.session.state,
        context: recast.session.context,
        combatant: requireCombatant(recast.session.state, ownerId),
        unitLibrary,
        statBlockCatalog,
      }),
    );

    expect(characterSheetCompanion(settled)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:retained-battle-recast",
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "rat" },
          resolvedStatBlockId: "stat_block_rat",
        },
      },
    });
  });

  test("recasting a temporarily dismissed retained companion carries clamped Hit Points (A47)", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-recast-dismissed",
      companionIdValue: "companion:recast-dismissed",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(1),
    });
    const dismissed = retainedCompanionSheetWithManifestation(
      sheet,
      (manifestation) => {
        if (manifestation.tag === "disappearedAtZeroHitPoints") {
          throw new Error("Expected embodied retained companion fixture.");
        }
        return {
          ...manifestation,
          tag: "temporarilyDismissed",
        };
      },
    );

    const recast = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet: dismissed,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:recast-dismissed"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "bat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(recast)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:recast-dismissed",
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "bat" },
          resolvedStatBlockId: "stat_block_bat",
          hitPoints: { currentHp: 1, tempHp: 1 },
        },
      },
    });
  });

  test("recasting a retained companion disappeared at 0 Hit Points mints fresh form Hit Points (A47)", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-recast-disappeared",
      companionIdValue: "companion:recast-disappeared",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(1),
      tempHp: Hp(1),
    });
    const disappeared = retainedCompanionSheetWithManifestation(
      sheet,
      (manifestation) => ({
        tag: "disappearedAtZeroHitPoints",
        selectedForm: manifestation.selectedForm,
        creatureTypeOverride: manifestation.creatureTypeOverride,
        resolvedStatBlockId: manifestation.resolvedStatBlockId,
      }),
    );

    const recast = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet: disappeared,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:recast-disappeared"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );

    expect(characterSheetCompanion(recast)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:recast-disappeared",
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: "stat_block_cat",
          hitPoints: { currentHp: 2, tempHp: 0 },
        },
      },
    });
  });

  test("recasting an occupied retained companion slot rejects replacement durable identity (A47)", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-recast-replacement-id",
      companionIdValue: "companion:occupied-slot",
      selectedForm: { tag: "normalNamedForm", formId: "cat" },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });

    const recast = createRetainedFamiliarLikeCompanion({
      sheet,
      unitLibrary,
      statBlockCatalog,
      companionId: retainedCompanionId("companion:replacement"),
      source: { tag: "ritualSpell", spellId: authoredUnitId("find_familiar") },
      selectedForm: { tag: "normalNamedForm", formId: "bat" },
      creatureTypeOverrideChoiceId: "fey",
    });

    expect(recast).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Retained companion recast cannot replace the durable identity of an occupied companion slot.",
      },
    });
  });

  test("rejects forged retained normal-form proof before battle admission", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:forged-companion-form"),
        build: {
          ...trueStrikeWizardBuild(),
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_wizard"),
                spellcastingAbility: "int",
                cantrips: [authoredUnitId("true_strike")],
                spellbook: [authoredUnitId("find_familiar")],
                preparedSpells: [],
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
        unitLibrary,
      }),
    );
    const retained = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:forged-form"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    const retainedCompanion = characterSheetCompanion(retained);
    expect(retainedCompanion.tag).toBe("retainedOneAtATime");
    if (retainedCompanion.tag !== "retainedOneAtATime") return;
    const forged = expectRight(
      replaceCharacterSheetCompanion({
        sheet: retained,
        companion: {
          tag: "retainedOneAtATime",
          companion: {
            ...retainedCompanion.companion,
            manifestation: {
              ...retainedCompanion.companion.manifestation,
              selectedForm: {
                tag: "normalNamedForm",
                formId: "goblin_warrior",
              },
              resolvedStatBlockId: authoredStatBlockId(
                "stat_block_goblin_warrior",
              ),
            },
          },
        },
      }),
    );
    const ownerId = combatantId("forged-companion-owner");
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-forged-companion-form"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: ownerId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(12),
          }),
        ],
      }),
    );

    const admitted = admitCharacterSheetCompanionToBattle({
      sheet: forged,
      state: state.state,
      unitLibrary,
      ownerCombatantId: ownerId,
      ammunitionStocks: [],
      companionCombatantId: combatantId("forged-companion"),
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      initialCombatantOrder: new Map([
        [ownerId, 0],
        [combatantId("forged-companion"), 1],
      ]),
      statBlockCatalog,
    });

    expect(admitted).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Retained companion normal form is not eligible for the familiar-like form catalog.",
      },
    });
  });

  test("rejects forged retained Challenge Rating 0 Beast proof before battle admission", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:forged-companion-cr0-beast"),
        build: {
          ...trueStrikeWizardBuild(),
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("class_wizard"),
                spellcastingAbility: "int",
                cantrips: [authoredUnitId("true_strike")],
                spellbook: [authoredUnitId("find_familiar")],
                preparedSpells: [],
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
        unitLibrary,
      }),
    );
    const retained = expectRight(
      createRetainedFamiliarLikeCompanion({
        sheet,
        unitLibrary,
        statBlockCatalog,
        companionId: retainedCompanionId("companion:forged-cr0-beast"),
        source: {
          tag: "ritualSpell",
          spellId: authoredUnitId("find_familiar"),
        },
        selectedForm: {
          tag: "challengeRatingZeroBeast",
          statBlockId: authoredStatBlockId("stat_block_cat"),
        },
        creatureTypeOverrideChoiceId: "fey",
      }),
    );
    const retainedCompanion = characterSheetCompanion(retained);
    expect(retainedCompanion.tag).toBe("retainedOneAtATime");
    if (retainedCompanion.tag !== "retainedOneAtATime") return;
    const forged = expectRight(
      replaceCharacterSheetCompanion({
        sheet: retained,
        companion: {
          tag: "retainedOneAtATime",
          companion: {
            ...retainedCompanion.companion,
            manifestation: {
              ...retainedCompanion.companion.manifestation,
              selectedForm: {
                tag: "challengeRatingZeroBeast",
                statBlockId: authoredStatBlockId("stat_block_goblin_warrior"),
              },
              resolvedStatBlockId: authoredStatBlockId(
                "stat_block_goblin_warrior",
              ),
            },
          },
        },
      }),
    );
    const ownerId = combatantId("forged-cr0-beast-owner");
    const companionId = combatantId("forged-cr0-beast-companion");
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-forged-companion-cr0-beast"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: ownerId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(12),
          }),
        ],
      }),
    );
    const admissionInput = {
      state: state.state,
      unitLibrary,
      ownerCombatantId: ownerId,
      ammunitionStocks: [],
      companionCombatantId: companionId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" as const },
      initialCombatantOrder: new Map([
        [ownerId, 0],
        [companionId, 1],
      ]),
    };

    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionInput,
        sheet: retained,
        statBlockCatalog,
      }),
    ).toMatchObject({ _tag: "Right" });

    const mismatchedProof = expectRight(
      replaceCharacterSheetCompanion({
        sheet: retained,
        companion: {
          tag: "retainedOneAtATime",
          companion: {
            ...retainedCompanion.companion,
            manifestation: {
              ...retainedCompanion.companion.manifestation,
              resolvedStatBlockId: authoredStatBlockId("stat_block_rat"),
            },
          },
        },
      }),
    );
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionInput,
        sheet: mismatchedProof,
        statBlockCatalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "does not match its resolved Stat Block id",
        ),
      },
    });

    const catalogWithoutCat: StatBlockCatalog = {
      getStatBlock: (id) =>
        id === "stat_block_cat"
          ? Option.none()
          : statBlockCatalog.getStatBlock(id),
      listStatBlocks: () =>
        statBlockCatalog
          .listStatBlocks()
          .filter((statBlock) => statBlock.id !== "stat_block_cat"),
      requireStatBlock: (id) => statBlockCatalog.requireStatBlock(id),
    };
    expect(
      admitCharacterSheetCompanionToBattle({
        ...admissionInput,
        sheet: retained,
        statBlockCatalog: catalogWithoutCat,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Stat Block is missing") },
    });

    const admitted = admitCharacterSheetCompanionToBattle({
      sheet: forged,
      ...admissionInput,
      statBlockCatalog,
    });

    expect(admitted).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Retained companion Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block.",
      },
    });
  });

  test("rejects retained companion battle admission when multiple familiar-like form catalogs exist", () => {
    const sheet = retainedOrdinaryCompanionSheet({
      characterIdValue: "character:retained-multiple-form-catalogs",
      companionIdValue: "companion:retained-multiple-form-catalogs",
      selectedForm: {
        tag: "challengeRatingZeroBeast",
        statBlockId: authoredStatBlockId("stat_block_cat"),
      },
      currentHp: Hp(2),
      tempHp: Hp(0),
    });
    const ownerId = combatantId("multiple-form-catalogs-owner");
    const companionId = combatantId("multiple-form-catalogs-companion");
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-multiple-form-catalogs"),
        combatants: [
          battleCreatureInitFromStatBlock({
            combatantId: ownerId,
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(12),
          }),
        ],
      }),
    );

    const admitted = admitCharacterSheetCompanionToBattle({
      sheet,
      state: state.state,
      unitLibrary: unitLibraryWithSyntheticFamiliarFormCatalog(),
      ownerCombatantId: ownerId,
      ammunitionStocks: [],
      companionCombatantId: companionId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      initialCombatantOrder: new Map([
        [ownerId, 0],
        [companionId, 1],
      ]),
      statBlockCatalog,
    });

    expect(admitted).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Retained companion admission requires exactly one familiar-like form catalog.",
      },
    });
  });

  test("ignores battle-only companions during retained companion handoff", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:battle-only-companion-handoff",
        ),
        build,
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const ownerId = combatantId("battle-only-companion-owner");
    const battleOnlyCompanionId = combatantId("battle-only-companion");
    const ownerInit = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: ownerId,
        displayName: "Owner",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-only-companion-handoff"),
        combatants: [ownerInit],
      }),
    );
    const findFamiliarUnit = unitLibrary.requireUnit("find_familiar");
    if (findFamiliarUnit.kind !== "spell") {
      throw new Error("Find Familiar fixture must be a Spell.");
    }
    const eligibility = findFamiliarFormEligibilityForSpell(findFamiliarUnit);
    if (eligibility === null) {
      throw new Error("Find Familiar fixture must expose form eligibility.");
    }
    const cast = castFindFamiliar({
      state: state.state,
      casterId: ownerId,
      familiarId: battleOnlyCompanionId,
      ammunitionStocks: [],
      catalog: statBlockCatalog,
      eligibility,
      selection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverrideChoiceId: "fey",
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const handoff = expectRight(
      settleCharacterSheetFromBattle({
        sheet,
        state: cast.state,
        context: state.context,
        combatant: requireCombatant(cast.state, ownerId),
        unitLibrary,
        statBlockCatalog,
      }),
    );

    expect(characterSheetCompanion(handoff)).toEqual({ tag: "none" });
  });

  test("passes the caller Stat Block catalog while preserving Wild Shape forms", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:druid-wild-shape-catalog"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      statBlockCatalog,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const countedStatBlockCatalog = statBlockCatalogWithLookupCount();
    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      statBlockCatalog: countedStatBlockCatalog.catalog,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:druid-wild-shape-catalog"),
        },
        hp: Hp(12),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetDruidWildShapeKnownForms(handoff.right)).toEqual({
        statBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      });
    }
    expect(countedStatBlockCatalog.lookupCount()).toBeGreaterThan(0);
  });

  test("threads Druid Wild Shape known forms into battle initialization", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:druid-wild-shape-init"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      statBlockCatalog,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const init = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("druid-wild-shape-init"),
        displayName: "Druid",
        sheet: sheet.right,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(
      init.creatureInit.druidWildShapeAvailableForms?.map((form) => form.id),
    ).toEqual(DRUID_WILD_SHAPE_KNOWN_FORM_IDS);
  });

  test("allows Druid Wild Shape battle initialization when selected form records are unavailable", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:druid-wild-shape-no-catalog"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );

    const init = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("druid-wild-shape-no-catalog"),
        displayName: "Druid",
        sheet,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog: emptyStatBlockCatalog(),
      }),
    );
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-druid-wild-shape-no-catalog"),
        combatants: [
          init,
          battleCreatureInitFromStatBlock({
            combatantId: combatantId("combatant:no-catalog-skeleton"),
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(10),
          }),
        ],
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.druidWildShapeAvailableForms).toEqual([]);
    expect(
      discoverBattleActs(state).filter(
        (act) =>
          act.subject.tag === "druidWildShape" &&
          act.subject.action === "assumeForm",
      ),
    ).toEqual([]);
  });

  test("admits available supported selected Wild Shape forms without rejecting unsupported selected forms", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:druid-wild-shape-subset"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: [
          authoredStatBlockId("stat_block_rat"),
          authoredStatBlockId("stat_block_riding_horse"),
          authoredStatBlockId("stat_block_spider"),
          authoredStatBlockId("stat_block_wolf"),
        ],
      }),
    );

    expect(characterSheetDruidWildShapeKnownForms(sheet)).toEqual({
      statBlockIds: [
        "stat_block_rat",
        "stat_block_riding_horse",
        "stat_block_spider",
        "stat_block_wolf",
      ],
    });
    const init = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("druid-wild-shape-subset"),
        displayName: "Druid",
        sheet,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog,
      }),
    );
    const state = expectRight(
      startBattle({
        battleId: battleId("battle-druid-wild-shape-subset"),
        combatants: [
          init,
          battleCreatureInitFromStatBlock({
            combatantId: combatantId("combatant:wild-shape-subset-skeleton"),
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(10),
          }),
        ],
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(
      init.creatureInit.druidWildShapeAvailableForms?.map((form) => form.id),
    ).toEqual([
      "stat_block_rat",
      "stat_block_riding_horse",
      "stat_block_spider",
      "stat_block_wolf",
    ]);
    expect(
      discoverBattleActs(state).flatMap((act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm"
          ? [battleActDruidWildShapePresentation(act)?.formStatBlockId]
          : [],
      ),
    ).toEqual([
      "stat_block_rat",
      "stat_block_riding_horse",
      "stat_block_spider",
      "stat_block_wolf",
    ]);
  });

  test("projects reduced Character Sheet Hit Point maximum into battle initialization", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:reduced-maximum-init"),
      build,
      hitPointMaximumReduction: Hp(3),
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const init = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("reduced-maximum-init"),
        displayName: "Fighter",
        sheet: sheet.right,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.maxHp).toBe(sheetMaximumHp(sheet.right));
    expect(init.creatureInit.currentHp).toBe(7);
  });

  test("rejects CharacterBuild battle initialization max HP above the build-derived maximum", () => {
    const init = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("contradictory-maximum-init"),
      characterId: characterId("character:contradictory-maximum-init"),
      displayName: "Fighter",
      build,
      initiative: initiativeScore(20),
      ammunitionStocks: [],
      unitLibrary,
      hitPointMaximum: Hp(13),
    });

    expect(init).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Character battle initialization max HP exceeds build-derived max HP.",
      }),
    );

    expect(
      battleCreatureInitFromCharacterBuildWithRoute({
        combatantId: combatantId("contradictory-maximum-init-route"),
        characterId: characterId("character:contradictory-maximum-init-route"),
        displayName: "Fighter",
        build,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        hitPointMaximum: Hp(13),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        routeEvents: [
          {
            kind: "rejectCharacterBattleHandoff",
            holes: ["hitPointProjection"],
          },
        ],
      },
    });
  });

  test("records accepted and ordinary rejected CharacterBuild projection routes", () => {
    expect(
      battleCreatureInitFromCharacterBuildWithRoute({
        combatantId: combatantId("accepted-build-init-route"),
        characterId: characterId("character:accepted-build-init-route"),
        displayName: "Fighter",
        build,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        routeEvents: [
          { kind: "projectCharacterSheetToBattle" },
          { kind: "recordCharacterBattleHandoffFacts" },
          { kind: "enterBattleRuntime" },
        ],
      },
    });

    expect(
      battleCreatureInitFromCharacterBuildWithRoute({
        combatantId: combatantId("rejected-build-init-route"),
        characterId: characterId("character:rejected-build-init-route"),
        displayName: "Druid",
        build: druidWildShapeBuild(),
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        routeEvents: [
          {
            kind: "rejectCharacterBattleHandoff",
            holes: ["settlementConflict"],
          },
        ],
      },
    });
  });

  test("threads origin and class-feature languages into character battle initialization", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("language-threading-init"),
        characterId: characterId("character:language-threading-init"),
        displayName: "Druid",
        build: {
          ...build,
          classFeatureLanguages: [
            {
              kind: "classFeatureLanguageGrant",
              sourceUnitId: authoredUnitId("synthetic_language_feature"),
              language: "Druidic",
            },
            {
              kind: "classFeatureLanguageChoice",
              sourceUnitId: authoredUnitId("synthetic_language_choice_feature"),
              language: "Goblin",
            },
          ],
        },
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(init.creatureInit).toMatchObject({
      kind: "character",
      knownLanguages: ["Common", "Dwarvish", "Goblin", "Druidic"],
    });
  });

  test("rejects ineligible Druid Wild Shape known forms during battle initialization", () => {
    const init = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("druid-wild-shape-ineligible-form"),
      characterId: characterId("character:druid-wild-shape-ineligible-form"),
      displayName: "Druid",
      build: druidWildShapeBuild(),
      initiative: initiativeScore(20),
      ammunitionStocks: [],
      unitLibrary,
      druidWildShapeAvailableForms: [
        statBlockCatalog.requireStatBlock("stat_block_rat"),
        statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
        statBlockCatalog.requireStatBlock("stat_block_cat"),
        statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      ],
    });

    expect(init).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
      }),
    );
  });

  test("rejects omitted Druid Wild Shape available forms during CharacterBuild battle initialization", () => {
    const init = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("druid-wild-shape-omitted-available-forms"),
      characterId: characterId(
        "character:druid-wild-shape-omitted-available-forms",
      ),
      displayName: "Druid",
      build: druidWildShapeBuild(),
      initiative: initiativeScore(20),
      ammunitionStocks: [],
      unitLibrary,
    });

    expect(init).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Druid Wild Shape battle initialization requires an available known-form subset.",
      }),
    );
  });

  test("projects Wild Shape Unit-ref support at Beast Spells levels", () => {
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        druidWildShapeBuildAtLevel(18),
        unitLibrary,
        undefined,
        [{ className: "druid", level: 18 }],
      ),
    );
    const wildShapeRef = refs.find(
      (candidate) => candidate.unit.id === "druid_wild_shape",
    );

    expect(wildShapeRef?.supportProfiles).toContainEqual(
      expect.objectContaining({
        classLevel: 18,
        kind: "druidWildShapeKnownForm",
      }),
    );
  });

  test("projects retained Hunter's Prey selected option into semantic battle support", () => {
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        hunterRangerHordeBreakerBuild(),
        unitLibrary,
        undefined,
        [{ className: "ranger", level: 3 }],
      ),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "ranger_hunters_prey" }),
          supportProfiles: expect.arrayContaining([
            expect.objectContaining({
              kind: "huntersPrey",
              huntersPrey: expect.objectContaining({
                kind: "nearbyDifferentTargetSameWeaponAttack",
              }),
            }),
          ]),
        }),
      ]),
    );
    expect(
      refs.find((ref) => ref.unit.id === "ranger_hunters_prey"),
    ).not.toHaveProperty("selectedOption");
  });

  test("rejects Dragonborn Breath Weapon support without selected Draconic Ancestry", () => {
    const refs = characterBattleSupportProjection(
      dragonbornFighterBuild({ draconicAncestry: false }),
      unitLibrary,
      undefined,
      [{ className: "fighter", level: 1 }],
    );

    expect(refs).toEqual(
      Either.left([
        {
          tag: "battleSupportProfileIssue",
          message:
            "Unsupported battle Attack-action area save-damage replacement Unit hook: species_dragonborn_breath_weapon.",
        },
        {
          tag: "battleSupportProfileIssue",
          message:
            "Unsupported battle passive damage Resistance Unit hook: species_dragonborn_damage_resistance.",
        },
      ]),
    );
  });

  test("projects Dragonborn Breath Weapon support from selected Draconic Ancestry", () => {
    const dragonbornBuild = dragonbornFighterBuild();
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        dragonbornBuild,
        unitLibrary,
        undefined,
        [{ className: "fighter", level: 1 }],
      ),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({
            id: "species_dragonborn_breath_weapon",
          }),
          supportProfiles: expect.arrayContaining([
            expect.objectContaining({
              kind: ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
              breath: expect.objectContaining({
                damage: expect.objectContaining({
                  damageType: {
                    kind: "draconicAncestry",
                    holeId: "species_dragonborn_draconic_ancestry_damage_type",
                    value: "fire",
                  },
                }),
              }),
            }),
          ]),
        }),
      ]),
    );
    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({
            id: "species_dragonborn_damage_resistance",
          }),
          supportProfiles: expect.arrayContaining([
            {
              kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
              resistance: {
                damageType: {
                  kind: "draconicAncestry",
                  holeId: "species_dragonborn_draconic_ancestry_damage_type",
                  value: "fire",
                },
              },
            },
          ]),
        }),
      ]),
    );
  });

  test("preserves Dragonborn Breath Weapon support after Character Sheet parsing", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:dragonborn-breath-parse"),
        build: dragonbornFighterBuild(),
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const parsed = expectRight(parseCharacterSheet(sheet, unitLibrary));
    const init = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("dragonborn-breath-parse"),
        displayName: "Dragonborn",
        sheet: parsed,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog,
      }),
    );

    const session = expectRight(
      startBattle({
        battleId: battleId("battle-dragonborn-breath-parse"),
        combatants: [init],
      }),
    );
    const runtimeContext = session.context.characters.get(
      combatantId("dragonborn-breath-parse"),
    );
    expect(runtimeContext?.unitPresentationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({
            id: "species_dragonborn_breath_weapon",
          }),
          supportProfiles: expect.arrayContaining([
            expect.objectContaining({
              kind: ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
              breath: expect.objectContaining({
                damage: expect.objectContaining({
                  damageType: {
                    kind: "draconicAncestry",
                    holeId: "species_dragonborn_draconic_ancestry_damage_type",
                    value: "fire",
                  },
                }),
              }),
            }),
          ]),
        }),
      ]),
    );
    expect(runtimeContext?.unitPresentationSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({
            id: "species_dragonborn_damage_resistance",
          }),
          supportProfiles: expect.arrayContaining([
            {
              kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
              resistance: {
                damageType: {
                  kind: "draconicAncestry",
                  holeId: "species_dragonborn_draconic_ancestry_damage_type",
                  value: "fire",
                },
              },
            },
          ]),
        }),
      ]),
    );
    expect(runtimeContext?.resourceOwnership).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({
            id: "species_dragonborn_breath_weapon",
          }),
        }),
      ]),
    );
    const breathWeaponOwnership = runtimeContext?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "species_dragonborn_breath_weapon",
    );
    const dragonborn = session.state.combatants.get(
      combatantId("dragonborn-breath-parse"),
    );
    expect(dragonborn?.origin.kind).toBe("character");
    if (
      dragonborn?.origin.kind === "character" &&
      breathWeaponOwnership !== undefined
    ) {
      expect(
        dragonborn.origin.resources.map((resource) => resource.resourcePoolRef),
      ).toContain(breathWeaponOwnership.resourcePoolRef);
    }
  });

  test("projects Dwarven Resilience Poison Resistance and Poisoned save Advantage support into battle Unit refs", () => {
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        dwarfFighterBuild(),
        unitLibrary,
        undefined,
        [{ className: "fighter", level: 1 }],
      ),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "dwarf_dwarven_resilience" }),
          supportProfiles: [
            {
              kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
              savingThrow: {
                mode: "advantage",
                scope: {
                  kind: "condition",
                  condition: "poisoned",
                },
              },
            },
            {
              kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
              resistance: {
                damageType: {
                  kind: "fixed",
                  value: "poison",
                },
              },
            },
          ],
        }),
      ]),
    );
  });

  test("projects Halfling Brave Frightened save Advantage support into battle Unit refs", () => {
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        halflingFighterBuild(),
        unitLibrary,
        undefined,
        [{ className: "fighter", level: 1 }],
      ),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "species_halfling_brave" }),
          supportProfiles: [
            {
              kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
              savingThrow: {
                mode: "advantage",
                scope: {
                  kind: "condition",
                  condition: "frightened",
                },
              },
            },
          ],
        }),
      ]),
    );
  });

  test("rejects duplicated persisted Dragonborn Draconic Ancestry damage type", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:dragonborn-breath-mismatch"),
        build: dragonbornFighterBuild(),
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      parseCharacterSheet(
        {
          ...sheet,
          build: {
            ...sheet.build,
            speciesChoiceFacts: {
              draconicAncestry: {
                kind: "draconicAncestry",
                ancestorId: "red",
                damageType: "fire",
              },
            },
          },
        },
        unitLibrary,
      ),
    ).toEqual(
      Either.left({
        tag: "characterSheetIssue",
        message:
          "Character Build Draconic Ancestry fact must contain exactly selected ancestry fact fields.",
      }),
    );
  });

  test("blocks active Wild Shape handoff and persists spent use after dismissal", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:druid-wild-shape-resource"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      statBlockCatalog,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;
    const state = startDruidWildShapeSheetBattle(sheet.right);
    const assume = requireResolvedBattleSubject(
      resolveDruidWildShapeAssumeFormWithoutLoadoutEquipment(state),
    );
    const activeHandoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      context: state.context,
      combatant: requireCombatant(assume.state, combatantId("druid")),
    });
    expect(Either.isLeft(activeHandoff)).toBe(true);

    const dismissableState = restoreBonusAction(assume.state);
    const dismissableSession = battleRuntimeSessionForTest({
      state: dismissableState,
      context: state.context,
    });
    const dismissed = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: dismissableState,
        subject: druidWildShapeAct(dismissableSession, "dismiss"),
        fills: [],
      }),
    );
    const handoff = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        context: state.context,
        combatant: requireCombatant(dismissed.state, combatantId("druid")),
      }),
    );

    expect(handoff.resourceExpenditures).toContainEqual({
      tag: "useCountResource",
      unitId: "druid_wild_shape",
      expended: resourceCount(1),
    });
  });

  test("rejects Wild Shape handoff when battle resource capacity drifts", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:druid-wild-shape-drift"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      statBlockCatalog,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const wildShapeUnit = unitLibrary.requireUnit("druid_wild_shape");
    if (!isClassFeatureWithUseCountResource(wildShapeUnit)) {
      throw new Error("Expected Wild Shape to carry a use-count resource.");
    }
    const driftedWildShapeUnit = unitWithUseCountCap(wildShapeUnit, {
      kind: "fixed",
      uses: resourceCount(3),
    });
    const driftedWildShapeResource =
      characterBattleResourceForUnit(driftedWildShapeUnit);
    if (!hasLimitedCharacterBattleResourceCap(driftedWildShapeResource)) {
      throw new Error("Expected finite drifted Wild Shape resource.");
    }
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("drifted-wild-shape");

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: driftedWildShapeUnit,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:druid-wild-shape-drift"),
          classLevels: parsedClassLevelsForTest("druid", 2),
          resources: [
            {
              resourcePoolRef,
              resource: driftedWildShapeResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(15),
        maxHp: Hp(15),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count battle capacity must match Character Sheet resource capacity.",
      },
    });

    const wildShapeResource = characterBattleResourceForUnit(wildShapeUnit);
    if (!hasLimitedCharacterBattleResourceCap(wildShapeResource)) {
      throw new Error("Expected finite Wild Shape resource.");
    }
    const settleWithUsesRemaining = (usesRemaining: ResourceCount) =>
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: wildShapeUnit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:druid-wild-shape-drift"),
            classLevels: parsedClassLevelsForTest("druid", 2),
            resources: [
              {
                resourcePoolRef,
                resource: wildShapeResource,
                usedThisTurn: false,
                usesRemaining,
              },
            ],
          },
          hp: Hp(15),
          maxHp: Hp(15),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      });
    expect(settleWithUsesRemaining(resourceCount(3))).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
      },
    });
    expect(
      expectRight(settleWithUsesRemaining(resourceCount(2)))
        .resourceExpenditures,
    ).not.toContainEqual(
      expect.objectContaining({
        tag: "useCountResource",
        unitId: "druid_wild_shape",
      }),
    );

    const duplicateResourcePoolRef = battleResourcePoolExecutionRefForTest(
      "duplicate-wild-shape",
    );
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: wildShapeUnit,
            purpose: { tag: "unitResource" },
          },
          {
            resourcePoolRef: duplicateResourcePoolRef,
            unit: wildShapeUnit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:druid-wild-shape-drift"),
            classLevels: parsedClassLevelsForTest("druid", 2),
            resources: [
              {
                resourcePoolRef,
                resource: wildShapeResource,
                usedThisTurn: false,
                usesRemaining: resourceCount(2),
              },
              {
                resourcePoolRef: duplicateResourcePoolRef,
                resource: wildShapeResource,
                usedThisTurn: false,
                usesRemaining: resourceCount(2),
              },
            ],
          },
          hp: Hp(15),
          maxHp: Hp(15),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff supports exactly one Druid Wild Shape resource.",
      },
    });

    const mismatchedResourcePoolRef = battleResourcePoolExecutionRefForTest(
      "mismatched-wild-shape-resource",
    );
    const fontOfMagic = unitLibrary.requireUnit("sorcerer_font_of_magic");
    const pointPoolResource = characterBattleResourceForUnit(fontOfMagic);
    if (pointPoolResource.kind !== "point_pool") {
      throw new Error("Expected Font of Magic point-pool resource.");
    }
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef: mismatchedResourcePoolRef,
            unit: wildShapeUnit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:druid-wild-shape-drift"),
            classLevels: parsedClassLevelsForTest("druid", 2),
            resources: [
              {
                resourcePoolRef: mismatchedResourcePoolRef,
                resource: pointPoolResource,
                pointsRemaining: resourceCount(2),
              },
            ],
          },
          hp: Hp(15),
          maxHp: Hp(15),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Druid Wild Shape must carry remaining uses during battle handoff.",
      },
    });
  });

  test("rejects stable battle handoff when the sheet has in-progress Stable recovery time", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:stable"),
      build,
      currentHp: Hp(0),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(1),
        },
      },
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    expect(
      characterSheetBattleInitWithRoute({
        combatantId: combatantId("stable-init-route"),
        displayName: "Stable Fighter",
        sheet: sheet.right,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        routeEvents: [
          {
            kind: "rejectCharacterBattleHandoff",
            holes: ["settlementConflict"],
          },
        ],
      },
    });
    expect(
      startBattleFromCharacterSheetAndStatBlock({
        battleId: battleId("battle:stable-init-rejected"),
        character: {
          combatantId: combatantId("stable-init-entry"),
          displayName: "Stable Fighter",
          sheet: sheet.right,
          initiative: initiativeScore(10),
          ammunitionStocks: [],
          unitLibrary,
          statBlockCatalog,
        },
        statBlockBattleInput: {
          combatantId: combatantId("stable-init-entry-skeleton"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(5),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        issue: {
          message: expect.stringContaining("in-progress Stable recovery time"),
        },
      },
    });

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:stable"),
        },
        hp: Hp(0),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 0, failures: 0 },
            stable: true,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("in-progress Stable recovery time"),
      },
    });
  });

  test("rejects a character handoff carrying the Stat Block zero-HP policy", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:invalid-zero-hp-policy"),
        build,
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 0, failures: 0 },
        },
      }),
    );

    expect(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:invalid-zero-hp-policy"),
          },
          hp: Hp(0),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
          zeroHpLifecycle: { policy: "diesAtZeroHp" },
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Battle character has unsupported zero-HP lifecycle." },
    });
  });

  test("rejects Knocked Out Unconscious without exactly 1 HP and the Unconscious condition", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:invalid-knocked-out-unconscious",
        ),
        build,
        currentHp: Hp(0),
        tempHp: Hp(0),
        unitLibrary,
        zeroHpLifecycle: {
          tag: "unstable",
          deathSaves: { successes: 0, failures: 0 },
        },
      }),
    );

    expect(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId(
              "character:invalid-knocked-out-unconscious",
            ),
          },
          hp: Hp(0),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
          },
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "BattleCreatureState invariant violated: Knocked Out Unconscious requires exactly 1 HP and the Unconscious condition.",
      },
    });
  });

  test.each([
    {
      label: "unstable",
      sheetLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 1, failures: 1 },
      },
      battleLifecycle: {
        policy: "usesDeathSavingThrows",
        deathSaves: {
          deathSaves: { successes: 1, failures: 1 },
          stable: false,
          dead: false,
          hpRegained: false,
        },
      },
    },
    {
      label: "stable",
      sheetLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
      },
      battleLifecycle: {
        policy: "usesDeathSavingThrows",
        deathSaves: {
          deathSaves: { successes: 0, failures: 0 },
          stable: true,
          dead: false,
          hpRegained: false,
        },
      },
    },
    {
      label: "dead",
      sheetLifecycle: {
        tag: "dead",
        deathSaves: { successes: 0, failures: 3 },
      },
      battleLifecycle: {
        policy: "usesDeathSavingThrows",
        deathSaves: {
          deathSaves: { successes: 0, failures: 3 },
          stable: false,
          dead: true,
          hpRegained: false,
        },
      },
    },
  ] as const)(
    "round-trips $label zero-HP lifecycle through battle",
    ({ label, sheetLifecycle, battleLifecycle }) => {
      const characterIdValue = `character:zero-hp-${label}`;
      const sheet = expectRight(
        rebuildCharacterSheetFixture({
          characterId: characterSheetId(characterIdValue),
          build,
          currentHp: Hp(0),
          tempHp: Hp(0),
          unitLibrary,
          zeroHpLifecycle: sheetLifecycle,
        }),
      );
      const init = characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantId(`combatant:zero-hp-${label}`),
        displayName: `Zero HP ${label}`,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
      });
      expect(init).toMatchObject({ _tag: "Right" });

      const settled = settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId(characterIdValue),
          },
          hp: Hp(0),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
          zeroHpLifecycle: battleLifecycle,
        }),
      });
      expect(settled).toMatchObject({
        _tag: "Right",
        right: {
          hitPoints: {
            tag: "zero",
            lifecycle: { tag: label },
          },
        },
      });
    },
  );

  test("round-trips positive-HP unconscious state through battle", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:positive-hp-unconscious"),
        build,
        currentHp: Hp(1),
        tempHp: Hp(0),
        positiveHpUnconscious: { tag: "knockedOut" },
        unitLibrary,
      }),
    );
    const init = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantId("combatant:positive-hp-unconscious"),
        displayName: "Positive HP unconscious",
        initiative: initiativeScore(10),
        ammunitionStocks: [],
      }),
    );
    expect(init).toMatchObject({
      creatureInit: {
        positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      },
    });
    const session = expectRight(
      startBattle({
        battleId: battleId("battle:positive-hp-unconscious"),
        combatants: [init],
      }),
    );
    const combatant = requireCombatant(
      session.state,
      combatantId("combatant:positive-hp-unconscious"),
    );

    expect(
      settleCharacterSheetFromBattle({
        sheet,
        state: session.state,
        context: session.context,
        unitLibrary,
        combatant,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: { hitPoints: { tag: "knockedOut" } },
    });
  });

  test("preserves non-battle sheet state while settling battle-owned HP and Spell Slots", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:rest-state"),
      build: wizardSpellcastingBuild(),
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
      spentHitDice: [
        {
          classUnitId: authoredUnitId("class_wizard"),
          spent: resourceCount(1),
        },
      ],
      spellSlotExpenditures: [
        { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
      ],
      restFeatureUses: [{ tag: "arcaneRecovery", usedSinceLongRest: true }],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:rest-state"),
          spellcasting: handoffSpellcastingState(),
        },
        hp: Hp(6),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(3),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.spentHitDice).toEqual([
      { classUnitId: "class_wizard", spent: 1 },
    ]);
    expect(settled.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(characterSheetSpellSlots(settled)).toEqual([
      { spellLevel: 1, count: 2, expended: 2 },
    ]);
    expect(characterSheetTempHp(settled)).toBe(3);
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:rest-state"),
            spellcasting: handoffSpellcastingState({
              spellSlots: [
                {
                  spellLevel: spellSlotLevel(1),
                  count: resourceCount(2),
                  expended: resourceCount(0),
                },
              ],
            }),
          },
          hp: Hp(7),
          maxHp: sheetMaximumHp(sheet.right),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot expenditure cannot be lower than the pre-battle Character Sheet expenditure.",
      },
    });
  });

  test("rejects ordinary Spell Slot handoff when count capacity drifts", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:ordinary-slot-count-drift"),
        build: wizardSpellcastingBuild(),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ordinary-slot-count-drift"),
          spellcasting: handoffSpellcastingState({
            spellSlots: [
              {
                spellLevel: spellSlotLevel(1),
                count: resourceCount(3),
                expended: resourceCount(2),
              },
            ],
          }),
        },
        hp: Hp(7),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      },
    });
  });

  test("rejects contradictory ordinary Spell Slot execution state", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:contradictory-slot-state"),
        build: wizardSpellcastingBuild(),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const settleWithSlots = (
      spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
    ) =>
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:contradictory-slot-state"),
            spellcasting: handoffSpellcastingState({ spellSlots }),
          },
          hp: Hp(7),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      });

    expect(
      settleWithSlots([
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(1),
        },
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(1),
        },
      ]),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot state must not duplicate spell levels.",
      },
    });
    expect(
      settleWithSlots([
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(3),
        },
      ]),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot expenditure must not exceed its count.",
      },
    });
  });

  test("rejects ordinary Spell Slot handoff when levels drift", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:ordinary-slot-level-drift"),
        build: wizardSpellcastingBuild(),
        currentHp: Hp(7),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const missingSheetLevel = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ordinary-slot-level-drift"),
          spellcasting: handoffSpellcastingState({
            spellSlots: [],
          }),
        },
        hp: Hp(7),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(missingSheetLevel).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      },
    });

    const extraBattleLevel = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ordinary-slot-level-drift"),
          spellcasting: handoffSpellcastingState({
            spellSlots: [
              {
                spellLevel: spellSlotLevel(1),
                count: resourceCount(2),
                expended: resourceCount(2),
              },
              {
                spellLevel: spellSlotLevel(2),
                count: resourceCount(1),
                expended: resourceCount(0),
              },
            ],
          }),
        },
        hp: Hp(7),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(extraBattleLevel).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot state must match Character Sheet Spell Slot levels.",
      },
    });
  });

  test("projects pure Pact Magic slot state from a Character Sheet into battle Spell Slots", () => {
    const combatantIdValue = combatantId("combatant:pure-pact-magic");
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pure-pact-magic"),
        build: armorOfShadowsWarlockBuild({ armorOfShadows: false }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const init = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantIdValue,
        displayName: "Warlock",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    if (init.creatureInit.kind !== "character") {
      throw new Error("Expected character battle creature init.");
    }

    expect(characterSheetSpellSlots(sheet)).toEqual([]);
    expect(characterSheetPactSlots(sheet)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
    expect(init.creatureInit.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1 },
    ]);
    expect(init.creatureInit.spellcasting?.spellSlotExpenditures).toEqual([
      { spellLevel: 1, expended: 0 },
    ]);
  });

  test("settles pure Pact Magic battle Spell Slot expenditure back to Character Sheet Pact Slots", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pure-pact-magic-spent"),
        build: armorOfShadowsWarlockBuild({ armorOfShadows: false }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const settled = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:pure-pact-magic-spent"),
            spellcasting: pactMagicHandoffSpellcastingState({
              expended: resourceCount(1),
            }),
          },
          hp: Hp(8),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );

    expect(characterSheetSpellSlots(settled)).toEqual([]);
    expect(characterSheetPactSlots(settled)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 1,
    });

    const unchanged = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:pure-pact-magic-spent"),
          },
          hp: Hp(8),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );
    expect(characterSheetPactSlots(unchanged)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 0,
    });
  });

  test("rejects pure Pact Magic battle handoff when Pact Slot capacity drifts", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pure-pact-magic-drift"),
        build: armorOfShadowsWarlockBuild({ armorOfShadows: false }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:pure-pact-magic-drift"),
          spellcasting: pactMagicHandoffSpellcastingState({
            count: resourceCount(2),
            expended: resourceCount(1),
          }),
        },
        hp: Hp(8),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Pact Slot state must match Character Sheet Pact Slot capacity.",
      },
    });

    for (const spellcasting of [
      pactMagicHandoffSpellcastingState({
        spellLevel: spellSlotLevel(2),
        expended: resourceCount(1),
      }),
      pactMagicHandoffSpellcastingState({
        expended: resourceCount(2),
      }),
      {
        ...pactMagicHandoffSpellcastingState({
          expended: resourceCount(1),
        }),
        spellSlots: [
          {
            spellLevel: spellSlotLevel(1),
            count: resourceCount(1),
            expended: resourceCount(1),
          },
          {
            spellLevel: spellSlotLevel(2),
            count: resourceCount(1),
            expended: resourceCount(1),
          },
        ],
      },
    ]) {
      const rejected = settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:pure-pact-magic-drift"),
            spellcasting,
          },
          hp: Hp(8),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      });

      expect(rejected).toMatchObject({
        _tag: "Left",
        left: {
          message:
            "Battle handoff Pact Slot state must match Character Sheet Pact Slot capacity.",
        },
      });
    }
  });

  test("rejects pure Pact Magic battle handoff when expenditure moves below pre-battle Pact Slot state", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pure-pact-magic-regression"),
        build: armorOfShadowsWarlockBuild({ armorOfShadows: false }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
        pactSlots: { expended: resourceCount(1) },
      }),
    );

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:pure-pact-magic-regression"),
          spellcasting: pactMagicHandoffSpellcastingState({
            expended: resourceCount(0),
          }),
        },
        hp: Hp(8),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Pact Slot state must match Character Sheet Pact Slot capacity.",
      },
    });
  });

  test("rejects battle Spell Slot handoff when the sheet has no Spell Slot or Pact Slot state", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:no-slot-state"),
        build: defenseBuild({ wearingArmor: false }),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:no-slot-state"),
          spellcasting: pactMagicHandoffSpellcastingState({
            expended: resourceCount(1),
          }),
        },
        hp: Hp(8),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff Spell Slot state requires Character Sheet Spell Slot or Pact Slot state.",
      },
    });
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:no-slot-state"),
            spellcasting: handoffSpellcastingState({ spellSlots: [] }),
          },
          hp: Hp(8),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({ _tag: "Right" });
  });

  test("rejects mixed ordinary Spell Slot and Pact Slot handoff until battle slots carry source identity", () => {
    const combatantIdValue = combatantId("combatant:mixed-spell-pact");
    const warlockBuild = armorOfShadowsWarlockBuild({
      armorOfShadows: false,
    });
    if (warlockBuild.spellcasting === undefined) {
      throw new Error("Expected Warlock fixture spellcasting.");
    }
    const pactMagic = warlockBuild.spellcasting.slotPools.pactMagic;
    if (pactMagic === undefined) {
      throw new Error("Expected Warlock fixture Pact Magic.");
    }
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:mixed-spell-pact"),
        build: {
          ...warlockBuild,
          spellcasting: {
            ...warlockBuild.spellcasting,
            slotPools: {
              spellcasting: {
                kind: "spellcasting",
                slots: [{ spellLevel: 1, count: 2 }],
              },
              pactMagic,
            },
          },
        },
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(1), expended: resourceCount(1) },
        ],
        pactSlots: { expended: resourceCount(0) },
      }),
    );

    const init = characterSheetBattleInit({
      sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: combatantIdValue,
      displayName: "Wizard/Warlock",
      initiative: initiativeScore(12),
      ammunitionStocks: [],
    });

    expect(init).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.",
      },
    });

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:mixed-spell-pact"),
          spellcasting: handoffSpellcastingState(),
        },
        hp: Hp(8),
        maxHp: sheetMaximumHp(sheet),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });
    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.",
      },
    });
  });

  test("carries Font of Magic created Spell Slots into battle and rejects source-ambiguous handoff", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:sorcerer-font-battle"),
        build: sorcererMetamagicBuild(),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const created = expectRight(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    );

    const init = expectRight(
      characterSheetBattleInit({
        sheet: created,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantId("combatant:sorcerer-font-battle"),
        displayName: "Sorcerer",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    if (init.creatureInit.kind !== "character") {
      throw new Error("Expected character battle creature init.");
    }
    const spellcasting = init.creatureInit.spellcasting;
    if (spellcasting === undefined) {
      throw new Error("Expected character spellcasting init.");
    }
    expect(spellcasting.spellSlots).toEqual([
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 3 },
    ]);

    const unchangedHandoff = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet: created,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:sorcerer-font-battle"),
            spellcasting: {
              spellcastingSource: {
                tag: "classSpellcasting",
                className: "sorcerer",
                abilityModifier: abilityModifier(3),
              },
              proficiencyBonus: proficiencyBonus(3),
              canCastSpells: true,
              pactOfTheChainFindFamiliarInvocationMode: null,
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
                  expended: resourceCount(0),
                },
              ],
            },
          },
          hp: Hp(22),
          maxHp: sheetMaximumHp(created),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );
    expect(characterSheetSpellSlotSourceState(unchangedHandoff)).toEqual({
      ordinarySpellSlotExpenditures: [],
      createdSpellSlots: [{ spellLevel: 3, count: 1, expended: 0 }],
    });

    const ambiguousHandoff = settleHandoffBranchToCharacterSheet({
      sheet: created,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sorcerer-font-battle"),
          spellcasting: {
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "sorcerer",
              abilityModifier: abilityModifier(3),
            },
            proficiencyBonus: proficiencyBonus(3),
            canCastSpells: true,
            pactOfTheChainFindFamiliarInvocationMode: null,
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
          },
        },
        hp: Hp(22),
        maxHp: sheetMaximumHp(created),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(ambiguousHandoff).toEqual(
      Either.left({
        tag: "characterSheetBattleHandoffIssue",
        message:
          "Battle handoff Spell Slot expenditure is source-ambiguous for level 3.",
      }),
    );

    const ordinarySlotsExhausted = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:sorcerer-created-slot-spend"),
        build: sorcererMetamagicBuild(),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        spellSlotExpenditures: [
          { spellLevel: spellSlotLevel(3), expended: resourceCount(2) },
        ],
      }),
    );
    const createdAfterOrdinaryExhausted = expectRight(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet: ordinarySlotsExhausted,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    );
    const twoCreatedSlotLevels = expectRight(
      replaceCharacterSheetSpellSlotSourceState({
        sheet: createdAfterOrdinaryExhausted,
        unitLibrary,
        spellSlotState: {
          ordinarySpellSlotExpenditures: [
            { spellLevel: spellSlotLevel(3), expended: resourceCount(2) },
          ],
          createdSpellSlots: [
            {
              spellLevel: spellSlotLevel(2),
              count: resourceCount(1),
              expended: resourceCount(0),
            },
            {
              spellLevel: spellSlotLevel(3),
              count: resourceCount(1),
              expended: resourceCount(0),
            },
          ],
        },
      }),
    );
    const createdSlotSpent = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet: twoCreatedSlotLevels,
        unitLibrary,
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:sorcerer-created-slot-spend"),
            spellcasting: {
              spellcastingSource: {
                tag: "classSpellcasting",
                className: "sorcerer",
                abilityModifier: abilityModifier(3),
              },
              proficiencyBonus: proficiencyBonus(3),
              canCastSpells: true,
              pactOfTheChainFindFamiliarInvocationMode: null,
              spellSlots: [
                {
                  spellLevel: spellSlotLevel(1),
                  count: resourceCount(4),
                  expended: resourceCount(0),
                },
                {
                  spellLevel: spellSlotLevel(2),
                  count: resourceCount(4),
                  expended: resourceCount(0),
                },
                {
                  spellLevel: spellSlotLevel(3),
                  count: resourceCount(3),
                  expended: resourceCount(3),
                },
              ],
            },
          },
          hp: Hp(24),
          maxHp: sheetMaximumHp(twoCreatedSlotLevels),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    );
    expect(characterSheetSpellSlotSourceState(createdSlotSpent)).toEqual({
      ordinarySpellSlotExpenditures: [
        { spellLevel: spellSlotLevel(3), expended: resourceCount(2) },
      ],
      createdSpellSlots: [
        {
          spellLevel: spellSlotLevel(2),
          count: resourceCount(1),
          expended: resourceCount(0),
        },
        {
          spellLevel: spellSlotLevel(3),
          count: resourceCount(1),
          expended: resourceCount(1),
        },
      ],
    });
  });

  test("keeps Font of Magic Spell Slot creation at the Character Sheet boundary during battle", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:sorcerer-font-battle-closed"),
        build: sorcererMetamagicBuild(),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const created = expectRight(
      convertFontOfMagicSorceryPointsToSpellSlot({
        sheet,
        unitLibrary,
        spellLevel: spellSlotLevel(3),
      }),
    );
    const combatantIdValue = combatantId(
      "combatant:sorcerer-font-battle-closed",
    );
    const init = expectRight(
      characterSheetBattleInit({
        sheet: created,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantIdValue,
        displayName: "Sorcerer",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    const state = expectRight(
      startBattle({
        battleId: battleId("character-sheet-sorcerer-font-battle-closed"),
        combatants: [
          init,
          battleCreatureInitFromStatBlock({
            combatantId: combatantId(
              "combatant:sorcerer-font-battle-closed-skeleton",
            ),
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(10),
          }),
        ],
      }),
    );

    const sorcerer = state.state.combatants.get(combatantIdValue);
    if (sorcerer?.origin.kind !== "character") {
      throw new Error("Expected character-origin Sorcerer combatant.");
    }
    expect(sorcerer.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 3, expended: 0 },
    ]);
    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          battleActUnitPresentation(act)?.unitId === "sorcerer_font_of_magic",
      ),
    ).toBe(false);
  });

  test("bridges Metamagic facts through the shared Font of Magic point pool", () => {
    const characterSheetIdValue = characterSheetId(
      "character:sorcerer-metamagic-battle",
    );
    const sorcererCombatantId = combatantId("combatant:sorcerer-metamagic");
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetIdValue,
        build: sorcererMetamagicBuild(),
        currentHp: Hp(24),
        tempHp: Hp(0),
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: authoredUnitId("sorcerer_font_of_magic"),
            expended: resourceCount(1),
          },
        ],
      }),
    );

    const characterInit = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: sorcererCombatantId,
        displayName: "Sorcerer",
        initiative: initiativeScore(12),
        ammunitionStocks: [],
      }),
    );
    if (characterInit.creatureInit.kind !== "character") {
      throw new Error("Expected character battle creature init.");
    }
    expect(characterInit.creatureInit.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "sorcerer_font_of_magic" }),
          pointsRemaining: resourceCount(4),
        }),
      ]),
    );
    expect(characterInit.creatureInit.resources).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "sorcerer_metamagic" }),
        }),
      ]),
    );
    expect(characterInit.creatureInit.metamagic).toEqual({
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [
        {
          effectKind: "damage_dice_reroll",
          stackingMode: "can_combine_with_different_metamagic",
          sorceryPointCost: resourceCount(1),
        },
        {
          effectKind: "saving_throw_disadvantage",
          stackingMode: "one_per_spell",
          sorceryPointCost: resourceCount(2),
        },
      ],
    });

    const battle = expectRight(
      startBattle({
        battleId: battleId("character-sheet-sorcerer-metamagic"),
        combatants: [
          characterInit,
          battleCreatureInitFromStatBlock({
            combatantId: combatantId("combatant:skeleton-metamagic"),
            statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
            initiative: initiativeScore(10),
          }),
        ],
      }),
    );
    const sorcerer = battle.state.combatants.get(sorcererCombatantId);
    if (sorcerer?.origin.kind !== "character") {
      throw new Error("Expected Sorcerer character combatant.");
    }
    const sorceryPoints = sorcerer.origin.resources.find(
      characterBattleResourceIsPointPool,
    );
    if (sorceryPoints === undefined) {
      throw new Error("Expected shared Sorcery Point point-pool resource.");
    }
    const spentSorceryPoints = expectRight(
      spendCharacterPointPoolResource({
        resource: sorceryPoints,
        points: resourceCount(2),
      }),
    );
    const spentSorcerer = handoffBranchCombatant({
      combatantId: sorcererCombatantId,
      hp: characterSheetCurrentHp(sheet),
      maxHp: expectRight(characterSheetHitPointMaximum({ sheet, unitLibrary })),
      tempHp: characterSheetTempHp(sheet),
      positiveHpUnconscious: null,
      origin: {
        ...sorcerer.origin,
        resources: sorcerer.origin.resources.map((resource) =>
          resource.resourcePoolRef === spentSorceryPoints.resourcePoolRef
            ? spentSorceryPoints
            : resource,
        ),
      },
    });

    const handoff = expectRight(
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        context: battle.context,
        combatant: spentSorcerer,
      }),
    );
    expect(handoff.resourceExpenditures).toContainEqual({
      tag: "pointPoolResource",
      unitId: "sorcerer_font_of_magic",
      expended: resourceCount(3),
    });

    const malformedMetamagicBuild = {
      ...sorcererMetamagicBuild(),
      features: sorcererMetamagicBuild().features.map((feature) =>
        feature.kind === "selectedSorcererMetamagicOption"
          ? {
              ...feature,
              selectedFromUnitId: authoredUnitId(
                "synthetic:missing-metamagic-source",
              ),
            }
          : feature,
      ),
    } satisfies CharacterBuild;
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("malformed-metamagic-init"),
        characterId: characterId("character:malformed-metamagic-init"),
        displayName: "Malformed Metamagic Sorcerer",
        build: malformedMetamagicBuild,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Metamagic known option count must match the Sorcerer level.",
      },
    });
  });

  test("preserves sheet-owned healing resource expenditures", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:paladin-handoff"),
      build: paladinBuild(),
      currentHp: Hp(9),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures: [
        { tag: "layOnHandsHealingPool", expended: resourceCount(3) },
      ],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:paladin-handoff"),
        },
        hp: Hp(9),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      { tag: "layOnHandsHealingPool", expended: 3 },
    ]);
  });

  test("persists Favored Enemy free-cast spends for the next battle before Long Rest", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:ranger-handoff"),
      build: favoredEnemyRangerResourceBuild(),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    const favoredEnemyResource = characterBattleResourceForUnit(favoredEnemy);
    expect(hasFixedCharacterBattleResourceCap(favoredEnemyResource)).toBe(true);
    if (!hasFixedCharacterBattleResourceCap(favoredEnemyResource)) return;
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("favored-enemy");
    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: favoredEnemy,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ranger-handoff"),
          classLevels: parsedClassLevelsForTest("ranger", 1),
          resources: [
            {
              resourcePoolRef,
              resource: favoredEnemyResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(1),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      {
        tag: "spellAccessFreeCast",
        sourceUnitId: authoredUnitId("ranger_favored_enemy"),
        spellId: authoredUnitId("hunters_mark"),
        expended: 1,
      },
    ]);

    const nextBattleResources = expectRight(
      characterBattleResourceInitsFromBuild(
        settled.build,
        unitLibrary,
        settled.resourceExpenditures,
      ),
    );

    expect(nextBattleResources).toContainEqual(
      expect.objectContaining({
        unit: favoredEnemy,
        usesRemaining: 1,
      }),
    );
  });

  test("rejects Favored Enemy battle handoff when free-cast capacity drifts", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:ranger-free-cast-drift"),
      build: favoredEnemyRangerResourceBuild(),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    const favoredEnemyResource = characterBattleResourceForUnit(favoredEnemy);
    expect(hasFixedCharacterBattleResourceCap(favoredEnemyResource)).toBe(true);
    if (!hasFixedCharacterBattleResourceCap(favoredEnemyResource)) return;
    const resourcePoolRef = battleResourcePoolExecutionRefForTest(
      "drifted-favored-enemy",
    );
    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: favoredEnemy,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ranger-free-cast-drift"),
          classLevels: parsedClassLevelsForTest("ranger", 1),
          resources: [
            {
              resourcePoolRef,
              resource: {
                ...favoredEnemyResource,
                cap: {
                  ...favoredEnemyResource.cap,
                  uses: resourceCount(favoredEnemyResource.cap.uses + 1),
                },
              },
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(1),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spell Access free-cast battle capacity must match Character Sheet resource capacity.",
      },
    });
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: favoredEnemy,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:ranger-free-cast-drift"),
            classLevels: parsedClassLevelsForTest("ranger", 1),
            resources: [
              {
                resourcePoolRef,
                resource: favoredEnemyResource,
                usedThisTurn: false,
                usesRemaining: resourceCount(favoredEnemyResource.cap.uses + 1),
              },
            ],
          },
          hp: Hp(1),
          maxHp: sheetMaximumHp(sheet.right),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spell Access free-cast remaining uses exceed the battle resource cap during battle handoff.",
      },
    });
  });

  test("hands shared Monk Focus use-count expenditures into and out of battle", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:monk-focus-handoff"),
      build: monkBuild({ level: 2, str: 12, dex: 16 }),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures: [
        {
          tag: "useCountResource",
          unitId: authoredUnitId("monk_monks_focus"),
          expended: resourceCount(1),
        },
      ],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const focusUnit = unitLibrary.requireUnit("monk_monks_focus");
    const focusResource = characterBattleResourceForUnit(focusUnit);
    if (!hasLimitedCharacterBattleResourceCap(focusResource)) {
      throw new Error("Expected finite Monk Focus resource.");
    }
    const nextBattleResources = expectRight(
      characterBattleResourceInitsFromBuild(
        sheet.right.build,
        unitLibrary,
        sheet.right.resourceExpenditures,
      ),
    );
    expect(nextBattleResources).toContainEqual(
      expect.objectContaining({
        unit: focusUnit,
        usesRemaining: 1,
      }),
    );
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("focus-expended");

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: focusUnit,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:monk-focus-handoff"),
          classLevels: parsedClassLevelsForTest("monk", 2),
          resources: [
            {
              resourcePoolRef,
              resource: focusResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(0),
            },
          ],
        },
        hp: Hp(15),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(expectRight(handoff).resourceExpenditures).toEqual([
      {
        tag: "useCountResource",
        unitId: "monk_monks_focus",
        expended: 2,
      },
    ]);
  });

  test("rejects Monk Focus battle handoff when use-count capacity drifts", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:monk-focus-capacity-drift"),
      build: monkBuild({ level: 2, str: 12, dex: 16 }),
      currentHp: Hp(15),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const focusUnit = unitLibrary.requireUnit(MONK_MONKS_FOCUS_UNIT_ID);
    if (!isClassFeatureWithUseCountResource(focusUnit)) {
      throw new Error("Expected Monk Focus to carry a use-count resource.");
    }
    const driftedFocusUnit = unitWithUseCountCap(focusUnit, {
      kind: "fixed",
      uses: resourceCount(3),
    });
    const driftedFocusResource =
      characterBattleResourceForUnit(driftedFocusUnit);
    if (!hasLimitedCharacterBattleResourceCap(driftedFocusResource)) {
      throw new Error("Expected finite drifted Monk Focus resource.");
    }
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("drifted-focus");

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: driftedFocusUnit,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:monk-focus-capacity-drift"),
          classLevels: parsedClassLevelsForTest("monk", 2),
          resources: [
            {
              resourcePoolRef,
              resource: driftedFocusResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(15),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count battle capacity must match Character Sheet resource capacity.",
      },
    });
    const focusResource = characterBattleResourceForUnit(focusUnit);
    if (!hasLimitedCharacterBattleResourceCap(focusResource)) {
      throw new Error("Expected finite Monk Focus resource.");
    }
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: focusUnit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:monk-focus-capacity-drift"),
            classLevels: parsedClassLevelsForTest("monk", 2),
            resources: [
              {
                resourcePoolRef,
                resource: focusResource,
                usedThisTurn: false,
                usesRemaining: resourceCount(3),
              },
            ],
          },
          hp: Hp(15),
          maxHp: sheetMaximumHp(sheet.right),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count remaining uses exceed the battle resource cap during battle handoff.",
      },
    });
  });

  test("hands Uncanny Metabolism Focus recovery and HP restoration into battle", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:monk-uncanny-handoff"),
      build: monkBuild({ level: 2, str: 12, dex: 16 }),
      currentHp: Hp(7),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures: [
        {
          tag: "useCountResource",
          unitId: MONK_MONKS_FOCUS_UNIT_ID,
          expended: resourceCount(2),
        },
      ],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const recovered = expectRight(
      useMonkUncannyMetabolismWhenRollingInitiative({
        sheet: sheet.right,
        unitLibrary,
        martialArtsRoll: DieRollResult(4),
      }),
    );
    expect(characterSheetCurrentHp(recovered)).toBe(13);
    expect(recovered.resourceExpenditures).toEqual([]);
    expect(recovered.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);

    const focusUnit = unitLibrary.requireUnit(MONK_MONKS_FOCUS_UNIT_ID);
    const focusResource = characterBattleResourceForUnit(focusUnit);
    if (!hasLimitedCharacterBattleResourceCap(focusResource)) {
      throw new Error("Expected finite Monk Focus resource.");
    }
    const init = expectRight(
      characterSheetBattleInit({
        sheet: recovered,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantId("combatant:monk-uncanny-handoff"),
        displayName: "Monk",
        initiative: initiativeScore(16),
        ammunitionStocks: [],
      }),
    );
    if (init.creatureInit.kind !== "character") {
      throw new Error("Expected character battle creature init.");
    }
    const initFocusResource = init.creatureInit.resources?.find(
      (resource) => resource.unit.id === MONK_MONKS_FOCUS_UNIT_ID,
    );
    expect(init.creatureInit.currentHp).toBe(13);
    expect(initFocusResource).toEqual(
      expect.objectContaining({ unit: focusUnit }),
    );
    expect(initFocusResource).not.toHaveProperty("usesRemaining");
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("focus-recovered");

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: recovered,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: focusUnit,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:monk-uncanny-handoff"),
          classLevels: parsedClassLevelsForTest("monk", 2),
          resources: [
            {
              resourcePoolRef,
              resource: focusResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(13),
        maxHp: sheetMaximumHp(recovered),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });
    const afterBattle = expectRight(handoff);

    expect(afterBattle.restFeatureUses).toEqual([
      { tag: "uncannyMetabolism", usedSinceLongRest: true },
    ]);
    expect(afterBattle.resourceExpenditures).toEqual([
      {
        tag: "useCountResource",
        unitId: MONK_MONKS_FOCUS_UNIT_ID,
        expended: 1,
      },
    ]);
  });

  test("rejects Sorcery Point handoff when point-pool capacity drifts", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:sorcery-point-capacity-drift"),
      build: sorcererMetamagicBuild(),
      currentHp: Hp(24),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const fontOfMagicUnit = unitLibrary.requireUnit("sorcerer_font_of_magic");
    if (!isClassFeatureWithPointPoolResource(fontOfMagicUnit)) {
      throw new Error("Expected Font of Magic to carry a point-pool resource.");
    }
    const driftedFontOfMagicUnit = unitWithPointPoolCap(fontOfMagicUnit, {
      kind: "fixed",
      uses: resourceCount(7),
    });
    const driftedFontOfMagicResource = characterBattleResourceForUnit(
      driftedFontOfMagicUnit,
    );
    if (driftedFontOfMagicResource.kind !== "point_pool") {
      throw new Error("Expected drifted Font of Magic point-pool resource.");
    }
    const resourcePoolRef = battleResourcePoolExecutionRefForTest(
      "drifted-font-of-magic",
    );

    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: driftedFontOfMagicUnit,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sorcery-point-capacity-drift"),
          classLevels: parsedClassLevelsForTest("sorcerer", 5),
          resources: [
            {
              resourcePoolRef,
              resource: driftedFontOfMagicResource,
              pointsRemaining: resourceCount(5),
            },
          ],
        },
        hp: Hp(24),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature point-pool battle capacity must match Character Sheet resource capacity.",
      },
    });
    const fontOfMagicResource = characterBattleResourceForUnit(fontOfMagicUnit);
    if (fontOfMagicResource.kind !== "point_pool") {
      throw new Error("Expected Font of Magic point-pool resource.");
    }
    expect(
      settleHandoffBranchToCharacterSheet({
        sheet: sheet.right,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef,
            unit: fontOfMagicUnit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:sorcery-point-capacity-drift"),
            classLevels: parsedClassLevelsForTest("sorcerer", 5),
            resources: [
              {
                resourcePoolRef,
                resource: fontOfMagicResource,
                pointsRemaining: resourceCount(6),
              },
            ],
          },
          hp: Hp(24),
          maxHp: sheetMaximumHp(sheet.right),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature point-pool remaining points exceed the battle resource cap during battle handoff.",
      },
    });
  });

  test("persists Paladin's Smite free-cast spends for the next battle before Long Rest", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:paladin-smite-handoff"),
      build: paladinsSmitePaladinBuild(),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const paladinsSmite = unitLibrary.requireUnit("paladin_paladins_smite");
    const paladinsSmiteResource = characterBattleResourceForUnit(paladinsSmite);
    expect(hasFixedCharacterBattleResourceCap(paladinsSmiteResource)).toBe(
      true,
    );
    if (!hasFixedCharacterBattleResourceCap(paladinsSmiteResource)) return;
    const resourcePoolRef =
      battleResourcePoolExecutionRefForTest("paladins-smite");
    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: paladinsSmite,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:paladin-smite-handoff"),
          classLevels: parsedClassLevelsForTest("paladin", 2),
          resources: [
            {
              resourcePoolRef,
              resource: paladinsSmiteResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(0),
            },
          ],
        },
        hp: Hp(1),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      {
        tag: "spellAccessFreeCast",
        sourceUnitId: authoredUnitId("paladin_paladins_smite"),
        spellId: authoredUnitId("divine_smite"),
        expended: 1,
      },
    ]);

    const nextBattleResources = expectRight(
      characterBattleResourceInitsFromBuild(
        settled.build,
        unitLibrary,
        settled.resourceExpenditures,
      ),
    );

    expect(nextBattleResources).toContainEqual(
      expect.objectContaining({
        unit: paladinsSmite,
        usesRemaining: 0,
      }),
    );
  });

  test("rejects Favored Enemy battle handoff when free-cast cap shape is unsupported", () => {
    const sheet = rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:ranger-handoff-scaling"),
      build: favoredEnemyRangerResourceBuild(),
      currentHp: Hp(1),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    const favoredEnemyResource = characterBattleResourceForUnit(favoredEnemy);
    expect(hasLimitedCharacterBattleResourceCap(favoredEnemyResource)).toBe(
      true,
    );
    if (!hasLimitedCharacterBattleResourceCap(favoredEnemyResource)) return;
    const resourcePoolRef = battleResourcePoolExecutionRefForTest(
      "threshold-favored-enemy",
    );
    const handoff = settleHandoffBranchToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      resourceOwnership: [
        {
          resourcePoolRef,
          unit: favoredEnemy,
          purpose: { tag: "unitResource" },
        },
      ],
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ranger-handoff-scaling"),
          classLevels: parsedClassLevelsForTest("ranger", 1),
          resources: [
            {
              resourcePoolRef,
              resource: {
                ...favoredEnemyResource,
                cap: {
                  kind: "threshold_tiers",
                  axis: "class",
                  base: 2,
                  tiers: [{ atLevel: 5, value: 3 }],
                },
              },
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(1),
        maxHp: sheetMaximumHp(sheet.right),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toEqual(
      Either.left({
        tag: "characterSheetBattleHandoffIssue",
        message:
          "Spell Access free casts must use a fixed battle resource cap during battle handoff.",
      }),
    );
  });

  test("rejects battle resources absent from the Character Sheet resource projection", () => {
    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:foreign-battle-resource"),
        build,
        currentHp: Hp(10),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const settle = (
      unit: UnitRecord,
      resource: CharacterBattleResourceState,
      classLevels: CharacterBattleClassLevels,
    ) =>
      settleHandoffBranchToCharacterSheet({
        sheet,
        unitLibrary,
        resourceOwnership: [
          {
            resourcePoolRef: resource.resourcePoolRef,
            unit,
            purpose: { tag: "unitResource" },
          },
        ],
        combatant: handoffBranchCombatant({
          origin: {
            kind: "character",
            characterId: characterId("character:foreign-battle-resource"),
            classLevels,
            resources: [resource],
          },
          hp: Hp(10),
          maxHp: sheetMaximumHp(sheet),
          tempHp: Hp(0),
          positiveHpUnconscious: null,
        }),
      });

    const fontOfMagic = unitLibrary.requireUnit("sorcerer_font_of_magic");
    if (!isClassFeatureWithPointPoolResource(fontOfMagic)) {
      throw new Error("Expected Font of Magic to carry a point-pool resource.");
    }
    const fontOfMagicResource = characterBattleResourceForUnit(fontOfMagic);
    if (fontOfMagicResource.kind !== "point_pool") {
      throw new Error("Expected Font of Magic point-pool resource.");
    }
    expect(
      settle(
        fontOfMagic,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "foreign-font-of-magic",
          ),
          resource: fontOfMagicResource,
          pointsRemaining: resourceCount(5),
        },
        parsedClassLevelsForTest("sorcerer", 5),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature point-pool battle resource requires matching Character Sheet resource capacity.",
      },
    });
    expect(
      settle(
        fontOfMagic,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "font-of-magic-without-sorcerer-levels",
          ),
          resource: fontOfMagicResource,
          pointsRemaining: resourceCount(5),
        },
        parsedClassLevelsForTest("monk", 5),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature battle resources require a matching class level during battle handoff.",
      },
    });

    const monksFocus = unitLibrary.requireUnit(MONK_MONKS_FOCUS_UNIT_ID);
    const monksFocusResource = characterBattleResourceForUnit(monksFocus);
    if (!hasLimitedCharacterBattleResourceCap(monksFocusResource)) {
      throw new Error("Expected finite Monk Focus resource.");
    }
    const fontIdentityWithUseCountMechanics = {
      ...monksFocus,
      id: fontOfMagic.id,
      name: "Synthetic Point-Pool Ownership Mismatch",
      provenance: fontOfMagic.provenance,
    } satisfies UnitRecord;
    expect(
      settle(
        fontIdentityWithUseCountMechanics,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "point-pool-ownership-mechanics-mismatch",
          ),
          resource: fontOfMagicResource,
          pointsRemaining: resourceCount(5),
        },
        parsedClassLevelsForTest("monk", 5),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature point-pool resources must carry finite remaining points during battle handoff.",
      },
    });
    expect(
      settle(
        monksFocus,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "foreign-monks-focus",
          ),
          resource: monksFocusResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(2),
        },
        parsedClassLevelsForTest("monk", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count battle resource requires matching Character Sheet resource capacity.",
      },
    });
    expect(
      settle(
        monksFocus,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "monks-focus-without-monk-levels",
          ),
          resource: monksFocusResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(2),
        },
        parsedClassLevelsForTest("fighter", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature battle resources require a matching class level during battle handoff.",
      },
    });
    const unlimitedFocusResource = {
      ...monksFocusResource,
      cap: { kind: "unlimited" as const },
    };
    expect(
      settle(
        monksFocus,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "unlimited-monks-focus",
          ),
          resource: unlimitedFocusResource,
          usedThisTurn: false,
        },
        parsedClassLevelsForTest("monk", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count resources must carry finite remaining uses during battle handoff.",
      },
    });

    const paladinsSmite = unitLibrary.requireUnit("paladin_paladins_smite");
    const paladinsSmiteResource = characterBattleResourceForUnit(paladinsSmite);
    if (!hasFixedCharacterBattleResourceCap(paladinsSmiteResource)) {
      throw new Error("Expected fixed Paladin's Smite resource.");
    }
    expect(
      settle(
        paladinsSmite,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "foreign-paladins-smite",
          ),
          resource: paladinsSmiteResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(1),
        },
        parsedClassLevelsForTest("paladin", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Spell Access free-cast battle resource requires matching Character Sheet resource capacity.",
      },
    });
    expect(
      settle(
        paladinsSmite,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "paladins-smite-without-paladin-levels",
          ),
          resource: paladinsSmiteResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(1),
        },
        parsedClassLevelsForTest("fighter", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature battle resources require a matching class level during battle handoff.",
      },
    });

    const wildShape = unitLibrary.requireUnit("druid_wild_shape");
    const wildShapeResource = characterBattleResourceForUnit(wildShape);
    if (!hasLimitedCharacterBattleResourceCap(wildShapeResource)) {
      throw new Error("Expected finite Druid Wild Shape resource.");
    }
    expect(
      settle(
        wildShape,
        {
          resourcePoolRef:
            battleResourcePoolExecutionRefForTest("foreign-wild-shape"),
          resource: wildShapeResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(2),
        },
        parsedClassLevelsForTest("druid", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Class feature use-count battle resource requires matching Character Sheet resource capacity.",
      },
    });

    const syntheticWildShape = {
      ...wildShape,
      id: authoredUnitId("synthetic_wild_shape"),
      name: "Synthetic Shape Change",
    } satisfies UnitRecord;
    const syntheticWildShapeResource =
      characterBattleResourceForUnit(syntheticWildShape);
    if (!hasLimitedCharacterBattleResourceCap(syntheticWildShapeResource)) {
      throw new Error("Expected finite synthetic shape-change resource.");
    }
    expect(
      settle(
        syntheticWildShape,
        {
          resourcePoolRef: battleResourcePoolExecutionRefForTest(
            "synthetic-wild-shape",
          ),
          resource: syntheticWildShapeResource,
          usedThisTurn: false,
          usesRemaining: resourceCount(2),
        },
        parsedClassLevelsForTest("druid", 2),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
      },
    });
  });
});

describe("Character Build battle projection", () => {
  test("reports invalid build-to-battle creature boundary facts", () => {
    const init = {
      combatantId: combatantId("invalid-build-boundary"),
      characterId: characterId("character:invalid-build-boundary"),
      displayName: "Invalid boundary",
      build,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      unitLibrary,
    } as const;

    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        hitPointMaximum: Hp(0),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("max HP must be positive") },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        currentHp: Hp(13),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("current HP exceeds max HP") },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          species: authoredUnitId("synthetic:missing-species"),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Cannot find species Unit: synthetic:missing-species",
        ),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          species: authoredUnitId("class_fighter"),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Cannot read species Unit class_fighter: unsupported Unit kind",
        ),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          species: authoredUnitId("species_human"),
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("requires selected species size"),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          species: authoredUnitId("species_human"),
          speciesSize: "small",
        },
      }),
    ).toMatchObject({
      _tag: "Right",
      right: { creatureInit: { size: "small" } },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          progression: {
            startingClass: classUnitId(
              authoredUnitId("synthetic:missing-class"),
            ),
            advancements: [],
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Cannot find class Unit") },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        druidWildShapeAvailableForms: [
          statBlockCatalog.requireStatBlock("stat_block_rat"),
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "available forms require the Druid Wild Shape feature",
        ),
      },
    });
    expect(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("battle:invalid-build-boundary"),
        character: {
          ...init,
          hitPointMaximum: Hp(0),
        },
        statBlockBattleInput: {
          combatantId: combatantId("invalid-build-boundary-stat-block"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(5),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("max HP must be positive") },
    });

    const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
    expect(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("battle:invalid-stat-block-boundary"),
        character: init,
        statBlockBattleInput: {
          combatantId: combatantId("invalid-stat-block-boundary"),
          statBlock: {
            ...skeleton,
            statBlock: {
              ...skeleton.statBlock,
              hp: {
                kind: "caster_derived",
                source: "proficiency_bonus",
              },
            },
          },
          initiative: initiativeScore(5),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Battle runtime requires literal Stat Block maximum HP.",
      },
    });
  });

  test("reports missing Units referenced by armor and weapon projections", () => {
    const missingUnitId = authoredUnitId("synthetic:missing-equipment-unit");
    const missingItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(characterEquipmentItemUnitId(missingUnitId)),
    });
    const missingOffHandItemId = characterEquipmentItemId({
      slot: "off",
      unitId: expectRight(characterEquipmentItemUnitId(missingUnitId)),
    });
    const missingArmorItemId = characterEquipmentItemId({
      slot: "armor",
      unitId: expectRight(characterEquipmentItemUnitId(missingUnitId)),
    });
    const missingEquipmentBuild = {
      ...build,
      equipment: {
        owned: [
          characterBuildCatalogEquipmentItem({
            itemId: missingItemId,
          }),
          characterBuildCatalogEquipmentItem({
            itemId: missingOffHandItemId,
          }),
        ],
        loadout: {
          weapon: { itemId: missingItemId, grip: "one_handed" },
          offHandWeapon: { itemId: missingOffHandItemId },
        },
      },
    } satisfies CharacterBuild;
    expect(
      characterAttackActionOption(missingEquipmentBuild, unitLibrary),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterBaseUnarmedStrikeActionOption(
        missingEquipmentBuild,
        unitLibrary,
      ),
    ).toMatchObject({ _tag: "Right" });
    expect(
      characterBaseUnarmedStrikeActionOption(missingEquipmentBuild),
    ).toMatchObject({
      _tag: "Right",
      right: {
        kind: "unarmedStrike",
        attackAbility: "str",
      },
    });
    expect(
      characterOffHandAttackActionOption(missingEquipmentBuild, unitLibrary),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });

    expect(
      characterArmorClassState({
        build: {
          ...build,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
              unitId: authoredUnitId("synthetic:missing-armor-feature"),
            },
          ],
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterBaseUnarmedStrikeActionOption(
        {
          ...build,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
              unitId: authoredUnitId("synthetic:missing-martial-feature"),
            },
          ],
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    const daggerItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(
        characterEquipmentItemUnitId(authoredUnitId("weapon_dagger")),
      ),
    });
    expect(
      characterAttackActionOption(
        {
          ...build,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
              unitId: authoredUnitId("synthetic:missing-martial-feature"),
            },
          ],
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: daggerItemId,
              }),
            ],
            loadout: {
              weapon: { itemId: daggerItemId, grip: "one_handed" },
            },
          },
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });

    const nonWeaponItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(
        characterEquipmentItemUnitId(authoredUnitId("armor_chain_mail")),
      ),
    });
    expect(
      characterAttackActionOption(
        {
          ...build,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: nonWeaponItemId,
              }),
            ],
            loadout: {
              weapon: { itemId: nonWeaponItemId, grip: "one_handed" },
            },
          },
        },
        unitLibrary,
      ),
    ).toEqual(Either.right(null));

    const init = {
      combatantId: combatantId("missing-projection-unit"),
      characterId: characterId("character:missing-projection-unit"),
      displayName: "Missing projection Unit",
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      unitLibrary,
    } as const;
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: missingEquipmentBuild,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("Unknown Character Build Unit"),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: missingOffHandItemId,
              }),
            ],
            loadout: { offHandWeapon: { itemId: missingOffHandItemId } },
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("Unknown Character Build Unit"),
      },
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        ...init,
        build: {
          ...build,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: missingArmorItemId,
              }),
            ],
            loadout: { armor: missingArmorItemId },
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterPactBladeBondedWeaponItemId({
        build: {
          ...pactBladeInvocationBuild(authoredUnitId("weapon_longsword")),
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: missingItemId,
              }),
            ],
            loadout: {
              weapon: { itemId: missingItemId, grip: "one_handed" },
            },
          },
        },
        unitLibrary,
        itemId: missingItemId,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
  });

  test("reports unreadable Shielded and unshielded Armor Class base choices", () => {
    const unreadableChoice = {
      kind: "class_feature",
      unitId: authoredUnitId("synthetic:missing-armor-class-base"),
    } as const;

    expect(
      characterUnarmoredArmorClassBases({
        build,
        unitLibrary,
        shieldedBaseChoice: unreadableChoice,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Selected Armor Class base formula is not available." },
    });
    expect(
      characterUnarmoredArmorClassBases({
        build,
        unitLibrary,
        unshieldedBaseChoice: unreadableChoice,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Selected Armor Class base formula is not available." },
    });
  });

  test("reports every malformed Magic Initiate source instead of dropping access grants", () => {
    const validAccess = magicInitiateMonkBuild().magicInitiateSpellAccesses[0];
    if (validAccess === undefined) {
      throw new Error("Expected Magic Initiate access fixture.");
    }
    const result = characterSpellcasting({
      build: {
        ...magicInitiateMonkBuild(),
        magicInitiateSpellAccesses: [
          validAccess,
          { ...validAccess, featUnitId: authoredUnitId("class_fighter") },
          {
            ...validAccess,
            featUnitId: authoredUnitId("synthetic:missing-magic-initiate"),
          },
        ],
      },
      unitLibrary,
      resourceExpenditures: [],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toContain("class_fighter");
      expect(result.left.message).toContain("synthetic:missing-magic-initiate");
      expect(result.left.spellAccessIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            accessIndex: 1,
            featUnitId: authoredUnitId("class_fighter"),
            cause: "invalidSpellSelection",
          }),
          expect.objectContaining({
            accessIndex: 2,
            featUnitId: authoredUnitId("synthetic:missing-magic-initiate"),
            cause: "invalidSpellSelection",
          }),
        ]),
      );
    }
  });

  test("reports a missing canonical Magic Initiate spell list source", () => {
    const result = characterSpellcasting({
      build: magicInitiateMonkBuild(),
      unitLibrary: {
        getUnit: (id) =>
          id === "class_wizard" ? Option.none() : unitLibrary.getUnit(id),
        listUnits: () =>
          unitLibrary.listUnits().filter((unit) => unit.id !== "class_wizard"),
        requireUnit: (id) => unitLibrary.requireUnit(id),
      },
      resourceExpenditures: [],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toContain("selected spell list");
      expect(result.left.spellAccessIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ cause: "invalidBuildSpellAccess" }),
        ]),
      );
    }
  });

  test("reports missing and contradictory spellcasting projections", () => {
    expect(
      characterSpellcasting({ build, unitLibrary, resourceExpenditures: [] }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Character build does not have spellcasting." },
    });

    const wizard = trueStrikeWizardBuild();
    const wizardSpellcasting = wizard.spellcasting;
    if (wizardSpellcasting === undefined) {
      throw new Error("Expected Wizard spellcasting fixture.");
    }
    const [wizardSource] = wizardSpellcasting.sources;
    if (wizardSource === undefined) {
      throw new Error("Expected Wizard spellcasting source fixture.");
    }
    expect(
      characterSpellcasting({
        build: {
          ...wizard,
          spellcasting: {
            ...wizardSpellcasting,
            sources: [
              {
                ...wizardSource,
                cantrips: [authoredUnitId("synthetic:missing-cantrip")],
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterSpellcasting({
        build: {
          ...wizard,
          spellcasting: {
            ...wizardSpellcasting,
            sources: [
              {
                ...wizardSource,
                preparedSpells: [
                  authoredUnitId("synthetic:missing-prepared-spell"),
                ],
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    const missingCantripId = authoredUnitId("synthetic:missing-cantrip");
    const missingPreparedSpellId = authoredUnitId(
      "synthetic:missing-prepared-spell",
    );
    const missingBothSpellKinds = characterSpellcasting({
      build: {
        ...wizard,
        spellcasting: {
          ...wizardSpellcasting,
          sources: [
            {
              ...wizardSource,
              cantrips: [missingCantripId],
              preparedSpells: [missingPreparedSpellId],
            },
          ],
        },
      },
      unitLibrary,
    });
    expect(missingBothSpellKinds).toMatchObject({ _tag: "Left" });
    if (Either.isLeft(missingBothSpellKinds)) {
      expect(missingBothSpellKinds.left.message).toContain(missingCantripId);
      expect(missingBothSpellKinds.left.message).toContain(
        missingPreparedSpellId,
      );
    }
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("missing-spellcasting-unit"),
        characterId: characterId("character:missing-spellcasting-unit"),
        displayName: "Missing spellcasting Unit",
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        build: {
          ...wizard,
          spellcasting: {
            ...wizardSpellcasting,
            sources: [
              {
                ...wizardSource,
                cantrips: [authoredUnitId("synthetic:missing-cantrip")],
              },
            ],
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("Unknown Character Build Unit"),
      },
    });

    const missingArmorUnitId = authoredUnitId(
      "synthetic:missing-spellcasting-armor",
    );
    const missingArmorItemId = characterEquipmentItemId({
      slot: "armor",
      unitId: expectRight(characterEquipmentItemUnitId(missingArmorUnitId)),
    });
    expect(
      characterSpellcasting({
        build: {
          ...wizard,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: missingArmorItemId,
              }),
            ],
            loadout: { armor: missingArmorItemId },
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    const chainMailItemId = characterEquipmentItemId({
      slot: "armor",
      unitId: expectRight(
        characterEquipmentItemUnitId(authoredUnitId("armor_chain_mail")),
      ),
    });
    expect(
      expectRight(
        characterSpellcasting({
          build: {
            ...wizard,
            equipment: {
              owned: [
                characterBuildCatalogEquipmentItem({
                  itemId: chainMailItemId,
                }),
              ],
              loadout: { armor: chainMailItemId },
            },
          },
          unitLibrary,
        }),
      ),
    ).toMatchObject({ canCastSpells: false });
    expect(
      characterSpellcasting({
        build: {
          ...wizard,
          spellcasting: {
            ...wizardSpellcasting,
            sources: [
              {
                ...wizardSource,
                spellbook: [authoredUnitId("weapon_longsword")],
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Spellbook Ritual Access") },
    });
    expect(
      characterSpellcasting({
        build: wizard,
        unitLibrary: unitCatalogWithoutUnitIds("class_wizard"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("class Unit") },
    });
  });

  test("omits catalog-declared spell choices without installed Spell Definitions", () => {
    const wizard = trueStrikeWizardBuild();
    const wizardSpellcasting = wizard.spellcasting;
    if (wizardSpellcasting === undefined) {
      throw new Error("Expected Wizard spellcasting fixture.");
    }
    const [wizardSource] = wizardSpellcasting.sources;

    expect(
      characterSpellcasting({
        build: {
          ...wizard,
          spellcasting: {
            ...wizardSpellcasting,
            sources: [
              {
                ...wizardSource,
                cantrips: [
                  authoredUnitId("true_strike"),
                  authoredUnitId("mage_hand"),
                ],
                spellbook: [authoredUnitId("unseen_servant")],
                preparedSpells: [authoredUnitId("unseen_servant")],
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        cantrips: [expect.objectContaining({ id: "true_strike" })],
        preparedSpells: [],
        spellbookRitualSpellAccesses: [],
      },
    });
  });

  test("projects an empty weapon loadout and rejects a non-Weapon off-hand reference", () => {
    expect(characterAttackActionOption(build, unitLibrary)).toEqual(
      Either.right(null),
    );
    expect(characterOffHandAttackActionOption(build, unitLibrary)).toEqual(
      Either.right(undefined),
    );
    const leatherArmorUnitId = authoredUnitId("armor_leather");
    const leatherArmorItemId = characterEquipmentItemId({
      slot: "off",
      unitId: expectRight(characterEquipmentItemUnitId(leatherArmorUnitId)),
    });
    expect(
      characterOffHandAttackActionOption(
        {
          ...build,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: leatherArmorItemId,
              }),
            ],
            loadout: {
              offHandWeapon: { itemId: leatherArmorItemId },
            },
          },
        },
        unitLibrary,
      ),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message: "Off-hand weapon loadout must reference a Weapon Unit.",
      }),
    );
    expect(characterBattleLoadoutFromBuild(build)).toEqual({});
  });

  test("applies Defense Armor Class bonus while wearing eligible armor", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: true }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(17);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("does not apply Defense Armor Class bonus when no eligible armor is worn", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: false }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(12);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("threads selected Armor Class base choice through battle initialization", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk"),
        characterId: characterId("character:barbarian-monk"),
        displayName: "Barbarian Monk",
        build: multiclassUnarmoredDefenseBuild(),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        armorClassBaseChoices: {
          kind: "currentEquipment",
          choice: {
            kind: "class_feature",
            unitId: authoredUnitId("monk_unarmored_defense"),
          },
        },
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.armorClass.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(init.creatureInit.armorClass)).toBe(15);
  });

  test("retains distinct Shielded and unshielded Armor Class base choices", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk-shield-states"),
        characterId: characterId("character:barbarian-monk-shield-states"),
        displayName: "Barbarian Monk",
        build: multiclassUnarmoredDefenseBuild(),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        armorClassBaseChoices: {
          kind: "byShieldUse",
          shielded: {
            kind: "class_feature",
            unitId: authoredUnitId("barbarian_unarmored_defense"),
          },
          unshielded: {
            kind: "class_feature",
            unitId: authoredUnitId("monk_unarmored_defense"),
          },
        },
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.unarmoredArmorClassBases).toMatchObject({
      shielded: {
        source: "unarmored_defense",
        sourceUnitId: "barbarian_unarmored_defense",
      },
      unshielded: {
        source: "unarmored_defense",
        sourceUnitId: "monk_unarmored_defense",
      },
    });
  });

  test("rejects an unavailable shielded Armor Class base choice", () => {
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk-invalid-shielded-base"),
        characterId: characterId(
          "character:barbarian-monk-invalid-shielded-base",
        ),
        displayName: "Barbarian Monk",
        build: multiclassUnarmoredDefenseBuild(),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        armorClassBaseChoices: {
          kind: "byShieldUse",
          shielded: {
            kind: "class_feature",
            unitId: authoredUnitId("synthetic:missing-shielded-base"),
          },
          unshielded: {
            kind: "class_feature",
            unitId: authoredUnitId("monk_unarmored_defense"),
          },
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Selected Armor Class base formula is not available.",
      },
    });
  });

  test("selects the shield-compatible Armor Class base while using a Shield", () => {
    const shieldItemId = characterEquipmentItemId({
      slot: "shield",
      unitId: expectRight(
        characterEquipmentItemUnitId(authoredUnitId("equipment_shield")),
      ),
    });
    const shieldedInit = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk-shielded-choice"),
        characterId: characterId("character:barbarian-monk-shielded-choice"),
        displayName: "Shielded Barbarian Monk",
        build: {
          ...multiclassUnarmoredDefenseBuild(),
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: shieldItemId,
              }),
            ],
            loadout: { shield: shieldItemId },
          },
        },
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        armorClassBaseChoices: {
          kind: "byShieldUse",
          shielded: {
            kind: "class_feature",
            unitId: authoredUnitId("barbarian_unarmored_defense"),
          },
          unshielded: {
            kind: "class_feature",
            unitId: authoredUnitId("monk_unarmored_defense"),
          },
        },
      }),
    );
    expect(shieldedInit.creatureInit.kind).toBe("character");
    if (shieldedInit.creatureInit.kind !== "character") return;
    expect(shieldedInit.creatureInit.armorClass.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "barbarian_unarmored_defense",
    });
    expect(currentArmorClass(shieldedInit.creatureInit.armorClass)).toBe(15);
  });

  test("rejects a class progression whose catalog record is not a Class", () => {
    const orc = unitLibrary.requireUnit("species_orc");
    if (orc.kind !== "species") {
      throw new Error("Expected the SRD Orc fixture to be a Species.");
    }
    const classKindMismatch = {
      ...orc,
      id: authoredUnitId("class_fighter"),
      name: "Synthetic Class-Kind Mismatch",
    } satisfies UnitRecord;
    const classKindMismatchLibrary: UnitCatalog = {
      getUnit: (id) =>
        id === classKindMismatch.id
          ? Option.some(classKindMismatch)
          : unitLibrary.getUnit(id),
      listUnits: () =>
        unitLibrary
          .listUnits()
          .map((unit) =>
            unit.id === classKindMismatch.id ? classKindMismatch : unit,
          ),
      requireUnit: (id) =>
        id === classKindMismatch.id
          ? classKindMismatch
          : unitLibrary.requireUnit(id),
    };

    expect(
      characterBattleResourceInitsFromBuild(
        build,
        classKindMismatchLibrary,
        [],
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Expected class Unit: class_fighter" },
    });
  });

  test("rejects multiclass projection when distinct Class records claim the same class identity", () => {
    const fighter = unitLibrary.requireUnit("class_fighter");
    if (fighter.kind !== "class") {
      throw new Error("Expected the SRD Fighter fixture to be a Class.");
    }
    const duplicateClassUnitId = classUnitId(
      authoredUnitId("synthetic:duplicate-fighter-class"),
    );
    const duplicateClassIdentity = {
      ...fighter,
      id: duplicateClassUnitId,
      name: "Synthetic Duplicate Fighter Class",
    } satisfies UnitRecord;
    const duplicateClassIdentityLibrary: UnitCatalog = {
      getUnit: (id) =>
        id === duplicateClassIdentity.id
          ? Option.some(duplicateClassIdentity)
          : unitLibrary.getUnit(id),
      listUnits: () => [...unitLibrary.listUnits(), duplicateClassIdentity],
      requireUnit: (id) =>
        id === duplicateClassIdentity.id
          ? duplicateClassIdentity
          : unitLibrary.requireUnit(id),
    };
    const duplicateClassBuild = {
      ...build,
      progression: {
        startingClass: classUnitId(authoredUnitId("class_fighter")),
        advancements: [
          {
            classUnitId: duplicateClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" as const },
          },
        ],
      },
    } satisfies CharacterBuild;

    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("duplicate-class-identity"),
        characterId: characterId("character:duplicate-class-identity"),
        displayName: "Duplicate Class Identity",
        build: duplicateClassBuild,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary: duplicateClassIdentityLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Character class levels duplicate fighter.",
      },
    });
    expect(
      characterBattleResourceInitsFromBuild(
        duplicateClassBuild,
        duplicateClassIdentityLibrary,
        [],
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Character class levels duplicate fighter.",
      },
    });
  });

  test("does not project sheet-owned charge-pool resources into battle init", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("fighter-lay-on-hands"),
        characterId: characterId("character:fighter-lay-on-hands"),
        displayName: "Fighter With Sheet Resource",
        build: fighterWithLayOnHandsResourceBuild(),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(
      (init.creatureInit.resources ?? []).map((resource) => resource.unit.id),
    ).not.toContain("paladin_lay_on_hands");
  });

  test("rejects a Sorcery Point feature reference without Sorcerer progression", () => {
    const fontOfMagic = unitLibrary.requireUnit("sorcerer_font_of_magic");
    expect(
      characterBattleResourceInitsFromBuild(
        {
          ...build,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_fighter"),
              unitId: fontOfMagic.id,
            },
          ],
        },
        unitLibrary,
        [],
        parsedClassLevelsForTest("fighter", 1),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Font of Magic projection requires Sorcerer class progression.",
      },
    });
  });

  test("rejects a Wild Shape feature reference without Druid progression", () => {
    const wildShape = unitLibrary.requireUnit("druid_wild_shape");
    const invalidBuild = {
      ...build,
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("class_fighter"),
          unitId: wildShape.id,
        },
      ],
    };
    const expectedIssue = {
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Wild Shape projection requires Druid class progression",
        ),
      },
    };
    expect(
      characterBattleResourceInitsFromBuild(
        invalidBuild,
        unitLibrary,
        [],
        parsedClassLevelsForTest("fighter", 1),
      ),
    ).toMatchObject(expectedIssue);
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("wild-shape-without-druid"),
        characterId: characterId("character:wild-shape-without-druid"),
        displayName: "Wild Shape without Druid",
        build: invalidBuild,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    ).toMatchObject(expectedIssue);
  });

  test("rejects duplicate admitted Wild Shape resource profiles", () => {
    const wildShape = unitLibrary.requireUnit("druid_wild_shape");
    if (wildShape.kind !== "class_feature") {
      throw new Error("Expected Druid Wild Shape class feature.");
    }
    expect(
      characterBattleDruidWildShapeProjection(
        [{ unit: wildShape }, { unit: wildShape }],
        parsedClassLevelsForTest("druid", 2),
      ),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Druid Wild Shape battle initialization supports exactly one Druid Wild Shape resource.",
      }),
    );
  });

  test("rejects persisted battle resource expenditures above their caps", () => {
    for (const [candidateBuild, expenditure, message] of [
      [
        sorcererMetamagicBuild(),
        {
          tag: "pointPoolResource",
          unitId: authoredUnitId("sorcerer_font_of_magic"),
          expended: resourceCount(99),
        },
        "point-pool expenditure exceeds",
      ],
      [
        druidWildShapeBuild(),
        {
          tag: "useCountResource",
          unitId: authoredUnitId("druid_wild_shape"),
          expended: resourceCount(99),
        },
        "Druid Wild Shape expenditure exceeds",
      ],
      [
        favoredEnemyRangerBuild(),
        {
          tag: "spellAccessFreeCast",
          sourceUnitId: authoredUnitId("ranger_favored_enemy"),
          spellId: authoredUnitId("hunters_mark"),
          expended: resourceCount(99),
        },
        "free-cast expenditure exceeds",
      ],
      [
        monkBuild({ level: 2, str: 12, dex: 16 }),
        {
          tag: "useCountResource",
          unitId: authoredUnitId("monk_monks_focus"),
          expended: resourceCount(99),
        },
        "use-count expenditure exceeds",
      ],
    ] as const) {
      expect(
        characterBattleResourceInitsFromBuild(candidateBuild, unitLibrary, [
          expenditure,
        ]),
      ).toMatchObject({
        _tag: "Left",
        left: { message: expect.stringContaining(message) },
      });
    }
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("over-cap-resource-init"),
        characterId: characterId("character:over-cap-resource-init"),
        displayName: "Over-cap Sorcerer",
        build: sorcererMetamagicBuild(),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: authoredUnitId("sorcerer_font_of_magic"),
            expended: resourceCount(99),
          },
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("point-pool expenditure exceeds"),
      },
    });

    const druidMonkBuild = {
      ...druidWildShapeBuild(),
      progression: {
        startingClass: classUnitId(authoredUnitId("class_druid")),
        advancements: [
          {
            classUnitId: classUnitId(authoredUnitId("class_druid")),
            hitPointRule: { tag: "fixedHigherLevelGain" as const },
          },
          {
            classUnitId: classUnitId(authoredUnitId("class_monk")),
            hitPointRule: { tag: "fixedHigherLevelGain" as const },
          },
          {
            classUnitId: classUnitId(authoredUnitId("class_monk")),
            hitPointRule: { tag: "fixedHigherLevelGain" as const },
          },
        ],
      },
    } satisfies CharacterBuild;
    const multiplyInvalidResources = characterBattleResourceInitsFromBuild(
      druidMonkBuild,
      unitLibrary,
      [
        {
          tag: "useCountResource",
          unitId: authoredUnitId("druid_wild_shape"),
          expended: resourceCount(99),
        },
        {
          tag: "useCountResource",
          unitId: authoredUnitId("monk_monks_focus"),
          expended: resourceCount(99),
        },
      ],
    );
    expect(multiplyInvalidResources).toMatchObject({ _tag: "Left" });
    if (Either.isLeft(multiplyInvalidResources)) {
      expect(multiplyInvalidResources.left.message).toContain(
        "Druid Wild Shape expenditure exceeds",
      );
      expect(multiplyInvalidResources.left.message).toContain(
        "use-count expenditure exceeds",
      );
    }

    const barbarian = {
      ...defenseBuild({ wearingArmor: false }),
      progression: {
        startingClass: classUnitId(authoredUnitId("class_barbarian")),
        advancements: Array.from({ length: 9 }, () => ({
          classUnitId: classUnitId(authoredUnitId("class_barbarian")),
          hitPointRule: { tag: "fixedHigherLevelGain" as const },
        })),
      },
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId("class_barbarian"),
          unitId: authoredUnitId("subclass_barbarian_path_of_the_berserker"),
        },
      ],
      equipment: { owned: [], loadout: {} },
    } satisfies CharacterBuild;
    expect(
      characterBattleResourceInitsFromBuild(barbarian, unitLibrary, [
        {
          tag: "useCountResource",
          unitId: authoredUnitId("barbarian_retaliation"),
          expended: resourceCount(1),
        },
      ]),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "requires a finite battle resource cap",
        ),
      },
    });

    const bardBuild = {
      ...build,
      progression: {
        startingClass: classUnitId(authoredUnitId("class_bard")),
        advancements: [],
      },
      abilityScores: expectRight(
        abilityScoreAssignment({
          str: 8,
          dex: 14,
          con: 13,
          int: 10,
          wis: 12,
          cha: 16,
        }),
      ),
      features: [],
    } satisfies CharacterBuild;
    expect(
      expectRight(
        characterBattleResourceInitsFromBuild(bardBuild, unitLibrary, [
          {
            tag: "useCountResource",
            unitId: authoredUnitId("bard_bardic_inspiration"),
            expended: resourceCount(1),
          },
        ]),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: "bard_bardic_inspiration" }),
          capAbilityModifier: abilityModifier(3),
          usesRemaining: resourceCount(2),
        }),
      ]),
    );
  });

  test("threads build weapon proficiencies into True Strike discovery", () => {
    const casterId = combatantId("true-strike-wizard");
    const targetId = combatantId("true-strike-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-true-strike"),
        character: {
          combatantId: casterId,
          characterId: characterId("character:true-strike-wizard"),
          displayName: "True Strike Wizard",
          build: trueStrikeWizardBuild(),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );

    const trueStrike = discoverBattleActs(state).find(
      (act) => act.label === "True Strike (Dagger)",
    );

    expect(trueStrike?.subject).toMatchObject({
      tag: "actionSpell",
      actorId: casterId,
    });
    expect(trueStrike?.summary).toBe(
      "Cast True Strike as a cantrip using Dagger.",
    );
    expect(
      trueStrike?.initialHoles.find((hole) => hole.kind === "targetChoice"),
    ).toMatchObject({ choices: [targetId] });
  });

  test("projects Favored Enemy Hunter's Mark as feature-prepared Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: favoredEnemyRangerBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([
      {
        sourceUnitId: "ranger_favored_enemy",
        spell: unitLibrary.requireUnit("hunters_mark"),
      },
    ]);
  });

  test("projects Paladin's Smite Divine Smite as feature-prepared Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: paladinsSmitePaladinBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([
      {
        sourceUnitId: "paladin_paladins_smite",
        spell: unitLibrary.requireUnit("divine_smite"),
      },
    ]);
  });

  test("projects selected Armor of Shadows as invocation Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: armorOfShadowsWarlockBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([]);
    expect(spellcasting.invocationSpellAccesses).toEqual([
      {
        tag: "armorOfShadowsMageArmor",
        spell: unitLibrary.requireUnit("mage_armor"),
      },
    ]);
  });

  test("does not project Armor of Shadows Spell Access without selected invocation ownership", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: armorOfShadowsWarlockBuild({ armorOfShadows: false }),
        unitLibrary,
      }),
    );

    expect(spellcasting.invocationSpellAccesses).toEqual([]);
  });

  test("projects selected Pact of the Chain as no-slot Find Familiar Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: warlockInvocationBuild({ pactOfTheChain: true }),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([]);
    expect(spellcasting.invocationSpellAccesses).toEqual([
      {
        tag: "pactOfTheChainFindFamiliar",
        spell: unitLibrary.requireUnit("find_familiar"),
      },
    ]);
  });

  test("projects selected Pact of the Tome as Book of Shadows Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild(),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([]);
    expect(spellcasting.bookOfShadowsSpellAccesses).toEqual([
      {
        tag: "bookOfShadows",
        bookPresence: { tag: "onPerson" },
        cantrips: [
          unitLibrary.requireUnit("fire_bolt"),
          unitLibrary.requireUnit("spare_the_dying"),
          unitLibrary.requireUnit("minor_illusion"),
        ],
        ritualSpells: [
          unitLibrary.requireUnit("detect_magic"),
          unitLibrary.requireUnit("detect_poison_and_disease"),
        ],
        spellcastingFocus: "book_of_shadows",
      },
    ]);

    const sheet = expectRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:pact-tome-battle-init"),
        build: pactOfTheTomeWarlockBuild(),
        currentHp: Hp(8),
        tempHp: Hp(0),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    );
    const init = expectRight(
      characterSheetBattleInit({
        sheet,
        unitLibrary,
        statBlockCatalog,
        combatantId: combatantId("pact-tome-battle-init"),
        displayName: "Pact Tome Warlock",
        initiative: initiativeScore(10),
        ammunitionStocks: [],
      }),
    );
    expect(init.creatureInit).toMatchObject({
      kind: "character",
      spellcasting: {
        bookOfShadowsSpellAccesses: [
          {
            tag: "bookOfShadows",
            bookPresence: { tag: "onPerson" },
          },
        ],
      },
    });

    const characterCombatantId = combatantId("combatant:pact-tome-settlement");
    const entry = expectRight(
      startBattleFromCharacterSheetAndStatBlock({
        battleId: battleId("battle:pact-tome-settlement"),
        character: {
          sheet,
          unitLibrary,
          statBlockCatalog,
          combatantId: characterCombatantId,
          displayName: "Pact Tome Warlock",
          initiative: initiativeScore(10),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: combatantId("combatant:pact-tome-opponent"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(5),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
      }),
    );
    const combatant = entry.session.state.combatants.get(characterCombatantId);
    if (combatant === undefined) {
      throw new Error("Expected Pact Tome character combatant.");
    }
    const settled = expectRight(
      settleCharacterSheetFromBattle({
        sheet,
        state: entry.session.state,
        context: entry.session.context,
        combatant,
        unitLibrary,
        statBlockCatalog,
      }),
    );
    expect(settled.bookOfShadowsPresence).toEqual({ tag: "onPerson" });
  });

  test("rejects Book of Shadows spells already prepared from the Warlock source", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild({ alreadyPrepared: "detect_magic" }),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      }),
    );
  });

  test("rejects Book of Shadows without selected Pact of the Tome invocation", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild({ pactOfTheTome: false }),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message: "Book of Shadows Spell Access requires Pact of the Tome.",
      }),
    );
  });

  test("rejects Book of Shadows battle projection without sheet presence state", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild(),
        unitLibrary,
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Book of Shadows Spell Access requires Book of Shadows presence state.",
      }),
    );
  });

  test("rejects Book of Shadows attached to a non-Warlock spellcasting source", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild({
          spellcastingSourceUnitId: "class_wizard",
        }),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Book of Shadows Spell Access must be attached to the Warlock spellcasting source.",
      }),
    );
  });

  test("rejects Book of Shadows when Pact of the Tome is not selected from Warlock invocations", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild({
          pactOfTheTomeSelectedFromUnitId: "class_wizard",
        }),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message: "Book of Shadows Spell Access requires Pact of the Tome.",
      }),
    );
  });

  test("rejects Book of Shadows spells already prepared from feature Spell Access", () => {
    expect(
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild({
          extraFeatures: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_ranger"),
              unitId: authoredUnitId("ranger_favored_enemy"),
            },
          ],
          bookOfShadowsCantrips: [
            "hunters_mark",
            "spare_the_dying",
            "minor_illusion",
          ],
        }),
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      }),
    ).toEqual(
      Either.left({
        tag: "battleCreatureInitIssue",
        message:
          "Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
      }),
    );
  });

  test("rejects contradictory Book of Shadows and spellcasting source facts", () => {
    const spellcastingIssue = (candidateBuild: CharacterBuild) =>
      characterSpellcasting({
        build: candidateBuild,
        unitLibrary,
        bookOfShadowsPresence: { tag: "onPerson" },
      });
    const tome = pactOfTheTomeWarlockBuild();
    const tomeSpellcasting = tome.spellcasting;
    if (tomeSpellcasting === undefined) {
      throw new Error("Expected Pact of the Tome spellcasting fixture.");
    }
    const [source] = tomeSpellcasting.sources;

    expectRight(
      spellcastingIssue({
        ...tome,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_warlock"),
            unitId: authoredUnitId("warlock_pact_magic"),
          },
          ...tome.features,
        ],
      }),
    );
    expect(
      spellcastingIssue({
        ...tome,
        spellcasting: {
          ...tomeSpellcasting,
          sources: [source, source],
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Character Battle supports one Book of Shadows Spell Access source.",
      },
    });
    expect(
      spellcastingIssue(
        pactOfTheTomeWarlockBuild({
          bookOfShadowsCantrips: ["fire_bolt", "fire_bolt", "minor_illusion"],
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("selections must be distinct") },
    });
    expect(
      spellcastingIssue(
        pactOfTheTomeWarlockBuild({
          bookOfShadowsCantrips: [
            "weapon_longsword",
            "spare_the_dying",
            "minor_illusion",
          ],
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "cantrips must come from class spell lists",
        ),
      },
    });
    expect(
      spellcastingIssue(
        pactOfTheTomeWarlockBuild({
          bookOfShadowsRitualSpells: ["true_strike", "detect_magic"],
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Ritual spells must be level-1 spells from class spell lists",
        ),
      },
    });

    const oneSourceBuild = trueStrikeWizardBuild();
    const oneSourceSpellcasting = oneSourceBuild.spellcasting;
    if (oneSourceSpellcasting === undefined) {
      throw new Error("Expected Wizard spellcasting fixture.");
    }
    const [wizardSource] = oneSourceSpellcasting.sources;
    expect(
      characterSpellcasting({
        build: {
          ...oneSourceBuild,
          spellcasting: {
            ...oneSourceSpellcasting,
            sources: [
              {
                ...wizardSource,
                sourceUnitId: authoredUnitId("synthetic:missing-class"),
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("class spellcasting source") },
    });
    expect(
      characterSpellcasting({
        build: {
          ...oneSourceBuild,
          spellcasting: {
            ...oneSourceSpellcasting,
            sources: [
              wizardSource,
              {
                ...wizardSource,
                sourceUnitId: authoredUnitId("class_warlock"),
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("one source class") },
    });
    expect(
      characterSpellcasting({
        build: {
          ...oneSourceBuild,
          spellcasting: {
            ...oneSourceSpellcasting,
            sources: [
              wizardSource,
              { ...wizardSource, spellcastingAbility: "wis" },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("one spellcasting ability") },
    });
    expect(
      characterSpellcasting({
        build: {
          ...oneSourceBuild,
          spellcasting: {
            ...oneSourceSpellcasting,
            sources: [
              {
                ...wizardSource,
                cantrips: [authoredUnitId("weapon_longsword")],
              },
            ],
          },
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Expected spell Unit") },
    });
  });

  test("propagates missing invocation and feature-granted Spell Units", () => {
    expect(
      characterSpellcasting({
        build: armorOfShadowsWarlockBuild(),
        unitLibrary: unitCatalogWithoutUnitIds("mage_armor"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterSpellcasting({
        build: warlockInvocationBuild({ pactOfTheChain: true }),
        unitLibrary: unitCatalogWithoutUnitIds("find_familiar"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
    expect(
      characterSpellcasting({
        build: favoredEnemyRangerBuild(),
        unitLibrary: unitCatalogWithoutUnitIds("hunters_mark"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Unknown Unit") },
    });
  });

  test("rejects cross-record Spell catalog kind and level drift", () => {
    const fireBolt = srdUnitCollection.units.find(
      (unit) => unit.id === "fire_bolt",
    );
    const detectMagic = srdUnitCollection.units.find(
      (unit) => unit.id === "detect_magic",
    );
    const mageArmor = srdUnitCollection.units.find(
      (unit) => unit.id === "mage_armor",
    );
    const huntersMark = srdUnitCollection.units.find(
      (unit) => unit.id === "hunters_mark",
    );
    const longsword = srdUnitCollection.units.find(
      (unit) => unit.id === "weapon_longsword",
    );
    if (
      fireBolt?.kind !== "spell" ||
      detectMagic?.kind !== "spell" ||
      mageArmor?.kind !== "spell" ||
      huntersMark?.kind !== "spell" ||
      longsword?.kind !== "weapon"
    ) {
      throw new Error("Expected Spell and weapon catalog fixtures.");
    }
    const tomeProjection = (catalog: UnitCatalog) =>
      characterSpellcasting({
        build: pactOfTheTomeWarlockBuild(),
        unitLibrary: catalog,
        bookOfShadowsPresence: { tag: "onPerson" },
      });

    expect(
      tomeProjection(
        unitCatalogReplacingUnit({
          ...fireBolt,
          mechanics: { ...fireBolt.mechanics, level: 1 },
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "cantrip selections must be cantrip Spell Definitions",
        ),
      },
    });
    expect(
      tomeProjection(
        unitCatalogReplacingUnit({
          ...detectMagic,
          mechanics: { ...detectMagic.mechanics, level: 2 },
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining(
          "Ritual selections must be level-1 ritual-tagged",
        ),
      },
    });

    const weaponAtSpellId = {
      ...longsword,
      id: fireBolt.id,
      name: "Synthetic Weapon at Spell Id",
      provenance: fireBolt.provenance,
    } satisfies (typeof srdUnitCollection.units)[number];
    expect(
      tomeProjection(unitCatalogReplacingUnit(weaponAtSpellId)),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Expected spell Unit") },
    });
    expect(
      tomeProjection(
        unitCatalogReplacingUnit({
          ...longsword,
          id: detectMagic.id,
          name: "Synthetic Weapon at Ritual Spell Id",
          provenance: detectMagic.provenance,
        }),
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("Expected spell Unit") },
    });

    for (const [spell, candidateBuild] of [
      [mageArmor, armorOfShadowsWarlockBuild()],
      [huntersMark, favoredEnemyRangerBuild()],
    ] as const) {
      const weaponReplacement = {
        ...longsword,
        id: spell.id,
        name: "Synthetic Weapon at Granted Spell Id",
        provenance: spell.provenance,
      } satisfies (typeof srdUnitCollection.units)[number];
      expect(
        characterSpellcasting({
          build: candidateBuild,
          unitLibrary: unitCatalogReplacingUnit(weaponReplacement),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { message: expect.stringContaining("Expected spell Unit") },
      });
    }
  });

  test("does not project Pact of the Chain Spell Access without selected invocation ownership", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: warlockInvocationBuild({ pactOfTheChain: false }),
        unitLibrary,
      }),
    );

    expect(
      spellcasting.invocationSpellAccesses.some(
        (access) => access.tag === "pactOfTheChainFindFamiliar",
      ),
    ).toBe(false);
  });

  test("projects selected Eldritch Mind as a battle invocation feature", () => {
    const warlockId = combatantId("character-battle-eldritch-mind-warlock");
    const targetId = combatantId("character-battle-eldritch-mind-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-eldritch-mind"),
        character: {
          combatantId: warlockId,
          characterId: characterId("character:eldritch-mind-warlock"),
          displayName: "Eldritch Mind Warlock",
          build: eldritchMindInvocationBuild(),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );

    expect(state.state.combatants.get(warlockId)?.origin).toMatchObject({
      kind: "character",
      invocationFeatures: [{ tag: "eldritchMind" }],
    });
  });

  test("does not promote unrelated passive prepared Spell Access during Favored Enemy projection", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: druidDruidicBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([]);

    expect(
      expectRight(
        characterSpellcasting({
          build: {
            ...trueStrikeWizardBuild(),
            features: [
              {
                kind: "selectedClassChoice",
                selectedFromUnitId: authoredUnitId("class_wizard"),
                unitId: authoredUnitId(
                  "synthetic:missing-feature-spell-access",
                ),
              },
            ],
          },
          unitLibrary,
        }),
      ).featurePreparedSpells,
    ).toEqual([]);
  });

  test("projects selected Weapon Mastery Sap into battle attack behavior", () => {
    const fighterId = combatantId("weapon-mastery-fighter");
    const targetId = combatantId("weapon-mastery-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-weapon-mastery-sap"),
        character: {
          combatantId: fighterId,
          characterId: characterId("character:weapon-mastery-fighter"),
          displayName: "Weapon Mastery Fighter",
          build: weaponMasteryLongswordFighterBuild(),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const fighter = state.state.combatants.get(fighterId);
    expect(
      fighter?.origin.kind === "character" &&
        fighter.origin.attack?.hasWeaponMastery,
    ).toBe(true);
    expect(
      state.context.characters.get(fighterId)?.unitPresentationSources,
    ).toEqual(
      expect.arrayContaining([
        {
          unit: expect.objectContaining({ id: "mastery_sap" }),
          supportProfiles: ["weaponMasterySap"],
        },
      ]),
    );

    const subject = requireDiscoveredAttackSubject(
      state,
      fighterId,
      "Take the Attack action with Longsword.",
    );
    const meleeReachFact = attackMeleeReachFact(subject, targetId);
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const damageRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(damageRoll, 1),
        ],
      }),
    );

    const sapProcedureRef = state.context.characters
      .get(fighterId)
      ?.unitProcedureOwnership.find(
        (ownership) => ownership.unitId === "mastery_sap",
      )?.procedureRef;
    expect(sapProcedureRef).toBeDefined();
    expect(hit.state.combatants.get(targetId)?.activeEffects).toContainEqual({
      kind: "nextAttackRollBySelf",
      sourceProcedureRef: sapProcedureRef,
      sourceCombatantId: fighterId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });
  });

  test("projects Tactical Master replacement and replacement mastery refs into battle support", () => {
    const { unitRefs: refs } = expectRight(
      characterBattleSupportProjection(
        weaponMasteryLongswordLevel9FighterBuild(),
        unitLibrary,
        undefined,
        [{ className: "fighter", level: 9 }],
      ),
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        {
          unit: expect.objectContaining({ id: "fighter_tactical_master" }),
          supportProfiles: [
            {
              kind: "tacticalMasterReplacement",
              replacementProperties: ["push", "sap", "slow"],
            },
          ],
        },
        {
          unit: expect.objectContaining({ id: "mastery_push" }),
          supportProfiles: ["weaponMasteryPush"],
        },
        {
          unit: expect.objectContaining({ id: "mastery_sap" }),
          supportProfiles: ["weaponMasterySap"],
        },
        {
          unit: expect.objectContaining({ id: "mastery_slow" }),
          supportProfiles: ["weaponMasterySlow"],
        },
      ]),
    );
  });

  test("projects selected Weapon Mastery Topple into battle save holes", () => {
    const fighterId = combatantId("weapon-mastery-topple-fighter");
    const targetId = combatantId("weapon-mastery-topple-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-weapon-mastery-topple"),
        character: {
          combatantId: fighterId,
          characterId: characterId("character:weapon-mastery-topple-fighter"),
          displayName: "Weapon Mastery Topple Fighter",
          build: weaponMasteryQuarterstaffFighterBuild(),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const fighter = state.state.combatants.get(fighterId);
    expect(
      fighter?.origin.kind === "character" &&
        fighter.origin.attack?.hasWeaponMastery,
    ).toBe(true);
    expect(
      state.context.characters.get(fighterId)?.unitPresentationSources,
    ).toEqual(
      expect.arrayContaining([
        {
          unit: expect.objectContaining({ id: "mastery_topple" }),
          supportProfiles: ["weaponMasteryTopple"],
        },
      ]),
    );

    const subject = requireDiscoveredAttackSubject(
      state,
      fighterId,
      "Take the Attack action with Quarterstaff.",
    );
    const meleeReachFact = attackMeleeReachFact(subject, targetId);
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const toppleSave = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "savingThrowOutcome",
    );

    expect(toppleSave).toMatchObject({
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(12) },
      targetIds: [targetId],
    });
  });

  test("projects selected Weapon Mastery Cleave into battle decision holes", () => {
    const fighterId = combatantId("weapon-mastery-cleave-fighter");
    const targetId = combatantId("weapon-mastery-cleave-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-weapon-mastery-cleave"),
        character: {
          combatantId: fighterId,
          characterId: characterId("character:weapon-mastery-cleave-fighter"),
          displayName: "Weapon Mastery Cleave Fighter",
          build: weaponMasteryGreataxeFighterBuild(),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const fighter = state.state.combatants.get(fighterId);
    expect(
      fighter?.origin.kind === "character" &&
        fighter.origin.attack?.hasWeaponMastery,
    ).toBe(true);
    expect(
      state.context.characters.get(fighterId)?.unitPresentationSources,
    ).toEqual(
      expect.arrayContaining([
        {
          unit: expect.objectContaining({ id: "mastery_cleave" }),
          supportProfiles: ["weaponMasteryCleave"],
        },
      ]),
    );

    const subject = requireDiscoveredAttackSubject(
      state,
      fighterId,
      "Take the Attack action with Greataxe.",
    );
    const meleeReachFact = attackMeleeReachFact(subject, targetId);
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const damageRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const cleaveDecision = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(damageRoll, 1),
        ],
      }),
      "unitFeatureDecision",
    );

    expect(cleaveDecision).toMatchObject({
      choices: ["use", "decline"],
    });
  });

  test("projects Martial Arts d6 and Dexterity for eligible unarmed and Monk weapon attacks", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-dagger"),
        characterId: characterId("character:martial-arts-dagger"),
        displayName: "Martial Arts Dagger Monk",
        build: monkBuild({ weaponUnitId: "weapon_dagger", str: 12, dex: 16 }),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "dex",
      abilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      weapon: {
        weaponUnitId: "weapon_dagger",
        damage: { dice: 1, dieSize: 6 },
      },
    });
    expect(init.creatureInit.unarmedStrike).toMatchObject({
      kind: "unarmedStrike",
      attackAbility: "dex",
      attackAbilityModifier: abilityModifier(3),
      attackBonus: 5,
      damageAbilityModifier: abilityModifier(3),
      effect: {
        damage: {
          kind: "mechanicalReplacement",
          dice: 1,
          dieSize: 6,
        },
      },
    });

    const shortsword = expectRight(
      characterAttackActionOption(
        monkBuild({
          weaponUnitId: "weapon_shortsword",
          str: 12,
          dex: 16,
        }),
        unitLibrary,
        [{ className: "monk", level: 1 }],
      ),
    );
    expect(shortsword?.weapon.damage).toMatchObject({
      kind: "dice",
      dice: 1,
      dieSize: 6,
    });
  });

  test("projects Pact of the Blade onto the bonded melee weapon only", () => {
    const build = pactBladeInvocationBuild(authoredUnitId("weapon_longsword"));
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-longsword"),
        characterId: characterId("character:pact-blade-longsword"),
        displayName: "Pact Blade Character",
        build,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        pactBladeBondedWeaponItemId: bondedItemId,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
      attackBonus: 1,
      damageAbilityModifier: abilityModifier(-1),
      alternateAbilityChoices: [
        {
          ability: "cha",
          abilityModifier: abilityModifier(3),
          attackBonus: 5,
          damageAbilityModifier: abilityModifier(3),
        },
      ],
      damageTypeChoices: ["slashing", "necrotic", "psychic", "radiant"],
      weapon: { weaponUnitId: "weapon_longsword" },
    });
  });

  test("keeps Pact of the Blade damage choices distinct for magical weapon damage", () => {
    const baseWeapon = srdUnitCollection.units.find(
      (unit) => unit.id === "weapon_longsword",
    );
    if (
      baseWeapon === undefined ||
      baseWeapon.kind !== "weapon" ||
      baseWeapon.damage.kind !== "dice"
    ) {
      throw new Error("Expected Longsword dice-damage weapon fixture.");
    }
    for (const [damageType, expected] of [
      ["necrotic", ["necrotic", "psychic", "radiant"]],
      ["psychic", ["psychic", "necrotic", "radiant"]],
      ["radiant", ["radiant", "necrotic", "psychic"]],
    ] as const) {
      const weapon = {
        ...baseWeapon,
        damage: { ...baseWeapon.damage, damageType },
      } satisfies typeof baseWeapon;
      const catalog = unitCatalogReplacingUnit(weapon);
      const pactBuild = pactBladeInvocationBuild(baseWeapon.id);
      const bondedItemId = pactBuild.equipment.loadout.weapon?.itemId;
      if (bondedItemId === undefined) {
        throw new Error("Expected Pact of the Blade weapon fixture.");
      }
      expect(
        expectRight(
          characterAttackActionOption(pactBuild, catalog, [], bondedItemId),
        )?.damageTypeChoices,
      ).toEqual(expected);
    }
  });

  test("keeps Pact of the Blade Charisma selectable when the normal ability is better", () => {
    const build = pactBladeInvocationBuild(authoredUnitId("weapon_longsword"), {
      str: 18,
      cha: 14,
    });
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-stronger-strength"),
        characterId: characterId("character:pact-blade-stronger-strength"),
        displayName: "Strong Pact Blade Character",
        build,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        pactBladeBondedWeaponItemId: bondedItemId,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(4),
      attackBonus: 6,
      damageAbilityModifier: abilityModifier(4),
      alternateAbilityChoices: [
        {
          ability: "cha",
          abilityModifier: abilityModifier(2),
          attackBonus: 4,
          damageAbilityModifier: abilityModifier(2),
        },
      ],
      damageTypeChoices: ["slashing", "necrotic", "psychic", "radiant"],
    });
  });

  test("applies selected Pact of the Blade alternate damage in Attack action damage", () => {
    const actorId = combatantId("pact-blade-necrotic-attacker");
    const targetId = combatantId("pact-blade-necrotic-target");
    const build = pactBladeInvocationBuild(authoredUnitId("weapon_longsword"));
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("pact-blade-necrotic-attack"),
        character: {
          combatantId: actorId,
          characterId: characterId("character:pact-blade-necrotic-attacker"),
          displayName: "Pact Blade Character",
          build,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          pactBladeBondedWeaponItemId: bondedItemId,
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const attackName = "Longsword (Charisma, necrotic)";
    const subject = requireDiscoveredAttackSubject(
      state,
      actorId,
      `Take the Attack action with ${attackName}.`,
    );
    const meleeReachFact = attackMeleeReachFact(subject, targetId);
    expect(discoverBattleActs(state).map((act) => act.summary)).toEqual(
      expect.arrayContaining([
        "Take the Attack action with Longsword (slashing).",
        "Take the Attack action with Longsword (necrotic).",
        "Take the Attack action with Longsword (psychic).",
        "Take the Attack action with Longsword (radiant).",
        "Take the Attack action with Longsword (Charisma, slashing).",
        "Take the Attack action with Longsword (Charisma, necrotic).",
        "Take the Attack action with Longsword (Charisma, psychic).",
        "Take the Attack action with Longsword (Charisma, radiant).",
      ]),
    );
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const damageRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(damageRoll.label).toBe("weapon_longsword damage (1d8+3-necrotic)");
    const hit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(damageRoll, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(targetId)?.hp).toBe(Hp(6));
  });

  test("applies selected Pact of the Blade alternate damage for a bonded off-hand weapon", () => {
    const actorId = combatantId("pact-blade-offhand-attacker");
    const targetId = combatantId("pact-blade-offhand-target");
    const build = pactBladeInvocationBuild(
      authoredUnitId("weapon_shortsword"),
      {
        offHandWeaponUnitId: authoredUnitId("weapon_dagger"),
      },
    );
    const bondedItemId = build.equipment.loadout.offHandWeapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade off-hand test weapon.");
    }
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("pact-blade-offhand-radiant-attack"),
        character: {
          combatantId: actorId,
          characterId: characterId("character:pact-blade-offhand-attacker"),
          displayName: "Pact Blade Off-Hand Character",
          build,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          pactBladeBondedWeaponItemId: bondedItemId,
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const mainSubject = requireDiscoveredAttackSubject(
      state,
      actorId,
      "Take the Attack action with Shortsword.",
    );
    const mainMeleeReachFact = attackMeleeReachFact(mainSubject, targetId);
    const mainTarget = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: mainSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const mainRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: mainSubject,
        fills: [targetFill(mainTarget, targetId, [mainMeleeReachFact])],
      }),
      "attackRoll",
    );
    const afterMainAttack = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: state.state,
        subject: mainSubject,
        fills: [
          targetFill(mainTarget, targetId, [mainMeleeReachFact]),
          attackRollFill(mainRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const offHandAttackName = "Dagger (Charisma, radiant)";
    const afterMainAttackSession = battleRuntimeSessionForTest({
      state: afterMainAttack,
      context: state.context,
    });
    const offHandSubject = requireDiscoveredAttackSubject(
      afterMainAttackSession,
      actorId,
      `Make the Light property Bonus Action attack with ${offHandAttackName}.`,
    );
    const offHandMeleeReachFact = attackMeleeReachFact(
      offHandSubject,
      targetId,
    );
    expect(
      discoverBattleActs(afterMainAttackSession).map((act) => act.summary),
    ).toEqual(
      expect.arrayContaining([
        "Make the Light property Bonus Action attack with Dagger (piercing).",
        "Make the Light property Bonus Action attack with Dagger (radiant).",
        "Make the Light property Bonus Action attack with Dagger (Charisma, piercing).",
        `Make the Light property Bonus Action attack with ${offHandAttackName}.`,
      ]),
    );
    const offHandTarget = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const offHandRoll = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [targetFill(offHandTarget, targetId, [offHandMeleeReachFact])],
      }),
      "attackRoll",
    );
    const offHandDamage = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [
          targetFill(offHandTarget, targetId, [offHandMeleeReachFact]),
          attackRollFill(offHandRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(offHandDamage.label).toBe("weapon_dagger damage (1d4-radiant)");
    const offHandHit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [
          targetFill(offHandTarget, targetId, [offHandMeleeReachFact]),
          attackRollFill(offHandRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(offHandDamage, 4),
        ],
      }),
    );
    expect(offHandHit.state.combatants.get(targetId)?.hp).toBe(Hp(6));
  });

  test("keeps non-bonded Pact of the Blade weapons as ordinary attacks", () => {
    const meleeBuild = pactBladeInvocationBuild(
      authoredUnitId("weapon_longsword"),
    );
    const meleeInit = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-unbonded"),
        characterId: characterId("character:pact-blade-unbonded"),
        displayName: "Unbonded Blade Warlock",
        build: meleeBuild,
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(meleeInit.creatureInit.kind).toBe("character");
    if (meleeInit.creatureInit.kind !== "character") return;
    expect(meleeInit.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
    });
    expect(meleeInit.creatureInit.attack).not.toHaveProperty(
      "damageTypeChoices",
    );
  });

  test("rejects impossible Pact of the Blade bond inputs", () => {
    const noInvocationBuild = pactBladeInvocationBuild(
      authoredUnitId("weapon_longsword"),
      {
        pactOfTheBlade: false,
      },
    );
    const noInvocationItemId =
      noInvocationBuild.equipment.loadout.weapon?.itemId;
    if (noInvocationItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-no-invocation"),
          characterId: characterId("character:pact-blade-no-invocation"),
          displayName: "No Invocation Character",
          build: noInvocationBuild,
          initiative: initiativeScore(10),
          ammunitionStocks: [],
          unitLibrary,
          pactBladeBondedWeaponItemId: noInvocationItemId,
        }),
      ),
    ).toBe(true);

    const rangedBuild = pactBladeInvocationBuild(
      authoredUnitId("weapon_shortbow"),
    );
    const rangedItemId = rangedBuild.equipment.loadout.weapon?.itemId;
    if (rangedItemId === undefined) {
      throw new Error("Expected Pact of the Blade ranged test weapon.");
    }
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-shortbow"),
          characterId: characterId("character:pact-blade-shortbow"),
          displayName: "Ranged Blade Character",
          build: rangedBuild,
          initiative: initiativeScore(10),
          ammunitionStocks: [],
          unitLibrary,
          pactBladeBondedWeaponItemId: rangedItemId,
        }),
      ),
    ).toBe(true);

    const arbitraryItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(
        characterEquipmentItemUnitId(authoredUnitId("weapon_dagger")),
      ),
    });
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-not-loadout"),
          characterId: characterId("character:pact-blade-not-loadout"),
          displayName: "Invalid Bond Character",
          build: pactBladeInvocationBuild(authoredUnitId("weapon_longsword")),
          initiative: initiativeScore(10),
          ammunitionStocks: [],
          unitLibrary,
          pactBladeBondedWeaponItemId: arbitraryItemId,
        }),
      ),
    ).toBe(true);

    const invalidPactBuild = pactBladeInvocationBuild(
      authoredUnitId("weapon_longsword"),
    );
    const invalidPactAndWildShape = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("pact-blade-before-wild-shape"),
      characterId: characterId("character:pact-blade-before-wild-shape"),
      displayName: "Invalid Bond and Wild Shape Character",
      build: {
        ...invalidPactBuild,
        features: [
          ...invalidPactBuild.features,
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("class_fighter"),
            unitId: authoredUnitId("druid_wild_shape"),
          },
        ],
      },
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      unitLibrary,
      pactBladeBondedWeaponItemId: arbitraryItemId,
    });
    expect(invalidPactAndWildShape).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Pact of the Blade bond must reference a wielded loadout weapon.",
      },
    });

    const validBuild = pactBladeInvocationBuild(
      authoredUnitId("weapon_longsword"),
    );
    const validItemId = validBuild.equipment.loadout.weapon?.itemId;
    if (validItemId === undefined) {
      throw new Error("Expected Pact of the Blade owned weapon fixture.");
    }
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-unowned"),
        characterId: characterId("character:pact-blade-unowned"),
        displayName: "Unowned Blade Character",
        build: {
          ...validBuild,
          equipment: { ...validBuild.equipment, owned: [] },
        },
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        pactBladeBondedWeaponItemId: validItemId,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("reference owned equipment") },
    });

    const missingUnitId = authoredUnitId("synthetic:missing-pact-weapon");
    const missingItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(characterEquipmentItemUnitId(missingUnitId)),
    });
    expect(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-missing-unit"),
        characterId: characterId("character:pact-blade-missing-unit"),
        displayName: "Missing Pact Weapon Character",
        build: {
          ...validBuild,
          equipment: {
            owned: [
              characterBuildCatalogEquipmentItem({
                itemId: missingItemId,
              }),
            ],
            loadout: {
              weapon: { itemId: missingItemId, grip: "one_handed" },
            },
          },
        },
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
        pactBladeBondedWeaponItemId: missingItemId,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: expect.stringContaining("Unknown Character Build Unit"),
      },
    });
  });

  test("keeps non-melee Pact of the Blade weapons ordinary when no bond is supplied", () => {
    const rangedInit = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-shortbow"),
        characterId: characterId("character:pact-blade-shortbow"),
        displayName: "Ranged Blade Warlock",
        build: pactBladeInvocationBuild(authoredUnitId("weapon_shortbow")),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(rangedInit.creatureInit.kind).toBe("character");
    if (rangedInit.creatureInit.kind !== "character") return;
    expect(rangedInit.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
      weapon: { weaponUnitId: "weapon_shortbow" },
    });
    expect(rangedInit.creatureInit.attack).not.toHaveProperty(
      "damageTypeChoices",
    );
  });

  test.each([
    { level: 5, dieSize: 8 },
    { level: 11, dieSize: 10 },
    { level: 17, dieSize: 12 },
  ] as const)(
    "projects Martial Arts d$dieSize and Dexterity at Monk level $level",
    ({ level, dieSize }) => {
      const init = expectRight(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId(`martial-arts-level-${level}`),
          characterId: characterId(`character:martial-arts-level-${level}`),
          displayName: "Experienced Monk",
          build: monkBuild({
            level,
            weaponUnitId: "weapon_dagger",
            str: 12,
            dex: 16,
          }),
          initiative: initiativeScore(10),
          ammunitionStocks: [],
          unitLibrary,
        }),
      );

      expect(init.creatureInit.kind).toBe("character");
      if (init.creatureInit.kind !== "character") return;
      expect(init.creatureInit.attack).toMatchObject({
        kind: "weapon",
        ability: "dex",
        abilityModifier: abilityModifier(3),
        damageAbilityModifier: abilityModifier(3),
        weapon: {
          weaponUnitId: "weapon_dagger",
          damage: { dice: 1, dieSize },
        },
      });
      expect(init.creatureInit.unarmedStrike).toMatchObject({
        kind: "unarmedStrike",
        attackAbility: "dex",
        attackAbilityModifier: abilityModifier(3),
        damageAbilityModifier: abilityModifier(3),
        effect: {
          damage: {
            kind: "mechanicalReplacement",
            dice: 1,
            dieSize,
          },
        },
      });
    },
  );

  test("keeps Strength when it is the better Martial Arts attack and damage choice", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-strength"),
        characterId: characterId("character:martial-arts-strength"),
        displayName: "Strength Monk",
        build: monkBuild({ weaponUnitId: "weapon_dagger", str: 16, dex: 12 }),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      weapon: { damage: { dice: 1, dieSize: 6 } },
    });
    expect(init.creatureInit.unarmedStrike).toMatchObject({
      attackAbility: "str",
      attackAbilityModifier: abilityModifier(3),
      attackBonus: 5,
      damageAbilityModifier: abilityModifier(3),
    });
  });

  test("requires unarmored unshielded loadouts that wield only Monk weapons", () => {
    const shielded = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-shield"),
        characterId: characterId("character:martial-arts-shield"),
        displayName: "Shielded Monk",
        build: monkBuild({
          weaponUnitId: "weapon_dagger",
          shield: true,
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );
    const longsword = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-longsword"),
        characterId: characterId("character:martial-arts-longsword"),
        displayName: "Longsword Monk",
        build: monkBuild({
          weaponUnitId: "weapon_longsword",
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );
    const mixed = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-mixed"),
        characterId: characterId("character:martial-arts-mixed"),
        displayName: "Mixed Weapon Monk",
        build: monkBuild({
          weaponUnitId: "weapon_dagger",
          offHandWeaponUnitId: "weapon_longsword",
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        ammunitionStocks: [],
        unitLibrary,
      }),
    );

    for (const init of [shielded, longsword, mixed]) {
      expect(init.creatureInit.kind).toBe("character");
      if (init.creatureInit.kind !== "character") return;
      expect(init.creatureInit.attack).toMatchObject({
        kind: "weapon",
        ability: "str",
        abilityModifier: abilityModifier(1),
      });
      expect(init.creatureInit.unarmedStrike.effect.damage).toEqual({
        kind: "base",
        damageType: "bludgeoning",
        flat: 1,
      });
    }
  });

  test("keeps Martial Arts Dexterity in Grapple and Shove save DCs above the d6 tier", () => {
    const monkId = combatantId("martial-arts-grappler");
    const targetId = combatantId("martial-arts-grapple-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("martial-arts-grapple-dc"),
        character: {
          combatantId: monkId,
          characterId: characterId("character:martial-arts-grappler"),
          displayName: "Grappling Monk",
          build: monkBuild({ level: 5, str: 12, dex: 16 }),
          initiative: initiativeScore(20),
          ammunitionStocks: [],
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        },
        unitLibrary,
      }),
    );
    const grappleSubject = {
      tag: "action" as const,
      actorId: monkId,
      action: "grapple" as const,
    };
    const grappleTarget = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: grappleSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const grappleOutcome = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: grappleSubject,
        fills: [
          targetFill(grappleTarget, targetId, [
            { kind: "grappleTargetWithinReach", grapplerId: monkId, targetId },
          ]),
        ],
      }),
      "grappleOutcome",
    );
    const shoveSubject = {
      tag: "action" as const,
      actorId: monkId,
      action: "shove" as const,
    };
    const shoveTarget = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: shoveSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const shoveOutcome = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: shoveSubject,
        fills: [
          targetFill(shoveTarget, targetId, [
            { kind: "shoveTargetWithinReach", shoverId: monkId, targetId },
          ]),
        ],
      }),
      "shoveOutcome",
    );

    expect(grappleOutcome.dc).toBe(14);
    expect(shoveOutcome.dc).toBe(14);
  });
});

function monkBuild(input: {
  readonly level?: number;
  readonly weaponUnitId?: string;
  readonly offHandWeaponUnitId?: string;
  readonly armor?: boolean;
  readonly shield?: boolean;
  readonly str: number;
  readonly dex: number;
}): CharacterBuild {
  const weaponItemId =
    input.weaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "main",
          unitId: expectRight(
            characterEquipmentItemUnitId(authoredUnitId(input.weaponUnitId)),
          ),
        });
  const offHandWeaponItemId =
    input.offHandWeaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "off",
          unitId: expectRight(
            characterEquipmentItemUnitId(
              authoredUnitId(input.offHandWeaponUnitId),
            ),
          ),
        });
  const armorItemId =
    input.armor === true
      ? characterEquipmentItemId({
          slot: "armor",
          unitId: expectRight(
            characterEquipmentItemUnitId(authoredUnitId("armor_leather")),
          ),
        })
      : undefined;
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: expectRight(
            characterEquipmentItemUnitId(authoredUnitId("equipment_shield")),
          ),
        })
      : undefined;

  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_monk")),
      advancements: Array.from(
        { length: Math.max(0, (input.level ?? 1) - 1) },
        () => ({
          classUnitId: classUnitId(authoredUnitId("class_monk")),
          hitPointRule: { tag: "fixedHigherLevelGain" as const },
        }),
      ),
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: input.str,
        dex: input.dex,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [
        ...(weaponItemId === undefined || input.weaponUnitId === undefined
          ? []
          : [
              characterBuildCatalogEquipmentItem({
                itemId: weaponItemId,
              }),
            ]),
        ...(offHandWeaponItemId === undefined ||
        input.offHandWeaponUnitId === undefined
          ? []
          : [
              characterBuildCatalogEquipmentItem({
                itemId: offHandWeaponItemId,
              }),
            ]),
        ...(armorItemId === undefined
          ? []
          : [
              characterBuildCatalogEquipmentItem({
                itemId: armorItemId,
              }),
            ]),
        ...(shieldItemId === undefined
          ? []
          : [
              characterBuildCatalogEquipmentItem({
                itemId: shieldItemId,
              }),
            ]),
      ],
      loadout: {
        ...(weaponItemId === undefined
          ? {}
          : { weapon: { itemId: weaponItemId, grip: "one_handed" as const } }),
        ...(offHandWeaponItemId === undefined
          ? {}
          : { offHandWeapon: { itemId: offHandWeaponItemId } }),
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function magicInitiateMonkBuild(): CharacterBuild {
  return {
    ...monkBuild({ str: 12, dex: 16 }),
    background: authoredUnitId("background_sage"),
    magicInitiateSpellAccesses: [
      {
        featUnitId: authoredUnitId("feat_magic_initiate_wizard"),
        spellcastingAbility: "cha",
        cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")],
        levelOneSpell: authoredUnitId("burning_hands"),
      },
    ],
  };
}

function pactBladeInvocationBuild(
  weaponUnitId: UnitRecord["id"],
  input: {
    readonly offHandWeaponUnitId?: UnitRecord["id"];
    readonly str?: number;
    readonly cha?: number;
    readonly pactOfTheBlade?: boolean;
  } = {},
): CharacterBuild {
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(characterEquipmentItemUnitId(weaponUnitId)),
  });
  const offHandWeaponItemId =
    input.offHandWeaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "off",
          unitId: expectRight(
            characterEquipmentItemUnitId(input.offHandWeaponUnitId),
          ),
        });
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: input.str ?? 8,
        dex: 12,
        con: 13,
        int: 10,
        wis: 10,
        cha: input.cha ?? 16,
      }),
    ),
    proficiencyChoices: [],
    features:
      input.pactOfTheBlade === false
        ? []
        : [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: authoredUnitId(
                "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "nonRepeatable",
                invocationId: eldritchInvocationId("pact_of_the_blade"),
              },
            },
          ],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: weaponItemId,
        }),
        ...(input.offHandWeaponUnitId === undefined ||
        offHandWeaponItemId === undefined
          ? []
          : [
              characterBuildCatalogEquipmentItem({
                itemId: offHandWeaponItemId,
              }),
            ]),
      ],
      loadout: {
        weapon: {
          itemId: weaponItemId,
          grip: "one_handed",
        },
        ...(offHandWeaponItemId === undefined
          ? {}
          : {
              offHandWeapon: {
                itemId: offHandWeaponItemId,
              },
            }),
      },
    },
  };
}

function requireHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

type BoundAttackSubject =
  | Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >
  | Extract<
      BattleSubject,
      { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
    >;

function requireDiscoveredAttackSubject(
  session: BattleRuntimeSession,
  actorId: ReturnType<typeof combatantId>,
  summary: string,
): BoundAttackSubject {
  const subject = discoverBattleActs(session).find(
    (act) => act.subject.actorId === actorId && act.summary === summary,
  )?.subject;
  if (
    subject === undefined ||
    !(
      (subject.tag === "action" && subject.action === "attack") ||
      (subject.tag === "bonusAction" && subject.action === "offHandAttack")
    )
  ) {
    throw new Error(`Expected discovered bound attack: ${summary}`);
  }
  return subject;
}

function attackMeleeReachFact(
  subject: BoundAttackSubject,
  targetId: ReturnType<typeof combatantId>,
): Extract<
  NonNullable<
    Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
  >[number],
  { readonly kind: "attackTargetInMeleeReach" }
> {
  return subject.attackAbility === undefined
    ? {
        kind: "attackTargetInMeleeReach",
        actorId: subject.actorId,
        targetId,
        procedureRef: subject.procedureRef,
      }
    : {
        kind: "attackTargetInMeleeReach",
        actorId: subject.actorId,
        targetId,
        procedureRef: subject.procedureRef,
        attackAbility: subject.attackAbility,
        attackDamageType: subject.attackDamageType,
      };
}

function requireResolvedBattleSubject(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function startDruidWildShapeSheetBattle(
  sheet: CharacterSheet,
): BattleRuntimeSession {
  const characterInit = expectRight(
    characterSheetBattleInit({
      combatantId: combatantId("druid"),
      displayName: "Druid",
      sheet,
      initiative: initiativeScore(20),
      ammunitionStocks: [],
      unitLibrary,
      statBlockCatalog,
    }),
  );
  return expectRight(
    startBattle({
      battleId: battleId("character-sheet-druid-wild-shape"),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("skeleton"),
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
        }),
      ],
    }),
  );
}

function statBlockCatalogWithLookupCount(): {
  readonly catalog: StatBlockCatalog;
  readonly lookupCount: () => number;
} {
  let getStatBlockCalls = 0;
  return {
    catalog: {
      getStatBlock: (id) => {
        getStatBlockCalls += 1;
        return statBlockCatalog.getStatBlock(id);
      },
      listStatBlocks: () => statBlockCatalog.listStatBlocks(),
      requireStatBlock: (id) => statBlockCatalog.requireStatBlock(id),
    },
    lookupCount: () => getStatBlockCalls,
  };
}

function emptyStatBlockCatalog(): StatBlockCatalog {
  return {
    getStatBlock: () => Option.none(),
    listStatBlocks: () => [],
    requireStatBlock: (id) => {
      throw new Error(`Unexpected Stat Block lookup: ${id}`);
    },
  };
}

function druidWildShapeAct(
  session: BattleRuntimeSession,
  action: "assumeForm" | "dismiss",
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const subject = discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "druidWildShape" && act.subject.action === action,
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error(`Expected Druid Wild Shape ${action} act.`);
  }
  return subject;
}

function resolveDruidWildShapeAssumeFormWithoutLoadoutEquipment(
  session: BattleRuntimeSession,
) {
  const subject = druidWildShapeAct(session, "assumeForm");
  const needsDisposition = resolveBattleSubject({
    state: session.state,
    subject,
    fills: [],
  });
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape object handling hole.");
  }
  const hole = requireHole(needsDisposition, "wildShapeEquipmentDisposition");
  expect(hole.candidates).toEqual([]);
  return resolveBattleSubject({
    state: session.state,
    subject,
    fills: [
      {
        kind: "wildShapeEquipmentDisposition",
        holeId: hole.holeId,
        value: {
          formLimbs: { kind: "canHandleObjects" },
          choices: [],
        },
      },
    ],
  });
}

function restoreBonusAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      currentHasBonusAction: true,
    },
  };
}

function requireCombatant(
  state: BattleState,
  combatantIdValue: ReturnType<typeof combatantId>,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error("Expected battle combatant.");
  }
  return combatant;
}

function targetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: ReturnType<typeof combatantId>,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(spatialFacts.length === 0 ? {} : { spatialFacts }),
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(value)] }],
  };
}

function multiclassUnarmoredDefenseBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_barbarian")),
      advancements: [
        {
          classUnitId: classUnitId(authoredUnitId("class_monk")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
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
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function defenseBuild(input: {
  readonly wearingArmor: boolean;
}): CharacterBuild {
  const armorItemId = characterEquipmentItemId({
    slot: "armor",
    unitId: expectRight(
      characterEquipmentItemUnitId(authoredUnitId("armor_chain_mail")),
    ),
  });

  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
        kind: "selectedClassChoice",
        unitId: authoredUnitId("defense"),
      },
    ],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: armorItemId,
        }),
      ],
      loadout: input.wearingArmor ? { armor: armorItemId } : {},
    },
  };
}

function dragonbornFighterBuild(
  input: { readonly draconicAncestry?: "red" | false } = {},
): CharacterBuild {
  const draconicAncestry =
    input.draconicAncestry === false
      ? undefined
      : (input.draconicAncestry ?? "red");
  return {
    ...defenseBuild({ wearingArmor: false }),
    species: authoredUnitId("species_dragonborn"),
    ...(draconicAncestry === undefined
      ? {}
      : {
          speciesChoiceFacts: {
            draconicAncestry: {
              kind: "draconicAncestry",
              ancestorId: characterDraconicAncestrySelection(draconicAncestry),
            },
          },
        }),
    originLanguages: ["Common", "Draconic", "Dwarvish"],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function dwarfFighterBuild(): CharacterBuild {
  return {
    ...defenseBuild({ wearingArmor: false }),
    species: authoredUnitId("species_dwarf"),
    originLanguages: ["Common", "Dwarvish", "Draconic"],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function halflingFighterBuild(): CharacterBuild {
  return {
    ...defenseBuild({ wearingArmor: false }),
    species: authoredUnitId("species_halfling"),
    originLanguages: ["Common", "Halfling", "Dwarvish"],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function weaponMasteryLongswordFighterBuild(): CharacterBuild {
  const longswordItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(
      characterEquipmentItemUnitId(authoredUnitId("weapon_longsword")),
    ),
  });

  return {
    ...defenseBuild({ wearingArmor: false }),
    features: [
      {
        selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
        kind: "selectedClassChoice",
        unitId: authoredUnitId("weapon_longsword"),
      },
    ],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: longswordItemId,
        }),
      ],
      loadout: {
        weapon: {
          itemId: longswordItemId,
          grip: "one_handed",
        },
      },
    },
  };
}

function weaponMasteryLongswordLevel9FighterBuild(): CharacterBuild {
  return {
    ...weaponMasteryLongswordFighterBuild(),
    progression: {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: Array.from({ length: 8 }, () => ({
        classUnitId: classUnitId(authoredUnitId("class_fighter")),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
  };
}

function weaponMasteryQuarterstaffFighterBuild(): CharacterBuild {
  const quarterstaffItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(
      characterEquipmentItemUnitId(authoredUnitId("weapon_quarterstaff")),
    ),
  });

  return {
    ...defenseBuild({ wearingArmor: false }),
    features: [
      {
        selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
        kind: "selectedClassChoice",
        unitId: authoredUnitId("weapon_quarterstaff"),
      },
    ],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: quarterstaffItemId,
        }),
      ],
      loadout: {
        weapon: {
          itemId: quarterstaffItemId,
          grip: "one_handed",
        },
      },
    },
  };
}

function weaponMasteryGreataxeFighterBuild(): CharacterBuild {
  const greataxeItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(
      characterEquipmentItemUnitId(authoredUnitId("weapon_greataxe")),
    ),
  });

  return {
    ...defenseBuild({ wearingArmor: false }),
    features: [
      {
        selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
        kind: "selectedClassChoice",
        unitId: authoredUnitId("weapon_greataxe"),
      },
    ],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: greataxeItemId,
        }),
      ],
      loadout: {
        weapon: {
          itemId: greataxeItemId,
          grip: "one_handed",
        },
      },
    },
  };
}

function trueStrikeWizardBuild(): CharacterBuild {
  const daggerItemId = trueStrikeDaggerItemId();

  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_wizard")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [
        characterBuildCatalogEquipmentItem({
          itemId: daggerItemId,
        }),
      ],
      loadout: {
        weapon: {
          itemId: daggerItemId,
          grip: "one_handed",
        },
      },
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_wizard"),
          spellcastingAbility: "int",
          cantrips: [authoredUnitId("true_strike")],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {},
    },
  };
}

function favoredEnemyRangerBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_ranger")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 16,
        con: 13,
        int: 8,
        wis: 14,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_ranger"),
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
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

function hunterRangerHordeBreakerBuild(): CharacterBuild {
  return {
    ...favoredEnemyRangerBuild(),
    progression: {
      startingClass: classUnitId(authoredUnitId("class_ranger")),
      advancements: [
        {
          classUnitId: classUnitId(authoredUnitId("class_ranger")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
        {
          classUnitId: classUnitId(authoredUnitId("class_ranger")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    features: [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("class_ranger"),
        unitId: authoredUnitId("subclass_ranger_hunter"),
      },
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("ranger_hunters_prey"),
        unitId: authoredUnitId("ranger_hunters_prey"),
        selectedOption: {
          kind: "huntersPrey",
          selection: "nearbyDifferentTargetSameWeaponAttack",
        },
      },
    ],
  };
}

function favoredEnemyRangerResourceBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_ranger")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 16,
        con: 13,
        int: 8,
        wis: 14,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function paladinsSmitePaladinBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_paladin")),
      advancements: [
        {
          classUnitId: classUnitId(authoredUnitId("class_paladin")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 10,
        con: 13,
        int: 8,
        wis: 12,
        cha: 14,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_paladin"),
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["holy_symbol"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

type LimitedCharacterBattleResource = Extract<
  CharacterBattleResourceState,
  { readonly usesRemaining: ResourceCount }
>["resource"];
type PointPoolCharacterBattleResource = Extract<
  CharacterBattleResourceState,
  { readonly pointsRemaining: ResourceCount }
>["resource"];
type UnitWithUseCountResource = UnitRecord & {
  readonly mechanics: {
    readonly resource: {
      readonly kind: "use_count";
    };
  };
};
type UnitWithPointPoolResource = UnitRecord & {
  readonly mechanics: {
    readonly resource: {
      readonly kind: "point_pool";
    };
  };
};

function hasFixedCharacterBattleResourceCap(
  resource: ReturnType<typeof characterBattleResourceForUnit>,
): resource is LimitedCharacterBattleResource & {
  readonly cap: { readonly kind: "fixed" };
} {
  return resource.kind === "use_count" && resource.cap.kind === "fixed";
}

function hasLimitedCharacterBattleResourceCap(
  resource: ReturnType<typeof characterBattleResourceForUnit>,
): resource is LimitedCharacterBattleResource {
  return resource.kind === "use_count" && resource.cap.kind !== "unlimited";
}

function isClassFeatureWithUseCountResource(
  unit: UnitRecord,
): unit is UnitWithUseCountResource {
  return (
    unit.kind === "class_feature" &&
    "resource" in unit.mechanics &&
    unit.mechanics.resource?.kind === "use_count"
  );
}

function isClassFeatureWithPointPoolResource(
  unit: UnitRecord,
): unit is UnitWithPointPoolResource {
  return (
    unit.kind === "class_feature" &&
    "resource" in unit.mechanics &&
    unit.mechanics.resource?.kind === "point_pool"
  );
}

function unitWithUseCountCap(
  unit: UnitWithUseCountResource,
  cap: LimitedCharacterBattleResource["cap"],
): UnitRecord {
  // Cast evidence: the input guard has already narrowed this to a class feature
  // UnitRecord with a use-count resource; replacing only the typed cap preserves
  // that UnitRecord shape, but object spread widens the mechanics union.
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      resource: {
        ...unit.mechanics.resource,
        cap,
      },
    },
  } as UnitRecord;
}

function unitWithPointPoolCap(
  unit: UnitWithPointPoolResource,
  cap: PointPoolCharacterBattleResource["cap"],
): UnitRecord {
  // Cast evidence: the input guard has already narrowed this to a class feature
  // UnitRecord with a point-pool resource; replacing only the typed cap preserves
  // that UnitRecord shape, but object spread widens the mechanics union.
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      resource: {
        ...unit.mechanics.resource,
        cap,
      },
    },
  } as UnitRecord;
}

function armorOfShadowsWarlockBuild(
  input: { readonly armorOfShadows?: boolean } = {},
): CharacterBuild {
  const features: CharacterBuild["features"] = [
    ...(input.armorOfShadows === false
      ? []
      : [
          {
            kind: "selectedEldritchInvocation" as const,
            selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
            selection: {
              kind: "nonRepeatable" as const,
              invocationId: eldritchInvocationId("armor_of_shadows"),
            },
          },
        ]),
  ];
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_warlock")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 10,
        cha: 16,
      }),
    ),
    proficiencyChoices: [],
    features,
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_warlock"),
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
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function warlockInvocationBuild(input: {
  readonly pactOfTheChain?: boolean;
}): CharacterBuild {
  const features: CharacterBuild["features"] = [
    ...(input.pactOfTheChain === false
      ? []
      : [
          {
            kind: "selectedEldritchInvocation" as const,
            selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
            selection: {
              kind: "nonRepeatable" as const,
              invocationId: eldritchInvocationId("pact_of_the_chain"),
            },
          },
        ]),
  ];
  return {
    ...armorOfShadowsWarlockBuild({ armorOfShadows: false }),
    features,
  };
}

function pactOfTheTomeWarlockBuild(input?: {
  readonly pactOfTheTome?: boolean;
  readonly pactOfTheTomeSelectedFromUnitId?: string;
  readonly spellcastingSourceUnitId?: string;
  readonly alreadyPrepared?: "detect_magic";
  readonly extraFeatures?: CharacterBuild["features"];
  readonly bookOfShadowsCantrips?: readonly [string, string, string];
  readonly bookOfShadowsRitualSpells?: readonly [string, string];
}): CharacterBuild {
  return {
    ...armorOfShadowsWarlockBuild({ armorOfShadows: false }),
    features: [
      ...(input?.pactOfTheTome === false
        ? []
        : [
            {
              kind: "selectedEldritchInvocation" as const,
              selectedFromUnitId: authoredUnitId(
                input?.pactOfTheTomeSelectedFromUnitId ??
                  "warlock_eldritch_invocations",
              ),
              selection: {
                kind: "nonRepeatable" as const,
                invocationId: eldritchInvocationId("pact_of_the_tome"),
              },
            },
          ]),
      ...(input?.extraFeatures ?? []),
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId(
            input?.spellcastingSourceUnitId ?? "class_warlock",
          ),
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells:
            input?.alreadyPrepared === undefined
              ? []
              : [authoredUnitId(input.alreadyPrepared)],
          spellcastingFocuses: ["arcane_focus"],
          bookOfShadows: {
            tag: "bookOfShadows",
            cantrips: authoredUnitIdTriple(
              input?.bookOfShadowsCantrips ?? [
                "fire_bolt",
                "spare_the_dying",
                "minor_illusion",
              ],
            ),
            ritualSpells: authoredUnitIdPair(
              input?.bookOfShadowsRitualSpells ?? [
                "detect_magic",
                "detect_poison_and_disease",
              ],
            ),
            spellcastingFocus: "book_of_shadows",
          },
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
  };
}

function authoredUnitIdTriple(
  values: readonly [string, string, string],
): readonly [UnitRecord["id"], UnitRecord["id"], UnitRecord["id"]] {
  return [
    authoredUnitId(values[0]),
    authoredUnitId(values[1]),
    authoredUnitId(values[2]),
  ];
}

function authoredUnitIdPair(
  values: readonly [string, string],
): readonly [UnitRecord["id"], UnitRecord["id"]] {
  return [authoredUnitId(values[0]), authoredUnitId(values[1])];
}

function eldritchMindInvocationBuild(): CharacterBuild {
  return {
    ...pactBladeInvocationBuild(authoredUnitId("weapon_longsword"), {
      pactOfTheBlade: false,
    }),
    features: [
      {
        kind: "selectedEldritchInvocation",
        selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
        selection: {
          kind: "nonRepeatable",
          invocationId: eldritchInvocationId("eldritch_mind"),
        },
      },
    ],
  };
}

function druidDruidicBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_druid")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
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
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

function druidWildShapeBuild(): CharacterBuild {
  return druidWildShapeBuildAtLevel(2);
}

function druidWildShapeBuildAtLevel(level: number): CharacterBuild {
  const base = druidDruidicBuild();
  if (base.spellcasting === undefined) {
    throw new Error("Expected Druid Wild Shape test build to cast spells.");
  }
  return {
    ...base,
    progression: {
      startingClass: classUnitId(authoredUnitId("class_druid")),
      advancements: Array.from({ length: level - 1 }, () => ({
        classUnitId: classUnitId(authoredUnitId("class_druid")),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    spellcasting: {
      sources: base.spellcasting.sources,
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function trueStrikeDaggerItemId() {
  return characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(
      characterEquipmentItemUnitId(authoredUnitId("weapon_dagger")),
    ),
  });
}

function handoffSpellcastingState(
  input: {
    readonly spellSlots?: CharacterBattleSpellcastingExecutionState["spellSlots"];
  } = {},
): CharacterBattleSpellcastingExecutionState {
  return {
    spellcastingSource: {
      tag: "classSpellcasting",
      className: "wizard",
      abilityModifier: abilityModifier(3),
    },
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    pactOfTheChainFindFamiliarInvocationMode: null,
    spellSlots: input.spellSlots ?? [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(2),
      },
    ],
  };
}

function pactMagicHandoffSpellcastingState(input: {
  readonly spellLevel?: ReturnType<typeof spellSlotLevel>;
  readonly count?: ResourceCount;
  readonly expended: ResourceCount;
}): CharacterBattleSpellcastingExecutionState {
  return {
    spellcastingSource: {
      tag: "classSpellcasting",
      className: "warlock",
      abilityModifier: abilityModifier(2),
    },
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    pactOfTheChainFindFamiliarInvocationMode: null,
    spellSlots: [
      {
        spellLevel: input.spellLevel ?? spellSlotLevel(1),
        count: input.count ?? resourceCount(1),
        expended: input.expended,
      },
    ],
  };
}

function wizardSpellcastingBuild(): CharacterBuild {
  const build = wizardWarlockBuild();
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Expected Wizard fixture spellcasting.");
  }
  return {
    ...build,
    spellcasting: {
      ...spellcasting,
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_wizard")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
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

function sorcererFontOfMagicBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_sorcerer")),
      advancements: [
        {
          classUnitId: classUnitId(authoredUnitId("class_sorcerer")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
        {
          classUnitId: classUnitId(authoredUnitId("class_sorcerer")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
        {
          classUnitId: classUnitId(authoredUnitId("class_sorcerer")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
        {
          classUnitId: classUnitId(authoredUnitId("class_sorcerer")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 16,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_sorcerer"),
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
  };
}

function sorcererMetamagicBuild(): CharacterBuild {
  return {
    ...sorcererFontOfMagicBuild(),
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
        optionId: testSorcererMetamagicOptionId("sorcerer_empowered_spell"),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
        optionId: testSorcererMetamagicOptionId("sorcerer_heightened_spell"),
      },
    ],
  };
}

function paladinBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_paladin")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 10,
        con: 13,
        int: 8,
        wis: 12,
        cha: 14,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function fighterWithLayOnHandsResourceBuild(): CharacterBuild {
  return {
    ...build,
    features: [
      ...build.features,
      {
        selectedFromUnitId: authoredUnitId("class_paladin"),
        kind: "selectedClassChoice",
        unitId: authoredUnitId("paladin_lay_on_hands"),
      },
    ],
  };
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.left)}`);
  }
  expect(Either.isRight(result)).toBe(true);
  return result.right;
}

function sheetMaximumHp(sheet: CharacterSheet) {
  return expectRight(characterSheetHitPointMaximum({ sheet, unitLibrary }));
}

function retainedCompanionId(value: string) {
  return expectRight(parseCharacterSheetRetainedCompanionId(value));
}

function retainedOrdinaryCompanionSheet(input: {
  readonly characterIdValue: string;
  readonly companionIdValue: string;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly currentHp: ReturnType<typeof Hp>;
  readonly tempHp: ReturnType<typeof Hp>;
}): CharacterSheet {
  const sheet = expectRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId(input.characterIdValue),
      build: {
        ...trueStrikeWizardBuild(),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("class_wizard"),
              spellcastingAbility: "int",
              cantrips: [authoredUnitId("true_strike")],
              spellbook: [authoredUnitId("find_familiar")],
              preparedSpells: [authoredUnitId("find_familiar")],
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
      unitLibrary,
    }),
  );
  const retained = expectRight(
    createRetainedFamiliarLikeCompanion({
      sheet,
      unitLibrary,
      statBlockCatalog,
      companionId: retainedCompanionId(input.companionIdValue),
      source: { tag: "ritualSpell", spellId: authoredUnitId("find_familiar") },
      selectedForm: input.selectedForm,
      creatureTypeOverrideChoiceId: "fey",
    }),
  );
  if (input.currentHp < Hp(1)) {
    throw new Error("Expected positive retained companion fixture HP.");
  }
  return retainedCompanionSheetWithManifestation(retained, (manifestation) => {
    if (manifestation.tag === "disappearedAtZeroHitPoints") {
      throw new Error("Expected embodied retained companion fixture.");
    }
    return {
      ...manifestation,
      hitPoints: {
        currentHp: expectRight(
          parseCharacterSheetRetainedCompanionCurrentHitPoints(input.currentHp),
        ),
        tempHp: input.tempHp,
      },
    };
  });
}

function retainedCompanionSheetWithManifestation(
  sheet: CharacterSheet,
  manifestation: (
    current: CharacterSheetRetainedCompanionManifestation,
  ) => CharacterSheetRetainedCompanionManifestation,
): CharacterSheet {
  const companion = characterSheetCompanion(sheet);
  if (companion.tag !== "retainedOneAtATime") {
    throw new Error("Expected retained companion fixture.");
  }
  return expectRight(
    replaceCharacterSheetCompanion({
      sheet,
      companion: {
        tag: "retainedOneAtATime",
        companion: {
          ...companion.companion,
          manifestation: manifestation(companion.companion.manifestation),
        },
      },
    }),
  );
}

function unitLibraryWithSyntheticFamiliarFormCatalog(): UnitCatalog {
  const findFamiliarUnit = unitLibrary.requireUnit("find_familiar");
  if (findFamiliarUnit.kind !== "spell") {
    throw new Error("Find Familiar fixture must be a Spell.");
  }
  const syntheticCatalog = {
    ...findFamiliarUnit,
    id: authoredUnitId("synthetic_familiar_form_catalog"),
    name: "Synthetic Familiar Form Catalog",
    provenance: {
      ...findFamiliarUnit.provenance,
      section: "Synthetic Familiar Form Catalog",
    },
  } satisfies typeof findFamiliarUnit;
  return {
    getUnit: (id) =>
      id === syntheticCatalog.id
        ? Option.some(syntheticCatalog)
        : unitLibrary.getUnit(id),
    listUnits: () => [...unitLibrary.listUnits(), syntheticCatalog],
    requireUnit: (id) =>
      id === syntheticCatalog.id
        ? syntheticCatalog
        : unitLibrary.requireUnit(id),
  };
}

function unitCatalogWithoutUnitIds(...unitIds: readonly string[]): UnitCatalog {
  const omitted = new Set(unitIds);
  const result = buildUnitCatalog({
    collections: [
      {
        ...srdUnitCollection,
        units: srdUnitCollection.units.filter((unit) => !omitted.has(unit.id)),
      },
    ],
  });
  if (result.tag !== "ok") {
    throw new Error("Expected filtered test Unit catalog to build.");
  }
  return result.catalog;
}

function unitCatalogReplacingUnit(
  replacement: (typeof srdUnitCollection.units)[number],
): UnitCatalog {
  const result = buildUnitCatalog({
    collections: [
      {
        ...srdUnitCollection,
        units: srdUnitCollection.units.map((unit) =>
          unit.id === replacement.id ? replacement : unit,
        ),
      },
    ],
  });
  if (result.tag !== "ok") {
    throw new Error("Expected replaced test Unit catalog to build.");
  }
  return result.catalog;
}

function testSorcererMetamagicOptionId(optionId: string) {
  return expectRight(sorcererMetamagicOptionId(optionId));
}

function settleHandoffBranchToCharacterSheet(
  input: Omit<
    Parameters<typeof settleCharacterSheetFromBattle>[0],
    "state" | "context"
  > & {
    readonly context?: BattleRuntimeContext;
    readonly resourceOwnership?: readonly CharacterBattleResourceOwnership[];
  },
): ReturnType<typeof settleCharacterSheetFromBattle> {
  const session = handoffBranchSession(
    input.combatant,
    input.resourceOwnership,
  );
  return settleCharacterSheetFromBattle({
    sheet: input.sheet,
    state: session.state,
    context: input.context ?? session.context,
    combatant: input.combatant,
    unitLibrary: input.unitLibrary,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
}

function handoffBranchSession(
  combatant: BattleCreatureState,
  resourceOwnership: readonly CharacterBattleResourceOwnership[] = [],
): BattleRuntimeSession {
  const session = expectRight(
    startBattle({
      battleId: battleId("battle:handoff-branch"),
      combatants: [
        battleCreatureInitFromStatBlock({
          combatantId: combatant.combatantId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
        }),
      ],
    }),
  );
  return battleRuntimeSessionForTest({
    state: {
      ...session.state,
      combatants: new Map(session.state.combatants).set(
        combatant.combatantId,
        combatant,
      ),
    },
    context: battleRuntimeContextForTest(
      new Map([
        [
          combatant.combatantId,
          {
            resourceOwnership,
            spellPresentationSources: [],
            unitProcedureOwnership: [],
            unitPresentationSources: [],
          },
        ],
      ]),
    ),
  });
}

function handoffBranchCombatant(
  combatant: Omit<Partial<BattleCreatureState>, "origin"> & {
    readonly origin: Partial<
      Extract<BattleCreatureState["origin"], { readonly kind: "character" }>
    > & {
      readonly kind: "character";
      readonly characterId: ReturnType<typeof characterId>;
    };
  },
): BattleCreatureState {
  // Branch-specific handoff fixtures provide every field read before the tested
  // branch exits. BattleCreatureState's remaining fields are unreachable here.
  return {
    combatantId: combatantId("combatant:handoff-branch"),
    ...combatant,
    origin: {
      classLevels: [{ className: "fighter", level: classLevel(1) }],
      resources: [],
      ...combatant.origin,
    },
  } as BattleCreatureState;
}

function parsedClassLevelsForTest(
  className: Parameters<
    typeof parseCharacterBattleClassLevels
  >[0][number]["className"],
  level: number,
) {
  const result = parseCharacterBattleClassLevels([{ className, level }]);
  if (Either.isLeft(result)) {
    throw new Error(result.left.messages.join("; "));
  }
  return result.right;
}
