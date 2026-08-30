import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore, spellSlotLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBuildClassFeatureFactsProjectionWithRoute,
  characterBuildMonkUncannyMetabolismFacts,
  characterBuildMonksFocusFacts,
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  classUnitId,
  creationChoiceOptionId,
  fontOfMagicSpellSlotCreationOption,
  copperPieceAmount,
  parseSorcererMetamagicOptionId,
  type CharacterBuild,
  type CharacterChoiceSelection,
  type CharacterBuildFeature,
  type UnitCatalog,
} from "./index.ts";
import {
  abilityScoreIncreaseOptions,
  grantExpertiseSkillSourceForSelection,
  skillExpertiseFromChoiceSelections,
} from "./discovery.ts";
import { loadoutSource, unitSource } from "./hole-factories.ts";
import { CLASS_FEATURE_PROFICIENCY_CHOICE_KEY } from "./phase1-manifest.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog projection fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const featureCases = [
  {
    unitId: authoredUnitId("monk_monks_focus"),
    project: characterBuildMonksFocusFacts,
    issueTag: "monksFocusFactsIssue",
    featureName: "Monk's Focus",
    ownerClassName: "Monk",
    ownerPrerequisiteUnitIds: [],
  },
  {
    unitId: authoredUnitId("monk_uncanny_metabolism"),
    project: characterBuildMonkUncannyMetabolismFacts,
    issueTag: "monkUncannyMetabolismFactsIssue",
    featureName: "Uncanny Metabolism",
    ownerClassName: "Monk",
    ownerPrerequisiteUnitIds: [authoredUnitId("monk_monks_focus")],
  },
  {
    unitId: authoredUnitId("sorcerer_font_of_magic"),
    project: characterBuildSorcererFontOfMagicFacts,
    issueTag: "sorcererFontOfMagicFactsIssue",
    featureName: "Font of Magic",
    ownerClassName: "Sorcerer",
    ownerPrerequisiteUnitIds: [],
  },
  {
    unitId: authoredUnitId("sorcerer_metamagic"),
    project: characterBuildSorcererMetamagicFacts,
    issueTag: "sorcererMetamagicFactsIssue",
    featureName: "Metamagic",
    ownerClassName: "Sorcerer",
    ownerPrerequisiteUnitIds: [],
  },
] as const;

function buildWithRetainedFeatures(
  unitIds: readonly UnitRecord["id"][] = [],
): CharacterBuild {
  const features: readonly CharacterBuildFeature[] = unitIds.map((unitId) => ({
    kind: "selectedClassChoice",
    selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
    unitId,
  }));
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
    abilityScores: {
      str: abilityScore(13),
      dex: abilityScore(14),
      con: abilityScore(13),
      int: abilityScore(8),
      wis: abilityScore(16),
      cha: abilityScore(10),
    },
    proficiencyChoices: [],
    features,
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
}

function catalogWithout(unitId: UnitRecord["id"]): UnitCatalog {
  return {
    getUnit: (candidate) =>
      candidate === unitId ? Option.none() : unitLibrary.getUnit(candidate),
    listUnits: () =>
      unitLibrary.listUnits().filter((candidate) => candidate.id !== unitId),
    requireUnit: (candidate) => {
      if (candidate === unitId) {
        throw new Error(
          `The ${unitId} Unit is deliberately absent from this test catalog.`,
        );
      }
      return unitLibrary.requireUnit(candidate);
    },
  };
}

function catalogWithWrongKind(unitId: UnitRecord["id"]): UnitCatalog {
  const weapon = unitLibrary.getUnit("weapon_longsword");
  if (Option.isNone(weapon)) {
    throw new Error("The wrong-kind Unit fixture must be installed.");
  }
  const replacement = {
    ...weapon.value,
    id: unitId,
  } satisfies UnitRecord;
  return {
    getUnit: (candidate) =>
      candidate === unitId
        ? Option.some(replacement)
        : unitLibrary.getUnit(candidate),
    listUnits: () => [
      ...unitLibrary.listUnits().filter((candidate) => candidate.id !== unitId),
      replacement,
    ],
    requireUnit: (candidate) =>
      candidate === unitId ? replacement : unitLibrary.requireUnit(candidate),
  };
}

