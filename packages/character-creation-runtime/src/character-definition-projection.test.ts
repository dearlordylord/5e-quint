import { Result, Schema } from "effect";
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
  decodeUnitRecordResult,
  decodeUnitRecordSync,
  SrdUnitRecordSchema,
} from "@dnd/surface/surface/schema";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import type {
  SrdSurface,
  SrdUnitRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  admitCharacterDefinitionMechanicsGraph,
  projectCharacterDefinition,
} from "./character-definition-projection.ts";
import {
  collectSurfaceUnitAuthoredRelations,
  type SurfaceAuthoredRelation,
} from "@dnd/surface/surface/surface-relations";
import { PositiveInteger } from "@dnd/shared/types";
import { unitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

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

const completeSurface = surfaceWithUnits(srdUnitCollection.units);

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
    const wizardRoot = characterDefinitionRoots.find(
      (unit) => unit.kind === "class" && unit.className === "wizard",
    );
    const speciesRoot = characterDefinitionRoots.find(
      (unit) => unit.kind === "species",
    );
    const subclassRoot = characterDefinitionRoots.find(
      (unit) => unit.kind === "subclass",
    );
    const dragonbornRoot = characterDefinitionRoots.find(
      (
        unit,
      ): unit is Extract<
        CharacterDefinitionRoot,
        { readonly kind: "species"; readonly species: "dragonborn" }
      > => unit.kind === "species" && unit.species === "dragonborn",
    );
    if (
      classRoot === undefined ||
      wizardRoot === undefined ||
      speciesRoot === undefined ||
      subclassRoot === undefined ||
      dragonbornRoot === undefined
    ) {
      throw new Error(
        "The SRD test catalog must contain class, wizard, subclass, species, and Dragonborn roots.",
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
    const wizardProjection = readable(
      projectCharacterDefinition(wizardRoot),
      wizardRoot.id,
    );
    const subclassProjection = readable(
      projectCharacterDefinition(subclassRoot),
      subclassRoot.id,
    );
    const dragonbornProjection = readable(
      projectCharacterDefinition(dragonbornRoot),
      dragonbornRoot.id,
    );

    expect(classProjection.facts).toMatchObject({
      className: classRoot.className,
    });
    expect(wizardProjection.facts).toMatchObject({
      className: "wizard",
      spellcasting: wizardRoot.spellcasting,
    });
    expect(subclassProjection.facts).toMatchObject({
      className: subclassRoot.className,
      featureGrants: subclassRoot.featureGrants,
    });
    expect(speciesProjection.facts).toMatchObject({
      species: speciesRoot.species,
    });
    expect(dragonbornProjection.facts).toMatchObject({
      species: "dragonborn",
      draconicAncestry: dragonbornRoot.draconicAncestry,
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

  test("does not admit a non-root through the Character Definition owner", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) {
      throw new Error("The SRD test catalog must contain a spell Unit.");
    }

    expect(
      admitCharacterDefinitionMechanicsGraph({
        unit: spell,
        surface: completeSurface,
      }),
    ).toMatchObject({
      tag: "rejected",
      issues: [
        expect.objectContaining({
          reason: "unsupported_mechanics",
          mechanicsPath: unitMechanicsPath([
            { kind: "singleton", role: "recordMechanics" },
          ]),
        }),
      ],
    });
  });

  test("admits every canonical root with its source-free projection", () => {
    for (const root of characterDefinitionRoots) {
      const result = admitCharacterDefinitionMechanicsGraph({
        unit: root,
        surface: completeSurface,
      });

      expect(result.tag, root.id).toBe("admitted");
      if (result.tag !== "admitted") continue;
      expect(result.execution).toEqual(
        readable(projectCharacterDefinition(root), root.id),
      );
    }

    const classRoot = characterDefinitionRoots.find(
      (
        unit,
      ): unit is Extract<CharacterDefinitionRoot, { readonly kind: "class" }> =>
        unit.kind === "class",
    );
    if (classRoot === undefined) {
      throw new Error("The SRD test catalog must contain a class root.");
    }
    const structurallyClonedRoot = Schema.decodeUnknownSync(
      SrdUnitRecordSchema,
      { onExcessProperty: "error" },
    )(classRoot);
    expect(structurallyClonedRoot).not.toBe(classRoot);
    expect(
      admitCharacterDefinitionMechanicsGraph({
        unit: structurallyClonedRoot,
        surface: completeSurface,
      }).tag,
    ).toBe("admitted");
  });

  test("reports a missing authored dependency at a mechanics path", () => {
    const classRoot = characterDefinitionRoots.find(
      (
        unit,
      ): unit is Extract<CharacterDefinitionRoot, { readonly kind: "class" }> =>
        unit.kind === "class" && unit.className === "fighter",
    );
    if (classRoot === undefined) {
      throw new Error("The SRD test catalog must contain a fighter root.");
    }
    const dependency = characterDefinitionRootRelations(classRoot).find(
      (link) => link.relationKind === "dependency",
    );
    if (dependency === undefined) {
      throw new Error("The fighter root must contain an authored dependency.");
    }
    const dependencyIndex = characterDefinitionRootRelations(
      classRoot,
    ).findIndex(
      (link) =>
        link.relationKind === dependency.relationKind &&
        link.fieldPath === dependency.fieldPath &&
        link.targetRecordId === dependency.targetRecordId,
    );
    if (dependencyIndex < 0) {
      throw new Error("The fighter dependency must retain its authored link.");
    }
    const missingDependencySurface = surfaceWithUnits(
      completeSurface.units.filter(
        (unit) => unit.id !== dependency.targetRecordId,
      ),
    );

    const result = admitCharacterDefinitionMechanicsGraph({
      unit: classRoot,
      surface: missingDependencySurface,
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [
        expect.objectContaining({
          reason: "incomplete_graph",
          mechanicsPath: {
            family: "unit",
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              {
                kind: "occurrence",
                role: "dependency",
                ordinal: PositiveInteger(dependencyIndex + 1),
              },
            ],
          },
        }),
      ],
    });
  });

  test("reports an ambiguous dependency that the decoded schema permits", () => {
    const classRoot = characterDefinitionRoots.find(
      (
        unit,
      ): unit is Extract<CharacterDefinitionRoot, { readonly kind: "class" }> =>
        unit.kind === "class" && unit.className === "fighter",
    );
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (classRoot === undefined || spell === undefined) {
      throw new Error(
        "The SRD test catalog must contain fighter and spell roots.",
      );
    }
    const firstFeatureGrant = classRoot.featureGrants[0];
    if (firstFeatureGrant === undefined) {
      throw new Error("The fighter root must contain a feature grant.");
    }
    const malformedRaw = {
      ...classRoot,
      featureGrants: [
        { ...firstFeatureGrant, unitId: spell.id },
        ...classRoot.featureGrants.slice(1),
      ],
    };
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(SrdUnitRecordSchema, {
          onExcessProperty: "error",
        })(malformedRaw),
      ),
    ).toBe(true);
    const malformed = Schema.decodeUnknownSync(SrdUnitRecordSchema, {
      onExcessProperty: "error",
    })(malformedRaw);
    expect(projectCharacterDefinition(malformed).tag).toBe("readable");
    const malformedLinkIndex = characterDefinitionRootRelations(
      malformed,
    ).findIndex((link) => link.fieldPath.endsWith("featureGrants[0].unitId"));
    if (malformedLinkIndex < 0) {
      throw new Error(
        "The malformed class must retain its feature grant link.",
      );
    }

    const result = admitCharacterDefinitionMechanicsGraph({
      unit: malformed,
      surface: surfaceWithUnits(
        completeSurface.units.map((unit) =>
          unit.id === classRoot.id ? malformed : unit,
        ),
      ),
    });

    expect(result).toMatchObject({
      tag: "rejected",
      issues: [
        expect.objectContaining({
          reason: "ambiguous_mechanics",
          mechanicsPath: unitMechanicsPath([
            { kind: "singleton", role: "recordMechanics" },
            {
              kind: "occurrence",
              role: "dependency",
              ordinal: PositiveInteger(malformedLinkIndex + 1),
            },
          ]),
        }),
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
    expect(Result.isFailure(decodeUnitRecordResult(contradictory))).toBe(true);
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

function withoutRecordId<
  Fact extends {
    readonly recordId: UnitRecord["id"];
  },
>(facts: Fact): Omit<Fact, "recordId"> {
  const { recordId: _recordId, ...mechanics } = facts;
  return mechanics;
}

function surfaceWithUnits(units: readonly SrdUnitRecord[]): SrdSurface {
  const [first, ...rest] = units;
  if (first === undefined) {
    throw new Error("A test Surface must retain at least one Unit.");
  }
  const [firstStatBlock, ...remainingStatBlocks] =
    srdStatBlockCollection.statBlocks;
  if (firstStatBlock === undefined) {
    throw new Error("A test Surface must retain at least one Stat Block.");
  }
  return {
    kind: "srd-5.2.1-surface-catalog",
    units: [first, ...rest],
    statBlocks: [firstStatBlock, ...remainingStatBlocks],
  };
}

function characterDefinitionRootRelations(
  root: SrdUnitRecord,
): readonly SurfaceAuthoredRelation[] {
  const relations = collectSurfaceUnitAuthoredRelations(root);
  if (Result.isFailure(relations)) {
    throw new Error(
      `The Character Definition root relation graph must be readable: ${relations.failure[0].message}`,
    );
  }
  return relations.success;
}
