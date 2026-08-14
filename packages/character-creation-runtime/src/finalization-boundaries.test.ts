import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { EffectAtom, UnitRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";
import { describe, expect, test } from "vitest";

import { classUnitId } from "./character-progression-types.ts";
import {
  allFinalizedChoicesSupported,
  applyBackgroundAbilityScoreIncrease,
  characterBuildArmorTraining,
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildProficiencies,
  characterBuildResources,
  characterBuildSpellcastingSlotCapacity,
  characterBuildUnitRefs,
  finalizedBuildEquipment,
  finalizedClassChoiceFeatures,
  finalizedSelections,
  isSupportedBackgroundAbilityScoreIncrease,
  selectedPreparedSpellsAreInSelectedSpellbook,
} from "./finalization.ts";
import { unitSource } from "./hole-factories.ts";
import {
  HUNTERS_PREY_CHOICE_KEY,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
} from "./phase1-manifest.ts";
import type {
  AbilityScoreAssignment,
  CharacterBuild,
  FinalizedCharacterSelections,
} from "./types.ts";
import {
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  copperPieceAmount,
  toolProficiencyId,
} from "./types.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog finalization fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

type HitPointMaximumDelta = Extract<
  EffectAtom,
  { readonly kind: "modify_max_hp" }
>["delta"];

const baseScores = {
  str: abilityScore(10),
  dex: abilityScore(10),
  con: abilityScore(10),
  int: abilityScore(10),
  wis: abilityScore(10),
  cha: abilityScore(10),
} as const satisfies AbilityScoreAssignment;

function selectionsWithStartingClass(
  startingClass: ReturnType<typeof classUnitId>,
): FinalizedCharacterSelections {
  return {
    progression: { startingClass, advancements: [] },
    background: authoredUnitId("background_soldier"),
    abilityScoreGeneration: {
      method: "standardArray",
      assignedScores: baseScores,
    },
    backgroundAbilityScoreIncrease: { kind: "oneEach" },
    species: authoredUnitId("species_orc"),
    languages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "neutral", morality: "neutral" },
    choices: [],
    equipment: { selectedUnitIds: [] },
  };
}

function projectionBuild(
  startingClass: ReturnType<typeof classUnitId>,
): Pick<
  CharacterBuild,
  | "progression"
  | "background"
  | "species"
  | "abilityScores"
  | "features"
  | "proficiencyChoices"
> {
  return {
    progression: { startingClass, advancements: [] },
    background: authoredUnitId("background_soldier"),
    species: authoredUnitId("species_orc"),
    abilityScores: baseScores,
    features: [],
    proficiencyChoices: [],
  };
}

function catalogWithHitPointMaximumFeature(
  featureUnitId: UnitRecord["id"],
  delta: HitPointMaximumDelta,
): typeof unitLibrary {
  const source = unitLibrary.requireUnit("sorcerer_draconic_resilience");
  if (
    source.kind !== "class_feature" ||
    source.className !== "sorcerer" ||
    source.mechanics.family !== "composite"
  ) {
    throw new Error("The Hit Point feature fixture must remain composite.");
  }
  const [hitPointPart, ...remainingParts] = source.mechanics.parts;
  if (hitPointPart.family !== "passive") {
    throw new Error("The Hit Point feature fixture must begin with a passive.");
  }
  if (
    hitPointPart.grants.filter((grant) => grant.kind === "modify_max_hp")
      .length !== 1
  ) {
    throw new Error(
      "The Hit Point feature fixture must retain one maximum-HP grant.",
    );
  }
  const feature = {
    ...source,
    id: featureUnitId,
    name: "Synthetic Hit Point Bonus",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic hit point projection boundary",
    },
    mechanics: {
      ...source.mechanics,
      parts: [
        {
          ...hitPointPart,
          grants: hitPointPart.grants.map((grant) =>
            grant.kind === "modify_max_hp" ? { ...grant, delta } : grant,
          ),
        },
        ...remainingParts,
      ],
    },
  } satisfies UnitRecord;

  return {
    getUnit: (unitId) =>
      unitId === featureUnitId
        ? Option.some(feature)
        : unitLibrary.getUnit(unitId),
    listUnits: () => [...unitLibrary.listUnits(), feature],
    requireUnit: (unitId) =>
      unitId === featureUnitId ? feature : unitLibrary.requireUnit(unitId),
  };
}

