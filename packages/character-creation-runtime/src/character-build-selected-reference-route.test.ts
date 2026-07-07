import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  abilityScoreAssignment,
  characterBuildSelectedReferenceCount,
  characterBuildSelectedReferencesWithRoute,
  classUnitId,
  eldritchInvocationId,
  sorcererMetamagicOptionId,
  type CharacterBuild,
  type CharacterBuildFeature,
} from "./index.ts";

const selectedReferenceFeatureCases = [
  {
    name: "selected class choice",
    feature: {
      kind: "selectedClassChoice",
      selectedFromUnitId: "fighter_fighting_style",
      unitId: "defense",
    },
  },
  {
    name: "selected Eldritch Invocation",
    feature: {
      kind: "selectedEldritchInvocation",
      selectedFromUnitId: "warlock_eldritch_invocations",
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
      selectedFromUnitId: "sorcerer_metamagic",
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
  test.each(selectedReferenceFeatureCases)(
    "routes $name as a retained selected reference",
    ({ feature }) => {
      const build = testBuild({ features: [feature] });
      const result = characterBuildSelectedReferencesWithRoute({
        build,
        route: ["seed"],
      });

      expect(characterBuildSelectedReferenceCount(build)).toBe(1);
      expect(Either.isRight(result)).toBe(true);
      if (Either.isLeft(result)) return;
      expect(result.right.route).toEqual([
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
            sourceUnitId: "class_wizard",
            spellcastingAbility: "int",
            cantrips: ["fire_bolt"],
            spellbook: ["detect_magic"],
            preparedSpells: ["magic_missile"],
            spellcastingFocuses: [],
          },
        ],
      },
    });

    expect(characterBuildSelectedReferenceCount(build)).toBe(3);
    expect(
      Either.isRight(
        characterBuildSelectedReferencesWithRoute({ build, route: [] }),
      ),
    ).toBe(true);
  });

  test("rejects a build without retained selected references", () => {
    const build = testBuild({
      features: [
        {
          kind: "abilityCheckBonus",
          selectedFromUnitId: "ranger_deft_explorer",
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
      Either.left({
        tag: "noSelectedReferences",
        message: "CharacterBuild has no retained selected references to route.",
      }),
    );
  });
});

function testBuild(input: {
  readonly features?: readonly CharacterBuildFeature[];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  const build: CharacterBuild = {
    progression: {
      startingClass: classUnitId("class_fighter"),
      advancements: [],
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

function expectRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error("Expected route test fixture parse to succeed.");
}
