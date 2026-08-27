import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  abilityScoreAssignment,
  characterBuildClassFeatureFactsProjectionWithRoute,
  characterBuildProjectionWithRoute,
  characterBuildSelectedReferenceCount,
  characterBuildSelectedReferencesWithRoute,
  classUnitId,
  eldritchInvocationId,
  copperPieceAmount,
  recordCharacterBuildSelectedReferenceRetentionWithRoute,
  sorcererMetamagicOptionId,
  type CharacterBuild,
  type CharacterBuildFeature,
  type CharacterBuildProficiencyChoiceSubject,
} from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog route fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const selectedReferenceFeatureCases = [
  {
    name: "selected class choice",
    feature: {
      kind: "selectedClassChoice",
      selectedFromUnitId: authoredUnitId("fighter_fighting_style"),
      unitId: authoredUnitId("defense"),
    },
  },
  {
    name: "selected Eldritch Invocation",
    feature: {
      kind: "selectedEldritchInvocation",
      selectedFromUnitId: authoredUnitId("warlock_eldritch_invocations"),
      selection: {
        kind: "nonRepeatable",
        invocationId: eldritchInvocationId("warlock_pact_of_the_chain"),
      },
    },
  },
  {
    name: "selected Sorcerer Metamagic option",
    feature: {
      kind: "selectedSorcererMetamagicOption",
      selectedFromUnitId: authoredUnitId("sorcerer_metamagic"),
      optionId: expectRight(
        sorcererMetamagicOptionId("sorcerer_empowered_spell"),
      ),
    },
  },
] as const satisfies ReadonlyArray<{
  readonly name: string;
  readonly feature: CharacterBuildFeature;
}>;

