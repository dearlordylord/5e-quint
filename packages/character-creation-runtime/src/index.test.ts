import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";
import { Either, Option } from "effect";
import fc from "fast-check";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type {
  ProficiencyGrant,
  ProficiencyGrantSubject,
  ToolProficiencyGrant,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";

import {
  characterDraftId,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterBuildDruidWildShapeFacts,
  characterBuildMonkUncannyMetabolismFacts,
  characterBuildMonksFocusFacts,
  characterBuildHitPoints,
  characterBuildProficiencies,
  characterBuildResources,
  DRUID_WILD_SHAPE_UNIT_ID,
  MONK_MARTIAL_ARTS_UNIT_ID,
  MONK_MONKS_FOCUS_UNIT_ID,
  MONK_UNCANNY_METABOLISM_UNIT_ID,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  SORCERER_METAMAGIC_UNIT_ID,
  exactChoiceCardinality,
  boundedChoiceCardinality,
  choiceCardinalityBounds,
  characterBuildUnitRefs,
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  computeTotalLevel,
  CHARACTER_EQUIPMENT_ITEM_SLOTS,
  LOADOUT_SLOTS,
  SRD_ELDRITCH_INVOCATION_OPTIONS,
  UNIT_CHOICE_KEYS,
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  createCharacterDraft,
  characterDraconicAncestrySelection,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  draftRevision,
  eldritchInvocationId,
  fillCreationHoles,
  finalizeCharacterDraft,
  fighterLevelGainWithFightingStyleReplacement,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  loadoutSourceKey,
  parseCharacterEquipmentItemId,
  parseCharacterDraft,
  parseCreationHoleId,
  parseLoadoutSourceKey,
  parseUnitChoiceSourceKey,
  replaceDruidWildShapeKnownForm,
  sorcererMetamagicOptionId,
  sorcererLevelGain,
  startingClassUnitId,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  warlockLevelGain,
  type CharacterDraft,
  type CharacterChoiceSelection,
  type CharacterBuild,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildWarlockEldritchInvocationSelectionInput,
  type CharacterBuildWarlockPactMagicLevelGain,
  type CharacterBuildProficiencies,
  type ChoiceCardinality,
  type CreationFill,
  type CreationChoiceOptionId,
  type CreationFillIssue,
  type CreationHole,
  type CreationHoleIdText,
  type AbilityScoreAssignment,
  type CharacterEquipmentItemSlot,
  type LoadoutSlot,
  type UnitCatalog,
  type CharacterProgression,
  type CharacterBuildClassLevelGain,
  type ClassHitPointRule,
  type UnitChoiceKey,
} from "./index.ts";
import {
  classFeatureGrantChoiceHoles,
  selectedClassFeatureAcquisitionGrantChoiceHoles,
} from "./discovery.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import { classUnitId } from "./character-progression-types.ts";
import {
  applyBackgroundAbilityScoreIncrease,
  buildCharacterBuild,
  finalizedBuildEquipment,
  supportedChoiceHolesBySource,
} from "./finalization.ts";
import { qntLoadoutSlot } from "./qnt-loadout-bridge.test-support.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  supportedHoleOptionIds,
  type SupportedLoadoutChoice,
} from "./support-gates.ts";
import {
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  PALADIN_FIGHTING_STYLE_CHOICE_KEY,
  RANGER_FIGHTING_STYLE_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
  abilityScoreIncreaseChoiceOptions,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  progressionOptionId,
  CLASS_SUBCLASS_CHOICE_KEY,
  SRD_LEVEL_ONE_CLASS_UNIT_IDS,
  SRD_LEVEL_THREE_SUBCLASS_UNIT_IDS,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  decodeAbilityScoreIncreaseOptionId,
  decodeProficiencyGrantSubjectOptionId,
  proficiencyGrantSubjectOption,
} from "./choice-option-codecs.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const SRD_SORCERY_POINTS_POOL_ID = "sorcery_points";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-feat-choice
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.weapon-mastery-choice
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.eldritch-invocation-choice
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-option-projection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.skill-expertise-choice
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-advancement-replacement
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.warlock-pact-magic-advancement
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-resource-projection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-source-fact-projection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.hit-point-maximum-projection
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.hunters-prey
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A15 barbarian_primal_knowledge sorcerer_draconic_resilience
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-03 fighter_fighting_style
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE warlock_eldritch_invocations
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12FS-WARLOCK-PACT-MAGIC-RETAINED-GRANT warlock_pact_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-06 cleric_divine_order druid_primal_order
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-PALADIN-FIGHTING-STYLE paladin_fighting_style
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-RANGER-FIGHTING-STYLE ranger_deft_explorer ranger_fighting_style
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection AT-L1-07 rogue_expertise
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-CLERIC-CHANNEL-DIVINITY cleric_channel_divinity
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A17 paladin_channel_divinity
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-CHARACTER-FACTS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-CHARACTER-FACTS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-UNCANNY-METABOLISM-CHARACTER-FACTS monk_uncanny_metabolism
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-FONT-RESOURCE-FACTS sorcerer_font_of_magic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SORCERER-METAMAGIC-CHARACTER-FACTS sorcerer_metamagic
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME ranger_hunters_prey

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "SRD Stat Block catalog test fixture must build successfully.",
  );
}

const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const sorcererFontOfMagicResourceFactsTestName =
  "projects Sorcerer 2 Font of Magic shared Sorcery Point resource facts";
const druidWildShapeFixtureKnownFormStatBlockIds = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
] as const;

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }
  expect(Either.isRight(result)).toBe(true);

  return result.right;
}

function finalizedCompleteManifestBuild(): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeManifestDraft(),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected complete manifest finalization to be ready, received ${result.tag}`,
    );
  }

  return result.build;
}

function testClassUnitId(classUnitId: UnitRecord["id"]) {
  return expectRight(classUnitIdFromUnitId({ unitLibrary, classUnitId }));
}

function finalizedWarlockBuild(draftId: string): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeSupportedProgressionDraft({
      draftId,
      progression: testProgression("class_warlock", 1),
    }),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected Warlock finalization to be ready, received ${result.tag}`,
    );
  }

  return result.build;
}

function finalizedSorcererMetamagicBuild(draftId: string): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeSupportedProgressionDraft({
      draftId,
      progression: testProgression("class_sorcerer", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          SORCERER_METAMAGIC_UNIT_ID,
          SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("sorcerer_empowered_spell"),
          creationChoiceOptionId("sorcerer_heightened_spell"),
        ],
      },
    }),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected Sorcerer finalization to be ready, received ${result.tag}`,
    );
  }

  return result.build;
}

function warlockSpellcastingSourceWithKnownCantrips(
  cantripIds: readonly UnitRecord["id"][],
): NonNullable<CharacterBuild["spellcasting"]>["sources"][number] {
  const classFacts = readableClassFacts("class_warlock");
  if (
    !("spellcasting" in classFacts) ||
    classFacts.spellcasting.kind !== "pact_magic_spellcasting_creation"
  ) {
    throw new Error("Expected Warlock Pact Magic spellcasting facts.");
  }
  const spellcasting = classFacts.spellcasting;

  return {
    sourceUnitId: "class_warlock",
    spellcastingAbility: spellcasting.spellcastingAbility,
    cantrips: cantripIds,
    spellbook: [],
    preparedSpells: [],
    spellcastingFocuses: [spellcasting.spellcastingFocus],
  };
}

function warlockBuildWithKnownWarlockCantrips(
  build: CharacterBuild,
  cantripIds: readonly UnitRecord["id"][],
): CharacterBuild {
  const warlockSource = warlockSpellcastingSourceWithKnownCantrips(cantripIds);
  if (build.spellcasting === undefined) {
    return {
      ...build,
      spellcasting: {
        sources: [warlockSource],
        slotPools: {},
      },
    };
  }
  const spellcasting = build.spellcasting;
  const firstSource = spellcasting.sources[0];
  if (firstSource === undefined) {
    throw new Error("Warlock test build must have a spellcasting source.");
  }
  const withCantrips = (
    source: (typeof spellcasting.sources)[number],
  ): (typeof spellcasting.sources)[number] => {
    if (source.sourceUnitId !== "class_warlock") return source;

    const nextCantrips = [
      ...cantripIds,
      ...source.cantrips.filter((cantripId) => !cantripIds.includes(cantripId)),
    ].slice(0, source.cantrips.length);
    return { ...source, cantrips: nextCantrips };
  };
  const hasWarlockSource = spellcasting.sources.some(
    (source) => source.sourceUnitId === "class_warlock",
  );

  return {
    ...build,
    spellcasting: {
      ...spellcasting,
      sources: hasWarlockSource
        ? [
            withCantrips(firstSource),
            ...spellcasting.sources.slice(1).map(withCantrips),
          ]
        : [warlockSource, ...spellcasting.sources],
    },
  };
}

function nonRepeatableEldritchInvocation(
  invocationId: string,
): CharacterBuildWarlockEldritchInvocationSelectionInput {
  return {
    kind: "nonRepeatable",
    invocationId: eldritchInvocationId(invocationId),
  };
}

function repeatableEldritchInvocation(
  invocationId: string,
  repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice,
): CharacterBuildWarlockEldritchInvocationSelectionInput {
  return {
    kind: "repeatable",
    invocationId: eldritchInvocationId(invocationId),
    repeatableChoice,
  };
}

function warlockPactMagicLevelGain(
  input: Partial<CharacterBuildWarlockPactMagicLevelGain> = {},
): CharacterBuildWarlockPactMagicLevelGain {
  return {
    gainedCantrips: input.gainedCantrips ?? [],
    ...(input.cantripReplacement === undefined
      ? {}
      : { cantripReplacement: input.cantripReplacement }),
    gainedPreparedSpells: input.gainedPreparedSpells ?? [],
    ...(input.preparedSpellReplacement === undefined
      ? {}
      : { preparedSpellReplacement: input.preparedSpellReplacement }),
  };
}

function warlockLevelFiveBuildWithThirstingBlade(): CharacterBuild {
  const warlockClassUnitId = testClassUnitId("class_warlock");
  const levelTwo = expectRight(
    advanceCharacterBuildClassLevel({
      build: finalizedWarlockBuild("draft:warlock-level-five-source"),
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["hex"],
          }),
          gainedInvocations: [
            nonRepeatableEldritchInvocation("pact_of_the_blade"),
            nonRepeatableEldritchInvocation("devils_sight"),
          ],
        }),
      ),
    }),
  );
  const levelThree = expectRight(
    advanceCharacterBuildClassLevel({
      build: levelTwo,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["bane"],
          }),
          gainedInvocations: [],
        }),
      ),
    }),
  );
  const levelFour = expectRight(
    advanceCharacterBuildClassLevel({
      build: levelThree,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedCantrips: ["poison_spray"],
            gainedPreparedSpells: ["detect_magic"],
          }),
          gainedInvocations: [],
        }),
      ),
    }),
  );

  return expectRight(
    advanceCharacterBuildClassLevel({
      build: levelFour,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId,
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["expeditious_retreat"],
          }),
          gainedInvocations: [
            nonRepeatableEldritchInvocation("thirsting_blade"),
            nonRepeatableEldritchInvocation("eldritch_mind"),
          ],
        }),
      ),
    }),
  );
}

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  hitPointRule: ClassHitPointRule = classLevel === 1
    ? { tag: "levelOneMaximumHitDie" }
    : { tag: "fixedHigherLevelGain" },
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  if (classLevel === 1 && hitPointRule.tag !== "levelOneMaximumHitDie") {
    throw new Error("Invalid test progression: level 1 requires maximum HP.");
  }
  if (classLevel > 1 && hitPointRule.tag !== "fixedHigherLevelGain") {
    throw new Error(
      "Invalid test progression: post-start levels require fixed HP.",
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.right,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test progression: ${JSON.stringify(result.left)}`);
  }

  return result.right;
}

function unitChoiceKeyRight(value: string) {
  const result = unitChoiceKey(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test Unit choice key: ${value}`);
  }
  return result.right;
}

function unitChoiceSourceUnitIdRight(value: string) {
  const result = unitChoiceSourceUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test Unit choice source Unit id: ${value}`);
  }
  return result.right;
}

