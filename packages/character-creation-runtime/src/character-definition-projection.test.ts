import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
  readSubclassCreationFacts,
  type BackgroundCreationFacts,
  type ClassCreationFacts,
  type SpeciesCreationFacts,
  type SubclassCreationFacts,
  type UnitReaderResult,
} from "@dnd/surface/surface/character-creation-readers";
import {
  decodeUnitRecordEither,
  decodeUnitRecordSync,
} from "@dnd/surface/surface/schema";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import type { SrdUnitRecord } from "@dnd/surface/surface/types";

import { projectCharacterDefinition } from "./character-definition-projection.ts";

const CHARACTER_DEFINITION_ROOT_KINDS = [
  "class",
  "subclass",
  "background",
  "species",
] as const;

type CharacterDefinitionRootKind =
  (typeof CHARACTER_DEFINITION_ROOT_KINDS)[number];

type CharacterDefinitionRoot = Extract<
  SrdUnitRecord,
  { readonly kind: CharacterDefinitionRootKind }
>;

type CharacterDefinitionCreationFacts =
  | ClassCreationFacts
  | SubclassCreationFacts
  | BackgroundCreationFacts
  | SpeciesCreationFacts;

const characterDefinitionRoots = srdUnitCollection.units.filter(
  (unit): unit is CharacterDefinitionRoot =>
    unit.kind === "class" ||
    unit.kind === "subclass" ||
    unit.kind === "background" ||
    unit.kind === "species",
);

describe("Character Definition static projection", () => {
  test("covers all canonical class, subclass, background, and species roots", () => {
    expect(characterDefinitionRoots).toHaveLength(37);
    expect(
      CHARACTER_DEFINITION_ROOT_KINDS.map((kind) => [
        kind,
        characterDefinitionRoots.filter((unit) => unit.kind === kind).length,
      ]),
    ).toEqual([
      ["class", 12],
      ["subclass", 12],
      ["background", 4],
      ["species", 9],
    ]);

    for (const root of characterDefinitionRoots) {
      const projection = projectCharacterDefinition(root);
      const facts = readable(readCreationFacts(root), root.id);

      expect(projection, root.id).toEqual({
        tag: "readable",
        value: {
          kind: root.kind,
          facts: withoutRecordId(facts),
        },
      });
    }
  });

  test("does not retain root authored identity in mechanics projections", () => {
    for (const [index, root] of characterDefinitionRoots.entries()) {
      const renamedRoot = decodeUnitRecordSync({
        ...root,
        id: `synthetic_character_definition_${index}`,
        name: `Synthetic Character Definition ${index}`,
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-character-definition",
        },
      });

      const originalProjection = readable(
        projectCharacterDefinition(root),
        root.id,
      );
      const renamedProjection = readable(
        projectCharacterDefinition(renamedRoot),
        renamedRoot.id,
      );

      expect(renamedProjection).toEqual(originalProjection);
    }
  });

  test("retains class and species discriminants for later composition", () => {
    const classRoot = characterDefinitionRoots.find(
      (unit) => unit.kind === "class",
    );
    const speciesRoot = characterDefinitionRoots.find(
      (unit) => unit.kind === "species",
    );
    if (classRoot === undefined || speciesRoot === undefined) {
      throw new Error(
        "The SRD test catalog must contain class and species roots.",
      );
    }

    const classProjection = readable(
      projectCharacterDefinition(classRoot),
      classRoot.id,
    );
    const speciesProjection = readable(
      projectCharacterDefinition(speciesRoot),
      speciesRoot.id,
    );

    expect(classProjection.facts).toMatchObject({
      className: classRoot.className,
    });
    expect(speciesProjection.facts).toMatchObject({
      species: speciesRoot.species,
    });
  });

  test("rejects a Unit outside the Character Definition root domain", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) {
      throw new Error("The SRD test catalog must contain a spell Unit.");
    }

    expect(projectCharacterDefinition(spell)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedUnitKind",
          message: "Expected a Character Definition root, received spell.",
          unitId: spell.id,
        },
      ],
    });
  });

  test("rejects contradictory authored class shapes before projection", () => {
    const wizard = characterDefinitionRoots.find(
      (unit) => unit.kind === "class" && unit.className === "wizard",
    );
    const fighter = characterDefinitionRoots.find(
      (unit) => unit.kind === "class" && unit.className === "fighter",
    );
    if (wizard === undefined || fighter === undefined) {
      throw new Error(
        "The SRD test catalog must contain wizard and fighter roots.",
      );
    }

    const contradictory: unknown = {
      ...fighter,
      spellcasting: wizard.spellcasting,
    };

    // UnitRecord is the already-decoded projection input. The Surface schema
    // therefore owns the ambiguity control and prevents this state from
    // reaching the shape-based Character Definition projection.
    expect(Either.isLeft(decodeUnitRecordEither(contradictory))).toBe(true);
  });
});

function readCreationFacts(
  root: CharacterDefinitionRoot,
): UnitReaderResult<CharacterDefinitionCreationFacts> {
  if (root.kind === "class") {
    return readClassCreationFacts(root);
  }
  if (root.kind === "subclass") {
    return readSubclassCreationFacts(root);
  }
  if (root.kind === "background") {
    return readBackgroundCreationFacts(root);
  }
  return readSpeciesCreationFacts(root);
}

function readable<T>(result: UnitReaderResult<T>, label: string): T {
  if (result.tag === "unreadable") {
    throw new Error(
      `${label} was unexpectedly unreadable: ${result.issues[0]?.message ?? "unknown issue"}`,
    );
  }
  return result.value;
}

function withoutRecordId<Fact extends { readonly recordId: string }>(
  facts: Fact,
): Omit<Fact, "recordId"> {
  const { recordId: _recordId, ...mechanics } = facts;
  return mechanics;
}