describe("characterBuildSelectedReferencesWithRoute", () => {
  test("routes class-feature projection facts from build inputs", () => {
    const build = testBuild({});

    expect(
      characterBuildProjectionWithRoute({ build, route: ["seed"] }),
    ).toEqual({
      build,
      route: [
        "seed",
        {
          kind: "projectCharacterBuildFacts",
          subject: "buildProjection",
          owner: "characterBuild",
        },
      ],
    });
    expect(
      characterBuildClassFeatureFactsProjectionWithRoute({
        build,
        unitLibrary,
        route: ["seed"],
      }),
    ).toMatchObject({
      _tag: "Success",
      success: {
        build,
        facts: {
          resources: [{ unitId: "fighter_second_wind" }],
          monksFocus: undefined,
          monkUncannyMetabolism: undefined,
          sorcererFontOfMagic: undefined,
          sorcererMetamagic: undefined,
        },
        route: [
          "seed",
          {
            kind: "projectCharacterBuildFacts",
            subject: "buildProjection",
            owner: "characterBuild",
          },
          {
            kind: "recordCreationFacts",
            subject: "buildProjection",
            facts: ["buildProjectionInput"],
            owner: "characterBuild",
          },
        ],
      },
    });
  });

  test.each(selectedReferenceFeatureCases)(
    "routes $name as a retained selected reference",
    ({ feature }) => {
      const build = testBuild({ features: [feature] });
      const result = characterBuildSelectedReferencesWithRoute({
        build,
        route: ["seed"],
      });

      expect(characterBuildSelectedReferenceCount(build)).toBe(1);
      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isFailure(result)) return;
      expect(result.success.route).toEqual([
        "seed",
        {
          kind: "retainCreationSelectedReferences",
          subject: "selectedReference",
          owner: "creationSelectedReference",
        },
      ]);
    },
  );

  test("routes retained selected spell references from spellcasting sources", () => {
    const build = testBuild({
      spellcasting: {
        slotPools: {},
        sources: [
          {
            sourceUnitId: authoredUnitId("class_wizard"),
            spellcastingAbility: "int",
            cantrips: [authoredUnitId("fire_bolt")],
            spellbook: [authoredUnitId("detect_magic")],
            preparedSpells: [authoredUnitId("magic_missile")],
            spellcastingFocuses: [],
          },
        ],
      },
    });

    expect(characterBuildSelectedReferenceCount(build)).toBe(3);
    expect(
      Result.isSuccess(
        characterBuildSelectedReferencesWithRoute({ build, route: [] }),
      ),
    ).toBe(true);
  });

  test("counts Book of Shadows references and records the routed retention fact", () => {
    const build = testBuild({
      spellcasting: {
        slotPools: {},
        sources: [
          {
            sourceUnitId: authoredUnitId("class_warlock"),
            spellcastingAbility: "cha",
            cantrips: [],
            spellbook: [],
            preparedSpells: [],
            spellcastingFocuses: ["book_of_shadows"],
            bookOfShadows: {
              tag: "bookOfShadows",
              cantrips: [
                authoredUnitId("synthetic_book_cantrip_one"),
                authoredUnitId("synthetic_book_cantrip_two"),
                authoredUnitId("synthetic_book_cantrip_three"),
              ],
              ritualSpells: [
                authoredUnitId("synthetic_book_ritual_one"),
                authoredUnitId("synthetic_book_ritual_two"),
              ],
              spellcastingFocus: "book_of_shadows",
            },
          },
        ],
      },
    });
    const retained = expectRight(
      characterBuildSelectedReferencesWithRoute({
        build,
        route: ["seed"],
      }),
    );

    expect(characterBuildSelectedReferenceCount(build)).toBe(5);
    expect(
      recordCharacterBuildSelectedReferenceRetentionWithRoute(retained),
    ).toEqual({
      build,
      route: [
        "seed",
        {
          kind: "retainCreationSelectedReferences",
          subject: "selectedReference",
          owner: "creationSelectedReference",
        },
        {
          kind: "recordCreationFacts",
          subject: "selectedReference",
          facts: ["selectedReferenceRetention"],
          owner: "creationSelectedReference",
        },
      ],
    });
  });

  test("routes retained skill Expertise choices from build proficiency facts", () => {
    const build = testBuild({
      proficiencyChoices: [
        { kind: "skill", skill: "sleight_of_hand" },
        { kind: "skill", skill: "stealth" },
        { kind: "skill_expertise", skill: "sleight_of_hand" },
        { kind: "skill_expertise", skill: "stealth" },
      ],
    });
    const result = characterBuildSelectedReferencesWithRoute({
      build,
      route: ["seed"],
    });

    expect(characterBuildSelectedReferenceCount(build)).toBe(2);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success.route).toEqual([
      "seed",
      {
        kind: "retainCreationSelectedReferences",
        subject: "selectedReference",
        owner: "creationSelectedReference",
      },
    ]);
  });

  test("rejects a build without retained selected references", () => {
    const build = testBuild({
      features: [
        {
          kind: "abilityCheckBonus",
          selectedFromUnitId: authoredUnitId("ranger_deft_explorer"),
          ability: "wis",
          skills: ["survival"],
          bonus: {
            kind: "abilityModifier",
            ability: "wis",
            minimum: 1,
          },
        },
      ],
    });
    const result = characterBuildSelectedReferencesWithRoute({
      build,
      route: [],
    });

    expect(characterBuildSelectedReferenceCount(build)).toBe(0);
    expect(result).toEqual(
      Result.fail({
        tag: "noSelectedReferences",
        message: "CharacterBuild has no retained selected references to route.",
      }),
    );
  });
});

function testBuild(input: {
  readonly features?: readonly CharacterBuildFeature[];
  readonly proficiencyChoices?: readonly CharacterBuildProficiencyChoiceSubject[];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  const build: CharacterBuild = {
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
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: input.proficiencyChoices ?? [],
    features: input.features ?? [],
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
  };
  if (input.spellcasting === undefined) return build;
  return {
    ...build,
    spellcasting: input.spellcasting,
  };
}

function expectRight<A, E>(either: Result.Result<A, E>): A {
  if (Result.isSuccess(either)) return either.success;
  throw new Error("Expected route test fixture parse to succeed.");
}