function loadoutEquipmentUnitIdRight(value: string) {
  const result = loadoutEquipmentUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test loadout equipment Unit id: ${value}`);
  }
  return result.right;
}

function characterEquipmentItemUnitIdRight(value: string) {
  const result = characterEquipmentItemUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(
      `Invalid test CharacterBuild equipment item Unit id: ${value}`,
    );
  }
  return result.right;
}

function testCharacterEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(slot: Slot, unitId: string) {
  return characterEquipmentItemId({
    slot,
    unitId: characterEquipmentItemUnitIdRight(unitId),
  });
}

function testUnitChoiceSourceKey(unitId: string, choiceKey: string) {
  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: unitChoiceSourceUnitIdRight(unitId),
    choiceKey: unitChoiceKeyRight(choiceKey),
  });
}

function testLoadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: loadoutEquipmentUnitIdRight(equipmentUnitId),
    slot,
  });
}

function testUnitHoleId(unitId: string, choiceKey: string): CreationHoleIdText {
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: unitChoiceSourceUnitIdRight(unitId),
    choiceKey: unitChoiceKeyRight(choiceKey),
  });
}

function choiceCardinalityRight(
  cardinality: ChoiceCardinality | undefined,
): ChoiceCardinality {
  if (cardinality === undefined) {
    throw new Error("Invalid test choice cardinality.");
  }
  return cardinality;
}

describe("CharacterDraft parser", () => {
  test("accepts persisted promoted draft JSON", () => {
    const draft = createCharacterDraft({
      draftId: characterDraftId("test:stored-draft"),
    });

    expect(parseCharacterDraft(JSON.parse(JSON.stringify(draft)))).toEqual(
      Either.right(draft),
    );
  });

  test("rejects malformed nested selection data", () => {
    const draft = createCharacterDraft({
      draftId: characterDraftId("test:malformed-stored-draft"),
    });

    expect(
      parseCharacterDraft({
        ...draft,
        selections: {
          choices: [{ kind: "unitChoice", source: { tag: "unitChoice" } }],
        },
      }),
    ).toEqual(
      Either.left({
        tag: "invalidCharacterDraft",
        path: "$.selections.choices[0].source.unitId",
        message: "Expected a string.",
      }),
    );
  });
});

describe("UnitChoiceSourceKey", () => {
  const sourceUnitIdText = fc.string({ minLength: 1, maxLength: 40 });
  const unitChoiceKeyText = fc.constantFrom(...UNIT_CHOICE_KEYS);

  test("preserves source facts through the source/key isomorphism", () => {
    const source = {
      tag: "unitChoice" as const,
      unitId: unitChoiceSourceUnitIdRight("class:custom:fighter"),
      choiceKey: unitChoiceKeyRight("class_skill_proficiency_choice"),
    };

    const key = unitChoiceSourceKey(source);
    const parsed = expectRight(parseUnitChoiceSourceKey(key));

    expect(parsed).toEqual(source);
    expect(unitChoiceSourceKey(parsed)).toBe(key);
  });

  test("rejects the old separator-based Unit-source hole id", () => {
    expect(
      parseCreationHoleId(
        "cc:unit:class_fighter:class_skill_proficiency_choice",
      ),
    ).toBeNull();
  });

  test("returns typed issues for invalid source keys", () => {
    expect(
      parseUnitChoiceSourceKey("u:13:class_fighter:c:not_a_choice"),
    ).toEqual(
      Either.left({
        tag: "unitChoiceSourceKeyUnsupportedChoiceKey",
        value: "u:13:class_fighter:c:not_a_choice",
        choiceKey: "not_a_choice",
      }),
    );
  });

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(
        sourceUnitIdText,
        unitChoiceKeyText,
        (unitIdText, choiceKey) => {
          const source = {
            tag: "unitChoice" as const,
            unitId: unitChoiceSourceUnitIdRight(unitIdText),
            choiceKey,
          };
          const key = unitChoiceSourceKey(source);
          const parsed = expectRight(parseUnitChoiceSourceKey(key));

          expect(parsed).toEqual(source);
          expect(unitChoiceSourceKey(parsed)).toBe(key);
        },
      ),
    );
  });
});

describe("LoadoutSourceKey", () => {
  const equipmentUnitIdText = fc.string({ minLength: 1, maxLength: 40 });
  const loadoutSlot = fc.constantFrom(...LOADOUT_SLOTS);

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(equipmentUnitIdText, loadoutSlot, (equipmentUnitId, slot) => {
        const source = {
          tag: "loadout" as const,
          equipmentUnitId: loadoutEquipmentUnitIdRight(equipmentUnitId),
          slot,
        };
        const key = loadoutSourceKey(source);
        const parsed = expectRight(parseLoadoutSourceKey(key));

        expect(parsed).toEqual(source);
        expect(loadoutSourceKey(parsed)).toBe(key);
      }),
    );
  });

  test("rejects unsupported loadout slots with typed issues", () => {
    expect(parseLoadoutSourceKey("e:16:armor_chain_mail:s:carried")).toEqual(
      Either.left({
        tag: "loadoutSourceKeyUnsupportedSlot",
        value: "e:16:armor_chain_mail:s:carried",
        slot: "carried",
      }),
    );
  });
});

describe("CharacterEquipmentItemId", () => {
  const itemSlot = fc.constantFrom(...CHARACTER_EQUIPMENT_ITEM_SLOTS);
  const itemUnitIdText = fc.string({ minLength: 1, maxLength: 40 });

  test("satisfies source/key isomorphism laws", () => {
    fc.assert(
      fc.property(itemSlot, itemUnitIdText, (slot, unitIdText) => {
        const source = {
          slot,
          unitId: characterEquipmentItemUnitIdRight(unitIdText),
        };
        const itemId = characterEquipmentItemId(source);
        const parsed = expectRight(parseCharacterEquipmentItemId(itemId));

        expect(parsed).toEqual(source);
        expect(characterEquipmentItemId(parsed)).toBe(itemId);
      }),
    );
  });

  test("preserves separator-like characters in authored Unit ids", () => {
    const source = {
      slot: "main" as const,
      unitId: characterEquipmentItemUnitIdRight("weapon:custom:blade"),
    };
    const itemId = characterEquipmentItemId(source);

    expect(itemId).toBe("main:weapon:custom:blade");
    expect(expectRight(parseCharacterEquipmentItemId(itemId))).toEqual(source);
  });

  test("returns typed issues for invalid item ids", () => {
    expect(parseCharacterEquipmentItemId("carried:weapon_longsword")).toEqual(
      Either.left({
        tag: "characterEquipmentItemIdSlotUnsupported",
        value: "carried:weapon_longsword",
      }),
    );
    expect(parseCharacterEquipmentItemId("main:")).toEqual(
      Either.left({
        tag: "characterEquipmentItemIdUnitIdEmpty",
        value: "main:",
        slot: "main",
      }),
    );
  });
});

const packageRootPath = fileURLToPath(new URL("../", import.meta.url));
const characterCreationRuntimeSliceTestsPath = fileURLToPath(
  new URL("../character-creation-runtime-slice-tests.qnt", import.meta.url),
);

describe("character creation hole discovery", () => {
  test("rejects unknown Unit choice keys at the protocol boundary", () => {
    expect(unitChoiceKey("future_choice")).toEqual(
      Either.left({
        tag: "unsupportedUnitChoiceKey",
        value: "future_choice",
      }),
    );
  });

  test("discovers the initial manifest draft holes from Surface records", () => {
    const draft = createCharacterDraft({
      unitLibrary,
      draftId: characterDraftId("draft:initial"),
    });
    const holes = discoverCreationHoles({ draft, unitLibrary });

    expect(holeSummary(holes)).toEqual([
      [
        "choice",
        "cc:draft:draft.progression.initial",
        [
          "15:class_barbarian:level_1:maximum_hit_die",
          "15:class_barbarian|15:class_barbarian|15:class_barbarian:level_3:fixed_hp_gain",
          "10:class_bard:level_1:maximum_hit_die",
          "10:class_bard|10:class_bard|10:class_bard:level_3:fixed_hp_gain",
          "10:class_bard|10:class_bard:level_2:fixed_hp_gain",
          "12:class_cleric:level_1:maximum_hit_die",
          "12:class_cleric|12:class_cleric|12:class_cleric:level_3:fixed_hp_gain",
          "12:class_cleric|12:class_cleric:level_2:fixed_hp_gain",
          "11:class_druid:level_1:maximum_hit_die",
          "11:class_druid|11:class_druid|11:class_druid:level_3:fixed_hp_gain",
          "11:class_druid|11:class_druid:level_2:fixed_hp_gain",
          "13:class_fighter:level_1:maximum_hit_die",
          "13:class_fighter|13:class_fighter|13:class_fighter:level_3:fixed_hp_gain",
          "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
          "13:class_fighter|15:class_barbarian:level_2:fixed_hp_gain",
          "13:class_fighter|10:class_bard:level_2:fixed_hp_gain",
          "13:class_fighter|12:class_cleric:level_2:fixed_hp_gain",
          "13:class_fighter|11:class_druid:level_2:fixed_hp_gain",
          "13:class_fighter|10:class_monk:level_2:fixed_hp_gain",
          "13:class_fighter|13:class_paladin:level_2:fixed_hp_gain",
          "13:class_fighter|12:class_ranger:level_2:fixed_hp_gain",
          "13:class_fighter|11:class_rogue:level_2:fixed_hp_gain",
          "13:class_fighter|14:class_sorcerer:level_2:fixed_hp_gain",
          "13:class_fighter|13:class_warlock:level_2:fixed_hp_gain",
          "13:class_fighter|12:class_wizard:level_2:fixed_hp_gain",
          "10:class_monk:level_1:maximum_hit_die",
          "10:class_monk|10:class_monk|10:class_monk:level_3:fixed_hp_gain",
          "10:class_monk|10:class_monk:level_2:fixed_hp_gain",
          "13:class_paladin:level_1:maximum_hit_die",
          "13:class_paladin|13:class_paladin|13:class_paladin:level_3:fixed_hp_gain",
          "13:class_paladin|13:class_paladin:level_2:fixed_hp_gain",
          "12:class_ranger:level_1:maximum_hit_die",
          "12:class_ranger|12:class_ranger|12:class_ranger:level_3:fixed_hp_gain",
          "12:class_ranger|12:class_ranger:level_2:fixed_hp_gain",
          "11:class_rogue:level_1:maximum_hit_die",
          "11:class_rogue|11:class_rogue|11:class_rogue:level_3:fixed_hp_gain",
          "11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue|11:class_rogue:level_6:fixed_hp_gain",
          "14:class_sorcerer:level_1:maximum_hit_die",
          "14:class_sorcerer|14:class_sorcerer|14:class_sorcerer:level_3:fixed_hp_gain",
          "14:class_sorcerer|14:class_sorcerer:level_2:fixed_hp_gain",
          "13:class_warlock:level_1:maximum_hit_die",
          "13:class_warlock|13:class_warlock|13:class_warlock:level_3:fixed_hp_gain",
          "12:class_wizard:level_1:maximum_hit_die",
          "12:class_wizard|12:class_wizard|12:class_wizard:level_3:fixed_hp_gain",
          "12:class_wizard|12:class_wizard:level_2:fixed_hp_gain",
          "12:class_wizard|13:class_fighter:level_2:fixed_hp_gain",
        ],
      ],
      [
        "choice",
        "cc:draft:draft.background",
        [
          "background_acolyte",
          "background_criminal",
          "background_sage",
          "background_soldier",
        ],
      ],
      [
        "choice",
        "cc:draft:draft.species",
        [
          "species_dragonborn",
          "species_dwarf",
          "species_elf",
          "species_goliath",
          "species_orc",
          "species_tiefling",
        ],
      ],
      [
        "abilityScores",
        "cc:draft:draft.abilityScoreGeneration",
        ["standardArray", "pointBuy"],
      ],
      [
        "choice",
        "cc:draft:draft.languages",
        [
          "Common Sign Language",
          "Draconic",
          "Dwarvish",
          "Elvish",
          "Giant",
          "Gnomish",
          "Goblin",
          "Halfling",
          "Orc",
        ],
      ],
      [
        "choice",
        "cc:draft:draft.alignment",
        [
          "lawful_good",
          "neutral_good",
          "chaotic_good",
          "lawful_neutral",
          "neutral_neutral",
          "chaotic_neutral",
          "lawful_evil",
          "neutral_evil",
          "chaotic_evil",
        ],
      ],
    ]);
  });

  test("discovers legal catalog width while support gates reject unsupported choices", () => {
    const widenedUnitCatalog = unitLibraryWithUnrelatedUnits(48);
    const draft = createCharacterDraft({
      unitLibrary: widenedUnitCatalog,
      draftId: characterDraftId("draft:widened-catalog"),
    });
    const holes = discoverCreationHoles({
      draft,
      unitLibrary: widenedUnitCatalog,
    });

    expect(
      optionIds(holeById(holes, "cc:draft:draft.progression.initial")),
    ).toContain("17:class_unrelated_0:level_1:maximum_hit_die");
    expect(optionIds(holeById(holes, "cc:draft:draft.background"))).toContain(
      "background_unrelated_0",
    );
    expect(optionIds(holeById(holes, "cc:draft:draft.species"))).toContain(
      "species_unrelated_0",
    );

    const result = fillCreationHoles({
      draft,
      unitLibrary: widenedUnitCatalog,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "17:class_unrelated_0:level_1:maximum_hit_die",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "unsupportedChoice",
          message:
            "Unsupported choice 17:class_unrelated_0:level_1:maximum_hit_die for character creation hole: cc:draft:draft.progression.initial",
        },
      ],
    });
  });

  test("opens Fighter holes after the class selection", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:draft:draft.progression.initial"),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
      options: [
        { optionId: "acrobatics" },
        { optionId: "animal_handling" },
        { optionId: "athletics" },
        { optionId: "history" },
        { optionId: "insight" },
        { optionId: "intimidation" },
        { optionId: "persuasion" },
        { optionId: "perception" },
        { optionId: "survival" },
      ],
    });
    const fightingStyleHole = holeById(
      holes,
      testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
    );
    expect(fightingStyleHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(fightingStyleHole)).toEqual(
      expect.arrayContaining(["defense"]),
    );
    const weaponMasteryHole = holeById(
      holes,
      testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
    );
    expect(weaponMasteryHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 3 },
    });
    expect(optionIds(weaponMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ]),
    );
    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      optionIds(
        holeById(
          holes,
          testUnitHoleId("class_fighter", "class_equipment_choice"),
        ),
      ),
    ).toEqual(["option_a", "option_b", "option_c"]);
  });

  test("models Paladin Fighting Style as a feat or Blessed Warrior acquisition choice", () => {
    const paladinFacts = readClassCreationFacts(
      unitLibrary.requireUnit("class_paladin"),
    );
    expect(paladinFacts.tag).toBe("readable");
    if (paladinFacts.tag !== "readable") return;
    expect(paladinFacts.value.featureGrants).toEqual(
      expect.arrayContaining([{ level: 2, unitId: "paladin_fighting_style" }]),
    );

    const branchHole = classFeatureGrantChoiceHoles(
      "paladin_fighting_style",
      unitLibrary,
      { classLevel: 2 },
    )[0];
    expect(branchHole).toBeDefined();
    if (branchHole === undefined) return;
    expect(branchHole).toMatchObject({
      kind: "choice",
      source: {
        unitId: "paladin_fighting_style",
        choiceKey: PALADIN_FIGHTING_STYLE_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(branchHole)).toEqual([
      "fighting_style_feat",
      "blessed_warrior",
    ]);
    expect(supportedHoleOptionIds(branchHole)).toEqual([
      "fighting_style_feat",
      "blessed_warrior",
    ]);

    const featBranchHoles = selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: [
        selectedChoice(
          "paladin_fighting_style",
          PALADIN_FIGHTING_STYLE_CHOICE_KEY,
          "fighting_style_feat",
        ),
      ],
      classUnitId: "class_paladin",
      classFacts: paladinFacts.value,
      classLevel: 2,
      unitLibrary,
    });
    expect(featBranchHoles[0]).toBeDefined();
    if (featBranchHoles[0] === undefined) return;
    expect(featBranchHoles[0]).toMatchObject({
      kind: "choice",
      source: {
        unitId: "paladin_fighting_style",
        choiceKey: CLASS_FEATURE_FEAT_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(featBranchHoles[0])).toEqual(
      expect.arrayContaining(["defense", "feat_archery"]),
    );

    const blessedWarriorHoles = selectedClassFeatureAcquisitionGrantChoiceHoles(
      {
        choices: [
          selectedChoice(
            "paladin_fighting_style",
            PALADIN_FIGHTING_STYLE_CHOICE_KEY,
            "blessed_warrior",
          ),
        ],
        classUnitId: "class_paladin",
        classFacts: paladinFacts.value,
        classLevel: 2,
        unitLibrary,
      },
    );
    expect(blessedWarriorHoles[0]).toBeDefined();
    if (blessedWarriorHoles[0] === undefined) return;
    expect(blessedWarriorHoles[0]).toMatchObject({
      kind: "choice",
      source: {
        unitId: "paladin_fighting_style",
        choiceKey: CLASS_CANTRIP_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(optionIds(blessedWarriorHoles[0])).toEqual(
      expect.arrayContaining(["guidance", "sacred_flame"]),
    );
    expect(optionIds(blessedWarriorHoles[0])).not.toContain("fire_bolt");
  });

  test("fills and finalizes Paladin level 2 Fighting Style branches through the supported workflow", () => {
    const progression = testProgression("class_paladin", 2);
    const initialDraft = createTestDraft(
      "draft:paladin-fighting-style-initial",
    );
    expect(
      optionIds(
        holeById(
          discoverCreationHoles({ draft: initialDraft, unitLibrary }),
          "cc:draft:draft.progression.initial",
        ),
      ),
    ).toContain(progressionOptionId(progression));
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft: initialDraft,
        unitLibrary,
        expectedRevision: initialDraft.revision,
        fills: initialManifestFills(progressionOptionId(progression)),
      }),
    );
    expect(
      holeById(
        discoverCreationHoles({ draft: afterInitial, unitLibrary }),
        testUnitHoleId(
          "paladin_fighting_style",
          PALADIN_FIGHTING_STYLE_CHOICE_KEY,
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });

    const featDraft = completeSupportedProgressionDraft({
      draftId: "draft:paladin-fighting-style-feat",
      progression,
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "paladin_fighting_style",
          PALADIN_FIGHTING_STYLE_CHOICE_KEY,
        )]: [creationChoiceOptionId("fighting_style_feat")],
        [testUnitChoiceSourceKey(
          "paladin_fighting_style",
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("defense")],
      },
    });
    expect(
      selectedChoiceOptionIds(
        featDraft,
        "paladin_fighting_style",
        PALADIN_FIGHTING_STYLE_CHOICE_KEY,
      ),
    ).toEqual(["fighting_style_feat"]);
    expect(
      selectedChoiceOptionIds(
        featDraft,
        "paladin_fighting_style",
        CLASS_FEATURE_FEAT_CHOICE_KEY,
      ),
    ).toEqual(["defense"]);
    const paladinFeatBuild = finalizeCharacterDraft({
      draft: featDraft,
      unitLibrary,
    });
    expect(paladinFeatBuild.tag).toBe("ready");
    if (paladinFeatBuild.tag !== "ready") return;
    expect(
      characterBuildFeatureUnitIds(paladinFeatBuild.build, unitLibrary),
    ).toEqual(expect.arrayContaining(["paladin_fighting_style", "defense"]));
    expect(
      selectedBuildClassChoiceUnitIds(
        paladinFeatBuild.build,
        "paladin_fighting_style",
      ),
    ).toEqual(["defense"]);

    const blessedWarriorDraft = completeSupportedProgressionDraft({
      draftId: "draft:paladin-fighting-style-blessed-warrior",
      progression,
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "paladin_fighting_style",
          PALADIN_FIGHTING_STYLE_CHOICE_KEY,
        )]: [creationChoiceOptionId("blessed_warrior")],
        [testUnitChoiceSourceKey(
          "paladin_fighting_style",
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("guidance"),
          creationChoiceOptionId("sacred_flame"),
        ],
      },
    });
    expect(
      selectedChoiceOptionIds(
        blessedWarriorDraft,
        "paladin_fighting_style",
        PALADIN_FIGHTING_STYLE_CHOICE_KEY,
      ),
    ).toEqual(["blessed_warrior"]);
    expect(
      selectedChoiceOptionIds(
        blessedWarriorDraft,
        "paladin_fighting_style",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["guidance", "sacred_flame"]);
    const blessedWarriorBuild = finalizeCharacterDraft({
      draft: blessedWarriorDraft,
      unitLibrary,
    });
    expect(blessedWarriorBuild.tag).toBe("ready");
    if (blessedWarriorBuild.tag !== "ready") return;
    expect(
      spellcastingSourceCantrips(blessedWarriorBuild.build, "class_paladin"),
    ).toEqual(["guidance", "sacred_flame"]);
    expect(
      blessedWarriorBuild.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_paladin",
      )?.spellcastingAbility,
    ).toBe("cha");
  });

  test("models Ranger level 2 Deft Explorer and Fighting Style acquisition choices", () => {
    const rangerFacts = readClassCreationFacts(
      unitLibrary.requireUnit("class_ranger"),
    );
    expect(rangerFacts.tag).toBe("readable");
    if (rangerFacts.tag !== "readable") return;
    expect(rangerFacts.value.featureGrants).toEqual(
      expect.arrayContaining([
        { level: 2, unitId: "ranger_deft_explorer" },
        { level: 2, unitId: "ranger_fighting_style" },
      ]),
    );
    if (
      !("spellcasting" in rangerFacts.value) ||
      rangerFacts.value.spellcasting.kind !==
        "list_prepared_spellcasting_progression_creation"
    ) {
      throw new Error("Expected Ranger level-scaled spellcasting facts.");
    }
    expect(rangerFacts.value.spellcasting.spellcastingProgression).toEqual(
      expect.arrayContaining([
        {
          atLevel: 2,
          cantripCount: 0,
          preparedSpellCount: 3,
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      ]),
    );

    const deftHoles = classFeatureGrantChoiceHoles(
      "ranger_deft_explorer",
      unitLibrary,
      {
        classLevel: 2,
        knownLanguages: ["Common", "Dwarvish", "Goblin"],
        ownedSkillProficiencies: ["perception", "survival"],
      },
    );
    expect(deftHoles).toHaveLength(2);
    const deftExpertiseHole = deftHoles.find(
      (hole) =>
        hole.source.tag === "unitChoice" &&
        hole.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );
    const deftLanguageHole = deftHoles.find(
      (hole) =>
        hole.source.tag === "unitChoice" &&
        hole.source.choiceKey === CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
    );
    expect(deftExpertiseHole).toMatchObject({
      kind: "choice",
      source: {
        unitId: "ranger_deft_explorer",
        choiceKey: CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(deftExpertiseHole)).toEqual(["perception", "survival"]);
    expect(deftLanguageHole).toMatchObject({
      kind: "choice",
      source: {
        unitId: "ranger_deft_explorer",
        choiceKey: CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(optionIds(deftLanguageHole)).toEqual(
      expect.arrayContaining(["Elvish", "Gnomish"]),
    );

    const branchHole = classFeatureGrantChoiceHoles(
      "ranger_fighting_style",
      unitLibrary,
      { classLevel: 2 },
    )[0];
    expect(branchHole).toBeDefined();
    if (branchHole === undefined) return;
    expect(branchHole).toMatchObject({
      kind: "choice",
      source: {
        unitId: "ranger_fighting_style",
        choiceKey: RANGER_FIGHTING_STYLE_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(branchHole)).toEqual([
      "fighting_style_feat",
      "druidic_warrior",
    ]);
    expect(supportedHoleOptionIds(branchHole)).toEqual([
      "fighting_style_feat",
      "druidic_warrior",
    ]);

    const featBranchHoles = selectedClassFeatureAcquisitionGrantChoiceHoles({
      choices: [
        selectedChoice(
          "ranger_fighting_style",
          RANGER_FIGHTING_STYLE_CHOICE_KEY,
          "fighting_style_feat",
        ),
      ],
      classUnitId: "class_ranger",
      classFacts: rangerFacts.value,
      classLevel: 2,
      unitLibrary,
    });
    expect(featBranchHoles[0]).toBeDefined();
    if (featBranchHoles[0] === undefined) return;
    expect(featBranchHoles[0]).toMatchObject({
      kind: "choice",
      source: {
        unitId: "ranger_fighting_style",
        choiceKey: CLASS_FEATURE_FEAT_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(featBranchHoles[0])).toEqual(
      expect.arrayContaining(["defense", "feat_archery"]),
    );

    const druidicWarriorHoles = selectedClassFeatureAcquisitionGrantChoiceHoles(
      {
        choices: [
          selectedChoice(
            "ranger_fighting_style",
            RANGER_FIGHTING_STYLE_CHOICE_KEY,
            "druidic_warrior",
          ),
        ],
        classUnitId: "class_ranger",
        classFacts: rangerFacts.value,
        classLevel: 2,
        unitLibrary,
      },
    );
    expect(druidicWarriorHoles[0]).toBeDefined();
    if (druidicWarriorHoles[0] === undefined) return;
    expect(druidicWarriorHoles[0]).toMatchObject({
      kind: "choice",
      source: {
        unitId: "ranger_fighting_style",
        choiceKey: CLASS_CANTRIP_CHOICE_KEY,
      },
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(optionIds(druidicWarriorHoles[0])).toEqual(
      expect.arrayContaining(["guidance", "starry_wisp"]),
    );
    expect(optionIds(druidicWarriorHoles[0])).not.toContain("fire_bolt");
    expect(optionIds(druidicWarriorHoles[0])).not.toContain("sacred_flame");
  });

  test("fills and finalizes Ranger level 2 Deft Explorer and Fighting Style branches through the supported workflow", () => {
    const progression = testProgression("class_ranger", 2);
    const initialDraft = createTestDraft("draft:ranger-level-2-initial");
    expect(
      optionIds(
        holeById(
          discoverCreationHoles({ draft: initialDraft, unitLibrary }),
          "cc:draft:draft.progression.initial",
        ),
      ),
    ).toContain(progressionOptionId(progression));
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft: initialDraft,
        unitLibrary,
        expectedRevision: initialDraft.revision,
        fills: initialManifestFills(progressionOptionId(progression)),
      }),
    );
    const initialRangerHoles = discoverCreationHoles({
      draft: afterInitial,
      unitLibrary,
    });
    expect(
      holeById(
        initialRangerHoles,
        testUnitHoleId(
          "ranger_fighting_style",
          RANGER_FIGHTING_STYLE_CHOICE_KEY,
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(
        initialRangerHoles,
        testUnitHoleId(
          "ranger_deft_explorer",
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(
        initialRangerHoles,
        testUnitHoleId(
          "ranger_deft_explorer",
          CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });

    const rangerCommonChoices = {
      [testUnitChoiceSourceKey(
        "class_ranger",
        CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
      )]: [
        creationChoiceOptionId("animal_handling"),
        creationChoiceOptionId("perception"),
        creationChoiceOptionId("survival"),
      ],
      [testUnitChoiceSourceKey(
        "ranger_deft_explorer",
        CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
      )]: [creationChoiceOptionId("athletics")],
      [testUnitChoiceSourceKey(
        "ranger_deft_explorer",
        CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
      )]: [creationChoiceOptionId("Elvish"), creationChoiceOptionId("Gnomish")],
    } as const;
    const featDraft = completeSupportedProgressionDraft({
      draftId: "draft:ranger-level-2-fighting-style-feat",
      progression,
      preferredOptionIdsBySource: {
        ...rangerCommonChoices,
        [testUnitChoiceSourceKey(
          "ranger_fighting_style",
          RANGER_FIGHTING_STYLE_CHOICE_KEY,
        )]: [creationChoiceOptionId("fighting_style_feat")],
        [testUnitChoiceSourceKey(
          "ranger_fighting_style",
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("defense")],
      },
    });
    expect(
      selectedChoiceOptionIds(
        featDraft,
        "ranger_fighting_style",
        RANGER_FIGHTING_STYLE_CHOICE_KEY,
      ),
    ).toEqual(["fighting_style_feat"]);
    expect(
      selectedChoiceOptionIds(
        featDraft,
        "ranger_fighting_style",
        CLASS_FEATURE_FEAT_CHOICE_KEY,
      ),
    ).toEqual(["defense"]);
    const rangerFeatBuild = finalizeCharacterDraft({
      draft: featDraft,
      unitLibrary,
    });
    expect(rangerFeatBuild.tag).toBe("ready");
    if (rangerFeatBuild.tag !== "ready") return;
    expect(
      characterBuildFeatureUnitIds(rangerFeatBuild.build, unitLibrary),
    ).toEqual(
      expect.arrayContaining([
        "ranger_deft_explorer",
        "ranger_fighting_style",
        "defense",
      ]),
    );
    expect(
      selectedBuildClassChoiceUnitIds(
        rangerFeatBuild.build,
        "ranger_fighting_style",
      ),
    ).toEqual(["defense"]);
    expect(
      expectRight(
        characterBuildProficiencies(rangerFeatBuild.build, unitLibrary),
      ),
    ).toMatchObject({
      skills: expect.arrayContaining(["athletics"]),
      expertise: ["athletics"],
    });
    expect(rangerFeatBuild.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "ranger_deft_explorer",
        language: "Elvish",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "ranger_deft_explorer",
        language: "Gnomish",
      },
    ]);
    expect(
      rangerFeatBuild.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_ranger",
      )?.preparedSpells,
    ).toHaveLength(3);

    const druidicWarriorDraft = completeSupportedProgressionDraft({
      draftId: "draft:ranger-level-2-druidic-warrior",
      progression,
      preferredOptionIdsBySource: {
        ...rangerCommonChoices,
        [testUnitChoiceSourceKey(
          "ranger_fighting_style",
          RANGER_FIGHTING_STYLE_CHOICE_KEY,
        )]: [creationChoiceOptionId("druidic_warrior")],
        [testUnitChoiceSourceKey(
          "ranger_fighting_style",
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("guidance"),
          creationChoiceOptionId("starry_wisp"),
        ],
      },
    });
    expect(
      selectedChoiceOptionIds(
        druidicWarriorDraft,
        "ranger_fighting_style",
        RANGER_FIGHTING_STYLE_CHOICE_KEY,
      ),
    ).toEqual(["druidic_warrior"]);
    expect(
      selectedChoiceOptionIds(
        druidicWarriorDraft,
        "ranger_fighting_style",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["guidance", "starry_wisp"]);
    const druidicWarriorBuild = finalizeCharacterDraft({
      draft: druidicWarriorDraft,
      unitLibrary,
    });
    expect(druidicWarriorBuild.tag).toBe("ready");
    if (druidicWarriorBuild.tag !== "ready") return;
    expect(
      spellcastingSourceCantrips(druidicWarriorBuild.build, "class_ranger"),
    ).toEqual(["guidance", "starry_wisp"]);
    expect(
      druidicWarriorBuild.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_ranger",
      )?.spellcastingAbility,
    ).toBe("wis");
    expect(
      selectedBuildClassChoiceUnitIds(
        druidicWarriorBuild.build,
        "ranger_fighting_style",
      ),
    ).toEqual([]);
  });

  test("opens Rogue Thieves' Cant extra language choice from Character Creation language tables", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_rogue", 1),
        languages: ["Common", "Dwarvish", "Goblin"],
      }),
      unitLibrary,
    });
    const languageHole = holeById(
      holes,
      testUnitHoleId("rogue_thieves_cant", CLASS_FEATURE_LANGUAGE_CHOICE_KEY),
    );

    expect(languageHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(languageHole)).toEqual(
      expect.arrayContaining([
        "Common Sign Language",
        "Draconic",
        "Elvish",
        "Druidic",
      ]),
    );
    expect(optionIds(languageHole)).not.toContain("Common");
    expect(optionIds(languageHole)).not.toContain("Dwarvish");
    expect(optionIds(languageHole)).not.toContain("Goblin");
    expect(optionIds(languageHole)).not.toContain("Thieves' Cant");
  });

  test("reads non-Fighter Weapon Mastery holes from class proficiencies", () => {
    const barbarianMasteryHole = classFeatureGrantChoiceHoles(
      "barbarian_weapon_mastery",
      unitLibrary,
    )[0];
    expect(barbarianMasteryHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(optionIds(barbarianMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_dagger",
        "weapon_longsword",
        "weapon_spear",
      ]),
    );
    expect(optionIds(barbarianMasteryHole)).not.toContain("weapon_shortbow");

    const rogueMasteryHole = classFeatureGrantChoiceHoles(
      "rogue_weapon_mastery",
      unitLibrary,
    )[0];
    expect(rogueMasteryHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(optionIds(rogueMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_dagger",
        "weapon_shortbow",
        "weapon_shortsword",
      ]),
    );
    expect(optionIds(rogueMasteryHole)).not.toContain("weapon_flail");
    expect(optionIds(rogueMasteryHole)).not.toContain("weapon_longsword");

    for (const unitId of [
      "paladin_weapon_mastery",
      "ranger_weapon_mastery",
    ] as const) {
      const masteryHole = classFeatureGrantChoiceHoles(unitId, unitLibrary)[0];
      expect(masteryHole).toMatchObject({
        kind: "choice",
        cardinality: { tag: "exactly", count: 2 },
      });
      expect(optionIds(masteryHole)).toEqual(
        expect.arrayContaining([
          "weapon_longsword",
          "weapon_shortbow",
          "weapon_spear",
        ]),
      );
    }
  });

  test("opens Soldier holes after class and background selections", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.background")).toBeUndefined();
    const backgroundIncreaseHole = holeById(
      holes,
      testUnitHoleId("background_soldier", "background_ability_score_increase"),
    );
    expect(backgroundIncreaseHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(backgroundIncreaseHole)).toEqual(
      expect.arrayContaining(["two_and_one:str:con", "one_each"]),
    );
    const backgroundToolHole = holeById(
      holes,
      testUnitHoleId("background_soldier", "background_tool_choice"),
    );
    expect(backgroundToolHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(optionIds(backgroundToolHole)).toEqual([
      "tool_dice_set",
      "tool_dragonchess_set",
      "tool_playing_card_set",
      "tool_three_dragon_ante_set",
    ]);
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "option_a" }, { optionId: "option_b" }],
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test.each([
    {
      backgroundUnitId: "background_acolyte",
      expectedAsiOptions: [
        "two_and_one:int:wis",
        "two_and_one:int:cha",
        "two_and_one:wis:int",
        "two_and_one:wis:cha",
        "two_and_one:cha:int",
        "two_and_one:cha:wis",
        "one_each",
      ],
      expectedToolOptions: ["calligraphers_supplies"],
    },
    {
      backgroundUnitId: "background_criminal",
      expectedAsiOptions: [
        "two_and_one:dex:con",
        "two_and_one:dex:int",
        "two_and_one:con:dex",
        "two_and_one:con:int",
        "two_and_one:int:dex",
        "two_and_one:int:con",
        "one_each",
      ],
      expectedToolOptions: ["thieves_tools"],
    },
    {
      backgroundUnitId: "background_sage",
      expectedAsiOptions: [
        "two_and_one:con:int",
        "two_and_one:con:wis",
        "two_and_one:int:con",
        "two_and_one:int:wis",
        "two_and_one:wis:con",
        "two_and_one:wis:int",
        "one_each",
      ],
      expectedToolOptions: ["calligraphers_supplies"],
    },
  ] as const)(
    "opens selected Background facts for $backgroundUnitId",
    ({ backgroundUnitId, expectedAsiOptions, expectedToolOptions }) => {
      const holes = discoverCreationHoles({
        draft: draftWithSelections({
          progression: testProgression("class_fighter", 1),
          background: backgroundUnitId,
        }),
        unitLibrary,
      });

      const asiHole = requireHoleById(
        holes,
        testUnitHoleId(backgroundUnitId, "background_ability_score_increase"),
      );
      expect(optionIds(asiHole)).toEqual(expectedAsiOptions);
      expect(supportedHoleOptionIds(asiHole)).toEqual(expectedAsiOptions);

      const toolHole = requireHoleById(
        holes,
        testUnitHoleId(backgroundUnitId, "background_tool_choice"),
      );
      expect(optionIds(toolHole)).toEqual(expectedToolOptions);
      expect(supportedHoleOptionIds(toolHole)).toEqual(expectedToolOptions);

      const equipmentHole = requireHoleById(
        holes,
        testUnitHoleId(backgroundUnitId, "background_equipment_choice"),
      );
      expect(equipmentHole).toMatchObject({
        kind: "choice",
        cardinality: { tag: "exactly", count: 1 },
        options: [{ optionId: "option_a" }, { optionId: "option_b" }],
      });
      expect(supportedHoleOptionIds(equipmentHole)).toEqual(["option_b"]);
    },
  );

  test("opens purchase after the manifest coin equipment path is selected", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_equipment_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "between", min: 1, max: 3 },
      options: [
        { optionId: "armor_chain_mail" },
        { optionId: "weapon_longsword" },
        { optionId: "weapon_dagger" },
        { optionId: "weapon_flail" },
        { optionId: "equipment_shield" },
      ],
    });
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
  });

  test("does not open purchase from malformed equipment-path choice metadata", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoiceWithUnitRef(
            "class_fighter",
            "class_equipment_choice",
            "option_c",
            "armor_chain_mail",
          ),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("does not open purchase for a non-manifest background equipment path", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_a",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("reports non-coin background equipment as unsupported, not invalid", () => {
    const draft = requireAcceptedBatch(
      fillCreationHoles({
        draft: createTestDraft("draft:background-option-a"),
        unitLibrary,
        expectedRevision: draftRevision(0),
        fills: [
          choiceFill(
            "cc:draft:draft.progression.initial",
            "13:class_fighter:level_1:maximum_hit_die",
          ),
          choiceFill("cc:draft:draft.background", "background_acolyte"),
        ],
      }),
    );

    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          testUnitHoleId("background_acolyte", "background_equipment_choice"),
          "option_a",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "unsupportedChoice",
          message:
            "Unsupported choice option_a for character creation hole: cc:unit-source:u:18:background_acolyte:c:background_equipment_choice",
        },
      ],
    });
  });

  test("does not open purchase for Fighter item-bundle equipment choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_b"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_equipment_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
  });

  test("opens loadout only for purchased equipment and suppresses filled loadout slots", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
          selectedLoadoutChoice("armor_chain_mail", "armor", "worn"),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("equipment_shield", "shield")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded" }],
    });
    expect(
      holeById(holes, testLoadoutHoleId("weapon_longsword", "weapon")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("opens Flail loadout when the Skeleton-pressure bludgeoning weapon is purchased", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_flail",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testLoadoutHoleId("weapon_flail", "weapon")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("keeps malformed equipment purchase selections fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
            "tool_dice_set",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, testUnitHoleId("class_fighter", "equipment_purchase")),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "between", min: 1, max: 3 },
    });
    expect(
      holeById(holes, testLoadoutHoleId("armor_chain_mail", "armor")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("equipment_shield", "shield")),
    ).toBeUndefined();
    expect(
      holeById(holes, testLoadoutHoleId("weapon_longsword", "weapon")),
    ).toBeUndefined();
  });

  test("suppresses already-filled class and background unit-choice holes", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        choices: [
          selectedChoice(
            "class_fighter",
            "class_skill_proficiency_choice",
            "perception",
            "survival",
          ),
          selectedUnitChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
          selectedUnitChoice(
            "fighter_weapon_mastery",
            "weapon_mastery_options",
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          selectedChoice(
            "background_soldier",
            "background_tool_choice",
            "tool_dice_set",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
    expect(
      holeById(
        holes,
        testUnitHoleId("background_soldier", "background_tool_choice"),
      ),
    ).toBeUndefined();
  });

  test("keeps malformed existing choice selections fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        choices: [
          selectedChoice(
            "class_fighter",
            "class_skill_proficiency_choice",
            "perception",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
  });

  test("keeps existing choice selections with malformed unit refs fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        choices: [
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
  });

  test("suppresses Soldier ability-score increase from the typed draft field", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "str",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toBeUndefined();
  });

  test("keeps malformed typed Soldier ability-score increase fillable", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "cha",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        testUnitHoleId(
          "background_soldier",
          "background_ability_score_increase",
        ),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
    });
  });

  test("removes selected species from draft holes without adding synthetic species choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_orc",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.species")).toBeUndefined();
    expect(
      holes.some(
        (hole) =>
          hole.source.tag === "unitChoice" &&
          hole.source.unitId === "species_orc",
      ),
    ).toBe(false);
  });

  test("discovers selected species size source fact only for choice-sized species", () => {
    const fixedSpeciesHoles = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_dwarf",
      }),
      unitLibrary,
    });
    const choiceSpeciesHoles = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_tiefling",
      }),
      unitLibrary,
    });

    expect(
      holeById(fixedSpeciesHoles, "cc:draft:draft.speciesSize"),
    ).toBeUndefined();
    expect(
      optionIds(holeById(choiceSpeciesHoles, "cc:draft:draft.speciesSize")),
    ).toEqual(["medium", "small"]);
  });

  test("discovers selected Draconic Ancestry source fact only for Dragonborn", () => {
    const orcHoles = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_orc",
      }),
      unitLibrary,
    });
    const dragonbornHoles = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_dragonborn",
      }),
      unitLibrary,
    });

    expect(
      holeById(orcHoles, "cc:draft:draft.draconicAncestry"),
    ).toBeUndefined();
    expect(
      optionIds(holeById(dragonbornHoles, "cc:draft:draft.draconicAncestry")),
    ).toEqual([
      "black",
      "blue",
      "brass",
      "bronze",
      "copper",
      "gold",
      "green",
      "red",
      "silver",
      "white",
    ]);
  });
});

describe("character creation QNT slice parity", () => {
  test("Quint slice and runtime agree on manifest path and fill rejection algebra", () => {
    runQuintSliceSelfTests();

    const draft = createTestDraft("draft:qnt-parity");
    const initialHoles = discoverCreationHoles({ draft, unitLibrary });

    const afterInitial = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    });
    if (afterInitial.tag !== "accepted") {
      throw new Error("Expected the initial manifest fill to be accepted.");
    }

    const unsupportedLaterChoices = fillCreationHoles({
      draft: afterInitial.draft,
      unitLibrary,
      expectedRevision: afterInitial.draft.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "athletics",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_a",
        ),
      ],
    });
    if (unsupportedLaterChoices.tag !== "rejected") {
      throw new Error(
        "Expected later valid-but-unsupported choices to be rejected.",
      );
    }

    const complete = completeManifestDraft();
    const completeHoles = discoverCreationHoles({
      draft: complete,
      unitLibrary,
    });
    const completeFinalization = finalizeCharacterDraft({
      draft: complete,
      unitLibrary,
    });

    const invalid = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });
    if (invalid.tag !== "rejected") {
      throw new Error(
        "Expected the invalid primary-class fill to be rejected.",
      );
    }

    const unsupportedLanguage = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish", "Elvish")],
    });
    if (unsupportedLanguage.tag !== "rejected") {
      throw new Error("Expected the unsupported language fill to be rejected.");
    }

    const unsupportedAlignment = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.alignment", "neutral_good")],
    });
    if (unsupportedAlignment.tag !== "rejected") {
      throw new Error(
        "Expected the unsupported alignment fill to be rejected.",
      );
    }

    const duplicateLanguage = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish", "Dwarvish")],
    });
    if (duplicateLanguage.tag !== "rejected") {
      throw new Error("Expected the duplicate language fill to be rejected.");
    }

    const standardArrayPermutation = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 14,
            dex: 15,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
      ],
    });
    if (standardArrayPermutation.tag !== "accepted") {
      throw new Error(
        "Expected the Standard Array permutation fill to be accepted.",
      );
    }

    const pointBuyAssignment = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 13,
            dex: 13,
            con: 13,
            int: 12,
            wis: 12,
            cha: 12,
          }),
        },
      ],
    });
    if (pointBuyAssignment.tag !== "accepted") {
      throw new Error("Expected the Point Buy fill to be accepted.");
    }

    const tooFewLanguages = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [choiceFill("cc:draft:draft.languages", "Dwarvish")],
    });
    if (tooFewLanguages.tag !== "rejected") {
      throw new Error("Expected the too-few language fill to be rejected.");
    }

    const tooManyLanguages = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin", "Elvish"),
      ],
    });
    if (tooManyLanguages.tag !== "rejected") {
      throw new Error("Expected the too-many language fill to be rejected.");
    }

    const staleRevision = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draftRevision(draft.revision + 1),
      fills: [],
    });
    if (staleRevision.tag !== "rejected") {
      throw new Error("Expected the stale-revision fill to be rejected.");
    }

    runGeneratedQuintParity(
      renderQuintParityModule({
        initialHoles,
        afterInitial,
        complete,
        completeHoles,
        completeFinalization,
        invalid,
        unsupportedLanguage,
        unsupportedAlignment,
        duplicateLanguage,
        unsupportedLaterChoices,
        standardArrayPermutation,
        pointBuyAssignment,
        tooFewLanguages,
        tooManyLanguages,
        staleRevision,
      }),
    );
  }, 30_000);
});

describe("character creation batch fill", () => {
  test("accepts a legal batch atomically, increments revision, and rederives holes", () => {
    const draft = createTestDraft("draft:batch-accepted");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") {
      return;
    }

    expect(draft.revision).toBe(0);
    expect(result.draft.revision).toBe(1);
    expect(result.draft.selections).toMatchObject({
      progression: testProgression("class_fighter", 1),
      background: "background_soldier",
      species: "species_orc",
      abilityScoreGeneration: {
        method: "standardArray",
        assignedScores: {
          str: 15,
          dex: 14,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        },
      },
      languages: ["Common", "Dwarvish", "Goblin"],
      alignment: { order: "lawful", morality: "good" },
    });
    expect(
      holeById(result.holes, "cc:draft:draft.progression.initial"),
    ).toBeUndefined();
    expect(
      holeById(
        result.holes,
        testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
      ),
    ).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 2 },
    });
    expect(result.finalization).toMatchObject({ tag: "incomplete" });
  });

  test("rejects Rogue Thieves' Cant extra language choices that duplicate known languages", () => {
    const draft = requireAcceptedBatch(
      fillCreationHoles({
        draft: createTestDraft("draft:rogue-language-duplicate-fill"),
        unitLibrary,
        expectedRevision: draftRevision(0),
        fills: initialManifestFills(
          progressionOptionId(testProgression("class_rogue", 1)),
        ),
      }),
    );
    const languageChoiceHoleId = testUnitHoleId(
      "rogue_thieves_cant",
      CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
    );

    for (const invalidLanguage of ["Dwarvish", "Thieves' Cant"] as const) {
      expect(
        fillCreationHoles({
          draft,
          unitLibrary,
          expectedRevision: draft.revision,
          fills: [choiceFill(languageChoiceHoleId, invalidLanguage)],
        }),
      ).toMatchObject({
        tag: "rejected",
        issues: [
          {
            tag: "illegalFill",
            code: "invalidChoice",
            message: `Invalid choice ${invalidLanguage} for character creation hole: ${languageChoiceHoleId}`,
          },
        ],
      });
    }
  });

  test("records accepted choice options without inferring Units from option ids", () => {
    const draft = createTestDraft("draft:batch-choice-option-metadata");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(),
      }),
    );
    const result = fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
      ],
    });

    expect(result.tag).toBe("accepted");
    if (result.tag !== "accepted") {
      return;
    }

    expect(
      selectedChoiceBySource(
        result.draft,
        "class_fighter",
        "class_skill_proficiency_choice",
      )?.options,
    ).toEqual([{ optionId: "perception" }, { optionId: "survival" }]);
    expect(
      selectedChoiceBySource(
        result.draft,
        "fighter_fighting_style",
        "class_feature_feat_choice",
      )?.options,
    ).toEqual([{ optionId: "defense", unitRef: { unitId: "defense" } }]);
    expect(
      selectedChoiceBySource(
        result.draft,
        "fighter_weapon_mastery",
        "weapon_mastery_options",
      )?.options,
    ).toEqual([
      {
        optionId: "weapon_longsword",
        unitRef: { unitId: "weapon_longsword" },
      },
      { optionId: "weapon_spear", unitRef: { unitId: "weapon_spear" } },
      { optionId: "weapon_flail", unitRef: { unitId: "weapon_flail" } },
    ]);
  });

  test("rejects invalid choices without changing the draft", () => {
    const draft = createTestDraft("draft:batch-invalid-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "invalidChoice", fillIndex: 0 }],
    });
  });

  test("rejects source-unsupported class equipment option ids", () => {
    const draft = createTestDraft("draft:batch-fighter-item-equipment");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(),
      }),
    );
    const result = fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_equipment_choice"),
          "option_b",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft: afterInitial,
      issues: [{ tag: "illegalFill", code: "unsupportedChoice", fillIndex: 0 }],
    });
  });

  test("reports every invalid option in a choice fill", () => {
    const draft = createTestDraft("draft:batch-multiple-invalid-choices");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "background_soldier",
          "species_orc",
        ),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "tooManyChoices",
      "invalidChoice",
      "invalidChoice",
    ]);
    expect(
      result.issues
        .filter((issue) => issue.code === "invalidChoice")
        .map((issue) => issue.message),
    ).toEqual([
      "Invalid choice background_soldier for character creation hole: cc:draft:draft.progression.initial",
      "Invalid choice species_orc for character creation hole: cc:draft:draft.progression.initial",
    ]);
  });

  test("accepts Point Buy ability score assignments and records the method", () => {
    const draft = createTestDraft("draft:batch-point-buy-ability-scores");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 13,
            dex: 13,
            con: 13,
            int: 12,
            wis: 12,
            cha: 12,
          }),
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "accepted",
      draft: {
        selections: {
          abilityScoreGeneration: {
            method: "pointBuy",
            assignedScores: testAbilityScoreAssignment({
              str: 13,
              dex: 13,
              con: 13,
              int: 12,
              wis: 12,
              cha: 12,
            }),
          },
        },
      },
    });
  });

  test("rejects ability score assignments that are invalid for their method", () => {
    const draft = createTestDraft("draft:batch-invalid-ability-scores");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 20,
            dex: 20,
            con: 20,
            int: 20,
            wis: 20,
            cha: 20,
          }),
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [
        { tag: "illegalFill", code: "invalidAbilityScores", fillIndex: 0 },
      ],
    });

    const invalidPointBuy = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "pointBuy",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 15,
            con: 15,
            int: 15,
            wis: 8,
            cha: 8,
          }),
        },
      ],
    });

    expect(invalidPointBuy).toMatchObject({
      tag: "rejected",
      draft,
      issues: [
        { tag: "illegalFill", code: "invalidAbilityScores", fillIndex: 0 },
      ],
    });
  });

  test("rejects duplicate fills for the same hole", () => {
    const draft = createTestDraft("draft:batch-duplicate");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "rejected",
      draft,
      issues: [{ tag: "illegalFill", code: "duplicateFill", fillIndex: 1 }],
    });
  });

  test("rejects stale revisions while still reporting diagnosable fill issues", () => {
    const draft = createTestDraft("draft:batch-stale");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draftRevision(draft.revision + 1),
      fills: [
        choiceFill("cc:draft:draft.progression.initial", "background_soldier"),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "staleRevision",
      "invalidChoice",
    ]);
  });

  test("rejects wrong fill kinds and unsupported but otherwise valid choices", () => {
    const draft = createTestDraft("draft:batch-wrong-kind");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.progression.initial"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 12,
            wis: 10,
            cha: 8,
          }),
        },
        choiceFill("cc:draft:draft.alignment", "neutral_good"),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.draft).toBe(draft);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "wrongFillKind",
      "unsupportedChoice",
    ]);
  });

  test("reports the unsupported selected option for choice fills", () => {
    const draft = createTestDraft("draft:batch-unsupported-choice");
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        {
          kind: "choice",
          holeId: creationHoleId("cc:draft:draft.languages"),
          optionIds: [
            creationChoiceOptionId("Dwarvish"),
            creationChoiceOptionId("Elvish"),
          ],
        },
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.issues).toMatchObject([
      {
        tag: "illegalFill",
        code: "unsupportedChoice",
        fillIndex: 0,
        message:
          "Unsupported choice Elvish for character creation hole: cc:draft:draft.languages",
      },
    ]);
  });

  test("reports unsupported Soldier gaming sets as unsupported, not invalid", () => {
    const draft = draftWithSelections({
      progression: testProgression("class_fighter", 1),
      background: "background_soldier",
    });
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dragonchess_set",
        ),
      ],
    });

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") {
      return;
    }

    expect(result.issues).toMatchObject([
      {
        tag: "illegalFill",
        code: "unsupportedChoice",
        fillIndex: 0,
        message: `Unsupported choice tool_dragonchess_set for character creation hole: ${testUnitHoleId(
          "background_soldier",
          "background_tool_choice",
        )}`,
      },
    ]);
  });

  test("replaying the same accepted batch from the same prior draft is idempotent", () => {
    const draft = createTestDraft("draft:batch-replay");
    const fills = initialManifestFills();
    const first = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });
    const second = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills,
    });

    expect(second).toEqual(first);
  });
});

describe("character creation finalization", () => {
  test("finalizes the complete Orc Soldier Fighter manifest into a legal CharacterBuild", () => {
    const draft = completeManifestDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") {
      return;
    }

    expect(result.build.progression).toEqual({
      startingClass: "class_fighter",
      advancements: [],
    });
    expect(result.build.background).toBe("background_soldier");
    expect(result.build.species).toBe("species_orc");
    expect(result.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(result.build.classFeatureLanguages).toEqual([]);
    expect(result.build.alignment).toEqual({
      order: "lawful",
      morality: "good",
    });
    expect(result.build.abilityScores).toEqual({
      str: 17,
      dex: 14,
      con: 14,
      int: 8,
      wis: 10,
      cha: 12,
    });
    expect(
      expectRight(characterBuildHitPoints(result.build, unitLibrary)),
    ).toEqual({
      maximum: 12,
      hitDice: [{ classUnitId: "class_fighter", dieSize: 10, total: 1 }],
    });
    expect(
      expectRight(characterBuildProficiencies(result.build, unitLibrary)),
    ).toEqual({
      savingThrows: ["str", "con"],
      skills: ["athletics", "intimidation", "perception", "survival"],
      expertise: [],
      weapon: ["simple", "martial"],
      weaponPropertyFilters: [],
      tools: ["tool_dice_set"],
    });
    expect(
      expectRight(characterBuildArmorTraining(result.build, unitLibrary)),
    ).toEqual(["light", "medium", "heavy", "shield"]);
    expect(result.build.features).toEqual([
      {
        selectedFromUnitId: "fighter_fighting_style",
        kind: "selectedClassChoice",
        unitId: "defense",
      },
      {
        selectedFromUnitId: "fighter_weapon_mastery",
        kind: "selectedClassChoice",
        unitId: "weapon_longsword",
      },
      {
        selectedFromUnitId: "fighter_weapon_mastery",
        kind: "selectedClassChoice",
        unitId: "weapon_spear",
      },
      {
        selectedFromUnitId: "fighter_weapon_mastery",
        kind: "selectedClassChoice",
        unitId: "weapon_flail",
      },
    ]);
    expect(result.build.equipment).toMatchObject({
      loadout: {
        armor: testCharacterEquipmentItemId("armor", "armor_chain_mail"),
        shield: testCharacterEquipmentItemId("shield", "equipment_shield"),
        weapon: {
          itemId: testCharacterEquipmentItemId("main", "weapon_longsword"),
          grip: "one_handed",
        },
      },
    });
    expect(characterBuildResources(result.build, unitLibrary)).toEqual([
      {
        unitId: "fighter_second_wind",
        resource: {
          cap: {
            axis: "class",
            base: 2,
            kind: "threshold_tiers",
            tiers: [
              { atLevel: 4, value: 3 },
              { atLevel: 10, value: 4 },
            ],
          },
          kind: "use_count",
        },
      },
    ]);
    expect(
      characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual([
      "class_fighter",
      "background_soldier",
      "species_orc",
      "fighter_fighting_style",
      "fighter_second_wind",
      "fighter_weapon_mastery",
      "feat_savage_attacker",
      "orc_adrenaline_rush",
      "orc_darkvision",
      "orc_relentless_endurance",
      "defense",
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      "armor_chain_mail",
      "equipment_shield",
    ]);
  });

  test.each([
    {
      backgroundUnitId: "background_acolyte",
      asiOptionId: "two_and_one:int:wis",
      toolOptionId: "calligraphers_supplies",
      expectedAbilityScores: {
        str: 15,
        dex: 14,
        con: 13,
        int: 10,
        wis: 11,
        cha: 12,
      },
      expectedSkills: ["insight", "religion", "perception", "survival"],
      expectedOriginFeatUnitId: "feat_magic_initiate_cleric",
    },
    {
      backgroundUnitId: "background_criminal",
      asiOptionId: "two_and_one:dex:con",
      toolOptionId: "thieves_tools",
      expectedAbilityScores: {
        str: 15,
        dex: 16,
        con: 14,
        int: 8,
        wis: 10,
        cha: 12,
      },
      expectedSkills: ["sleight_of_hand", "stealth", "perception", "survival"],
      expectedOriginFeatUnitId: "alert",
    },
    {
      backgroundUnitId: "background_sage",
      asiOptionId: "two_and_one:int:wis",
      toolOptionId: "calligraphers_supplies",
      expectedAbilityScores: {
        str: 15,
        dex: 14,
        con: 13,
        int: 10,
        wis: 11,
        cha: 12,
      },
      expectedSkills: ["arcana", "history", "perception", "survival"],
      expectedOriginFeatUnitId: "feat_magic_initiate_wizard",
    },
  ] as const)(
    "finalizes $backgroundUnitId option B without duplicated background state",
    ({
      backgroundUnitId,
      asiOptionId,
      toolOptionId,
      expectedAbilityScores,
      expectedSkills,
      expectedOriginFeatUnitId,
    }) => {
      const draft = completeFighterDraftForBackground({
        backgroundUnitId,
        asiOptionId,
        toolOptionId,
      });
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag).toBe("ready");
      if (result.tag !== "ready") {
        return;
      }

      expect(result.build.background).toBe(backgroundUnitId);
      expect(result.build.spellcasting).toBeUndefined();
      expect(result.build.abilityScores).toEqual(expectedAbilityScores);
      expect(
        expectRight(characterBuildProficiencies(result.build, unitLibrary)),
      ).toMatchObject({
        skills: expectedSkills,
        tools: [toolOptionId],
      });
      expect(
        characterBuildUnitRefs(result.build, unitLibrary).map(
          (ref) => ref.unitId,
        ),
      ).toEqual(
        expect.arrayContaining([backgroundUnitId, expectedOriginFeatUnitId]),
      );
      expect("backgroundSkillProficiencies" in result.build).toBe(false);
      expect("backgroundToolProficiency" in result.build).toBe(false);
      expect(
        result.build.features.some(
          (feature) =>
            "unitId" in feature && feature.unitId === expectedOriginFeatUnitId,
        ),
      ).toBe(false);
    },
  );

  test("finalizes non-Orc species admission with retained trait Unit refs", () => {
    const cases = [
      {
        speciesUnitId: "species_dragonborn",
        expectedTraitUnitIds: [
          "species_dragonborn_breath_weapon",
          "species_dragonborn_damage_resistance",
          "species_dragonborn_darkvision",
        ],
      },
      {
        speciesUnitId: "species_dwarf",
        expectedTraitUnitIds: ["dwarf_darkvision", "dwarf_dwarven_resilience"],
      },
      {
        speciesUnitId: "species_elf",
        expectedTraitUnitIds: ["elf_darkvision"],
      },
      {
        speciesUnitId: "species_goliath",
        expectedTraitUnitIds: ["species_goliath_powerful_build"],
      },
      {
        speciesUnitId: "species_tiefling",
        speciesSize: "medium",
        expectedTraitUnitIds: ["species_tiefling_darkvision"],
      },
    ] as const;

    for (const testCase of cases) {
      const draft = completeManifestDraftForSpecies(testCase);
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag, testCase.speciesUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      expect(result.build.species).toBe(testCase.speciesUnitId);
      if (testCase.speciesUnitId === "species_tiefling") {
        expect(result.build.speciesSize).toBe("medium");
      } else {
        expect(result.build.speciesSize).toBeUndefined();
      }
      if (testCase.speciesUnitId === "species_dragonborn") {
        expect(result.build.speciesChoiceFacts).toEqual({
          draconicAncestry: {
            kind: "draconicAncestry",
            ancestorId: "red",
          },
        });
      } else {
        expect(result.build.speciesChoiceFacts).toBeUndefined();
      }
      const unitRefIds = characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      );
      expect(unitRefIds, testCase.speciesUnitId).toContain(
        testCase.speciesUnitId,
      );
      for (const traitUnitId of testCase.expectedTraitUnitIds) {
        expect(unitRefIds, testCase.speciesUnitId).toContain(traitUnitId);
      }
    }
  });

  test("requires species size selection exactly for choice-sized species", () => {
    const tieflingWithoutSize = finalizeCharacterDraft({
      draft: completeManifestDraftForSpecies("species_tiefling"),
      unitLibrary,
    });
    expect(tieflingWithoutSize).toMatchObject({ tag: "incomplete" });

    const dwarf = completeManifestDraftForSpecies("species_dwarf");
    const dwarfWithStaleSize: CharacterDraft = {
      ...dwarf,
      selections: {
        ...dwarf.selections,
        speciesSize: "medium",
      },
    };
    const staleSize = finalizeCharacterDraft({
      draft: dwarfWithStaleSize,
      unitLibrary,
    });

    expect(staleSize).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build species size selection must match the selected species Surface facts.",
        },
      ],
    });
  });

  test("requires Draconic Ancestry selection exactly for Dragonborn", () => {
    const dragonbornWithoutAncestry = finalizeCharacterDraft({
      draft: completeManifestDraftForSpecies({
        speciesUnitId: "species_dragonborn",
        draconicAncestry: false,
      }),
      unitLibrary,
    });
    expect(dragonbornWithoutAncestry).toMatchObject({ tag: "incomplete" });

    const dwarf = completeManifestDraftForSpecies("species_dwarf");
    const dwarfWithStaleAncestry: CharacterDraft = {
      ...dwarf,
      selections: {
        ...dwarf.selections,
        draconicAncestry: characterDraconicAncestrySelection("red"),
      },
    };
    const staleAncestry = finalizeCharacterDraft({
      draft: dwarfWithStaleAncestry,
      unitLibrary,
    });

    expect(staleAncestry).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build Draconic Ancestry selection must match the selected species Surface facts.",
        },
      ],
    });
  });

  test("finalizes supported Monk 1 class-container source facts from Surface class records", () => {
    const draft = completeMonkDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.progression).toEqual({
      startingClass: "class_monk",
      advancements: [],
    });
    expect(
      expectRight(characterBuildHitPoints(result.build, unitLibrary)),
    ).toEqual({
      maximum: 10,
      hitDice: [{ classUnitId: "class_monk", dieSize: 8, total: 1 }],
    });
    expect(
      expectRight(characterBuildProficiencies(result.build, unitLibrary)),
    ).toMatchObject({
      savingThrows: ["str", "dex"],
      skills: expect.arrayContaining(["acrobatics", "athletics"]),
      weapon: ["simple"],
    });
    expect(
      expectRight(characterBuildArmorTraining(result.build, unitLibrary)),
    ).toEqual([]);
    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual([
      "monk_martial_arts",
      "monk_unarmored_defense",
    ]);
    expect(
      expectRight(characterBuildProficiencies(result.build, unitLibrary)).tools,
    ).toEqual(expect.arrayContaining(["tool_dice_set", "tool_lute"]));
    expect(result.build.equipment.owned.map((item) => item.unitId)).toEqual([
      "weapon_longsword",
      "weapon_dagger",
      "equipment_shield",
    ]);
  });

  test("finalizes each supported level-1 SRD class-container source facts from Surface class records", () => {
    for (const classUnitId of SRD_LEVEL_ONE_CLASS_UNIT_IDS) {
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:srd-level-1-${classUnitId}`,
        progression: testProgression(classUnitId, 1),
      });
      const classFacts = readableClassFacts(classUnitId);
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag, classUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      expect(result.build.progression).toEqual({
        startingClass: classUnitId,
        advancements: [],
      });
      expect(characterBuildUnitRefs(result.build)).toContainEqual({
        unitId: classUnitId,
      });
      expect(
        expectRight(characterBuildHitPoints(result.build, unitLibrary)).hitDice,
      ).toEqual([
        {
          classUnitId,
          dieSize: classFacts.hitPointDie,
          total: 1,
        },
      ]);
      const proficiencies = expectRight(
        characterBuildProficiencies(result.build, unitLibrary),
      );
      expect(proficiencies.savingThrows).toEqual(
        classFacts.savingThrowProficiencies,
      );
      expect(proficiencies.weapon).toEqual(
        expect.arrayContaining(
          classFacts.weaponProficiencies.flatMap((proficiency) =>
            proficiency.kind === "weapon_category"
              ? [proficiency.category]
              : [],
          ),
        ),
      );
      expect(proficiencies.weaponPropertyFilters).toEqual(
        classFacts.weaponProficiencies.flatMap((proficiency) =>
          proficiency.kind === "weapon_category_with_properties"
            ? [proficiency]
            : [],
        ),
      );
      expect(proficiencies.skills).toEqual(
        expect.arrayContaining([
          ...selectedChoiceOptionIds(
            draft,
            classUnitId,
            "class_skill_proficiency_choice",
          ),
        ]),
      );
      assertClassToolProficienciesProjected({
        classUnitId,
        toolProficiencies: classFacts.toolProficiencies,
        proficiencies,
        draft,
      });
      expect(
        expectRight(characterBuildArmorTraining(result.build, unitLibrary)),
      ).toEqual(expect.arrayContaining([...classFacts.armorTraining]));
      expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
        expect.arrayContaining(
          classFacts.featureGrants
            .filter((grant) => grant.level <= 1)
            .map((grant) => grant.unitId),
        ),
      );
      expect(
        selectedChoiceOptionIds(draft, classUnitId, "class_equipment_choice"),
      ).toHaveLength(1);
      expect(result.build.equipment.owned.map((item) => item.unitId)).toEqual(
        draft.selections.equipment?.selectedUnitIds,
      );
    }
  });

  test("finalizes fixed class-feature language grants without changing origin languages", () => {
    const cases = [
      {
        classUnitId: "class_druid",
        sourceUnitId: "druid_druidic",
        language: "Druidic",
      },
      {
        classUnitId: "class_rogue",
        sourceUnitId: "rogue_thieves_cant",
        language: "Thieves' Cant",
      },
    ] as const;

    for (const testCase of cases) {
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:${testCase.classUnitId}-language-grant`,
        progression: testProgression(testCase.classUnitId, 1),
      });
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag, testCase.classUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      expect(result.build.originLanguages).toEqual([
        "Common",
        "Dwarvish",
        "Goblin",
      ]);
      expect(result.build.classFeatureLanguages).toEqual(
        expect.arrayContaining([
          {
            kind: "classFeatureLanguageGrant",
            sourceUnitId: testCase.sourceUnitId,
            language: testCase.language,
          },
        ]),
      );
    }
  });

  test("finalizes Rogue Thieves' Cant extra language choice without changing origin languages", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:rogue-thieves-cant-extra-language-choice",
      progression: testProgression("class_rogue", 1),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "rogue_thieves_cant",
          CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
        )]: [creationChoiceOptionId("Elvish")],
      },
    });
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(
      selectedChoiceOptionIds(
        draft,
        "rogue_thieves_cant",
        CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
      ),
    ).toEqual(["Elvish"]);
    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.originLanguages).toEqual([
      "Common",
      "Dwarvish",
      "Goblin",
    ]);
    expect(result.build.classFeatureLanguages).toEqual([
      {
        kind: "classFeatureLanguageGrant",
        sourceUnitId: "rogue_thieves_cant",
        language: "Thieves' Cant",
      },
      {
        kind: "classFeatureLanguageChoice",
        sourceUnitId: "rogue_thieves_cant",
        language: "Elvish",
      },
    ]);
  });

  test("rejects unsupported authored class-feature language grants during finalization", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:druid-unsupported-language-grant",
      progression: testProgression("class_druid", 1),
    });
    const brokenUnitLibrary = unitCatalogWithUnsupportedLanguageGrant({
      unitId: "druid_druidic",
      languageId: "secret_tree_talk",
    });
    const result = finalizeCharacterDraft({
      draft,
      unitLibrary: brokenUnitLibrary,
    });

    expect(result).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "illegalFinalization",
          code: "illegalFinalization",
          message:
            "Unsupported class-feature language id secret_tree_talk on Unit druid_druidic.",
        },
      ],
    });
  });

  test("finalizes supported level-1 class-feature acquisition choices", () => {
    const clericProtector = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-cleric-protector-feature-choice",
      progression: testProgression("class_cleric", 1),
    });
    const clericThaumaturge = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-cleric-thaumaturge-feature-choice",
      progression: testProgression("class_cleric", 1),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("cleric_divine_order", "divine_order")]: [
          creationChoiceOptionId("thaumaturge"),
        ],
        [testUnitChoiceSourceKey(
          "cleric_divine_order",
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [creationChoiceOptionId("light")],
      },
    });
    const druidMagician = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-druid-magician-feature-choice",
      progression: testProgression("class_druid", 1),
    });
    const druidWarden = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-druid-warden-feature-choice",
      progression: testProgression("class_druid", 1),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("druid_primal_order", "primal_order")]: [
          creationChoiceOptionId("warden"),
        ],
      },
    });
    const rogue = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-rogue-feature-choices",
      progression: testProgression("class_rogue", 1),
    });

    expect(
      selectedChoiceOptionIds(
        clericProtector,
        "cleric_divine_order",
        "divine_order",
      ),
    ).toEqual(["protector"]);
    expect(
      selectedChoiceOptionIds(
        clericThaumaturge,
        "cleric_divine_order",
        "divine_order",
      ),
    ).toEqual(["thaumaturge"]);
    expect(
      selectedChoiceOptionIds(
        clericThaumaturge,
        "cleric_divine_order",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["light"]);
    expect(
      selectedChoiceOptionIds(
        druidMagician,
        "druid_primal_order",
        "primal_order",
      ),
    ).toEqual(["magician"]);
    expect(
      selectedChoiceOptionIds(
        druidMagician,
        "druid_primal_order",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["guidance"]);
    expect(
      selectedChoiceOptionIds(
        druidWarden,
        "druid_primal_order",
        "primal_order",
      ),
    ).toEqual(["warden"]);
    expect(
      selectedChoiceOptionIds(
        rogue,
        "rogue_expertise",
        "class_feature_proficiency_choice",
      ),
    ).toHaveLength(2);

    const clericProtectorBuild = finalizeCharacterDraft({
      draft: clericProtector,
      unitLibrary,
    });
    const clericThaumaturgeBuild = finalizeCharacterDraft({
      draft: clericThaumaturge,
      unitLibrary,
    });
    const druidMagicianBuild = finalizeCharacterDraft({
      draft: druidMagician,
      unitLibrary,
    });
    const druidWardenBuild = finalizeCharacterDraft({
      draft: druidWarden,
      unitLibrary,
    });
    const rogueBuild = finalizeCharacterDraft({ draft: rogue, unitLibrary });
    expect(clericProtectorBuild.tag).toBe("ready");
    expect(clericThaumaturgeBuild.tag).toBe("ready");
    expect(druidMagicianBuild.tag).toBe("ready");
    expect(druidWardenBuild.tag).toBe("ready");
    expect(rogueBuild.tag).toBe("ready");
    if (
      clericProtectorBuild.tag !== "ready" ||
      clericThaumaturgeBuild.tag !== "ready" ||
      druidMagicianBuild.tag !== "ready" ||
      druidWardenBuild.tag !== "ready" ||
      rogueBuild.tag !== "ready"
    ) {
      return;
    }

    expect(
      expectRight(
        characterBuildProficiencies(clericProtectorBuild.build, unitLibrary),
      ).weapon,
    ).toContain("martial");
    expect(
      expectRight(
        characterBuildArmorTraining(clericProtectorBuild.build, unitLibrary),
      ),
    ).toContain("heavy");
    expect(
      clericThaumaturgeBuild.build.spellcasting?.sources[0]?.cantrips,
    ).toEqual(expect.arrayContaining(["light"]));
    expect(clericThaumaturgeBuild.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "abilityCheckBonus",
          selectedFromUnitId: "cleric_divine_order",
          ability: "int",
          skills: ["arcana", "religion"],
          bonus: { kind: "abilityModifier", ability: "wis", minimum: 1 },
        },
      ]),
    );
    expect(druidMagicianBuild.build.spellcasting?.sources[0]?.cantrips).toEqual(
      expect.arrayContaining(["guidance"]),
    );
    expect(druidMagicianBuild.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "abilityCheckBonus",
          selectedFromUnitId: "druid_primal_order",
          ability: "int",
          skills: ["arcana", "nature"],
          bonus: { kind: "abilityModifier", ability: "wis", minimum: 1 },
        },
      ]),
    );
    expect(
      expectRight(
        characterBuildProficiencies(druidWardenBuild.build, unitLibrary),
      ).weapon,
    ).toContain("martial");
    expect(
      expectRight(
        characterBuildArmorTraining(druidWardenBuild.build, unitLibrary),
      ),
    ).toContain("medium");
    expect(
      expectRight(characterBuildProficiencies(rogueBuild.build, unitLibrary))
        .expertise,
    ).toEqual(
      selectedChoiceOptionIds(
        rogue,
        "rogue_expertise",
        "class_feature_proficiency_choice",
      ),
    );
  });

  test("finalizes supported multiclass order cantrip projections", () => {
    const clericThaumaturge = completeSupportedProgressionDraft({
      draftId: "draft:srd-multiclass-cleric-thaumaturge-feature-choice",
      progression: supportedMulticlassProgressionForClass("class_cleric"),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("cleric_divine_order", "divine_order")]: [
          creationChoiceOptionId("thaumaturge"),
        ],
        [testUnitChoiceSourceKey(
          "cleric_divine_order",
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [creationChoiceOptionId("light")],
      },
    });
    const druidMagician = completeSupportedProgressionDraft({
      draftId: "draft:srd-multiclass-druid-magician-feature-choice",
      progression: supportedMulticlassProgressionForClass("class_druid"),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("druid_primal_order", "primal_order")]: [
          creationChoiceOptionId("magician"),
        ],
        [testUnitChoiceSourceKey(
          "druid_primal_order",
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [creationChoiceOptionId("guidance")],
      },
    });

    expect(
      selectedChoiceOptionIds(
        clericThaumaturge,
        "cleric_divine_order",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["light"]);
    expect(
      selectedChoiceOptionIds(
        druidMagician,
        "druid_primal_order",
        CLASS_CANTRIP_CHOICE_KEY,
      ),
    ).toEqual(["guidance"]);

    const clericBuild = finalizeCharacterDraft({
      draft: clericThaumaturge,
      unitLibrary,
    });
    const druidBuild = finalizeCharacterDraft({
      draft: druidMagician,
      unitLibrary,
    });

    expect(clericBuild.tag).toBe("ready");
    expect(druidBuild.tag).toBe("ready");
    if (clericBuild.tag !== "ready" || druidBuild.tag !== "ready") {
      return;
    }

    expect(
      spellcastingSourceCantrips(clericBuild.build, "class_cleric"),
    ).toEqual(expect.arrayContaining(["light"]));
    expect(spellcastingSourceCantrips(druidBuild.build, "class_druid")).toEqual(
      expect.arrayContaining(["guidance"]),
    );
  });

  test("rejects Rogue Expertise choices that are not already skill proficiencies", () => {
    const rogue = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-rogue-invalid-expertise",
      progression: testProgression("class_rogue", 1),
    });
    const invalidExpertise: CharacterDraft = {
      ...rogue,
      selections: {
        ...rogue.selections,
        choices: rogue.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "rogue_expertise" &&
          choice.source.choiceKey === "class_feature_proficiency_choice"
            ? {
                ...choice,
                options: choice.options.map((option, index) =>
                  index === 0
                    ? {
                        ...option,
                        optionId: creationChoiceOptionId("arcana"),
                      }
                    : option,
                ),
              }
            : choice,
        ),
      },
    };

    expect(
      finalizeCharacterDraft({ draft: invalidExpertise, unitLibrary }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("finalizes non-Wizard level-1 Spell Access from Surface class spellcasting facts", () => {
    const spellAccessClassUnitIds = [
      "class_bard",
      "class_cleric",
      "class_druid",
      "class_paladin",
      "class_ranger",
      "class_sorcerer",
    ] as const satisfies ReadonlyArray<UnitRecord["id"]>;

    for (const classUnitId of spellAccessClassUnitIds) {
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:srd-level-1-${classUnitId}-spell-access`,
        progression: testProgression(classUnitId, 1),
      });
      const classFacts = readableClassFacts(classUnitId);
      if (
        !("spellcasting" in classFacts) ||
        (classFacts.spellcasting.kind !==
          "list_prepared_spellcasting_creation" &&
          classFacts.spellcasting.kind !==
            "list_prepared_spellcasting_progression_creation")
      ) {
        throw new Error(
          `Expected list-prepared spellcasting for ${classUnitId}`,
        );
      }
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag, classUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      const spellcasting = classFacts.spellcasting;
      const expectedClassCantrips = spellcasting.cantripAccess?.spellIds ?? [];
      const expectedCantrips = selectedChoiceOptionIdsByChoiceKey(
        draft,
        CLASS_CANTRIP_CHOICE_KEY,
      );
      const expectedPreparedSpells = spellcasting.preparedAccess.spells
        .slice(0, spellcasting.preparedAccess.choose)
        .map((spell) => spell.spellId);
      expect(
        selectedChoiceOptionIds(draft, classUnitId, CLASS_CANTRIP_CHOICE_KEY),
        classUnitId,
      ).toEqual(expectedClassCantrips);
      expect(
        selectedChoiceOptionIds(
          draft,
          classUnitId,
          CLASS_PREPARED_SPELL_CHOICE_KEY,
        ),
        classUnitId,
      ).toEqual(expectedPreparedSpells);
      expect(result.build.spellcasting, classUnitId).toEqual({
        sources: [
          {
            sourceUnitId: classUnitId,
            spellcastingAbility: spellcasting.spellcastingAbility,
            cantrips: expectedCantrips,
            spellbook: [],
            preparedSpells: expectedPreparedSpells,
            spellcastingFocuses: [spellcasting.spellcastingFocus],
          },
        ],
        slotPools: {
          spellcasting: {
            kind: "spellcasting",
            slots: spellcasting.spellSlotProjection.slots,
          },
        },
      });
    }
  });

  test("finalizes Warlock level-1 Pact Magic spellcasting facts", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-1-class_warlock-pact-magic",
      progression: testProgression("class_warlock", 1),
    });
    const classFacts = readableClassFacts("class_warlock");
    if (
      !("spellcasting" in classFacts) ||
      classFacts.spellcasting.kind !== "pact_magic_spellcasting_creation"
    ) {
      throw new Error("Expected Pact Magic spellcasting for class_warlock");
    }

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.spellcasting).toEqual({
      sources: [
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: selectedChoiceOptionIds(
            draft,
            "class_warlock",
            CLASS_CANTRIP_CHOICE_KEY,
          ),
          spellbook: [],
          preparedSpells: selectedChoiceOptionIds(
            draft,
            "class_warlock",
            CLASS_PREPARED_SPELL_CHOICE_KEY,
          ),
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        pactMagic: {
          kind: "pactMagic",
          slotLevel: classFacts.spellcasting.pactSlotProjection.spellLevel,
          count: classFacts.spellcasting.pactSlotProjection.count,
        },
      },
    });
  });

  test("projects Paladin and Warlock level-3 spellcasting facts from progression rows", () => {
    const paladinDraft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-class_paladin-spellcasting",
      progression: testProgression("class_paladin", 3),
    });
    const paladinResult = finalizeCharacterDraft({
      draft: paladinDraft,
      unitLibrary,
    });

    expect(paladinResult.tag).toBe("ready");
    if (paladinResult.tag !== "ready") return;
    expect(
      selectedChoiceOptionIds(
        paladinDraft,
        "class_paladin",
        CLASS_PREPARED_SPELL_CHOICE_KEY,
      ),
    ).toEqual(["heroism", "searing_smite", "bless", "command"]);
    expect(
      paladinResult.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_paladin",
      )?.preparedSpells,
    ).toEqual(["heroism", "searing_smite", "bless", "command"]);
    expect(paladinResult.build.spellcasting?.slotPools.spellcasting).toEqual({
      kind: "spellcasting",
      slots: [{ spellLevel: 1, count: 3 }],
    });

    const warlockDraft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-class_warlock-pact-magic",
      progression: testProgression("class_warlock", 3),
    });
    const warlockResult = finalizeCharacterDraft({
      draft: warlockDraft,
      unitLibrary,
    });

    expect(warlockResult.tag).toBe("ready");
    if (warlockResult.tag !== "ready") return;
    expect(
      selectedChoiceOptionIds(
        warlockDraft,
        "class_warlock",
        CLASS_PREPARED_SPELL_CHOICE_KEY,
      ),
    ).toEqual(["charm_person", "hellish_rebuke", "hex", "mirror_image"]);
    expect(
      warlockResult.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_warlock",
      )?.preparedSpells,
    ).toEqual(["charm_person", "hellish_rebuke", "hex", "mirror_image"]);
    expect(warlockResult.build.spellcasting?.slotPools.pactMagic).toEqual({
      kind: "pactMagic",
      slotLevel: 2,
      count: 2,
    });
  });

  test("rejects level-gated prepared spell options before their class has matching slots", () => {
    const progression = testProgression("class_bard", 2);
    const draft = createTestDraft("draft:srd-level-2-class_bard-aid-rejected");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(progressionOptionId(progression)),
      }),
    );
    const preparedSpellHoleId = testUnitHoleId(
      "class_bard",
      CLASS_PREPARED_SPELL_CHOICE_KEY,
    );

    expect(
      optionIds(
        holeById(
          discoverCreationHoles({ draft: afterInitial, unitLibrary }),
          preparedSpellHoleId,
        ),
      ),
    ).not.toContain("aid");
    expect(
      fillCreationHoles({
        draft: afterInitial,
        unitLibrary,
        expectedRevision: afterInitial.revision,
        fills: [
          choiceFill(
            preparedSpellHoleId,
            "charm_person",
            "color_spray",
            "dissonant_whispers",
            "healing_word",
            "aid",
          ),
        ],
      }),
    ).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "illegalFill",
          code: "invalidChoice",
        },
      ],
    });
  });

  test("finalizes a level-3 Wizard with a level-2 prepared spell from the selected spellbook", () => {
    const spellbookSpellIds = [
      "detect_magic",
      "feather_fall",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
      "chromatic_orb",
      "mirror_image",
      "misty_step",
    ] as const;
    const preparedSpellIds = [
      "detect_magic",
      "feather_fall",
      "mage_armor",
      "magic_missile",
      "shield",
      "mirror_image",
    ] as const;
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-class_wizard-mirror-image-prepared",
      progression: testProgression("class_wizard", 3),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("class_wizard", WIZARD_SPELLBOOK_CHOICE_KEY)]:
          spellbookSpellIds.map(creationChoiceOptionId),
        [testUnitChoiceSourceKey(
          "class_wizard",
          WIZARD_PREPARED_SPELL_CHOICE_KEY,
        )]: preparedSpellIds.map(creationChoiceOptionId),
      },
    });

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;
    expect(
      selectedChoiceOptionIds(
        draft,
        "class_wizard",
        WIZARD_PREPARED_SPELL_CHOICE_KEY,
      ),
    ).toEqual([...preparedSpellIds]);
    expect(
      result.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_wizard",
      )?.preparedSpells,
    ).toEqual([...preparedSpellIds]);
  });

  test("finalizes Ranger Hunter's Prey with a retained selected option Unit ref", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-3-ranger-hunter-horde-breaker",
      progression: testProgression("class_ranger", 3),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey("class_ranger", CLASS_SUBCLASS_CHOICE_KEY)]: [
          creationChoiceOptionId("subclass_ranger_hunter"),
        ],
        [testUnitChoiceSourceKey(
          "ranger_hunters_prey",
          HUNTERS_PREY_CHOICE_KEY,
        )]: [creationChoiceOptionId("horde_breaker")],
      },
    });

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;
    expect(
      selectedChoiceOptionIds(
        draft,
        "ranger_hunters_prey",
        HUNTERS_PREY_CHOICE_KEY,
      ),
    ).toEqual(["horde_breaker"]);
    expect(characterBuildUnitRefs(result.build, unitLibrary)).toContainEqual({
      unitId: "ranger_hunters_prey",
      selectedOption: { kind: "huntersPrey", optionId: "hordeBreaker" },
    });
  });

  test("finalizes non-Fighter level-1 Weapon Mastery choices from Surface mastery records", () => {
    const masteryProfiles = [
      {
        classUnitId: "class_barbarian",
        featureUnitId: "barbarian_weapon_mastery",
      },
      { classUnitId: "class_paladin", featureUnitId: "paladin_weapon_mastery" },
      { classUnitId: "class_ranger", featureUnitId: "ranger_weapon_mastery" },
      { classUnitId: "class_rogue", featureUnitId: "rogue_weapon_mastery" },
    ] as const satisfies ReadonlyArray<{
      readonly classUnitId: UnitRecord["id"];
      readonly featureUnitId: UnitRecord["id"];
    }>;

    for (const profile of masteryProfiles) {
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:srd-level-1-${profile.classUnitId}-weapon-mastery`,
        progression: testProgression(profile.classUnitId, 1),
      });
      const selectedMasteryWeapons = selectedChoiceOptionIds(
        draft,
        profile.featureUnitId,
        WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
      );
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(selectedMasteryWeapons, profile.classUnitId).toHaveLength(2);
      expect(result.tag, profile.classUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      expect(result.build.features, profile.classUnitId).toEqual(
        expect.arrayContaining(
          selectedMasteryWeapons.map((unitId) => ({
            kind: "selectedClassChoice",
            unitId,
            selectedFromUnitId: profile.featureUnitId,
          })),
        ),
      );
      expect(
        characterBuildUnitRefs(result.build, unitLibrary).map(
          (ref) => ref.unitId,
        ),
        profile.classUnitId,
      ).toEqual(expect.arrayContaining([...selectedMasteryWeapons]));
    }
  });

  test("rejects over-cap parsed ability scores without throwing during finalization", () => {
    const complete = completeManifestDraft();
    const draft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        abilityScoreGeneration: {
          method: "standardArray",
          assignedScores: testAbilityScoreAssignment({
            str: 30,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
      },
    };

    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result).toMatchObject({ tag: "invalid" });
    if (result.tag !== "invalid") return;
    expect(result.issues.map((issue) => issue.message)).toContain(
      "Finalized build must use a supported background ability-score increase.",
    );
  });

  test("returns a typed issue instead of clamping over-cap background ability-score increases", () => {
    const result = applyBackgroundAbilityScoreIncrease(
      testAbilityScoreAssignment({
        str: 30,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
      { kind: "twoAndOne", plusTwo: "str", plusOne: "con" },
      ["str", "dex", "con"],
    );

    expect(result).toEqual(
      Either.left({
        tag: "illegalFinalization",
        code: "illegalFinalization",
        message:
          "Cannot apply background ability-score increase: str 30 + 2 would exceed 20.",
      }),
    );
  });

  test("accepts Fighter 2 through the runtime progression fill", () => {
    const fighterTwo = completeFighterTwoDraft();
    const result = finalizeCharacterDraft({ draft: fighterTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(
      expectRight(characterBuildHitPoints(result.build, unitLibrary)).hitDice,
    ).toEqual([{ classUnitId: "class_fighter", dieSize: 10, total: 2 }]);
    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining(["fighter_action_surge", "fighter_tactical_mind"]),
    );
    expect(
      characterBuildResources(result.build, unitLibrary).map(
        (resource) => resource.unitId,
      ),
    ).toContain("fighter_action_surge");
  });

  test("accepts Cleric 2 Channel Divinity as a class resource container", () => {
    const clericTwo = completeSupportedProgressionDraft({
      draftId: "draft:cleric-channel-divinity",
      progression: testProgression("class_cleric", 2),
    });
    const result = finalizeCharacterDraft({ draft: clericTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "cleric_divine_order",
        "cleric_channel_divinity",
      ]),
    );
    expect(
      characterBuildResources(result.build, unitLibrary).find(
        (resource) => resource.unitId === "cleric_channel_divinity",
      ),
    ).toEqual({
      unitId: "cleric_channel_divinity",
      resource: {
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 6, value: 3 },
            { atLevel: 18, value: 4 },
          ],
        },
      },
    });
  });

  test("accepts Paladin 3 Channel Divinity as a class resource container", () => {
    const paladinThree = completeSupportedProgressionDraft({
      draftId: "draft:paladin-channel-divinity",
      progression: testProgression("class_paladin", 3),
    });
    const result = finalizeCharacterDraft({ draft: paladinThree, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining(["paladin_channel_divinity"]),
    );
    expect(
      characterBuildResources(result.build, unitLibrary).find(
        (resource) => resource.unitId === "paladin_channel_divinity",
      ),
    ).toEqual({
      unitId: "paladin_channel_divinity",
      resource: {
        kind: "use_count",
        cap: {
          kind: "fixed",
          uses: 2,
        },
      },
    });
  });

  test("accepts Druid 2 Wild Shape and projects character facts", () => {
    const druidTwo = completeSupportedProgressionDraft({
      draftId: "draft:druid-wild-companion",
      progression: testProgression("class_druid", 2),
    });
    const result = finalizeCharacterDraft({ draft: druidTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "druid_druidic",
        "druid_primal_order",
        DRUID_WILD_SHAPE_UNIT_ID,
        "druid_wild_companion",
      ]),
    );
    expect(
      characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "class_druid",
        DRUID_WILD_SHAPE_UNIT_ID,
        "druid_wild_companion",
      ]),
    );
    expect(
      result.build.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_druid",
      )?.preparedSpells,
    ).toHaveLength(5);
    expect(result.build.spellcasting?.slotPools.spellcasting?.slots).toEqual([
      { spellLevel: 1, count: 3 },
    ]);
    expect(
      characterBuildResources(result.build, unitLibrary).find(
        (resource) => resource.unitId === DRUID_WILD_SHAPE_UNIT_ID,
      ),
    ).toEqual({
      unitId: DRUID_WILD_SHAPE_UNIT_ID,
      resource: {
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 6, value: 3 },
            { atLevel: 17, value: 4 },
          ],
        },
      },
    });
    const wildShapeFacts = expectRight(
      characterBuildDruidWildShapeFacts({
        build: result.build,
        unitLibrary,
      }),
    );
    if (wildShapeFacts === undefined) {
      throw new Error("Expected Druid 2 build to project Wild Shape facts.");
    }
    expect(wildShapeFacts).toEqual({
      unitId: DRUID_WILD_SHAPE_UNIT_ID,
      useCount: {
        maximum: 2,
        shortRestRefill: 1,
        longRestRefillsAll: true,
      },
      duration: { unit: "hour", amount: 1 },
      knownFormRoster: {
        creatureType: "beast",
        count: 4,
        maxChallengeRating: 0.25,
        flySpeed: "forbidden",
        longRestReplacementCount: 1,
      },
    });
    expect(
      expectRight(
        replaceDruidWildShapeKnownForm({
          facts: wildShapeFacts,
          currentKnownFormStatBlockIds:
            druidWildShapeFixtureKnownFormStatBlockIds,
          replacement: {
            replaceStatBlockId: "stat_block_rat",
            selectedStatBlockId: "stat_block_cat",
          },
          statBlockCatalog,
        }),
      ),
    ).toEqual([
      "stat_block_cat",
      "stat_block_riding_horse",
      "stat_block_spider",
      "stat_block_wolf",
    ]);
    expect(
      Either.isLeft(
        replaceDruidWildShapeKnownForm({
          facts: wildShapeFacts,
          currentKnownFormStatBlockIds:
            druidWildShapeFixtureKnownFormStatBlockIds,
          replacement: {
            replaceStatBlockId: "stat_block_rat",
            selectedStatBlockId: "stat_block_hawk",
          },
          statBlockCatalog,
        }),
      ),
    ).toBe(true);
  });

  test("accepts Monk 2 Monk's Focus as shared Focus Point character facts", () => {
    const monkTwo = completeSupportedProgressionDraft({
      draftId: "draft:monk-monks-focus",
      progression: testProgression("class_monk", 2),
    });
    const result = finalizeCharacterDraft({ draft: monkTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "monk_martial_arts",
        "monk_unarmored_defense",
        MONK_MONKS_FOCUS_UNIT_ID,
        "monk_unarmored_movement",
        "monk_uncanny_metabolism",
      ]),
    );
    expect(
      characterBuildResources(result.build, unitLibrary).find(
        (resource) => resource.unitId === MONK_MONKS_FOCUS_UNIT_ID,
      ),
    ).toEqual({
      unitId: MONK_MONKS_FOCUS_UNIT_ID,
      resource: {
        kind: "use_count",
        cap: {
          axis: "class",
          base: 2,
          kind: "linear_per_level",
          perLevel: 1,
          startingAtLevel: 2,
        },
      },
    });

    const focusFacts = expectRight(
      characterBuildMonksFocusFacts({
        build: result.build,
        unitLibrary,
      }),
    );
    if (focusFacts === undefined) {
      throw new Error("Expected Monk 2 build to project Monk's Focus facts.");
    }
    expect(focusFacts).toEqual({
      unitId: MONK_MONKS_FOCUS_UNIT_ID,
      focusPointUseCount: {
        maximum: 2,
        shortRestRefillsAll: true,
        longRestRefillsAll: true,
      },
      initialOptions: [
        { id: "monk_flurry_of_blows", displayName: "Flurry of Blows" },
        { id: "monk_patient_defense", displayName: "Patient Defense" },
        { id: "monk_step_of_the_wind", displayName: "Step of the Wind" },
      ],
      saveDc: {
        base: 8,
        ability: "wis",
        includesProficiencyBonus: true,
      },
    });

    const levelFourFocusFacts = expectRight(
      characterBuildMonksFocusFacts({
        build: {
          features: result.build.features,
          progression: testProgression("class_monk", 4),
        },
        unitLibrary,
      }),
    );
    expect(levelFourFocusFacts?.focusPointUseCount.maximum).toBe(4);
  });

  test("projects Monk 2 Uncanny Metabolism source facts without duplicating Focus or Martial Arts tables", () => {
    const monkTwo = completeSupportedProgressionDraft({
      draftId: "draft:monk-uncanny-metabolism",
      progression: testProgression("class_monk", 2),
    });
    const result = finalizeCharacterDraft({ draft: monkTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        MONK_MARTIAL_ARTS_UNIT_ID,
        MONK_MONKS_FOCUS_UNIT_ID,
        MONK_UNCANNY_METABOLISM_UNIT_ID,
      ]),
    );

    const facts = expectRight(
      characterBuildMonkUncannyMetabolismFacts({
        build: result.build,
        unitLibrary,
      }),
    );
    if (facts === undefined) {
      throw new Error(
        "Expected Monk 2 build to project Uncanny Metabolism facts.",
      );
    }
    expect(facts).toEqual({
      unitId: MONK_UNCANNY_METABOLISM_UNIT_ID,
      trigger: "roll_initiative",
      optional: true,
      oncePerLongRestUse: {
        resetCadence: { kind: "long_rest" },
      },
      focusRecovery: {
        resourceUnitId: MONK_MONKS_FOCUS_UNIT_ID,
        recoversAllExpended: true,
      },
      healing: {
        target: "self",
        martialArtsDieSourceUnitId: MONK_MARTIAL_ARTS_UNIT_ID,
        martialArtsDie: {
          dice: 1,
          dieSize: 6,
        },
        monkLevelBonus: 2,
      },
    });

    const monkLevelFacts = [
      { level: 4, dieSize: 6 },
      { level: 5, dieSize: 8 },
      { level: 11, dieSize: 10 },
      { level: 17, dieSize: 12 },
    ] as const;
    for (const expectation of monkLevelFacts) {
      const levelFacts = expectRight(
        characterBuildMonkUncannyMetabolismFacts({
          build: {
            features: result.build.features,
            progression: testProgression("class_monk", expectation.level),
          },
          unitLibrary,
        }),
      );
      expect(levelFacts?.healing.monkLevelBonus).toBe(expectation.level);
      expect(levelFacts?.healing.martialArtsDie).toEqual({
        dice: 1,
        dieSize: expectation.dieSize,
      });
    }
  });

  test(sorcererFontOfMagicResourceFactsTestName, () => {
    const sorcererTwo = completeSupportedProgressionDraft({
      draftId: "draft:sorcerer-font-of-magic",
      progression: testProgression("class_sorcerer", 2),
    });
    const result = finalizeCharacterDraft({ draft: sorcererTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "sorcerer_innate_sorcery",
        SORCERER_FONT_OF_MAGIC_UNIT_ID,
        "sorcerer_metamagic",
      ]),
    );
    expect(
      characterBuildResources(result.build, unitLibrary).find(
        (resource) => resource.unitId === SORCERER_FONT_OF_MAGIC_UNIT_ID,
      ),
    ).toEqual({
      unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
      resource: {
        kind: "point_pool",
        poolId: SRD_SORCERY_POINTS_POOL_ID,
        cap: {
          axis: "class",
          base: 2,
          kind: "linear_per_level",
          perLevel: 1,
          startingAtLevel: 2,
        },
      },
    });

    const fontFacts = expectRight(
      characterBuildSorcererFontOfMagicFacts({
        build: result.build,
        unitLibrary,
      }),
    );
    if (fontFacts === undefined) {
      throw new Error(
        "Expected Sorcerer 2 build to project Font of Magic facts.",
      );
    }
    expect(fontFacts).toEqual({
      unitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
      sorceryPointPool: {
        poolId: SRD_SORCERY_POINTS_POOL_ID,
        maximum: 2,
        longRestRefillsAll: true,
      },
      spellSlotCreation: {
        ownerClassLevel: 2,
        operation: {
          activationCost: { kind: "bonus_action" },
          createdSlotExpiry: { kind: "long_rest" },
          kind: "point_pool_to_spell_slot",
          options: [
            { minimumClassLevel: 2, pointCost: 2, spellSlotLevel: 1 },
            { minimumClassLevel: 3, pointCost: 3, spellSlotLevel: 2 },
            { minimumClassLevel: 5, pointCost: 5, spellSlotLevel: 3 },
            { minimumClassLevel: 7, pointCost: 6, spellSlotLevel: 4 },
            { minimumClassLevel: 9, pointCost: 7, spellSlotLevel: 5 },
          ],
        },
      },
    });

    const levelFourFontFacts = expectRight(
      characterBuildSorcererFontOfMagicFacts({
        build: {
          features: result.build.features,
          progression: testProgression("class_sorcerer", 4),
        },
        unitLibrary,
      }),
    );
    expect(levelFourFontFacts?.sorceryPointPool.maximum).toBe(4);
  });

  test("projects Sorcerer Metamagic known option facts from finalized CharacterBuild selections", () => {
    const preferredMetamagicOptionIds = [
      creationChoiceOptionId("sorcerer_empowered_spell"),
      creationChoiceOptionId("sorcerer_heightened_spell"),
    ] as const;
    const sorcererTwo = completeSupportedProgressionDraft({
      draftId: "draft:sorcerer-metamagic-facts",
      progression: testProgression("class_sorcerer", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          SORCERER_METAMAGIC_UNIT_ID,
          SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
        )]: preferredMetamagicOptionIds,
      },
    });
    const result = finalizeCharacterDraft({ draft: sorcererTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(
      selectedChoiceOptionIds(
        sorcererTwo,
        SORCERER_METAMAGIC_UNIT_ID,
        SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
      ),
    ).toEqual(preferredMetamagicOptionIds);
    expect(
      selectedBuildSorcererMetamagicOptionIds(
        result.build,
        SORCERER_METAMAGIC_UNIT_ID,
      ),
    ).toEqual(preferredMetamagicOptionIds);
    expect(
      selectedBuildClassChoiceUnitIds(result.build, SORCERER_METAMAGIC_UNIT_ID),
    ).toEqual([]);
    expect(
      characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual(expect.not.arrayContaining([...preferredMetamagicOptionIds]));

    const metamagicFacts = expectRight(
      characterBuildSorcererMetamagicFacts({
        build: result.build,
        unitLibrary,
      }),
    );
    if (metamagicFacts === undefined) {
      throw new Error("Expected Sorcerer 2 build to project Metamagic facts.");
    }
    expect(metamagicFacts).toEqual({
      unitId: SORCERER_METAMAGIC_UNIT_ID,
      ownerClassLevel: 2,
      choiceCount: 2,
      knownOptions: [
        {
          optionId: "sorcerer_empowered_spell",
          sorceryPointCost: 1,
          stackingMode: "can_combine_with_different_metamagic",
          effectKind: "damage_dice_reroll",
        },
        {
          optionId: "sorcerer_heightened_spell",
          sorceryPointCost: 2,
          stackingMode: "one_per_spell",
          effectKind: "saving_throw_disadvantage",
        },
      ],
      selectionRepeatability: "unique",
      sorceryPointResource: {
        resourceUnitId: SORCERER_FONT_OF_MAGIC_UNIT_ID,
        poolId: SRD_SORCERY_POINTS_POOL_ID,
      },
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
    });

    const levelTenMetamagicFacts = expectRight(
      characterBuildSorcererMetamagicFacts({
        build: {
          features: [
            ...result.build.features,
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: testSorcererMetamagicOptionId("sorcerer_seeking_spell"),
            },
            {
              kind: "selectedSorcererMetamagicOption" as const,
              selectedFromUnitId: SORCERER_METAMAGIC_UNIT_ID,
              optionId: testSorcererMetamagicOptionId("sorcerer_subtle_spell"),
            },
          ],
          progression: testProgression("class_sorcerer", 10),
        },
        unitLibrary,
      }),
    );
    expect(levelTenMetamagicFacts?.choiceCount).toBe(4);
    expect(
      levelTenMetamagicFacts?.knownOptions.map((option) => option.optionId),
    ).toEqual([
      "sorcerer_empowered_spell",
      "sorcerer_heightened_spell",
      "sorcerer_seeking_spell",
      "sorcerer_subtle_spell",
    ]);
  });

  test("advances a finalized Sorcerer build and replaces one Metamagic option", () => {
    const build = finalizedSorcererMetamagicBuild(
      "draft:sorcerer-metamagic-replacement",
    );
    const levelGain = expectRight(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_heightened_spell",
          selectedOptionId: "sorcerer_subtle_spell",
        },
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    );

    expect(computeTotalLevel(result.progression)).toBe(3);
    expect(
      selectedBuildSorcererMetamagicOptionIds(
        result,
        SORCERER_METAMAGIC_UNIT_ID,
      ),
    ).toEqual(["sorcerer_empowered_spell", "sorcerer_subtle_spell"]);
    expect(
      expectRight(
        characterBuildSorcererMetamagicFacts({
          build: result,
          unitLibrary,
        }),
      )?.knownOptions.map((option) => option.optionId),
    ).toEqual(["sorcerer_empowered_spell", "sorcerer_subtle_spell"]);
  });

  test("rejects invalid Sorcerer Metamagic replacement gates", () => {
    const build = finalizedSorcererMetamagicBuild(
      "draft:sorcerer-metamagic-replacement-gates",
    );
    expect(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_heightened_spell",
          selectedOptionId: "sorcerer_heightened_spell",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "sameSorcererMetamagicReplacement" },
    });

    const missingKnownOption = expectRight(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_distant_spell",
          selectedOptionId: "sorcerer_subtle_spell",
        },
      }),
    );
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: missingKnownOption,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "missingSelectedSorcererMetamagicOption" },
    });

    const duplicateKnownOption = expectRight(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedOptions: [],
        replacement: {
          replaceOptionId: "sorcerer_empowered_spell",
          selectedOptionId: "sorcerer_heightened_spell",
        },
      }),
    );
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: duplicateKnownOption,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { code: "duplicateSorcererMetamagicOption" },
    });
  });

  test("advances Sorcerer level 10 and 17 Metamagic option gains from Surface thresholds", () => {
    const levelNineBuild = {
      ...finalizedSorcererMetamagicBuild("draft:sorcerer-metamagic-level-ten"),
      progression: testProgression("class_sorcerer", 9),
    };

    const levelTen = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelNineBuild,
        unitLibrary,
        levelGain: expectRight(
          sorcererLevelGain({
            unitLibrary,
            classUnitId: testClassUnitId("class_sorcerer"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
            gainedOptions: ["sorcerer_seeking_spell", "sorcerer_subtle_spell"],
          }),
        ),
      }),
    );

    expect(
      selectedBuildSorcererMetamagicOptionIds(
        levelTen,
        SORCERER_METAMAGIC_UNIT_ID,
      ),
    ).toEqual([
      "sorcerer_empowered_spell",
      "sorcerer_heightened_spell",
      "sorcerer_seeking_spell",
      "sorcerer_subtle_spell",
    ]);
    expect(
      expectRight(
        characterBuildSorcererMetamagicFacts({
          build: levelTen,
          unitLibrary,
        }),
      )?.choiceCount,
    ).toBe(4);

    const levelSixteenBuild = {
      ...levelTen,
      progression: testProgression("class_sorcerer", 16),
    };
    const levelSeventeen = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelSixteenBuild,
        unitLibrary,
        levelGain: expectRight(
          sorcererLevelGain({
            unitLibrary,
            classUnitId: testClassUnitId("class_sorcerer"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
            gainedOptions: ["sorcerer_distant_spell", "sorcerer_twinned_spell"],
          }),
        ),
      }),
    );

    expect(
      selectedBuildSorcererMetamagicOptionIds(
        levelSeventeen,
        SORCERER_METAMAGIC_UNIT_ID,
      ),
    ).toEqual([
      "sorcerer_empowered_spell",
      "sorcerer_heightened_spell",
      "sorcerer_seeking_spell",
      "sorcerer_subtle_spell",
      "sorcerer_distant_spell",
      "sorcerer_twinned_spell",
    ]);
    expect(
      expectRight(
        characterBuildSorcererMetamagicFacts({
          build: levelSeventeen,
          unitLibrary,
        }),
      )?.choiceCount,
    ).toBe(6);
  });

  test("rejects Sorcerer Metamagic level gains that duplicate known options", () => {
    const levelNineBuild = {
      ...finalizedSorcererMetamagicBuild(
        "draft:sorcerer-metamagic-duplicate-gain",
      ),
      progression: testProgression("class_sorcerer", 9),
    };
    const levelGain = expectRight(
      sorcererLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_sorcerer"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedOptions: ["sorcerer_empowered_spell", "sorcerer_subtle_spell"],
      }),
    );

    expect(
      advanceCharacterBuildClassLevel({
        build: levelNineBuild,
        unitLibrary,
        levelGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "duplicateSorcererMetamagicOption",
        optionId: "sorcerer_empowered_spell",
      },
    });
  });

  test("projects Druid 4 Wild Shape roster thresholds without known-form defaults", () => {
    const druidTwo = completeSupportedProgressionDraft({
      draftId: "draft:druid-wild-shape-level-four",
      progression: testProgression("class_druid", 2),
    });
    const result = finalizeCharacterDraft({ draft: druidTwo, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    const wildShapeFacts = expectRight(
      characterBuildDruidWildShapeFacts({
        build: {
          features: result.build.features,
          progression: testProgression("class_druid", 4),
        },
        unitLibrary,
      }),
    );
    if (wildShapeFacts === undefined) {
      throw new Error("Expected Druid 4 build to project Wild Shape facts.");
    }
    expect(wildShapeFacts).toEqual({
      unitId: DRUID_WILD_SHAPE_UNIT_ID,
      useCount: {
        maximum: 2,
        shortRestRefill: 1,
        longRestRefillsAll: true,
      },
      duration: { unit: "hour", amount: 2 },
      knownFormRoster: {
        creatureType: "beast",
        count: 6,
        maxChallengeRating: 0.5,
        flySpeed: "forbidden",
        longRestReplacementCount: 1,
      },
    });
  });

  test("advances a finalized Fighter build and replaces Fighting Style in one level-gain operation", () => {
    const build = finalizedCompleteManifestBuild();
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const levelGain = expectRight(
      fighterLevelGainWithFightingStyleReplacement({
        unitLibrary,
        classUnitId: fighterClassUnitId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        selectedFeatUnitId: "feat_archery",
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    );

    expect(result.progression).toEqual({
      startingClass: "class_fighter",
      advancements: [
        {
          classUnitId: "class_fighter",
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    });
    expect(
      selectedBuildClassChoiceUnitIds(result, "fighter_fighting_style"),
    ).toEqual(["feat_archery"]);
    expect(
      selectedBuildClassChoiceUnitIds(result, "fighter_weapon_mastery"),
    ).toEqual(["weapon_longsword", "weapon_spear", "weapon_flail"]);
    const unitRefIds = characterBuildUnitRefs(result, unitLibrary).map(
      (ref) => ref.unitId,
    );
    expect(unitRefIds).toEqual(
      expect.arrayContaining([
        "fighter_action_surge",
        "fighter_tactical_mind",
        "feat_archery",
      ]),
    );
    expect(unitRefIds).not.toContain("defense");
  });

  test("advances a finalized Fighter build without duplicating Fighting Style state", () => {
    const build = finalizedCompleteManifestBuild();
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const levelGain = {
      tag: "classLevelGain",
      classUnitId: fighterClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" },
    } as const satisfies CharacterBuildClassLevelGain;

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    );

    expect(computeTotalLevel(result.progression)).toBe(2);
    expect(
      selectedBuildClassChoiceUnitIds(result, "fighter_fighting_style"),
    ).toEqual(["defense"]);
  });

  test("rejects replacing Fighting Style with the already-selected feat", () => {
    const build = finalizedCompleteManifestBuild();
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const levelGain = expectRight(
      fighterLevelGainWithFightingStyleReplacement({
        unitLibrary,
        classUnitId: fighterClassUnitId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        selectedFeatUnitId: "defense",
      }),
    );
    const result = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { code: "sameFightingStyleReplacement" },
    });
  });

  test("rejects Fighting Style replacement outside Fighting Style feat options", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );

    const result = fighterLevelGainWithFightingStyleReplacement({
      unitLibrary,
      classUnitId: fighterClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      selectedFeatUnitId: "feat_savage_attacker",
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { code: "nonFightingStyleFeat" },
    });
  });

  test("rejects Fighting Style replacement outside a Fighter level gain", () => {
    const wizardClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_wizard",
      }),
    );

    const result = fighterLevelGainWithFightingStyleReplacement({
      unitLibrary,
      classUnitId: wizardClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      selectedFeatUnitId: "feat_archery",
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { code: "nonFighterClassLevelGain" },
    });
  });

  test("retains each supported SRD subclass Unit ref in finalized builds", () => {
    for (const subclassUnitId of SRD_LEVEL_THREE_SUBCLASS_UNIT_IDS) {
      const subclassUnit = unitLibrary.requireUnit(subclassUnitId);
      if (subclassUnit.kind !== "subclass") {
        throw new Error(`Expected subclass Unit: ${subclassUnitId}`);
      }
      const classUnitId = `class_${subclassUnit.className}`;
      const classThree = testProgression(classUnitId, 3);
      const isSupportedLevelThreeProgression =
        CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.some(
          (progression) =>
            progressionOptionId(progression) ===
            progressionOptionId(classThree),
        );
      if (!isSupportedLevelThreeProgression) {
        continue;
      }
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:subclass-${subclassUnitId}`,
        progression: classThree,
        preferredOptionIdsBySource: {
          [testUnitHoleId(classUnitId, CLASS_SUBCLASS_CHOICE_KEY)]: [
            creationChoiceOptionId(subclassUnitId),
          ],
        },
      });

      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result).toMatchObject({
        tag: "ready",
        build: {
          features: expect.arrayContaining([
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: classUnitId,
              unitId: subclassUnitId,
            },
          ]),
        },
      });
    }
  });

  test("projects selected Ability Score Improvement feat choices into build ability scores", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterFour = testProgression("class_fighter", 4);
    profile.supportedProgressions = [...originalProgressions, fighterFour];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterFour,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_score:dex:+2:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });
      expect(result).toMatchObject({
        tag: "ready",
        build: {
          abilityScores: {
            dex: 16,
          },
          features: expect.arrayContaining([
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: "fighter_ability_score_improvement_l4",
              unitId: "feat_ability_score_improvement",
            },
          ]),
        },
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("represents two-score Ability Score Improvement choices as unordered pairs", () => {
    const optionIds = abilityScoreIncreaseChoiceOptions({
      maxScore: 20,
      methods: [
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    }).map((option) => option.optionId);

    expect(optionIds).toContain("ability_scores:str:+1;dex:+1:max20");
    expect(optionIds).not.toContain("ability_scores:dex:+1;str:+1:max20");
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  test("decodes every generated Ability Score Improvement option", () => {
    const options = abilityScoreIncreaseChoiceOptions({
      maxScore: 20,
      methods: [
        { kind: "one_score", increase: 2 },
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    });

    for (const option of options) {
      const decoded = decodeAbilityScoreIncreaseOptionId(option.optionId);
      expect(Either.isRight(decoded)).toBe(true);
      if (Either.isRight(decoded)) {
        expect(decoded.right.length).toBeGreaterThan(0);
      }
    }
    expect(
      Either.isLeft(
        decodeAbilityScoreIncreaseOptionId("ability_score:dex:2:max20"),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeAbilityScoreIncreaseOptionId(
          "ability_scores:str:+1;str:+1:max20",
        ),
      ),
    ).toBe(true);
  });

  test("applies two-score Ability Score Improvement feat choices", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterFour = testProgression("class_fighter", 4);
    profile.supportedProgressions = [...originalProgressions, fighterFour];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterFour,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_scores:str:+1;dex:+1:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });
      expect(result).toMatchObject({
        tag: "ready",
        build: {
          abilityScores: {
            str: 18,
            dex: 15,
          },
        },
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("rejects cumulative class-feature ability-score increases above their cap", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      supportedProgressions: CharacterProgression[];
    };
    const originalProgressions = profile.supportedProgressions;
    const fighterSix = testProgression("class_fighter", 6);
    profile.supportedProgressions = [...originalProgressions, fighterSix];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const abilityScoreImprovement = {
        ...secondWind,
        id: "fighter_ability_score_improvement_l4",
        name: "Ability Score Improvement",
        acquiredAtLevel: 4,
        mechanics: {
          family: "passive",
          grants: [
            {
              category: "general",
              kind: "grant_feat",
              openFallback: "any_qualifying_feat",
            },
          ],
        },
      } as UnitRecord;
      const secondAbilityScoreImprovement = {
        ...abilityScoreImprovement,
        id: "fighter_ability_score_improvement_l6",
        acquiredAtLevel: 6,
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 4, unitId: "fighter_ability_score_improvement_l4" },
          { level: 6, unitId: "fighter_ability_score_improvement_l6" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        abilityScoreImprovement,
        secondAbilityScoreImprovement,
      ]);
      const complete = completeManifestDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          progression: fighterSix,
          choices: [
            ...complete.selections.choices,
            selectedUnitChoice(
              "class_fighter",
              "class_subclass_choice",
              "subclass_fighter_champion",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l4",
              "class_feature_ability_score_increase_choice",
              "ability_score:str:+2:max20",
            ),
            selectedUnitChoice(
              "fighter_ability_score_improvement_l6",
              "class_feature_feat_choice",
              "feat_ability_score_improvement",
            ),
            selectedChoice(
              "fighter_ability_score_improvement_l6",
              "class_feature_ability_score_increase_choice",
              "ability_score:str:+2:max20",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });

      expect(result).toMatchObject({
        tag: "invalid",
        issues: [
          {
            tag: "illegalFinalization",
            code: "illegalFinalization",
            message:
              "Cannot apply class-feature ability-score increase: str 19 + 2 would exceed 20.",
          },
        ],
      });
    } finally {
      profile.supportedProgressions = originalProgressions;
    }
  });

  test("does not treat Fighter followed by Wizard as supported Fighter 2", () => {
    const fighterThenWizard = expectRight(
      parseCharacterProgressionShape({
        startingClass: expectRight(
          classUnitIdFromUnitId({
            unitLibrary,
            classUnitId: "class_fighter",
          }),
        ),
        advancements: [
          {
            classUnitId: expectRight(
              classUnitIdFromUnitId({
                unitLibrary,
                classUnitId: "class_wizard",
              }),
            ),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const fighterTwo = testProgression("class_fighter", 2);

    expect(progressionOptionId(fighterThenWizard)).not.toBe(
      progressionOptionId(fighterTwo),
    );
  });

  test("finalizes supported multiclass proficiencies and class feature choices", () => {
    const draft = completeWizardThenFighterDraft();
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(
      expectRight(characterBuildHitPoints(result.build, unitLibrary)).hitDice,
    ).toEqual([
      { classUnitId: "class_wizard", dieSize: 6, total: 1 },
      { classUnitId: "class_fighter", dieSize: 10, total: 1 },
    ]);
    expect(
      expectRight(characterBuildProficiencies(result.build, unitLibrary))
        .weapon,
    ).toEqual(["simple", "martial"]);
    expect(
      expectRight(characterBuildArmorTraining(result.build, unitLibrary)),
    ).toEqual(["light", "medium", "shield"]);
    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "wizard_ritual_adept",
        "fighter_fighting_style",
        "fighter_weapon_mastery",
      ]),
    );
  });

  test("finalizes each supported SRD multiclass-entry source facts from Surface class records", () => {
    for (const classUnitId of SRD_LEVEL_ONE_CLASS_UNIT_IDS) {
      const progression = supportedMulticlassProgressionForClass(classUnitId);
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:srd-multiclass-entry-${classUnitId}`,
        progression,
      });
      const classFacts = readableClassFacts(classUnitId);
      const result = finalizeCharacterDraft({ draft, unitLibrary });

      expect(result.tag, classUnitId).toBe("ready");
      if (result.tag !== "ready") continue;

      expect(
        expectRight(characterBuildHitPoints(result.build, unitLibrary)).hitDice,
      ).toEqual(
        expect.arrayContaining([
          {
            classUnitId,
            dieSize: classFacts.hitPointDie,
            total: 1,
          },
        ]),
      );
      expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
        expect.arrayContaining(
          classFacts.featureGrants
            .filter((grant) => grant.level <= 1)
            .map((grant) => grant.unitId),
        ),
      );
      assertMulticlassProficienciesProjected({
        classUnitId,
        multiclassProficiencies: classFacts.multiclassProficiencies,
        proficiencies: expectRight(
          characterBuildProficiencies(result.build, unitLibrary),
        ),
        armorTraining: expectRight(
          characterBuildArmorTraining(result.build, unitLibrary),
        ),
        draft,
      });
    }
  });

  test("discovers level-1 Warlock Eldritch Invocation options from the invocation catalog", () => {
    const draft = createTestDraft("draft:warlock-invocation-discovery");
    const afterInitial = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills("13:class_warlock:level_1:maximum_hit_die"),
      }),
    );

    const invocationHole = holeById(
      discoverCreationHoles({ draft: afterInitial, unitLibrary }),
      testUnitHoleId(
        "warlock_eldritch_invocations",
        ELDRITCH_INVOCATIONS_CHOICE_KEY,
      ),
    );

    expect(invocationHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      source: {
        tag: "unitChoice",
        unitId: "warlock_eldritch_invocations",
        choiceKey: "eldritch_invocations",
      },
    });
    const invocationOptions =
      invocationHole?.kind === "choice" ? invocationHole.options : [];
    expect(invocationOptions).toEqual(
      SRD_ELDRITCH_INVOCATION_OPTIONS.filter(
        (option) => option.prerequisites.length === 0,
      ).map((option) => ({
        optionId: option.optionId,
        label: option.label,
      })),
    );
    const invocationOptionIds = invocationOptions.map(
      (option) => option.optionId,
    );
    expect(invocationOptionIds).toEqual(
      expect.arrayContaining([
        creationChoiceOptionId("armor_of_shadows"),
        creationChoiceOptionId("eldritch_mind"),
        creationChoiceOptionId("pact_of_the_blade"),
        creationChoiceOptionId("pact_of_the_chain"),
        creationChoiceOptionId("pact_of_the_tome"),
      ]),
    );
    const prerequisiteGatedOptionIds = [
      creationChoiceOptionId("agonizing_blast"),
      creationChoiceOptionId("devils_sight"),
      creationChoiceOptionId("thirsting_blade"),
    ] as const;
    for (const prerequisiteGatedOptionId of prerequisiteGatedOptionIds) {
      expect(invocationOptionIds).not.toContain(prerequisiteGatedOptionId);
    }
  });

  test("finalizes a selected Warlock Eldritch Invocation as option ownership, not a retained Unit ref", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:warlock-invocation-finalization",
      progression: testProgression("class_warlock", 1),
    });
    const result = finalizeCharacterDraft({ draft, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.features).toContainEqual({
      kind: "selectedEldritchInvocation",
      selectedFromUnitId: "warlock_eldritch_invocations",
      selection: {
        kind: "nonRepeatable",
        invocationId: "armor_of_shadows",
      },
    });
    expect(
      result.build.features.some(
        (feature) =>
          feature.kind === "selectedClassChoice" &&
          feature.selectedFromUnitId === "warlock_eldritch_invocations",
      ),
    ).toBe(false);
    expect(characterBuildFeatureUnitIds(result.build, unitLibrary)).toEqual(
      expect.arrayContaining([
        "warlock_eldritch_invocations",
        "warlock_pact_magic",
      ]),
    );
    expect(
      characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).not.toContain("armor_of_shadows");
  });

  test("advances a finalized Warlock build and gains invocations from the Warlock table", () => {
    const build = finalizedWarlockBuild("draft:warlock-invocation-level-2");
    const warlockClassUnitId = testClassUnitId("class_warlock");
    const levelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockClassUnitId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
          preparedSpellReplacement: {
            replaceSpellId: "hellish_rebuke",
            selectedSpellId: "bane",
          },
        }),
        gainedInvocations: [
          nonRepeatableEldritchInvocation("pact_of_the_blade"),
          nonRepeatableEldritchInvocation("devils_sight"),
        ],
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    );

    expect(computeTotalLevel(result.progression)).toBe(2);
    expect(
      selectedBuildEldritchInvocationIds(
        result,
        "warlock_eldritch_invocations",
      ),
    ).toEqual(["armor_of_shadows", "pact_of_the_blade", "devils_sight"]);
    expect(
      result.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_warlock",
      )?.preparedSpells,
    ).toEqual(["charm_person", "bane", "hex"]);
    expect(result.spellcasting?.slotPools.pactMagic).toEqual({
      kind: "pactMagic",
      slotLevel: 1,
      count: 2,
    });
    expect(characterBuildFeatureUnitIds(result, unitLibrary)).toEqual(
      expect.arrayContaining(["warlock_magical_cunning"]),
    );
  });

  test("uses Warlock class-list levels for Pact Magic prepared-spell advancement without requiring spell Unit admission", () => {
    const warlockClassUnitId = testClassUnitId("class_warlock");
    const levelTwo = expectRight(
      advanceCharacterBuildClassLevel({
        build: finalizedWarlockBuild("draft:warlock-class-list-level-2"),
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: warlockClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedPreparedSpells: ["hex"],
            }),
            gainedInvocations: [
              nonRepeatableEldritchInvocation("pact_of_the_blade"),
              nonRepeatableEldritchInvocation("devils_sight"),
            ],
          }),
        ),
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelTwo,
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: warlockClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedPreparedSpells: ["hold_person"],
            }),
            gainedInvocations: [],
          }),
        ),
      }),
    );

    expect(
      result.spellcasting?.sources.find(
        (source) => source.sourceUnitId === "class_warlock",
      )?.preparedSpells,
    ).toEqual(["charm_person", "hellish_rebuke", "hex", "hold_person"]);
    expect(result.spellcasting?.slotPools.pactMagic).toEqual({
      kind: "pactMagic",
      slotLevel: 2,
      count: 2,
    });
  });

  test("rejects a plain Warlock level gain when Pact Magic facts change", () => {
    const build = finalizedWarlockBuild(
      "draft:warlock-missing-invocation-gain",
    );
    const levelGain = {
      tag: "classLevelGain",
      classUnitId: testClassUnitId("class_warlock"),
      hitPointRule: { tag: "fixedHigherLevelGain" },
    } as const satisfies CharacterBuildClassLevelGain;

    const result = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: { code: "invalidWarlockPactMagicPreparedSpellGainCount" },
    });
  });

  test("rejects Warlock invocation gains that do not meet prerequisites", () => {
    const build = finalizedWarlockBuild(
      "draft:warlock-invocation-prerequisite",
    );
    const levelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          nonRepeatableEldritchInvocation("ascendant_step"),
          nonRepeatableEldritchInvocation("devils_sight"),
        ],
      }),
    );

    const result = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: {
        code: "unmetEldritchInvocationPrerequisite",
        invocationId: "ascendant_step",
      },
    });
  });

  test("blocks replacing an invocation required by another selected invocation", () => {
    const levelFiveBuild = warlockLevelFiveBuildWithThirstingBlade();
    const levelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hideous_laughter"],
        }),
        gainedInvocations: [],
        replacement: {
          replaceInvocation:
            nonRepeatableEldritchInvocation("pact_of_the_blade"),
          selectedInvocation:
            nonRepeatableEldritchInvocation("pact_of_the_chain"),
        },
      }),
    );

    const result = advanceCharacterBuildClassLevel({
      build: levelFiveBuild,
      unitLibrary,
      levelGain,
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: {
        code: "lockedEldritchInvocationReplacement",
        replaceInvocationId: "pact_of_the_blade",
        dependentInvocationId: "thirsting_blade",
      },
    });
  });

  test("enforces duplicate invocation selection identity for Repeatable and non-Repeatable invocations", () => {
    const build = warlockBuildWithKnownWarlockCantrips(
      finalizedWarlockBuild("draft:warlock-invocation-duplicates"),
      ["eldritch_blast", "poison_spray"],
    );
    const eldritchBlastChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "eldritch_blast",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
    const poisonSprayChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "poison_spray",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
    const duplicateArmorLevelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          nonRepeatableEldritchInvocation("armor_of_shadows"),
          nonRepeatableEldritchInvocation("devils_sight"),
        ],
      }),
    );
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: duplicateArmorLevelGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "duplicateEldritchInvocationSelection",
        invocationId: "armor_of_shadows",
      },
    });

    const duplicateRepeatableLevelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          repeatableEldritchInvocation("repelling_blast", eldritchBlastChoice),
          repeatableEldritchInvocation("repelling_blast", eldritchBlastChoice),
        ],
      }),
    );
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: duplicateRepeatableLevelGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "duplicateEldritchInvocationSelection",
        invocationId: "repelling_blast",
      },
    });

    const repeatableLevelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          repeatableEldritchInvocation("repelling_blast", eldritchBlastChoice),
          repeatableEldritchInvocation("repelling_blast", poisonSprayChoice),
        ],
      }),
    );
    const repeatableResult = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: repeatableLevelGain,
      }),
    );
    expect(
      selectedBuildEldritchInvocations(
        repeatableResult,
        "warlock_eldritch_invocations",
      ),
    ).toEqual([
      { invocationId: "armor_of_shadows" },
      {
        invocationId: "repelling_blast",
        repeatableChoice: eldritchBlastChoice,
      },
      {
        invocationId: "repelling_blast",
        repeatableChoice: poisonSprayChoice,
      },
    ]);
  });

  test("replaces one Repeatable invocation selection by associated choice", () => {
    const build = warlockBuildWithKnownWarlockCantrips(
      finalizedWarlockBuild("draft:warlock-repeatable-replacement"),
      ["eldritch_blast", "poison_spray"],
    );
    const eldritchBlastChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "eldritch_blast",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
    const poisonSprayChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "poison_spray",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
    const levelTwo = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: testClassUnitId("class_warlock"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedPreparedSpells: ["hex"],
            }),
            gainedInvocations: [
              repeatableEldritchInvocation(
                "repelling_blast",
                eldritchBlastChoice,
              ),
              repeatableEldritchInvocation(
                "repelling_blast",
                poisonSprayChoice,
              ),
            ],
          }),
        ),
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelTwo,
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: testClassUnitId("class_warlock"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedPreparedSpells: ["bane"],
            }),
            gainedInvocations: [],
            replacement: {
              replaceInvocation: repeatableEldritchInvocation(
                "repelling_blast",
                eldritchBlastChoice,
              ),
              selectedInvocation:
                nonRepeatableEldritchInvocation("devils_sight"),
            },
          }),
        ),
      }),
    );

    expect(
      selectedBuildEldritchInvocations(result, "warlock_eldritch_invocations"),
    ).toEqual([
      { invocationId: "armor_of_shadows" },
      { invocationId: "devils_sight" },
      {
        invocationId: "repelling_blast",
        repeatableChoice: poisonSprayChoice,
      },
    ]);
  });

  test("requires Repeatable known-cantrip choices to be selected Warlock-list cantrips that match the invocation rule", () => {
    const build = warlockBuildWithKnownWarlockCantrips(
      finalizedWarlockBuild("draft:warlock-repeatable-cantrip-choice"),
      ["eldritch_blast"],
    );
    const levelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          repeatableEldritchInvocation("repelling_blast", {
            kind: "knownWarlockCantrip",
            cantripId: "fire_bolt",
          }),
          nonRepeatableEldritchInvocation("devils_sight"),
        ],
      }),
    );

    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        code: "invalidRepeatableEldritchInvocationChoice",
        invocationId: "repelling_blast",
      },
    });
  });

  test("admits True Strike as a Warlock damage cantrip via its spell-granted weapon attack", () => {
    const build = warlockBuildWithKnownWarlockCantrips(
      finalizedWarlockBuild("draft:warlock-true-strike-invocations"),
      ["true_strike"],
    );
    const trueStrikeChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "true_strike",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
    const levelGain = expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: testClassUnitId("class_warlock"),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          repeatableEldritchInvocation("agonizing_blast", trueStrikeChoice),
          repeatableEldritchInvocation("repelling_blast", trueStrikeChoice),
        ],
      }),
    );

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain,
      }),
    );

    expect(
      selectedBuildEldritchInvocations(result, "warlock_eldritch_invocations"),
    ).toEqual([
      { invocationId: "armor_of_shadows" },
      {
        invocationId: "agonizing_blast",
        repeatableChoice: trueStrikeChoice,
      },
      {
        invocationId: "repelling_blast",
        repeatableChoice: trueStrikeChoice,
      },
    ]);
  });

  test("checks invocation cantrip prerequisites against Pact Magic facts after a Warlock cantrip gain", () => {
    const warlockClassUnitId = testClassUnitId("class_warlock");
    const levelTwo = expectRight(
      advanceCharacterBuildClassLevel({
        build: finalizedWarlockBuild("draft:warlock-fresh-cantrip-level-2"),
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: warlockClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              cantripReplacement: {
                replaceCantripId: "eldritch_blast",
                selectedCantripId: "prestidigitation",
              },
              gainedPreparedSpells: ["hex"],
            }),
            gainedInvocations: [
              nonRepeatableEldritchInvocation("pact_of_the_blade"),
              nonRepeatableEldritchInvocation("devils_sight"),
            ],
          }),
        ),
      }),
    );
    const levelThree = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelTwo,
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: warlockClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedPreparedSpells: ["bane"],
            }),
            gainedInvocations: [],
          }),
        ),
      }),
    );
    const trueStrikeChoice = {
      kind: "knownWarlockCantrip",
      cantripId: "true_strike",
    } as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;

    const result = expectRight(
      advanceCharacterBuildClassLevel({
        build: levelThree,
        unitLibrary,
        levelGain: expectRight(
          warlockLevelGain({
            unitLibrary,
            classUnitId: warlockClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
            pactMagic: warlockPactMagicLevelGain({
              gainedCantrips: ["true_strike"],
              gainedPreparedSpells: ["detect_magic"],
            }),
            gainedInvocations: [],
            replacement: {
              replaceInvocation:
                nonRepeatableEldritchInvocation("armor_of_shadows"),
              selectedInvocation: repeatableEldritchInvocation(
                "agonizing_blast",
                trueStrikeChoice,
              ),
            },
          }),
        ),
      }),
    );

    expect(spellcastingSourceCantrips(result, "class_warlock")).toEqual([
      "prestidigitation",
      "minor_illusion",
      "true_strike",
    ]);
    expect(
      selectedBuildEldritchInvocations(result, "warlock_eldritch_invocations"),
    ).toEqual([
      {
        invocationId: "agonizing_blast",
        repeatableChoice: trueStrikeChoice,
      },
      { invocationId: "pact_of_the_blade" },
      { invocationId: "devils_sight" },
    ]);
  });

  test("collects all missing class Unit issues while projecting a build", () => {
    const progression = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_fighter"),
        advancements: [
          {
            classUnitId: classUnitId("class_missing_one"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
          {
            classUnitId: classUnitId("class_missing_two"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      progression,
    };
    const supportedSelections = {
      selections,
      progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.map((issue) => issue.message)).toEqual([
      "Cannot finalize unknown class Unit: class_missing_one",
      "Cannot finalize unknown class Unit: class_missing_two",
    ]);
  });

  test("collects malformed class-feature ability-score option issues while projecting a build", () => {
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      choices: [
        ...complete.selections.choices,
        selectedChoice(
          "fighter_ability_score_improvement_l4",
          "class_feature_ability_score_increase_choice",
          "ability_score:dex:2:max20",
          "ability_scores:str:+1;str:+1:max20",
        ),
      ],
    };
    const supportedSelections = {
      selections,
      progression: selections.progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject([
      { tag: "invalidChoiceOption", optionId: "ability_score:dex:2:max20" },
      {
        tag: "invalidChoiceOption",
        optionId: "ability_scores:str:+1;str:+1:max20",
      },
    ]);
  });

  test("collects malformed class-feature proficiency option issues while projecting a build", () => {
    const complete = completeManifestDraft();
    const selections = {
      ...complete.selections,
      choices: [
        ...complete.selections.choices,
        selectedChoice(
          "fighter_proficiency_grant",
          "class_feature_proficiency_choice",
          "proficiency:skill",
          "proficiency:armor",
        ),
      ],
    };
    const supportedSelections = {
      selections,
      progression: selections.progression,
      unitChoices: [],
      loadoutChoices: [],
    } as unknown as Parameters<
      typeof buildCharacterBuild
    >[0]["supportedSelections"];

    const result = buildCharacterBuild({ supportedSelections, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toMatchObject([
      { tag: "invalidChoiceOption", optionId: "proficiency:skill" },
      { tag: "invalidChoiceOption", optionId: "proficiency:armor" },
    ]);
  });

  test("uses collision-resistant progression option ids for class paths", () => {
    const singleClassWithRawEncodedSeparator = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_alpha%7Cclass_beta"),
        advancements: [
          {
            classUnitId: classUnitId("class_alpha%7Cclass_beta"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );
    const multiclassPath = expectRight(
      parseCharacterProgressionShape({
        startingClass: classUnitId("class_alpha"),
        advancements: [
          {
            classUnitId: classUnitId("class_beta"),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );

    expect(progressionOptionId(singleClassWithRawEncodedSeparator)).not.toBe(
      progressionOptionId(multiclassPath),
    );
  });

  test("finalizes Wizard 1 spellcasting build facts from selected spell access", () => {
    const wizard = completeWizardDraft();
    const result = finalizeCharacterDraft({ draft: wizard, unitLibrary });

    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;

    expect(result.build.spellcasting).toEqual({
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: ["light", "fire_bolt", "ray_of_frost"],
          spellbook: [
            "detect_magic",
            "mage_armor",
            "magic_missile",
            "shield",
            "sleep",
            "thunderwave",
          ],
          preparedSpells: ["detect_magic", "magic_missile", "shield", "sleep"],
          spellcastingFocuses: ["arcane_focus", "spellbook"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ count: 2, spellLevel: 1 }],
        },
      },
    });
    expect(
      expectRight(characterBuildProficiencies(result.build, unitLibrary))
        .skills,
    ).toEqual(["athletics", "intimidation", "arcana", "history"]);
    expect(
      characterBuildUnitRefs(result.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual([
      "class_wizard",
      "background_soldier",
      "species_orc",
      "wizard_ritual_adept",
      "wizard_arcane_recovery",
      "feat_savage_attacker",
      "orc_adrenaline_rush",
      "orc_darkvision",
      "orc_relentless_endurance",
      "weapon_longsword",
      "weapon_dagger",
      "equipment_shield",
      "light",
      "fire_bolt",
      "ray_of_frost",
      "detect_magic",
      "mage_armor",
      "magic_missile",
      "shield",
      "sleep",
      "thunderwave",
    ]);
  });

  test("does not finalize Fighter item-bundle equipment with purchased loadout", () => {
    const complete = completeManifestDraft();
    const itemBundleWithPurchasedEquipment: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: complete.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "class_fighter" &&
          choice.source.choiceKey === "class_equipment_choice"
            ? selectedChoice(
                "class_fighter",
                "class_equipment_choice",
                "option_b",
              )
            : choice,
        ),
      },
    };

    expect(
      finalizeCharacterDraft({
        draft: itemBundleWithPurchasedEquipment,
        unitLibrary,
      }),
    ).toMatchObject({
      tag: "invalid",
    });
  });

  test("derives build loadout projection from selected loadout source equipment", () => {
    const complete = completeManifestDraft();
    const projection = finalizedBuildEquipment(
      {
        ...complete.selections,
        progression: testProgression("class_fighter", 1),
        background: "background_soldier",
        abilityScoreGeneration: {
          method: "standardArray",
          assignedScores: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "str",
          plusOne: "con",
        },
        species: "species_orc",
        languages: ["Common", "Dwarvish", "Goblin"],
        alignment: { order: "lawful", morality: "good" },
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ],
        },
        choices: complete.selections.choices.map((choice) =>
          choice.kind === "loadout" &&
          choice.source.equipmentUnitId === "weapon_longsword" &&
          choice.source.slot === "weapon"
            ? selectedLoadoutChoice(
                "weapon_longsword",
                "weapon",
                "wielded_one_handed",
              )
            : choice,
        ),
      },
      unitLibrary,
    );

    expect(projection).toMatchObject({ _tag: "Right" });
    if (Either.isLeft(projection)) return;
    expect(projection.right.loadout.weapon).toEqual({
      itemId: testCharacterEquipmentItemId("main", "weapon_longsword"),
      grip: "one_handed",
    });
  });

  test("rejects finalized drafts with duplicate selected-equipment loadout slots", () => {
    const complete = completeManifestDraft();
    const mutableProfile =
      CHARACTER_CREATION_SUPPORT_PROFILE as unknown as MutableSupportProfile;
    const originalEquipmentPurchaseChoiceCount =
      mutableProfile.equipmentPurchaseChoiceCount;
    mutableProfile.equipmentPurchaseChoiceCount = 4;

    try {
      const duplicateWeaponSlotDraft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          equipment: {
            selectedUnitIds: [
              "armor_chain_mail",
              "weapon_longsword",
              "weapon_flail",
              "equipment_shield",
            ],
          },
          choices: [
            ...complete.selections.choices,
            selectedLoadoutChoice(
              "weapon_flail",
              "weapon",
              "wielded_one_handed",
            ),
          ],
        },
      };

      expect(
        finalizeCharacterDraft({
          draft: duplicateWeaponSlotDraft,
          unitLibrary,
        }),
      ).toMatchObject({
        tag: "invalid",
        issues: [
          {
            tag: "unsupportedFinalization",
            code: "unsupportedFinalization",
          },
        ],
      });
    } finally {
      mutableProfile.equipmentPurchaseChoiceCount =
        originalEquipmentPurchaseChoiceCount;
    }
  });

  test("finalizes public builds from support-profile-selected loadout Unit refs", () => {
    const complete = completeManifestDraft();
    const mutableProfile =
      CHARACTER_CREATION_SUPPORT_PROFILE as unknown as MutableSupportProfile;
    const originalPurchaseOptionIds =
      mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase;
    const originalPurchasableEquipmentUnitIds =
      mutableProfile.purchasableEquipmentUnitIds;
    const originalLoadoutChoices = mutableProfile.loadoutChoices;
    const spearWeaponLoadout: SupportedLoadoutChoice = {
      slot: "weapon",
      unitId: "weapon_spear",
      optionId: creationChoiceOptionId("wielded_one_handed"),
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    };

    mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase = [
      creationChoiceOptionId("armor_chain_mail"),
      creationChoiceOptionId("weapon_spear"),
      creationChoiceOptionId("equipment_shield"),
    ];
    mutableProfile.purchasableEquipmentUnitIds = [
      "armor_chain_mail",
      "weapon_spear",
      "equipment_shield",
    ];
    mutableProfile.loadoutChoices = [
      originalLoadoutChoices[0]!,
      originalLoadoutChoices[1]!,
      spearWeaponLoadout,
    ];

    try {
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          equipment: {
            selectedUnitIds: [
              "armor_chain_mail",
              "weapon_spear",
              "equipment_shield",
            ],
          },
          choices: complete.selections.choices.map((choice) =>
            choice.kind === "loadout" &&
            choice.source.equipmentUnitId === "weapon_longsword" &&
            choice.source.slot === "weapon"
              ? selectedLoadoutChoice(
                  "weapon_spear",
                  "weapon",
                  "wielded_one_handed",
                )
              : choice,
          ),
        },
      };

      const finalization = finalizeCharacterDraft({ draft, unitLibrary });

      expect(finalization).toMatchObject({
        tag: "ready",
        build: {
          equipment: {
            loadout: {
              armor: testCharacterEquipmentItemId("armor", "armor_chain_mail"),
              shield: testCharacterEquipmentItemId(
                "shield",
                "equipment_shield",
              ),
              weapon: {
                itemId: testCharacterEquipmentItemId("main", "weapon_spear"),
                grip: "one_handed",
              },
            },
          },
        },
      });
    } finally {
      mutableProfile.unitOptionIdsByChoiceKey.equipment_purchase =
        originalPurchaseOptionIds;
      mutableProfile.purchasableEquipmentUnitIds =
        originalPurchasableEquipmentUnitIds;
      mutableProfile.loadoutChoices = originalLoadoutChoices;
    }
  });

  test("merges duplicate supported choice-hole sources instead of overwriting", () => {
    const merged = supportedChoiceHolesBySource([
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
        ],
      },
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
          {
            optionId: creationChoiceOptionId("dueling"),
            label: "Dueling",
            unitRef: { unitId: "dueling" },
          },
        ],
      },
    ]);

    const mergedHole = merged.get(
      testUnitChoiceSourceKey(
        "fighter_fighting_style",
        "class_feature_feat_choice",
      ),
    );
    expect(mergedHole).toMatchObject({
      kind: "choice",
      source: {
        tag: "unitChoice",
        unitId: "fighter_fighting_style",
        choiceKey: "class_feature_feat_choice",
      },
    });
    expect(mergedHole?.options).toEqual([
      {
        optionId: "defense",
        label: "Defense",
        unitRef: { unitId: "defense" },
      },
      {
        optionId: "dueling",
        label: "Dueling",
        unitRef: { unitId: "dueling" },
      },
    ]);
  });

  test("ignores duplicate supported choice-hole sources that disagree on cardinality", () => {
    const merged = supportedChoiceHolesBySource([
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(exactChoiceCardinality(1)),
        options: [
          {
            optionId: creationChoiceOptionId("defense"),
            label: "Defense",
            unitRef: { unitId: "defense" },
          },
        ],
      },
      {
        kind: "choice",
        holeId: creationHoleId(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
        ),
        source: {
          tag: "unitChoice",
          unitId: unitChoiceSourceUnitIdRight("fighter_fighting_style"),
          choiceKey: unitChoiceKeyRight("class_feature_feat_choice"),
        },
        cardinality: choiceCardinalityRight(
          boundedChoiceCardinality({ min: 1, max: 2 }),
        ),
        options: [
          {
            optionId: creationChoiceOptionId("dueling"),
            label: "Dueling",
            unitRef: { unitId: "dueling" },
          },
        ],
      },
    ]);
    expect(
      merged.get(
        testUnitChoiceSourceKey(
          "fighter_fighting_style",
          "class_feature_feat_choice",
        ),
      )?.options,
    ).toEqual([
      {
        optionId: "defense",
        label: "Defense",
        unitRef: { unitId: "defense" },
      },
    ]);
  });

  test("does not finalize incomplete or illegal drafts", () => {
    const incomplete = finalizeCharacterDraft({
      draft: createTestDraft("draft:finalize-incomplete"),
      unitLibrary,
    });
    expect(incomplete).toMatchObject({ tag: "incomplete" });

    const complete = completeManifestDraft();
    const illegalDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        progression: testProgression("class_fighter", 4),
        choices: [
          ...complete.selections.choices,
          selectedUnitChoice(
            "class_fighter",
            CLASS_SUBCLASS_CHOICE_KEY,
            "subclass_fighter_champion",
          ),
        ],
      },
    };
    const illegal = finalizeCharacterDraft({
      draft: illegalDraft,
      unitLibrary,
    });

    expect(illegal).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build progression must match a supported progression profile.",
        },
      ],
    });
  });

  test("keeps drafts with off-background ability-score increases incomplete", () => {
    const complete = completeManifestDraft();
    const offBackgroundAsiDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "cha",
          plusOne: "con",
        },
      },
    };

    const finalization = finalizeCharacterDraft({
      draft: offBackgroundAsiDraft,
      unitLibrary,
    });

    expect(finalization).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
        },
      ],
    });
  });

  test("rejects completed drafts with extra or contradictory choices", () => {
    const complete = completeManifestDraft();
    const extraChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "weapon_longsword",
          ),
        ],
      },
    };
    const duplicateChoiceDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: [
          ...complete.selections.choices,
          selectedChoice(
            "fighter_fighting_style",
            "class_feature_feat_choice",
            "defense",
          ),
        ],
      },
    };

    expect(
      finalizeCharacterDraft({ draft: extraChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build must carry exactly the supported choices for the selected progression.",
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: duplicateChoiceDraft, unitLibrary }),
    ).toMatchObject({
      tag: "invalid",
      issues: [
        {
          tag: "unsupportedFinalization",
          code: "unsupportedFinalization",
          message:
            "Finalized build must carry exactly the supported choices for the selected progression.",
        },
      ],
    });
  });

  test("rejects drafts whose Unit-backed selected options lost Unit refs", () => {
    const complete = completeManifestDraft();
    const missingUnitRefDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        choices: complete.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "fighter_fighting_style" &&
          choice.source.choiceKey === "class_feature_feat_choice"
            ? {
                ...choice,
                options: choice.options.map((option) => ({
                  optionId: option.optionId,
                })),
              }
            : choice,
        ),
      },
    };

    const finalization = finalizeCharacterDraft({
      draft: missingUnitRefDraft,
      unitLibrary,
    });

    expect(finalization).toMatchObject({
      tag: "invalid",
    });
  });

  test("projects selected class-feature proficiency grants into build skills", () => {
    const fighter = unitLibrary.requireUnit("class_fighter");
    const secondWind = unitLibrary.requireUnit("fighter_second_wind");
    const bonusProficiencies = {
      ...secondWind,
      id: "fighter_bonus_proficiencies",
      name: "Bonus Proficiencies",
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "grant_proficiency",
            proficiency: {
              kind: "choice",
              count: 3,
              options: [
                { kind: "skill", skill: "animal_handling" },
                { kind: "skill", skill: "medicine" },
                { kind: "skill", skill: "religion" },
              ],
            },
          },
        ],
      },
    } as UnitRecord;
    const widenedFighter = {
      ...fighter,
      featureGrants: [
        ...("featureGrants" in fighter ? fighter.featureGrants : []),
        { level: 2, unitId: "fighter_bonus_proficiencies" },
      ],
    } as UnitRecord;
    const widenedUnitLibrary = unitLibraryReplacingUnits([
      widenedFighter,
      bonusProficiencies,
    ]);
    const draft = createCharacterDraft({
      unitLibrary: widenedUnitLibrary,
      draftId: characterDraftId("draft:class-feature-proficiency-grant"),
    });
    const afterProgression = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: draft.revision,
        fills: initialManifestFills(
          "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
        ),
      }),
    );

    const proficiencyHole = holeById(
      discoverCreationHoles({
        draft: afterProgression,
        unitLibrary: widenedUnitLibrary,
      }),
      testUnitHoleId(
        "fighter_bonus_proficiencies",
        "class_feature_proficiency_choice",
      ),
    );
    expect(proficiencyHole).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 3 },
      options: expect.arrayContaining([
        expect.objectContaining({ optionId: "animal_handling" }),
        expect.objectContaining({ optionId: "medicine" }),
        expect.objectContaining({ optionId: "religion" }),
      ]),
    });

    const afterChoices = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterProgression,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterProgression.revision,
        fills: [
          choiceFill(
            testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
            "perception",
            "survival",
          ),
          choiceFill(
            testUnitHoleId(
              "fighter_fighting_style",
              "class_feature_feat_choice",
            ),
            "defense",
          ),
          choiceFill(
            testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          choiceFill(
            testUnitHoleId(
              "fighter_bonus_proficiencies",
              "class_feature_proficiency_choice",
            ),
            "animal_handling",
            "medicine",
            "religion",
          ),
          choiceFill(
            testUnitHoleId(
              "background_soldier",
              "background_ability_score_increase",
            ),
            "two_and_one:str:con",
          ),
          choiceFill(
            testUnitHoleId("background_soldier", "background_tool_choice"),
            "tool_dice_set",
          ),
          choiceFill(
            testUnitHoleId("class_fighter", "class_equipment_choice"),
            "option_c",
          ),
          choiceFill(
            testUnitHoleId("background_soldier", "background_equipment_choice"),
            "option_b",
          ),
        ],
      }),
    );
    const afterPurchase = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterChoices,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterChoices.revision,
        fills: [
          choiceFill(
            testUnitHoleId("class_fighter", "equipment_purchase"),
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ),
        ],
      }),
    );
    const complete = requireAcceptedBatch(
      fillCreationHoles({
        draft: afterPurchase,
        unitLibrary: widenedUnitLibrary,
        expectedRevision: afterPurchase.revision,
        fills: [
          choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
          choiceFill(
            testLoadoutHoleId("equipment_shield", "shield"),
            "wielded",
          ),
          choiceFill(
            testLoadoutHoleId("weapon_longsword", "weapon"),
            "wielded_one_handed",
          ),
        ],
      }),
    );

    const finalization = finalizeCharacterDraft({
      draft: complete,
      unitLibrary: widenedUnitLibrary,
    });

    expect(finalization.tag).toBe("ready");
    if (finalization.tag !== "ready") return;
    expect(
      expectRight(
        characterBuildProficiencies(finalization.build, widenedUnitLibrary),
      ).skills,
    ).toEqual([
      "athletics",
      "intimidation",
      "perception",
      "survival",
      "animal_handling",
      "medicine",
      "religion",
    ]);
  });

  test("derives Primal Knowledge proficiency choice from the level-3 Barbarian feature grant", () => {
    const featureHoles = classFeatureGrantChoiceHoles(
      "barbarian_primal_knowledge",
      unitLibrary,
      {
        classLevel: 3,
        ownedSkillProficiencies: ["athletics", "intimidation"],
      },
    );

    expect(featureHoles).toHaveLength(1);
    expect(featureHoles[0]).toMatchObject({
      kind: "choice",
      cardinality: { tag: "exactly", count: 1 },
      options: expect.arrayContaining([
        expect.objectContaining({ optionId: "animal_handling" }),
        expect.objectContaining({ optionId: "nature" }),
        expect.objectContaining({ optionId: "perception" }),
        expect.objectContaining({ optionId: "survival" }),
      ]),
    });
    expect(featureHoles[0]?.options).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ optionId: "athletics" }),
        expect.objectContaining({ optionId: "intimidation" }),
      ]),
    );

    const build = {
      progression: testProgression("class_barbarian", 3),
      background: "background_soldier",
      proficiencyChoices: [
        { kind: "skill", skill: "athletics" },
        { kind: "skill", skill: "intimidation" },
        { kind: "skill", skill: "nature" },
      ],
      features: [],
    } as const;

    expect(characterBuildFeatureUnitIds(build, unitLibrary)).toContain(
      "barbarian_primal_knowledge",
    );
    expect(
      expectRight(characterBuildProficiencies(build, unitLibrary)).skills,
    ).toEqual(expect.arrayContaining(["athletics", "intimidation", "nature"]));
  });

  test("adds Draconic Resilience to Sorcerer Hit Point maximum from the retained feature", () => {
    const baseBuild = {
      progression: testProgression("class_sorcerer", 3),
      abilityScores: testAbilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 10,
        cha: 15,
      }),
      features: [],
    } as const;
    const build = {
      ...baseBuild,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: "class_sorcerer",
          unitId: "subclass_sorcerer_draconic_sorcery",
        },
      ],
    } as const;

    expect(characterBuildFeatureUnitIds(baseBuild, unitLibrary)).not.toContain(
      "sorcerer_draconic_resilience",
    );
    expect(
      expectRight(characterBuildHitPoints(baseBuild, unitLibrary)),
    ).toEqual({
      maximum: 17,
      hitDice: [{ classUnitId: "class_sorcerer", dieSize: 6, total: 3 }],
    });

    expect(characterBuildFeatureUnitIds(build, unitLibrary)).toContain(
      "sorcerer_draconic_resilience",
    );
    expect(expectRight(characterBuildHitPoints(build, unitLibrary))).toEqual({
      maximum: 20,
      hitDice: [{ classUnitId: "class_sorcerer", dieSize: 6, total: 3 }],
    });
  });

  test("represents mixed class-feature proficiency grant subjects without narrowing to skills", () => {
    const profile = CHARACTER_CREATION_SUPPORT_PROFILE as unknown as {
      unitOptionIdsByChoiceKey: Record<string, CreationChoiceOptionId[]>;
    };
    const originalProficiencyOptions =
      profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice;
    profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice = [
      ...(originalProficiencyOptions ?? []),
      creationChoiceOptionId("tool:thieves_tools"),
    ];
    try {
      const fighter = unitLibrary.requireUnit("class_fighter");
      const secondWind = unitLibrary.requireUnit("fighter_second_wind");
      const mixedProficiencies = {
        ...secondWind,
        id: "fighter_mixed_proficiencies",
        name: "Mixed Proficiencies",
        mechanics: {
          family: "passive",
          grants: [
            {
              kind: "grant_proficiency",
              proficiency: {
                kind: "choice",
                count: 4,
                options: [
                  { kind: "skill", skill: "medicine" },
                  { kind: "weapon_category", category: "martial" },
                  { kind: "armor_category", category: "light" },
                  { kind: "tool", toolId: "thieves_tools" },
                ],
              },
            },
          ],
        },
      } as UnitRecord;
      const widenedFighter = {
        ...fighter,
        featureGrants: [
          ...("featureGrants" in fighter ? fighter.featureGrants : []),
          { level: 2, unitId: "fighter_mixed_proficiencies" },
        ],
      } as UnitRecord;
      const widenedUnitLibrary = unitLibraryReplacingUnits([
        widenedFighter,
        mixedProficiencies,
      ]);
      const complete = completeFighterTwoDraft();
      const draft: CharacterDraft = {
        ...complete,
        selections: {
          ...complete.selections,
          choices: [
            ...complete.selections.choices,
            selectedChoice(
              "fighter_mixed_proficiencies",
              "class_feature_proficiency_choice",
              "medicine",
              "weapon_category:martial",
              "armor_category:light",
              "tool:thieves_tools",
            ),
          ],
        },
      };

      const result = finalizeCharacterDraft({
        draft,
        unitLibrary: widenedUnitLibrary,
      });

      expect(result.tag).toBe("ready");
      if (result.tag !== "ready") return;
      expect(
        expectRight(
          characterBuildArmorTraining(result.build, widenedUnitLibrary),
        ),
      ).toEqual(expect.arrayContaining(["light"]));
      const proficiencies = expectRight(
        characterBuildProficiencies(result.build, widenedUnitLibrary),
      );
      expect(proficiencies.skills).toEqual(
        expect.arrayContaining(["medicine"]),
      );
      expect(proficiencies.weapon).toEqual(expect.arrayContaining(["martial"]));
      expect(proficiencies.tools).toEqual(
        expect.arrayContaining(["thieves_tools"]),
      );
    } finally {
      profile.unitOptionIdsByChoiceKey.class_feature_proficiency_choice =
        originalProficiencyOptions;
    }
  });

  test("round-trips every class-feature proficiency subject option shape", () => {
    const subjects: readonly ProficiencyGrantSubject[] = [
      { kind: "skill", skill: "medicine" },
      { kind: "weapon_category", category: "martial" },
      { kind: "armor_category", category: "light" },
      { kind: "tool", toolId: "thieves_tools" },
    ];

    for (const subject of subjects) {
      const option = proficiencyGrantSubjectOption(subject);
      const decoded = decodeProficiencyGrantSubjectOptionId(option.optionId);
      expect(Either.isRight(decoded)).toBe(true);
      if (Either.isRight(decoded)) {
        expect(decoded.right).toEqual(subject);
      }
    }
    expect(
      Either.isLeft(
        decodeProficiencyGrantSubjectOptionId("weapon_category:future"),
      ),
    ).toBe(true);
    expect(Either.isLeft(decodeProficiencyGrantSubjectOptionId("tool:"))).toBe(
      true,
    );
    expect(
      Either.isLeft(decodeProficiencyGrantSubjectOptionId("tool:   ")),
    ).toBe(true);
    expect(
      proficiencyGrantSubjectOption({ kind: "skill", skill: "medicine" }),
    ).toMatchObject({ label: "Medicine" });
  });

  test("keeps duplicate or missing equipment ownership fillable", () => {
    const complete = completeManifestDraft();
    const duplicateEquipmentDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
            "equipment_shield",
          ],
        },
      },
    };
    const missingShieldDraft: CharacterDraft = {
      ...complete,
      selections: {
        ...complete.selections,
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "weapon_longsword",
          ],
        },
      },
    };

    expect(
      finalizeCharacterDraft({ draft: duplicateEquipmentDraft, unitLibrary }),
    ).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId("class_fighter", "equipment_purchase"),
        },
      ],
    });
    expect(
      finalizeCharacterDraft({ draft: missingShieldDraft, unitLibrary }),
    ).toMatchObject({
      tag: "incomplete",
      holes: [
        {
          holeId: testUnitHoleId("class_fighter", "equipment_purchase"),
        },
      ],
    });
  });
});

function draftWithSelections(
  selections: Partial<CharacterDraft["selections"]>,
): CharacterDraft {
  const base = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:with-selections"),
  });

  return {
    ...base,
    selections: {
      ...base.selections,
      ...selections,
    },
  };
}

function createTestDraft(draftId: string): CharacterDraft {
  return createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
}

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
}): CharacterDraft {
  let draft = createTestDraft(input.draftId);
  draft = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(progressionOptionId(input.progression)),
    }),
  );

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      return draft;
    }

    draft = requireAcceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) =>
          supportedFillForHole(hole, input.preferredOptionIdsBySource),
        ),
      }),
    );
  }

  throw new Error(
    `Supported progression fixture still has holes after iterative fills: ${JSON.stringify(
      holeSummary(discoverCreationHoles({ draft, unitLibrary })),
    )}`,
  );
}

type PreferredSupportedFillOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

function supportedFillForHole(
  hole: CreationHole,
  preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource,
): CreationFill {
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for discovered test hole: ${hole.holeId}`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIds = hole.options.map((option) => option.optionId);
  const preferredOptionIds =
    hole.source.tag === "unitChoice"
      ? (preferredOptionIdsBySource?.[unitChoiceSourceKey(hole.source)] ??
        manifestFixtureOptionIds(hole.source))
      : hole.source.tag === "draft" && hole.source.path === "draft.background"
        ? [creationChoiceOptionId("background_soldier")]
        : undefined;
  const holeOptionIdSet = new Set(holeOptionIds);
  const selectedOptionIds = (preferredOptionIds ?? holeOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough supported options for discovered test hole: ${hole.holeId}`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: selectedOptionIds,
  };
}

function manifestFixtureOptionIds(source: {
  readonly unitId: UnitRecord["id"];
  readonly choiceKey: UnitChoiceKey;
}): readonly CreationChoiceOptionId[] | undefined {
  if (
    source.unitId === "wizard_evocation_savant" &&
    source.choiceKey === WIZARD_SPELLBOOK_CHOICE_KEY
  ) {
    return [
      creationChoiceOptionId("gust_of_wind"),
      creationChoiceOptionId("shatter"),
    ];
  }
  if (
    source.unitId === "barbarian_primal_knowledge" &&
    source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY
  ) {
    return [creationChoiceOptionId("nature")];
  }

  return soldierBackgroundFixtureOptionIds(source);
}

function readableClassFacts(classUnitId: UnitRecord["id"]) {
  const facts = readClassCreationFacts(unitLibrary.requireUnit(classUnitId));
  if (facts.tag !== "readable") {
    throw new Error(`Expected readable class facts for ${classUnitId}.`);
  }

  return facts.value;
}

function unitCatalogWithUnsupportedLanguageGrant(input: {
  readonly unitId: UnitRecord["id"];
  readonly languageId: string;
}): UnitCatalog {
  const sourceUnit = unitLibrary.requireUnit(input.unitId);
  if (
    sourceUnit.kind !== "class_feature" ||
    sourceUnit.mechanics.family !== "passive"
  ) {
    throw new Error(`Expected passive class feature Unit: ${input.unitId}.`);
  }

  const replacementUnit: UnitRecord = {
    ...sourceUnit,
    mechanics: {
      ...sourceUnit.mechanics,
      grants: sourceUnit.mechanics.grants.map((grant) =>
        grant.kind === "grant_language"
          ? { ...grant, languageId: input.languageId }
          : grant,
      ),
    },
  };

  return {
    getUnit: (id) =>
      id === input.unitId
        ? Option.some(replacementUnit)
        : unitLibrary.getUnit(id),
    listUnits: () =>
      unitLibrary
        .listUnits()
        .map((unit) => (unit.id === input.unitId ? replacementUnit : unit)),
    requireUnit: (id) =>
      id === input.unitId ? replacementUnit : unitLibrary.requireUnit(id),
  };
}

function supportedMulticlassProgressionForClass(
  classUnitId: UnitRecord["id"],
): CharacterProgression {
  const progression =
    CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.find(
      (candidate) =>
        startingClassUnitId(candidate) !== classUnitId &&
        candidate.advancements.some(
          (entry) => entry.classUnitId === classUnitId,
        ),
    );
  if (progression == null) {
    throw new Error(`No supported multiclass progression for ${classUnitId}.`);
  }

  return progression;
}

function selectedChoiceOptionIds(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: string,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
}

function selectedBuildClassChoiceUnitIds(
  build: CharacterBuild,
  selectedFromUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === selectedFromUnitId
      ? [feature.unitId]
      : [],
  );
}

function selectedBuildEldritchInvocationIds(
  build: CharacterBuild,
  selectedFromUnitId: UnitRecord["id"],
): readonly string[] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedEldritchInvocation" &&
    feature.selectedFromUnitId === selectedFromUnitId
      ? [feature.selection.invocationId]
      : [],
  );
}

function selectedBuildSorcererMetamagicOptionIds(
  build: CharacterBuild,
  selectedFromUnitId: UnitRecord["id"],
): readonly string[] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedSorcererMetamagicOption" &&
    feature.selectedFromUnitId === selectedFromUnitId
      ? [feature.optionId]
      : [],
  );
}

function testSorcererMetamagicOptionId(optionId: string) {
  return expectRight(sorcererMetamagicOptionId(optionId));
}

function selectedBuildEldritchInvocations(
  build: CharacterBuild,
  selectedFromUnitId: UnitRecord["id"],
): readonly {
  readonly invocationId: string;
  readonly repeatableChoice?: CharacterBuildEldritchInvocationRepeatableChoice;
}[] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedEldritchInvocation" &&
    feature.selectedFromUnitId === selectedFromUnitId
      ? [
          {
            invocationId: feature.selection.invocationId,
            ...(feature.selection.kind === "nonRepeatable"
              ? {}
              : { repeatableChoice: feature.selection.repeatableChoice }),
          },
        ]
      : [],
  );
}

function spellcastingSourceCantrips(
  build: CharacterBuild,
  classUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] | undefined {
  return build.spellcasting?.sources.find(
    (source) => source.sourceUnitId === classUnitId,
  )?.cantrips;
}

function selectedChoiceOptionIdsByChoiceKey(
  draft: CharacterDraft,
  choiceKey: string,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" && selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
}

function assertMulticlassProficienciesProjected(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly multiclassProficiencies: ProficiencyGrant;
  readonly proficiencies: CharacterBuildProficiencies;
  readonly armorTraining: readonly string[];
  readonly draft: CharacterDraft;
}): void {
  const fixedSubjects = fixedMulticlassSubjects(input.multiclassProficiencies);
  for (const subject of fixedSubjects) {
    assertProficiencySubjectProjected({
      classUnitId: input.classUnitId,
      subject,
      proficiencies: input.proficiencies,
      armorTraining: input.armorTraining,
    });
  }

  for (const choice of multiclassProficiencyChoices(
    input.multiclassProficiencies,
  )) {
    const selectedSubjects = selectedChoiceOptionIds(
      input.draft,
      input.classUnitId,
      choice.choiceKey,
    );
    expect(selectedSubjects, input.classUnitId).toHaveLength(choice.count);
    for (const optionId of selectedSubjects) {
      const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
      expect(Either.isRight(decoded), input.classUnitId).toBe(true);
      if (Either.isRight(decoded)) {
        assertProficiencySubjectProjected({
          classUnitId: input.classUnitId,
          subject: decoded.right,
          proficiencies: input.proficiencies,
          armorTraining: input.armorTraining,
        });
      }
    }
  }
}

function assertClassToolProficienciesProjected(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly toolProficiencies: ToolProficiencyGrant;
  readonly proficiencies: CharacterBuildProficiencies;
  readonly draft: CharacterDraft;
}): void {
  if (input.toolProficiencies.kind === "none") {
    return;
  }
  if (input.toolProficiencies.kind === "fixed") {
    for (const subject of input.toolProficiencies.proficiencies) {
      assertProficiencySubjectProjected({
        classUnitId: input.classUnitId,
        subject,
        proficiencies: input.proficiencies,
        armorTraining: [],
      });
    }
    return;
  }

  const selectedSubjects = selectedChoiceOptionIds(
    input.draft,
    input.classUnitId,
    "class_tool_proficiency_choice",
  );
  expect(selectedSubjects, input.classUnitId).toHaveLength(
    input.toolProficiencies.count,
  );
  for (const optionId of selectedSubjects) {
    const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
    expect(Either.isRight(decoded), input.classUnitId).toBe(true);
    if (Either.isRight(decoded)) {
      assertProficiencySubjectProjected({
        classUnitId: input.classUnitId,
        subject: decoded.right,
        proficiencies: input.proficiencies,
        armorTraining: [],
      });
    }
  }
}

function multiclassProficiencyChoices(
  proficiency: ProficiencyGrant,
): readonly { readonly choiceKey: string; readonly count: number }[] {
  if (proficiency.kind === "choice") {
    return [
      {
        choiceKey: "class_feature_proficiency_choice",
        count: proficiency.count,
      },
    ];
  }
  if (proficiency.kind === "mixed") {
    return [
      {
        choiceKey: proficiency.choice.choiceKey,
        count: proficiency.choice.count,
      },
    ];
  }
  if (proficiency.kind === "mixed_choices") {
    return proficiency.choices.map((choice) => ({
      choiceKey: choice.choiceKey,
      count: choice.count,
    }));
  }

  return [];
}

function fixedMulticlassSubjects(
  proficiency: ProficiencyGrant,
): readonly ProficiencyGrantSubject[] {
  if (proficiency.kind === "fixed") {
    return proficiency.proficiencies;
  }
  if (proficiency.kind === "mixed" || proficiency.kind === "mixed_choices") {
    return proficiency.fixed;
  }

  return [];
}

function assertProficiencySubjectProjected(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly subject: ProficiencyGrantSubject;
  readonly proficiencies: CharacterBuildProficiencies;
  readonly armorTraining: readonly string[];
}): void {
  if (input.subject.kind === "skill") {
    expect(input.proficiencies.skills, input.classUnitId).toContain(
      input.subject.skill,
    );
  }
  if (input.subject.kind === "weapon_category") {
    expect(input.proficiencies.weapon, input.classUnitId).toContain(
      input.subject.category,
    );
  }
  if (input.subject.kind === "armor_category") {
    expect(input.armorTraining, input.classUnitId).toContain(
      input.subject.category,
    );
  }
  if (input.subject.kind === "tool") {
    expect(input.proficiencies.tools, input.classUnitId).toContain(
      input.subject.toolId,
    );
  }
}

function unitLibraryWithUnrelatedUnits(count: number): UnitCatalog {
  const fighter = unitLibrary.requireUnit("class_fighter");
  const soldier = unitLibrary.requireUnit("background_soldier");
  const orc = unitLibrary.requireUnit("species_orc");
  const longsword = unitLibrary.requireUnit("weapon_longsword");
  const unrelatedUnits: UnitRecord[] = Array.from(
    { length: count },
    (_, index) =>
      [
        { ...fighter, id: `class_unrelated_${index}` },
        { ...soldier, id: `background_unrelated_${index}` },
        { ...orc, id: `species_unrelated_${index}` },
        { ...longsword, id: `weapon_unrelated_${index}` },
      ] as UnitRecord[],
  ).flat();
  const units = [...unitLibrary.listUnits(), ...unrelatedUnits];

  return {
    ...unitLibrary,
    listUnits: () => units,
    requireUnit: (id) => {
      const unit = units.find((candidate) => candidate.id === id);
      if (unit == null) {
        throw new Error(`Missing test Unit: ${id}`);
      }

      return unit;
    },
  };
}

function unitLibraryReplacingUnits(
  replacements: readonly UnitRecord[],
): UnitCatalog {
  const replacementById = new Map(
    replacements.map((unit) => [unit.id, unit] as const),
  );
  const baseUnits = unitLibrary.listUnits();
  const units = [
    ...baseUnits.map((unit) => replacementById.get(unit.id) ?? unit),
    ...replacements.filter(
      (unit) => !baseUnits.some((baseUnit) => baseUnit.id === unit.id),
    ),
  ];

  return {
    ...unitLibrary,
    getUnit: (id) => Option.fromNullable(units.find((unit) => unit.id === id)),
    listUnits: () => units,
    requireUnit: (id) => {
      const unit = units.find((candidate) => candidate.id === id);
      if (unit == null) {
        throw new Error(`Missing test Unit: ${id}`);
      }

      return unit;
    },
  };
}

function initialManifestFills(
  progressionOptionId = "13:class_fighter:level_1:maximum_hit_die",
  speciesUnitId: UnitRecord["id"] = "species_orc",
): readonly CreationFill[] {
  return [
    choiceFill("cc:draft:draft.progression.initial", progressionOptionId),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", speciesUnitId),
    {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    },
    {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.languages"),
      optionIds: [
        creationChoiceOptionId("Dwarvish"),
        creationChoiceOptionId("Goblin"),
      ],
    },
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function completeManifestDraft(): CharacterDraft {
  return completeManifestDraftForSpecies("species_orc");
}

function completeManifestDraftForSpecies(input: {
  readonly speciesUnitId: UnitRecord["id"];
  readonly speciesSize?: "medium" | "small";
  readonly draconicAncestry?: "red" | false;
}): CharacterDraft;
function completeManifestDraftForSpecies(
  speciesUnitId: UnitRecord["id"],
): CharacterDraft;
function completeManifestDraftForSpecies(
  input:
    | UnitRecord["id"]
    | {
        readonly speciesUnitId: UnitRecord["id"];
        readonly speciesSize?: "medium" | "small";
        readonly draconicAncestry?: "red" | false;
      },
): CharacterDraft {
  const speciesUnitId = typeof input === "string" ? input : input.speciesUnitId;
  const speciesSize = typeof input === "string" ? undefined : input.speciesSize;
  const draconicAncestry =
    typeof input === "string"
      ? speciesUnitId === "species_dragonborn"
        ? "red"
        : undefined
      : (input.draconicAncestry ??
        (speciesUnitId === "species_dragonborn" ? "red" : undefined));
  const draft = createTestDraft("draft:complete-manifest");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(
        "13:class_fighter:level_1:maximum_hit_die",
        speciesUnitId,
      ),
    }),
  );
  const afterSpeciesSize =
    speciesSize === undefined
      ? afterInitial
      : requireAcceptedBatch(
          fillCreationHoles({
            draft: afterInitial,
            unitLibrary,
            expectedRevision: afterInitial.revision,
            fills: [choiceFill("cc:draft:draft.speciesSize", speciesSize)],
          }),
        );

  const afterDraconicAncestry =
    draconicAncestry === undefined || draconicAncestry === false
      ? afterSpeciesSize
      : requireAcceptedBatch(
          fillCreationHoles({
            draft: afterSpeciesSize,
            unitLibrary,
            expectedRevision: afterSpeciesSize.revision,
            fills: [
              choiceFill("cc:draft:draft.draconicAncestry", draconicAncestry),
            ],
          }),
        );

  return completeManifestDraftAfterProgression(afterDraconicAncestry);
}

function completeFighterTwoDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-fighter-two");
  const afterProgression = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(
        "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
      ),
    }),
  );

  return completeManifestDraftAfterProgression(afterProgression);
}

function completeManifestDraftAfterProgression(
  afterProgression: CharacterDraft,
): CharacterDraft {
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterProgression,
      unitLibrary,
      expectedRevision: afterProgression.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeFighterDraftForBackground(input: {
  readonly backgroundUnitId: UnitRecord["id"];
  readonly asiOptionId: string;
  readonly toolOptionId: string;
}): CharacterDraft {
  const draft = createTestDraft(`draft:complete-${input.backgroundUnitId}`);
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", input.backgroundUnitId),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          testUnitHoleId(
            input.backgroundUnitId,
            "background_ability_score_increase",
          ),
          input.asiOptionId,
        ),
        choiceFill(
          testUnitHoleId(input.backgroundUnitId, "background_tool_choice"),
          input.toolOptionId,
        ),
        choiceFill(
          testUnitHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          testUnitHoleId(input.backgroundUnitId, "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeWizardDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-wizard");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_wizard:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 8,
            dex: 14,
            con: 13,
            int: 15,
            wis: 10,
            cha: 12,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "class_skill_proficiency_choice"),
          "arcana",
          "history",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_cantrip_choices"),
          "light",
          "fire_bolt",
          "ray_of_frost",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_spellbook_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "shield",
          "sleep",
          "thunderwave",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_prepared_spell_choices"),
          "detect_magic",
          "magic_missile",
          "shield",
          "sleep",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "class_equipment_choice"),
          "option_b",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "equipment_purchase"),
          "weapon_longsword",
          "weapon_dagger",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeMonkDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-monk");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "10:class_monk:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 12,
            dex: 15,
            con: 14,
            int: 8,
            wis: 13,
            cha: 10,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_monk", "class_skill_proficiency_choice"),
          "acrobatics",
          "athletics",
        ),
        choiceFill(
          testUnitHoleId("class_monk", "class_tool_proficiency_choice"),
          "tool:tool_lute",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_monk", "class_equipment_choice"),
          "option_b",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_monk", "equipment_purchase"),
          "weapon_longsword",
          "weapon_dagger",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function completeWizardThenFighterDraft(): CharacterDraft {
  const draft = createTestDraft("draft:complete-wizard-fighter");
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "12:class_wizard|13:class_fighter:level_2:fixed_hp_gain",
        ),
        choiceFill("cc:draft:draft.background", "background_soldier"),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: testAbilityScoreAssignment({
            str: 15,
            dex: 14,
            con: 13,
            int: 8,
            wis: 10,
            cha: 12,
          }),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "class_skill_proficiency_choice"),
          "arcana",
          "history",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_cantrip_choices"),
          "light",
          "fire_bolt",
          "ray_of_frost",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_spellbook_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "shield",
          "sleep",
          "thunderwave",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "wizard_prepared_spell_choices"),
          "detect_magic",
          "mage_armor",
          "magic_missile",
          "sleep",
        ),
        choiceFill(
          testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          testUnitHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          testUnitHoleId("class_wizard", "class_equipment_choice"),
          "option_b",
        ),
        choiceFill(
          testUnitHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          testUnitHoleId("class_wizard", "equipment_purchase"),
          "weapon_longsword",
          "weapon_dagger",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(testLoadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          testLoadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }

  return result.draft;
}

type AcceptedCreationBatch = Extract<
  ReturnType<typeof fillCreationHoles>,
  { readonly tag: "accepted" }
>;
type RejectedCreationBatch = Extract<
  ReturnType<typeof fillCreationHoles>,
  { readonly tag: "rejected" }
>;
type MutableSupportProfile = {
  unitOptionIdsByChoiceKey: {
    equipment_purchase: ReturnType<typeof creationChoiceOptionId>[];
  };
  purchasableEquipmentUnitIds: UnitRecord["id"][];
  loadoutChoices: SupportedLoadoutChoice[];
  equipmentPurchaseChoiceCount: number;
};

const HOLE_ID_TO_QNT_VARIANT = {
  "cc:draft:draft.progression.initial": "HProgression",
  "cc:draft:draft.background": "HBackground",
  "cc:draft:draft.species": "HSpecies",
  "cc:draft:draft.abilityScoreGeneration": "HAbilityScores",
  "cc:draft:draft.languages": "HLanguages",
  "cc:draft:draft.alignment": "HAlignment",
  [testUnitHoleId("class_fighter", "class_skill_proficiency_choice")]:
    "HClassSkills",
  [testUnitHoleId("fighter_fighting_style", "class_feature_feat_choice")]:
    "HFighterFightingStyle",
  [testUnitHoleId("fighter_weapon_mastery", "weapon_mastery_options")]:
    "HFighterWeaponMastery",
  [testUnitHoleId("background_soldier", "background_ability_score_increase")]:
    "HBackgroundAbilityScoreIncrease",
  [testUnitHoleId("background_soldier", "background_tool_choice")]:
    "HBackgroundTool",
  [testUnitHoleId("class_fighter", "class_equipment_choice")]:
    "HClassEquipment",
  [testUnitHoleId("background_soldier", "background_equipment_choice")]:
    "HBackgroundEquipment",
  [testUnitHoleId("class_fighter", "equipment_purchase")]: "HEquipmentPurchase",
  [testLoadoutHoleId("armor_chain_mail", "armor")]: "HLoadoutArmor",
  [testLoadoutHoleId("equipment_shield", "shield")]: "HLoadoutShield",
  [testLoadoutHoleId("weapon_longsword", "weapon")]: "HLoadoutWeapon",
} as const satisfies Record<string, string>;
const HOLE_ID_TO_QNT_VARIANT_LOOKUP: Readonly<Record<string, string>> =
  HOLE_ID_TO_QNT_VARIANT;

const FILL_ISSUE_CODE_TO_QNT_VARIANT = {
  unknownHole: "UnknownHole",
  duplicateFill: "DuplicateFill",
  wrongFillKind: "WrongFillKind",
  invalidChoice: "InvalidChoice",
  invalidAbilityScores: "InvalidAbilityScores",
  tooFewChoices: "TooFewChoices",
  tooManyChoices: "TooManyChoices",
  unsupportedChoice: "UnsupportedChoice",
} as const satisfies Record<CreationFillIssue["code"], string>;

function runQuintSliceSelfTests(): void {
  const quintOutput = execFileSync(
    "pnpm",
    [
      "exec",
      "quint",
      "test",
      "--backend",
      "typescript",
      characterCreationRuntimeSliceTestsPath,
      "--match",
      "test_",
    ],
    { encoding: "utf8" },
  );
  for (const expectedTest of [
    "test_stale_revision_rejected_atomically",
    "test_wrong_fill_kind_rejected_atomically",
    "test_unopened_protocol_hole_rejected_as_unknown_hole",
  ]) {
    expect(quintOutput).toContain(expectedTest);
  }
}

function runGeneratedQuintParity(moduleBody: string): void {
  const tempDir = fs.mkdtempSync(
    path.join(
      packageRootPath,
      `.tmp-character-creation-parity-${os.userInfo().username}-`,
    ),
  );
  const tempFile = path.join(tempDir, "character-creation-runtime-parity.qnt");

  try {
    fs.writeFileSync(tempFile, moduleBody);
    const quintOutput = execFileSync(
      "pnpm",
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        tempFile,
        "--match",
        "parity_",
      ],
      { encoding: "utf8" },
    );
    expect(quintOutput).toContain("13 passing");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function renderQuintParityModule(input: {
  readonly initialHoles: readonly CreationHole[];
  readonly afterInitial: AcceptedCreationBatch;
  readonly complete: CharacterDraft;
  readonly completeHoles: readonly CreationHole[];
  readonly completeFinalization: ReturnType<typeof finalizeCharacterDraft>;
  readonly invalid: RejectedCreationBatch;
  readonly unsupportedLanguage: RejectedCreationBatch;
  readonly unsupportedAlignment: RejectedCreationBatch;
  readonly duplicateLanguage: RejectedCreationBatch;
  readonly unsupportedLaterChoices: RejectedCreationBatch;
  readonly standardArrayPermutation: AcceptedCreationBatch;
  readonly pointBuyAssignment: AcceptedCreationBatch;
  readonly tooFewLanguages: RejectedCreationBatch;
  readonly tooManyLanguages: RejectedCreationBatch;
  readonly staleRevision: RejectedCreationBatch;
}): string {
  const completeFinalizationTag = qntFinalizationTag(
    input.completeFinalization.tag,
  );

  return `module characterCreationRuntimeParity {
  import characterCreationRuntimeSlice.* from "../character-creation-runtime-slice"

  run parity_initial_holes_match_runtime = {
    assert(openCreationHoles(emptyDraft) == ${renderQntHoleSet(input.initialHoles)})
  }

  run parity_initial_batch_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, initialManifestFills) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.afterInitial.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.afterInitial.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.afterInitial.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_complete_manifest_matches_runtime = {
    all {
      assert(completeManifestDraft == ${renderQntDraftProjection(input.complete)}),
      assert(openCreationHoles(completeManifestDraft) == ${renderQntHoleSet(input.completeHoles)}),
      assert(finalizeDraft(completeManifestDraft) == ${completeFinalizationTag}),
    }
  }

  run parity_standard_array_permutation_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HAbilityScores,
        method: StandardArray,
        scores: {
          strength: 14,
          dexterity: 15,
          constitution: 13,
          intelligence: 8,
          wisdom: 10,
          charisma: 12,
        },
      }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.standardArrayPermutation.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.standardArrayPermutation.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.standardArrayPermutation.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_point_buy_assignment_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FAbilityScores({
        hole: HAbilityScores,
        method: PointBuy,
        scores: {
          strength: 13,
          dexterity: 13,
          constitution: 13,
          intelligence: 12,
          wisdom: 12,
          charisma: 12,
        },
      }),
    ]) {
      | Accepted(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.pointBuyAssignment.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.pointBuyAssignment.holes)}),
            assert(v.finalization == ${qntFinalizationTag(input.pointBuyAssignment.finalization.tag)}),
          }
      | Rejected(_) => assert(false)
    }
  }

  run parity_invalid_primary_class_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HProgression, options: [OBackgroundSoldier] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.invalid.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.invalid.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.invalid.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.invalid.finalization.tag)}),
          }
    }
  }

  run parity_unsupported_language_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageElvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedLanguage.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedLanguage.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedLanguage.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedLanguage.finalization.tag)}),
          }
    }
  }

  run parity_duplicate_language_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageDwarvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.duplicateLanguage.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.duplicateLanguage.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.duplicateLanguage.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.duplicateLanguage.finalization.tag)}),
          }
    }
  }

  run parity_unsupported_alignment_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HAlignment, options: [OAlignmentNeutralGood] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedAlignment.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedAlignment.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedAlignment.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedAlignment.finalization.tag)}),
          }
    }
  }

  run parity_later_valid_but_unsupported_choices_match_runtime = {
    match fillCreationHoles(afterInitialManifest, 1, [
      FChoice({ hole: HClassSkills, options: [OSkillPerception, OSkillAthletics] }),
      FChoice({ hole: HBackgroundEquipment, options: [OBackgroundEquipmentPack] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.unsupportedLaterChoices.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.unsupportedLaterChoices.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.unsupportedLaterChoices.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.unsupportedLaterChoices.finalization.tag)}),
          }
    }
  }

  run parity_too_few_languages_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.tooFewLanguages.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.tooFewLanguages.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.tooFewLanguages.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.tooFewLanguages.finalization.tag)}),
          }
    }
  }

  run parity_too_many_languages_matches_runtime = {
    match fillCreationHoles(emptyDraft, 0, [
      FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin, OLanguageElvish] }),
    ]) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.tooManyLanguages.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.tooManyLanguages.holes)}),
            assert(v.issues.batch == Set()),
            assert(v.issues.fills == ${renderQntFillIssueSet(input.tooManyLanguages.issues)}),
            assert(v.finalization == ${qntFinalizationTag(input.tooManyLanguages.finalization.tag)}),
          }
    }
  }

  run parity_stale_revision_matches_runtime_boundary = {
    match fillCreationHoles(emptyDraft, 1, []) {
      | Accepted(_) => assert(false)
      | Rejected(v) =>
          all {
            assert(v.draft == ${renderQntDraftProjection(input.staleRevision.draft)}),
            assert(v.holes == ${renderQntHoleSet(input.staleRevision.holes)}),
            assert(v.issues.batch == ${renderQntBatchIssueSet(input.staleRevision.issues)}),
            assert(v.issues.fills == Set()),
            assert(v.finalization == ${qntFinalizationTag(input.staleRevision.finalization.tag)}),
          }
    }
  }
}
`;
}

function renderQntDraftProjection(draft: CharacterDraft): string {
  const selections = draft.selections;

  return `{
    revision: ${draft.revision},
    progression: ${qntProgressionSelection(selections.progression)},
    background: ${qntBool(selections.background != null)},
    species: ${qntBool(selections.species != null)},
    abilityScores: ${qntBool(selections.abilityScoreGeneration != null)},
    languages: ${qntBool(selections.languages != null)},
    alignment: ${qntBool(selections.alignment != null)},
    classSkills: ${qntBool(hasChoiceSelection(draft, "class_fighter", "class_skill_proficiency_choice"))},
    fighterFightingStyle: ${qntBool(hasChoiceSelection(draft, "fighter_fighting_style", "class_feature_feat_choice"))},
    fighterWeaponMastery: ${qntBool(hasChoiceSelection(draft, "fighter_weapon_mastery", "weapon_mastery_options"))},
    backgroundAbilityScoreIncrease: ${qntBool(selections.backgroundAbilityScoreIncrease != null)},
    backgroundTool: ${qntBool(hasChoiceSelection(draft, "background_soldier", "background_tool_choice"))},
    classEquipment: ${qntBool(hasChoiceSelection(draft, "class_fighter", "class_equipment_choice"))},
    backgroundEquipment: ${qntBool(hasChoiceSelection(draft, "background_soldier", "background_equipment_choice"))},
    equipmentPurchase: ${qntBool(selections.equipment != null)},
    loadoutArmor: ${qntBool(hasChoiceSelection(draft, "armor_chain_mail", "loadout_armor"))},
    loadoutShield: ${qntBool(hasChoiceSelection(draft, "equipment_shield", "loadout_shield"))},
    loadoutWeapon: ${qntBool(hasChoiceSelection(draft, "weapon_longsword", "loadout_weapon"))},
  }`;
}

function qntProgressionSelection(
  progression: CharacterDraft["selections"]["progression"],
): string {
  if (progression == null) {
    return "NoProgression";
  }

  if (startingClassUnitId(progression) === "class_wizard") {
    return "WizardLevel1";
  }

  return computeTotalLevel(progression) === 1
    ? "FighterLevel1"
    : "FighterLevel2";
}

function renderQntHoleSet(holes: readonly CreationHole[]): string {
  return renderQntSet(holes.map((hole) => qntHoleVariant(hole.holeId)));
}

function renderQntFillIssueSet(issues: readonly unknown[]): string {
  const fillIssues = issues.filter(
    (issue): issue is CreationFillIssue =>
      typeof issue === "object" &&
      issue != null &&
      "tag" in issue &&
      issue.tag === "illegalFill",
  );

  return renderQntSet(
    fillIssues.map(
      (issue) =>
        `{ fillIndex: ${issue.fillIndex}, hole: ${qntHoleVariant(issue.holeId)}, code: ${FILL_ISSUE_CODE_TO_QNT_VARIANT[issue.code]} }`,
    ),
  );
}

function renderQntBatchIssueSet(issues: readonly unknown[]): string {
  const hasStaleRevision = issues.some(
    (issue) =>
      typeof issue === "object" &&
      issue != null &&
      "tag" in issue &&
      issue.tag === "illegalBatch" &&
      "code" in issue &&
      issue.code === "staleRevision",
  );

  return hasStaleRevision ? "Set(StaleRevision)" : "Set()";
}

function renderQntSet(items: readonly string[]): string {
  return items.length === 0 ? "Set()" : `Set(${items.join(", ")})`;
}

function qntHoleVariant(holeId: string): string {
  const variant = HOLE_ID_TO_QNT_VARIANT_LOOKUP[holeId];
  if (variant == null) {
    throw new Error(`No QNT hole-id variant mapping for ${holeId}.`);
  }

  return variant;
}

function qntFinalizationTag(
  tag: ReturnType<typeof finalizeCharacterDraft>["tag"],
): string {
  if (tag === "ready") {
    return "Ready";
  }

  return tag === "incomplete" ? "Incomplete" : "Invalid";
}

function qntBool(value: boolean): string {
  return value ? "true" : "false";
}

function hasChoiceSelection(
  draft: CharacterDraft,
  unitId: string,
  choiceKey: string,
): boolean {
  return selectedChoiceBySource(draft, unitId, choiceKey) != null;
}

function selectedChoiceBySource(
  draft: CharacterDraft,
  unitId: string,
  choiceKey: string,
): CharacterChoiceSelection | undefined {
  const loadoutSlot = qntLoadoutSlot(choiceKey);
  return draft.selections.choices.find(
    (choice) =>
      (choice.kind === "unitChoice" &&
        choice.source.unitId === unitId &&
        choice.source.choiceKey === choiceKey) ||
      (choice.kind === "loadout" &&
        choice.source.equipmentUnitId === unitId &&
        choice.source.slot === loadoutSlot),
  );
}

function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    // Test fixtures pass discovered hole ids as text, so they cast at the same
    // protocol boundary as caller-provided fill payloads.
    holeId: creationHoleId(holeId as CreationHoleIdText),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function holeSummary(
  holes: readonly CreationHole[],
): readonly (readonly [CreationHole["kind"], string, readonly string[]])[] {
  return holes.map((hole) => [
    hole.kind,
    hole.holeId,
    hole.kind === "abilityScores"
      ? hole.methods
      : "options" in hole
        ? hole.options.map((option) => option.optionId)
        : [],
  ]);
}

function holeById(
  holes: readonly CreationHole[],
  holeId: string,
): CreationHole | undefined {
  return holes.find((hole) => hole.holeId === holeId);
}

function requireHoleById(
  holes: readonly CreationHole[],
  holeId: string,
): CreationHole {
  const hole = holeById(holes, holeId);
  if (hole == null) {
    throw new Error(`Missing expected test hole: ${holeId}`);
  }

  return hole;
}

function optionIds(hole: CreationHole | undefined): readonly string[] {
  return hole != null && "options" in hole
    ? hole.options.map((option) => option.optionId)
    : [];
}

function selectedChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: optionIds.map((optionId) => ({
      optionId: creationChoiceOptionId(optionId),
    })),
  };
}

function selectedChoiceWithUnitRef(
  unitId: string,
  choiceKey: string,
  optionId: string,
  optionUnitId: string,
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: [
      {
        optionId: creationChoiceOptionId(optionId),
        unitRef: { unitId: optionUnitId },
      },
    ],
  };
}

function selectedUnitChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: {
      tag: "unitChoice",
      unitId: unitChoiceSourceUnitIdRight(unitId),
      choiceKey: unitChoiceKeyRight(choiceKey),
    },
    options: optionIds.map((optionId) => ({
      optionId: creationChoiceOptionId(optionId),
      unitRef: { unitId: optionId },
    })),
  };
}

function selectedLoadoutChoice(
  unitId: string,
  slot: LoadoutSlot,
  optionId: string,
): CharacterChoiceSelection {
  return {
    kind: "loadout",
    source: {
      tag: "loadout",
      equipmentUnitId: loadoutEquipmentUnitIdRight(unitId),
      slot,
    },
    options: [
      {
        optionId: creationChoiceOptionId(optionId),
      },
    ],
  };
}