describe("character finalization boundaries", () => {
  test("rejects unknown spellbook owners while accepting non-Wizard owners", () => {
    expect(
      selectedPreparedSpellsAreInSelectedSpellbook(
        selectionsWithStartingClass(
          classUnitId(authoredUnitId("synthetic_unknown_class")),
        ),
        unitLibrary,
      ),
    ).toBe(false);
    expect(
      selectedPreparedSpellsAreInSelectedSpellbook(
        selectionsWithStartingClass(
          classUnitId(authoredUnitId("class_fighter")),
        ),
        unitLibrary,
      ),
    ).toBe(true);
  });

  test("checks background score increases against readable installed facts", () => {
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("synthetic_unknown_background"),
        baseScores,
      ),
    ).toBe(false);
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("weapon_longsword"),
        baseScores,
      ),
    ).toBe(false);
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("background_soldier"),
        baseScores,
      ),
    ).toBe(true);
    expect(
      applyBackgroundAbilityScoreIncrease(baseScores, { kind: "oneEach" }, [
        "str",
        "dex",
        "con",
      ]),
    ).toMatchObject({
      _tag: "Right",
      right: {
        str: 11,
        dex: 11,
        con: 11,
        int: 10,
        wis: 10,
        cha: 10,
      },
    });
  });

  test("reports missing and unreadable projection source Units", () => {
    const unknownClassBuild = projectionBuild(
      classUnitId(authoredUnitId("synthetic_unknown_class")),
    );
    expect(
      characterBuildHitPoints(unknownClassBuild, unitLibrary),
    ).toMatchObject({
      _tag: "Left",
      left: [{ cause: { tag: "unknownUnit", role: "class" } }],
    });
    expect(
      characterBuildProficiencies(unknownClassBuild, unitLibrary),
    ).toHaveProperty("_tag", "Left");
    expect(
      characterBuildArmorTraining(unknownClassBuild, unitLibrary),
    ).toHaveProperty("_tag", "Left");

    expect(
      characterBuildProficiencies(
        projectionBuild(classUnitId(authoredUnitId("weapon_longsword"))),
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [
        {
          cause: {
            tag: "unreadableUnit",
            role: "class",
            issues: [{ code: "unsupportedUnitKind" }],
          },
        },
      ],
    });

    const fighterBuild = projectionBuild(
      classUnitId(authoredUnitId("class_fighter")),
    );
    expect(
      characterBuildProficiencies(
        {
          ...fighterBuild,
          background: authoredUnitId("synthetic_unknown_background"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [{ cause: { tag: "unknownUnit", role: "background" } }],
    });
    expect(
      characterBuildProficiencies(
        {
          ...fighterBuild,
          background: authoredUnitId("weapon_longsword"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [{ cause: { tag: "unreadableUnit", role: "background" } }],
    });
  });

  test("projects selected skill, expertise, weapon, tool, and armor proficiencies", () => {
    const fighterBuild = projectionBuild(
      classUnitId(authoredUnitId("class_fighter")),
    );
    const proficiencyChoices = [
      { kind: "skill", skill: "arcana" },
      { kind: "skill_expertise", skill: "athletics" },
      { kind: "weapon_category", category: "simple" },
      { kind: "tool", toolId: toolProficiencyId("thieves_tools") },
      { kind: "armor_category", category: "heavy" },
    ] as const satisfies CharacterBuild["proficiencyChoices"];

    expect(
      characterBuildProficiencies(
        { ...fighterBuild, proficiencyChoices },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Right",
      right: {
        skills: expect.arrayContaining(["arcana", "athletics"]),
        expertise: ["athletics"],
        weapon: expect.arrayContaining(["simple"]),
        tools: expect.arrayContaining(["thieves_tools"]),
      },
    });
    expect(
      characterBuildArmorTraining(
        { ...fighterBuild, proficiencyChoices },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining(["heavy"]),
    });
  });

  test("reports selected-species and Hit Point grant source projection failures", () => {
    const fighterBuild = projectionBuild(
      classUnitId(authoredUnitId("class_fighter")),
    );
    const missingFeatureUnitId = authoredUnitId("synthetic_missing_feature");

    expect(
      characterBuildHitPoints(
        {
          ...fighterBuild,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
              unitId: missingFeatureUnitId,
            },
          ],
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [
        {
          cause: {
            tag: "missingHitPointMaximumGrantSourceUnit",
            sourceUnitId: missingFeatureUnitId,
          },
        },
      ],
    });

    expect(
      characterBuildHitPoints(
        {
          ...fighterBuild,
          species: authoredUnitId("synthetic_missing_species"),
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
              unitId: missingFeatureUnitId,
            },
          ],
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [
        {
          cause: {
            tag: "unknownUnit",
            role: "species",
            unitId: "synthetic_missing_species",
          },
        },
        {
          cause: {
            tag: "missingHitPointMaximumGrantSourceUnit",
            sourceUnitId: missingFeatureUnitId,
          },
        },
      ],
    });

    expect(
      characterBuildHitPoints(
        {
          ...fighterBuild,
          species: authoredUnitId("weapon_longsword"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [
        {
          cause: {
            tag: "unreadableUnit",
            role: "species",
            unitId: "weapon_longsword",
            issues: [{ code: "unsupportedUnitKind" }],
          },
        },
      ],
    });

    const resourceUnitIds = characterBuildResources(
      {
        progression: fighterBuild.progression,
        features: [
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
            unitId: missingFeatureUnitId,
          },
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: authoredUnitId("species_orc"),
            unitId: authoredUnitId("orc_relentless_endurance"),
          },
        ],
      },
      unitLibrary,
    ).map((resource) => resource.unitId);
    expect(resourceUnitIds).toContain(authoredUnitId("fighter_second_wind"));
    expect(resourceUnitIds).toContain(
      authoredUnitId("orc_relentless_endurance"),
    );
    expect(resourceUnitIds).not.toContain(missingFeatureUnitId);
  });

  test("rejects non-deterministic retained Hit Point bonuses", () => {
    const fighterBuild = projectionBuild(
      classUnitId(authoredUnitId("class_fighter")),
    );

    const cases = [
      {
        suffix: "rolled_fixed",
        delta: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 6 },
        },
      },
      {
        suffix: "rolled_linear_base",
        delta: {
          kind: "linear_per_level",
          axis: "class",
          base: { dice: 1, dieSize: 6 },
          perLevel: { flat: 1 },
          startingAtLevel: 3,
        },
      },
    ] as const satisfies readonly {
      readonly suffix: string;
      readonly delta: HitPointMaximumDelta;
    }[];

    for (const { suffix, delta } of cases) {
      const featureUnitId = authoredUnitId(`synthetic_hit_point_${suffix}`);
      expect(
        characterBuildHitPoints(
          {
            ...fighterBuild,
            features: [
              {
                kind: "selectedClassChoice",
                selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
                unitId: featureUnitId,
              },
            ],
          },
          catalogWithHitPointMaximumFeature(featureUnitId, delta),
        ),
      ).toMatchObject({
        _tag: "Left",
        left: [
          {
            cause: {
              tag: "unsupportedHitPointMaximumGrant",
              sourceUnitId: featureUnitId,
            },
          },
        ],
      });
    }
  });

  test("scales retained character-axis Hit Point grants by total level", () => {
    const featureUnitId = authoredUnitId(
      "synthetic_character_axis_hit_point_bonus",
    );
    const build = projectionBuild(classUnitId(authoredUnitId("class_fighter")));

    expect(
      characterBuildHitPoints(
        {
          ...build,
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("synthetic_feature_source"),
              unitId: featureUnitId,
            },
          ],
        },
        catalogWithHitPointMaximumFeature(featureUnitId, {
          kind: "linear_per_level",
          axis: "character",
          base: { dice: 0, dieSize: 1, flat: 1 },
          perLevel: { flat: 1 },
          startingAtLevel: 1,
        }),
      ),
    ).toMatchObject({
      _tag: "Right",
      right: { maximum: 11 },
    });
  });

  test("omits unavailable feature grants and absent ordinary slot pools", () => {
    expect(
      characterBuildFeatureUnitIds(
        {
          progression: {
            startingClass: classUnitId(
              authoredUnitId("synthetic_unknown_class"),
            ),
            advancements: [],
          },
          features: [],
        },
        unitLibrary,
      ),
    ).toEqual([]);
    expect(
      characterBuildFeatureUnitIds(
        {
          progression: {
            startingClass: classUnitId(authoredUnitId("weapon_longsword")),
            advancements: [],
          },
          features: [],
        },
        unitLibrary,
      ),
    ).toEqual([]);
    expect(characterBuildSpellcastingSlotCapacity({})).toEqual([]);
    expect(
      characterBuildSpellcastingSlotCapacity({
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("synthetic_spellcasting_source"),
              spellcastingAbility: "int",
              cantrips: [],
              spellbook: [],
              preparedSpells: [],
              spellcastingFocuses: [],
            },
          ],
          slotPools: {},
        },
      }),
    ).toEqual([]);
    expect(
      characterBuildSpellcastingSlotCapacity({
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId("synthetic_spellcasting_source"),
              spellcastingAbility: "int",
              cantrips: [],
              spellbook: [],
              preparedSpells: [],
              spellcastingFocuses: [],
            },
          ],
          slotPools: {
            spellcasting: { kind: "spellcasting", slots: [] },
          },
        },
      }),
    ).toEqual([]);

    expect(
      characterBuildFeatureUnitIds(
        {
          progression: {
            startingClass: classUnitId(authoredUnitId("class_wizard")),
            advancements: [],
          },
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_fighter"),
              unitId: authoredUnitId("subclass_fighter_champion"),
            },
          ],
        },
        unitLibrary,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        authoredUnitId("fighter_improved_critical"),
        authoredUnitId("fighter_remarkable_athlete"),
      ]),
    );
    expect(
      characterBuildFeatureUnitIds(
        {
          progression: {
            startingClass: classUnitId(authoredUnitId("class_fighter")),
            advancements: [
              {
                classUnitId: classUnitId(authoredUnitId("class_fighter")),
                hitPointRule: { tag: "fixedHigherLevelGain" },
              },
              {
                classUnitId: classUnitId(authoredUnitId("class_fighter")),
                hitPointRule: { tag: "fixedHigherLevelGain" },
              },
            ],
          },
          features: [
            {
              kind: "selectedClassChoice",
              selectedFromUnitId: authoredUnitId("class_fighter"),
              unitId: authoredUnitId("subclass_fighter_champion"),
            },
          ],
        },
        unitLibrary,
      ),
    ).toEqual(
      expect.arrayContaining([authoredUnitId("fighter_improved_critical")]),
    );
  });

  test("projects supported class-choice identities and drops invalid option ids", () => {
    const base = selectionsWithStartingClass(
      classUnitId(authoredUnitId("class_ranger")),
    );
    expect(
      finalizedClassChoiceFeatures({
        ...base,
        choices: [
          {
            kind: "unitChoice",
            source: unitSource(
              authoredUnitId("ranger_hunters_prey"),
              HUNTERS_PREY_CHOICE_KEY,
            ),
            options: [{ optionId: creationChoiceOptionId("horde_breaker") }],
          },
        ],
      }),
    ).toEqual([
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "ranger_hunters_prey",
        unitId: "ranger_hunters_prey",
        selectedOption: {
          kind: "huntersPrey",
          selection: "nearbyDifferentTargetSameWeaponAttack",
        },
      },
    ]);
    expect(
      finalizedClassChoiceFeatures({
        ...base,
        choices: [
          {
            kind: "unitChoice",
            source: unitSource(
              authoredUnitId("ranger_hunters_prey"),
              HUNTERS_PREY_CHOICE_KEY,
            ),
            options: [{ optionId: creationChoiceOptionId("colossus_slayer") }],
          },
        ],
      }),
    ).toEqual([
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: "ranger_hunters_prey",
        unitId: "ranger_hunters_prey",
        selectedOption: {
          kind: "huntersPrey",
          selection: "woundedTargetWeaponDamage",
        },
      },
    ]);
    expect(
      finalizedClassChoiceFeatures({
        ...base,
        choices: [
          {
            kind: "unitChoice",
            source: unitSource(
              authoredUnitId("sorcerer_metamagic"),
              SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
            ),
            options: [
              { optionId: creationChoiceOptionId("synthetic_invalid_option") },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  test("distinguishes incomplete drafts at the finalization projection boundary", () => {
    expect(
      finalizedSelections({
        draftId: characterDraftId("draft:incomplete-finalization-boundary"),
        revision: draftRevision(0),
        selections: { choices: [] },
      }),
    ).toBeUndefined();
  });

  test("omits unavailable and unreadable derived Unit references", () => {
    const refsFor = (
      unitId: ReturnType<typeof authoredUnitId>,
      includeBookOfShadows = false,
    ): readonly string[] =>
      characterBuildUnitRefs(
        {
          progression: {
            startingClass: classUnitId(unitId),
            advancements: [],
          },
          background: unitId,
          species: unitId,
          features: [],
          magicInitiateSpellAccesses: [],
          equipment: {
            startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
            owned: [],
            loadout: {},
          },
          spellcasting: {
            sources: [
              {
                sourceUnitId: authoredUnitId("synthetic_spellcasting_source"),
                spellcastingAbility: "int",
                cantrips: [],
                spellbook: [],
                preparedSpells: [],
                spellcastingFocuses: [],
                ...(includeBookOfShadows
                  ? {
                      bookOfShadows: {
                        tag: "bookOfShadows",
                        cantrips: [
                          authoredUnitId("synthetic_cantrip_one"),
                          authoredUnitId("synthetic_cantrip_two"),
                          authoredUnitId("synthetic_cantrip_three"),
                        ],
                        ritualSpells: [
                          authoredUnitId("synthetic_ritual_one"),
                          authoredUnitId("synthetic_ritual_two"),
                        ],
                        spellcastingFocus: "book_of_shadows",
                      },
                    }
                  : {}),
              },
            ],
            slotPools: {},
          },
        },
        unitLibrary,
      ).map((ref) => ref.unitId);

    expect(refsFor(authoredUnitId("synthetic_unknown_unit"))).toEqual([
      "synthetic_unknown_unit",
      "synthetic_spellcasting_source",
    ]);
    expect(refsFor(authoredUnitId("weapon_longsword"))).toEqual([
      "weapon_longsword",
      "synthetic_spellcasting_source",
    ]);
    expect(refsFor(authoredUnitId("synthetic_unknown_unit"), true)).toEqual([
      "synthetic_unknown_unit",
      "synthetic_spellcasting_source",
      "synthetic_cantrip_one",
      "synthetic_cantrip_two",
      "synthetic_cantrip_three",
      "synthetic_ritual_one",
      "synthetic_ritual_two",
    ]);
  });

  test("rejects finalization support checks with missing or unreadable owners", () => {
    const unsupportedSelections = [
      selectionsWithStartingClass(
        classUnitId(authoredUnitId("synthetic_unknown_class")),
      ),
      selectionsWithStartingClass(
        classUnitId(authoredUnitId("weapon_longsword")),
      ),
      {
        ...selectionsWithStartingClass(
          classUnitId(authoredUnitId("class_fighter")),
        ),
        background: authoredUnitId("synthetic_unknown_background"),
      },
      {
        ...selectionsWithStartingClass(
          classUnitId(authoredUnitId("class_fighter")),
        ),
        background: authoredUnitId("weapon_longsword"),
      },
      {
        ...selectionsWithStartingClass(
          classUnitId(authoredUnitId("class_fighter")),
        ),
        progression: {
          startingClass: classUnitId(authoredUnitId("class_fighter")),
          advancements: [
            {
              classUnitId: classUnitId(
                authoredUnitId("synthetic_unknown_class"),
              ),
              hitPointRule: { tag: "fixedHigherLevelGain" },
            },
          ],
        },
      },
    ] as const satisfies readonly FinalizedCharacterSelections[];

    for (const selections of unsupportedSelections) {
      expect(allFinalizedChoicesSupported(selections, unitLibrary)).toBe(false);
    }
  });

  test("accumulates starting-equipment owner failures independently", () => {
    const bothUnknown = selectionsWithStartingClass(
      classUnitId(authoredUnitId("synthetic_unknown_class")),
    );
    expect(
      finalizedBuildEquipment(
        {
          ...bothUnknown,
          background: authoredUnitId("synthetic_unknown_background"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [
        { cause: { tag: "unknownUnit", role: "class" } },
        { cause: { tag: "unknownUnit", role: "background" } },
      ],
    });

    expect(finalizedBuildEquipment(bothUnknown, unitLibrary)).toMatchObject({
      _tag: "Left",
      left: [{ cause: { tag: "unknownUnit", role: "class" } }],
    });

    const fighter = selectionsWithStartingClass(
      classUnitId(authoredUnitId("class_fighter")),
    );
    expect(
      finalizedBuildEquipment(
        {
          ...fighter,
          background: authoredUnitId("synthetic_unknown_background"),
        },
        unitLibrary,
      ),
    ).toMatchObject({
      _tag: "Left",
      left: [{ cause: { tag: "unknownUnit", role: "background" } }],
    });

    expect(finalizedBuildEquipment(fighter, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: { startingEquipmentCurrencyRemainderCp: 0 },
    });
  });
});
