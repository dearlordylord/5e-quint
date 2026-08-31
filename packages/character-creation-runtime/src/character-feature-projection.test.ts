import { unitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";

import {
  projectCharacterCreationFeature,
  projectPartialCharacterCreationFeature,
} from "./character-feature-projection.ts";

const featureRootKinds = ["class_feature", "feat", "species_trait"] as const;
const partialRootIds = [
  "druid_wild_shape",
  "druid_wild_companion",
  "monk_monks_focus",
  "sorcerer_font_of_magic",
  "sorcerer_metamagic",
  "wizard_evocation_savant",
  "species_gnome_gnomish_lineage",
] as const;

describe("Character Creation feature projection", () => {
  test("projects every feature-root role without authored record identity", () => {
    for (const kind of featureRootKinds) {
      const root = requireRoot(kind);
      const projection = projectCharacterCreationFeature(root);

      expect(projection.tag, kind).toBe("readable");
      if (projection.tag !== "readable") continue;
      expect(projection.value.kind).toBe(kind);
      expect(projection.value.facts).not.toHaveProperty("id");
      expect(projection.value.facts).not.toHaveProperty("kind");
      expect(projection.value.facts).not.toHaveProperty("name");
      expect(projection.value.facts).not.toHaveProperty("provenance");
      expect(projection.value.facts).toHaveProperty(
        "mechanics",
        root.mechanics,
      );
    }
  });

  test.each(featureRootKinds)(
    "produces equal %s facts for a visibly synthetic renamed equivalent",
    (kind) => {
      const root = requireRoot(kind);
      const renamed = decodeUnitRecordSync({
        ...root,
        id: unitId(`synthetic_mycelium_${kind}`),
        name: `Synthetic Mycelium ${kind}`,
        provenance: {
          kind: "synthetic-test",
          section: `Synthetic/Mycelium/${kind}`,
        },
      });

      expect(projectCharacterCreationFeature(renamed)).toEqual(
        projectCharacterCreationFeature(root),
      );
    },
  );

  test("rejects a decoded Unit outside the owner boundary", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) throw new Error("Expected an SRD spell fixture.");

    expect(projectCharacterCreationFeature(spell)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedUnitKind",
          message:
            "Expected a Character Creation feature root, received spell.",
          unitId: spell.id,
        },
      ],
    });
  });

  test.each(partialRootIds)(
    "emits stable consumed and unowned mechanics paths for %s",
    (rootId) => {
      const root = requireUnit(rootId);
      const renamed = decodeUnitRecordSync({
        ...root,
        id: unitId(`synthetic_mycelium_${root.kind}`),
        name: `Synthetic Mycelium ${root.kind}`,
        provenance: {
          kind: "synthetic-test",
          section: `Synthetic/Mycelium/${root.kind}`,
        },
      });
      const projection = projectPartialCharacterCreationFeature(root);
      const renamedProjection = projectPartialCharacterCreationFeature(renamed);

      expect(projection.tag).toBe("readable");
      expect(renamedProjection).toEqual(projection);
      if (projection.tag !== "readable") return;
      expect(projection.value.evidence.length).toBeGreaterThan(0);
      expect(
        new Set(
          projection.value.evidence.map((entry) =>
            JSON.stringify(entry.mechanicsPath),
          ),
        ).size,
      ).toBe(projection.value.evidence.length);
      expect(
        projection.value.evidence.some(
          (entry) => entry.disposition === "unowned",
        ),
      ).toBe(true);
    },
  );

  test("rejects a complete feature root from partial-root evidence", () => {
    const completeRoot = srdUnitCollection.units.find(
      (unit) =>
        unit.kind === "class_feature" && unit.mechanics.family === "passive",
    );
    if (completeRoot === undefined) {
      throw new Error("Expected a complete passive class-feature fixture.");
    }

    expect(projectPartialCharacterCreationFeature(completeRoot)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "completeFeatureRoot",
          mechanicsPath: {
            family: "unit",
            nodes: [{ kind: "singleton", role: "recordMechanics" }],
          },
          message:
            "This feature root has no structurally partial Character Creation projection.",
        },
      ],
    });
  });

  test("classifies exactly the seven structurally partial SRD roots", () => {
    expect(
      srdUnitCollection.units.flatMap((unit) =>
        projectPartialCharacterCreationFeature(unit).tag === "readable"
          ? [unit.id]
          : [],
      ),
    ).toEqual(partialRootIds);
  });

  test("reports an unsupported root distinctly from a complete feature root", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) throw new Error("Expected an SRD spell fixture.");

    expect(projectPartialCharacterCreationFeature(spell)).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "unsupportedFeatureRoot" }],
    });
  });

  test("rejects an unsupported represented branch on a partial family", () => {
    const root = requireUnit("druid_wild_shape");
    if (
      root.kind !== "class_feature" ||
      root.mechanics.family !== "activation"
    ) {
      throw new Error("Expected an activation class-feature fixture.");
    }
    const unsupported = decodeUnitRecordSync({
      ...root,
      mechanics: {
        ...root.mechanics,
        resetCadence: { kind: "long_rest" },
      },
    });

    expect(projectPartialCharacterCreationFeature(unsupported)).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "unsupportedFeatureBranch" }],
    });
  });
});

function requireUnit(id: (typeof partialRootIds)[number]) {
  const root = srdUnitCollection.units.find((unit) => unit.id === id);
  if (root === undefined) throw new Error(`Expected SRD Unit ${id}.`);
  return root;
}

function requireRoot(kind: (typeof featureRootKinds)[number]) {
  const root = srdUnitCollection.units.find((unit) => unit.kind === kind);
  if (root === undefined) throw new Error(`Expected an SRD ${kind} fixture.`);
  if (
    root.kind !== "class_feature" &&
    root.kind !== "feat" &&
    root.kind !== "species_trait"
  ) {
    throw new Error(`Expected ${kind} to be a feature root.`);
  }
  return root;
}