function catalogReplacing(replacement: UnitRecord): UnitCatalog {
  return {
    getUnit: (candidate) =>
      candidate === replacement.id
        ? Option.some(replacement)
        : unitLibrary.getUnit(candidate),
    listUnits: () => [
      ...unitLibrary
        .listUnits()
        .filter((candidate) => candidate.id !== replacement.id),
      replacement,
    ],
    requireUnit: (candidate) =>
      candidate === replacement.id
        ? replacement
        : unitLibrary.requireUnit(candidate),
  };
}

function levelTwoClassBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly features: readonly CharacterBuildFeature[];
}): CharacterBuild {
  return {
    ...buildWithRetainedFeatures(),
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: [
        {
          classUnitId: classUnitId(input.classUnitId),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    features: input.features,
  };
}

function selectedMetamagicOption(optionId: string): CharacterBuildFeature {
  const parsed = parseSorcererMetamagicOptionId(optionId);
  if (Result.isFailure(parsed)) {
    throw new Error(`Unsupported Metamagic fixture option ${optionId}.`);
  }
  return {
    kind: "selectedSorcererMetamagicOption",
    selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
    optionId: parsed.success,
  };
}

describe("class-feature projection boundaries", () => {
  test("recognizes only installed expertise-grant Unit selections", () => {
    const option = {
      optionId: creationChoiceOptionId("stealth"),
    };
    const selectionFor = (
      unitId: UnitRecord["id"],
    ): CharacterChoiceSelection => ({
      kind: "unitChoice",
      source: unitSource(unitId, CLASS_FEATURE_PROFICIENCY_CHOICE_KEY),
      options: [option],
    });
    const loadoutSelection = {
      kind: "loadout",
      source: loadoutSource(authoredUnitId("weapon_longsword"), "weapon"),
      options: [option],
    } as const satisfies CharacterChoiceSelection;

    expect(
      grantExpertiseSkillSourceForSelection(loadoutSelection, unitLibrary),
    ).toBeUndefined();
    expect(
      grantExpertiseSkillSourceForSelection(
        selectionFor(authoredUnitId("synthetic_missing")),
        unitLibrary,
      ),
    ).toBeUndefined();
    expect(
      grantExpertiseSkillSourceForSelection(
        selectionFor(authoredUnitId("weapon_longsword")),
        unitLibrary,
      ),
    ).toBeUndefined();
    expect(
      grantExpertiseSkillSourceForSelection(
        selectionFor(authoredUnitId("fighter_fighting_style")),
        unitLibrary,
      ),
    ).toBeUndefined();
    expect(
      grantExpertiseSkillSourceForSelection(
        selectionFor(authoredUnitId("rogue_expertise")),
        unitLibrary,
      ),
    ).toEqual({ kind: "owned_skill_proficiencies_without_expertise" });
    expect(
      skillExpertiseFromChoiceSelections(
        [selectionFor(authoredUnitId("rogue_expertise"))],
        unitLibrary,
      ),
    ).toEqual(["stealth"]);
  });

  test("projects feat ability-score choices from their canonical Surface fact", () => {
    const grappler = unitLibrary.requireUnit(authoredUnitId("feat_grappler"));
    if (grappler.kind !== "feat") {
      throw new Error("The SRD Grappler fixture must be a feat.");
    }
    const abilityScoreIncreaseChoice = grappler.abilityScoreIncreaseChoice;
    if (abilityScoreIncreaseChoice == null) {
      throw new Error(
        "The SRD Grappler fixture must carry an ability-score increase choice.",
      );
    }

    expect(
      abilityScoreIncreaseOptions({
        ...grappler,
        abilityScoreIncreaseChoice,
      }),
    ).toEqual([
      {
        optionId: "ability_score:str:+1:max20",
        label: "STR +1",
      },
      {
        optionId: "ability_score:dex:+1:max20",
        label: "DEX +1",
      },
    ]);
  });

  test.each(featureCases)(
    "returns no $unitId facts when the build does not retain the feature",
    ({ project }) => {
      expect(
        project({ build: buildWithRetainedFeatures(), unitLibrary }),
      ).toMatchObject({
        _tag: "Success",
        success: undefined,
      });
    },
  );

  test.each(featureCases)(
    "reports missing, wrong-kind, and owner-mismatched $unitId facts",
    ({
      unitId,
      project,
      issueTag,
      featureName,
      ownerClassName,
      ownerPrerequisiteUnitIds,
    }) => {
      const build = buildWithRetainedFeatures([unitId]);
      expect(
        project({ build, unitLibrary: catalogWithout(unitId) }),
      ).toMatchObject({
        _tag: "Failure",
        failure: {
          tag: issueTag,
          message: `${featureName} requires an installed Unit.`,
        },
      });
      expect(
        project({ build, unitLibrary: catalogWithWrongKind(unitId) }),
      ).toMatchObject({
        _tag: "Failure",
        failure: {
          tag: issueTag,
          message: `${featureName} requires the installed Surface feature record.`,
        },
      });
      expect(
        project({
          build: buildWithRetainedFeatures([
            unitId,
            ...ownerPrerequisiteUnitIds,
          ]),
          unitLibrary,
        }),
      ).toMatchObject({
        _tag: "Failure",
        failure: {
          tag: issueTag,
          message: expect.stringContaining(
            `requires ${ownerClassName} class progression`,
          ),
        },
      });
    },
  );

  test.each(featureCases)(
    "propagates $unitId projection failure through the routed aggregate",
    ({ unitId, issueTag }) => {
      expect(
        characterBuildClassFeatureFactsProjectionWithRoute({
          build: buildWithRetainedFeatures([unitId]),
          unitLibrary,
          route: ["seed"],
        }),
      ).toMatchObject({
        _tag: "Failure",
        failure: { tag: issueTag },
      });
    },
  );

  test("reports malformed Metamagic ownership and missing resource facts", () => {
    const empowered = selectedMetamagicOption("sorcerer_empowered_spell");
    const heightened = selectedMetamagicOption("sorcerer_heightened_spell");
    const fighterWithOrphanSelection = {
      ...buildWithRetainedFeatures(),
      features: [empowered],
    };
    expect(
      characterBuildSorcererMetamagicFacts({
        build: fighterWithOrphanSelection,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Metamagic option selections require the retained Metamagic feature.",
      },
    });

    const oneOptionBuild = levelTwoClassBuild({
      classUnitId: authoredUnitId("class_sorcerer"),
      features: [empowered],
    });
    expect(
      characterBuildSorcererMetamagicFacts({
        build: oneOptionBuild,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Metamagic known option count must match the Sorcerer level.",
      },
    });

    const duplicateOptionBuild = levelTwoClassBuild({
      classUnitId: authoredUnitId("class_sorcerer"),
      features: [empowered, empowered],
    });
    expect(
      characterBuildSorcererMetamagicFacts({
        build: duplicateOptionBuild,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Metamagic known options must be unique." },
    });

    const completeBuild = levelTwoClassBuild({
      classUnitId: authoredUnitId("class_sorcerer"),
      features: [empowered, heightened],
    });
    expect(
      characterBuildSorcererMetamagicFacts({
        build: completeBuild,
        unitLibrary: catalogWithout(authoredUnitId("sorcerer_font_of_magic")),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Font of Magic requires an installed Unit." },
    });

    const sorcererClass = unitLibrary.requireUnit("class_sorcerer");
    if (sorcererClass.kind !== "class") {
      throw new Error("The Sorcerer fixture must be a class record.");
    }
    const sorcererWithoutFontOfMagic = {
      ...sorcererClass,
      featureGrants: sorcererClass.featureGrants.filter(
        (grant) => grant.unitId !== "sorcerer_font_of_magic",
      ),
    } satisfies UnitRecord;
    expect(
      characterBuildSorcererMetamagicFacts({
        build: completeBuild,
        unitLibrary: catalogReplacing(sorcererWithoutFontOfMagic),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Metamagic requires the shared Font of Magic Sorcery Point resource.",
      },
    });
  });

  test("parses Metamagic ids and selects Font of Magic slot-creation options", () => {
    expect(
      parseSorcererMetamagicOptionId("sorcerer_empowered_spell"),
    ).toMatchObject({
      _tag: "Success",
      success: "sorcerer_empowered_spell",
    });
    expect(parseSorcererMetamagicOptionId("synthetic_unknown")).toMatchObject({
      _tag: "Failure",
      failure: { message: "Unknown Sorcerer Metamagic option id." },
    });

    const build = levelTwoClassBuild({
      classUnitId: authoredUnitId("class_sorcerer"),
      features: [],
    });
    const facts = characterBuildSorcererFontOfMagicFacts({
      build,
      unitLibrary,
    });
    if (Result.isFailure(facts) || facts.success === undefined) {
      throw new Error("The Sorcerer fixture must project Font of Magic facts.");
    }
    expect(
      fontOfMagicSpellSlotCreationOption({
        facts: facts.success,
        spellLevel: spellSlotLevel(1),
      }),
    ).toMatchObject({ spellSlotLevel: 1, pointCost: 2 });
    expect(
      fontOfMagicSpellSlotCreationOption({
        facts: facts.success,
        spellLevel: spellSlotLevel(9),
      }),
    ).toBeUndefined();

    const fontOfMagic = unitLibrary.requireUnit("sorcerer_font_of_magic");
    if (
      fontOfMagic.kind !== "class_feature" ||
      fontOfMagic.mechanics.family !== "resource_pool"
    ) {
      throw new Error("The Font of Magic fixture must expose resource facts.");
    }
    const fixedSorceryPointCap = decodeUnitRecordSync({
      ...fontOfMagic,
      mechanics: {
        ...fontOfMagic.mechanics,
        resource: {
          ...fontOfMagic.mechanics.resource,
          cap: { kind: "fixed", uses: 2 },
        },
      },
    });
    expect(
      characterBuildSorcererFontOfMagicFacts({
        build,
        unitLibrary: catalogReplacing(fixedSorceryPointCap),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Font of Magic requires class-level Sorcery Point scaling facts.",
      },
    });

    const withoutSpellSlotCreation = decodeUnitRecordSync({
      ...fontOfMagic,
      mechanics: {
        ...fontOfMagic.mechanics,
        operations: fontOfMagic.mechanics.operations.filter(
          (operation) => operation.kind !== "point_pool_to_spell_slot",
        ),
      },
    });
    expect(
      characterBuildSorcererFontOfMagicFacts({
        build,
        unitLibrary: catalogReplacing(withoutSpellSlotCreation),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Font of Magic requires Spell Slot creation source facts.",
      },
    });
  });

  test("reports malformed Uncanny Metabolism dependency and Martial Arts die facts", () => {
    const build = levelTwoClassBuild({
      classUnitId: authoredUnitId("class_monk"),
      features: [],
    });
    const monksFocus = unitLibrary.requireUnit("monk_monks_focus");
    if (
      monksFocus.kind !== "class_feature" ||
      monksFocus.mechanics.family !== "resource_container"
    ) {
      throw new Error("The Monk's Focus fixture must expose resource facts.");
    }
    const wrongFocusPointBase = decodeUnitRecordSync({
      ...monksFocus,
      mechanics: {
        ...monksFocus.mechanics,
        resource: {
          ...monksFocus.mechanics.resource,
          cap: {
            kind: "linear_per_level",
            axis: "class",
            base: 3,
            perLevel: 1,
            startingAtLevel: 2,
          },
        },
      },
    });
    expect(
      characterBuildMonksFocusFacts({
        build,
        unitLibrary: catalogReplacing(wrongFocusPointBase),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Monk's Focus requires Monk-level Focus Point scaling facts.",
      },
    });
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogWithout(authoredUnitId("monk_monks_focus")),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { message: "Monk's Focus requires an installed Unit." },
    });
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogWithout(authoredUnitId("monk_martial_arts")),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Uncanny Metabolism requires the installed Martial Arts Unit.",
      },
    });
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogWithWrongKind(authoredUnitId("monk_martial_arts")),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Uncanny Metabolism requires Martial Arts die source facts.",
      },
    });

    const monkClass = unitLibrary.requireUnit("class_monk");
    if (monkClass.kind !== "class") {
      throw new Error("The Monk fixture must be a class record.");
    }
    const monkWithoutFocusGrant = {
      ...monkClass,
      featureGrants: monkClass.featureGrants.filter(
        (grant) => grant.unitId !== "monk_monks_focus",
      ),
    } satisfies UnitRecord;
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogReplacing(monkWithoutFocusGrant),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Uncanny Metabolism requires the shared Monk's Focus resource projection.",
      },
    });

    const uncannyMetabolism = unitLibrary.requireUnit(
      "monk_uncanny_metabolism",
    );
    if (
      uncannyMetabolism.kind !== "class_feature" ||
      uncannyMetabolism.mechanics.family !== "initiative_focus_recovery"
    ) {
      throw new Error(
        "The Uncanny Metabolism fixture must expose recovery facts.",
      );
    }
    const mismatchedRecovery = Object.assign({}, uncannyMetabolism, {
      ...uncannyMetabolism,
      mechanics: {
        ...uncannyMetabolism.mechanics,
        recovery: {
          ...uncannyMetabolism.mechanics.recovery,
          resourceUnitId: authoredUnitId("synthetic_focus_resource"),
        },
      },
    });
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogReplacing(mismatchedRecovery),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Uncanny Metabolism recovery must reference the shared Monk's Focus resource.",
      },
    });

    const martialArts = unitLibrary.requireUnit("monk_martial_arts");
    if (
      martialArts.kind !== "class_feature" ||
      martialArts.mechanics.family !== "passive"
    ) {
      throw new Error("The Martial Arts fixture must expose passive grants.");
    }
    const dieGrant = martialArts.mechanics.grants.find(
      (grant) => grant.kind === "replace_damage_die",
    );
    if (
      dieGrant?.kind !== "replace_damage_die" ||
      dieGrant.die.kind !== "threshold_tiers"
    ) {
      throw new Error("The Martial Arts fixture must expose its damage die.");
    }
    const withoutDieSource = {
      ...martialArts,
      mechanics: {
        ...martialArts.mechanics,
        grants: martialArts.mechanics.grants.filter(
          (grant) => grant !== dieGrant,
        ),
      },
    } satisfies UnitRecord;
    expect(
      characterBuildMonkUncannyMetabolismFacts({
        build,
        unitLibrary: catalogReplacing(withoutDieSource),
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Uncanny Metabolism requires Martial Arts die source facts.",
      },
    });

    const malformedDieCases = [
      {
        name: "multiple base dice",
        die: {
          ...dieGrant.die,
          base: { ...dieGrant.die.base, dice: 2 },
        },
        message:
          "Uncanny Metabolism requires a single Martial Arts damage die.",
      },
      {
        name: "unsupported base die size",
        die: {
          ...dieGrant.die,
          base: { ...dieGrant.die.base, dieSize: 20 },
        },
        message:
          "Uncanny Metabolism requires a supported Martial Arts damage die size.",
      },
      {
        name: "tier dice override",
        die: {
          ...dieGrant.die,
          tiers: [{ atLevel: 2, override: { dice: 2, dieSize: 8 } }],
        },
        message:
          "Uncanny Metabolism requires Martial Arts tiers to override only die size.",
      },
      {
        name: "missing tier die-size override",
        die: {
          ...dieGrant.die,
          tiers: [{ atLevel: 2, override: {} }],
        },
        message:
          "Uncanny Metabolism requires Martial Arts tiers to override die size.",
      },
      {
        name: "unsupported tier die size",
        die: {
          ...dieGrant.die,
          tiers: [{ atLevel: 2, override: { dieSize: 20 } }],
        },
        message:
          "Uncanny Metabolism requires a supported Martial Arts damage die size.",
      },
    ] as const;
    for (const malformed of malformedDieCases) {
      const replacement = decodeUnitRecordSync({
        ...martialArts,
        mechanics: {
          ...martialArts.mechanics,
          grants: martialArts.mechanics.grants.map((grant) =>
            grant === dieGrant ? { ...dieGrant, die: malformed.die } : grant,
          ),
        },
      });
      expect(
        characterBuildMonkUncannyMetabolismFacts({
          build,
          unitLibrary: catalogReplacing(replacement),
        }),
        malformed.name,
      ).toMatchObject({
        _tag: "Failure",
        failure: { message: malformed.message },
      });
    }
  });
});
