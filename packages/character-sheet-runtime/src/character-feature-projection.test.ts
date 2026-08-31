import { unitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";

import {
  projectCharacterSheetFeature,
  projectPartialCharacterSheetFeature,
} from "./character-feature-projection.ts";

const featureRootKinds = ["class_feature", "feat", "species_trait"] as const;
const partialRootIds = [
  "druid_wild_shape",
  "monk_monks_focus",
  "sorcerer_font_of_magic",
  "sorcerer_metamagic",
  "species_gnome_gnomish_lineage",
  "species_human_resourceful",
] as const;
type PartialRootId = (typeof partialRootIds)[number];

const expectedEvidenceByRootId = {
  druid_wild_shape: [
    "consumed|use-count resource|recordMechanics/resource",
    "consumed|rest reset cadence|recordMechanics/generalFact:1",
    "unowned|activation execution|recordMechanics/bonusAction",
    "consumed|duration projection|recordMechanics/generalFact:2",
    "consumed|known-form projection|recordMechanics/effect:1",
    "unowned|form execution and reversion|recordMechanics/effect:1/generalFact:1",
    "unowned|temporary-hit-point execution|recordMechanics/effect:2",
  ],
  monk_monks_focus: [
    "consumed|point resource|recordMechanics/resource",
    "consumed|rest reset cadence|recordMechanics/generalFact:1",
    "consumed|save DC projection|recordMechanics/generalFact:2",
    ...Array.from({ length: 3 }, (_, index) => [
      `consumed|selectable option|recordMechanics/generalFact:${index + 3}`,
      `unowned|option battle execution|recordMechanics/effect:${index + 1}`,
    ]).flat(),
  ],
  sorcerer_font_of_magic: [
    "consumed|point-pool resource|recordMechanics/resource",
    "consumed|rest reset cadence|recordMechanics/generalFact:1",
    "consumed|spell-slot conversion procedure|recordMechanics/procedure:1",
    "consumed|spell-slot creation procedure|recordMechanics/procedure:2",
  ],
  sorcerer_metamagic: [
    "consumed|selection lifecycle|recordMechanics/generalFact:1",
    ...Array.from({ length: 10 }, (_, index) => [
      `consumed|option selection facts|recordMechanics/generalFact:${index + 2}`,
      `unowned|option spell execution|recordMechanics/effect:${index + 1}`,
    ]).flat(),
    "consumed|point-pool composition reference|recordMechanics/dependency:1",
  ],
  species_gnome_gnomish_lineage: [
    "unowned|lineage and ability selection|recordMechanics/generalFact:1",
    "consumed|lineage option identity|recordMechanics/generalFact:2",
    "consumed|selected lineage grants|recordMechanics/effect:1",
    "consumed|lineage option identity|recordMechanics/generalFact:3",
    "consumed|selected lineage grants|recordMechanics/effect:2",
    "unowned|clockwork-device procedure|recordMechanics/procedure:1",
  ],
  species_human_resourceful: [
    "consumed|long-rest trigger|recordMechanics/generalFact:1",
    "consumed|heroic-inspiration grant|recordMechanics/effect:1",
  ],
} as const satisfies Record<PartialRootId, readonly string[]>;

describe("Character Sheet feature projection", () => {
  test("projects every feature-root role without authored record identity", () => {
    for (const kind of featureRootKinds) {
      const root = requireRoot(kind);
      const projection = projectCharacterSheetFeature(root);

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
        id: unitId(`synthetic_mycelium_sheet_${kind}`),
        name: `Synthetic Mycelium Sheet ${kind}`,
        provenance: {
          kind: "synthetic-test",
          section: `Synthetic/Mycelium/Sheet/${kind}`,
        },
      });

      expect(projectCharacterSheetFeature(renamed)).toEqual(
        projectCharacterSheetFeature(root),
      );
    },
  );

  test("rejects a decoded Unit outside the owner boundary", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) throw new Error("Expected an SRD spell fixture.");

    expect(projectCharacterSheetFeature(spell)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedUnitKind",
          message: "Expected a Character Sheet feature root, received spell.",
          unitId: spell.id,
        },
      ],
    });
  });

  test.each(partialRootIds)("emits stable mechanics paths for %s", (rootId) => {
    const root = requireUnit(rootId);
    const renamed = decodeUnitRecordSync({
      ...root,
      id: unitId(`synthetic_mycelium_sheet_${root.kind}`),
      name: `Synthetic Mycelium Sheet ${root.kind}`,
      provenance: {
        kind: "synthetic-test",
        section: `Synthetic/Mycelium/Sheet/${root.kind}`,
      },
    });
    const projection = projectPartialCharacterSheetFeature(root);

    expect(projection.tag).toBe("readable");
    expect(projectPartialCharacterSheetFeature(renamed)).toEqual(projection);
    if (projection.tag !== "readable") return;
    expect(projection.value.evidence.map(evidenceCoordinate)).toEqual(
      expectedEvidenceByRootId[rootId],
    );
    expect(
      new Set(
        projection.value.evidence.map((entry) =>
          JSON.stringify(entry.mechanicsPath),
        ),
      ).size,
    ).toBe(projection.value.evidence.length);
    expect(
      projection.value.evidence.some(
        (entry) => entry.disposition === "consumed",
      ),
    ).toBe(true);
  });

  test("rejects a complete feature root from partial-root evidence", () => {
    const completeRoot = srdUnitCollection.units.find(
      (unit) =>
        unit.kind === "class_feature" &&
        unit.mechanics.family === "spellbook_ritual_access",
    );
    if (completeRoot === undefined) {
      throw new Error("Expected a complete spellbook ritual fixture.");
    }

    expect(projectPartialCharacterSheetFeature(completeRoot)).toEqual({
      tag: "unreadable",
      issues: [
        {
          code: "completeFeatureRoot",
          mechanicsPath: {
            family: "unit",
            nodes: [{ kind: "singleton", role: "recordMechanics" }],
          },
          message:
            "This feature root has no structurally partial Character Sheet projection.",
        },
      ],
    });
  });

  test("classifies exactly the six structurally partial SRD roots", () => {
    expect(
      srdUnitCollection.units.flatMap((unit) =>
        projectPartialCharacterSheetFeature(unit).tag === "readable"
          ? [unit.id]
          : [],
      ),
    ).toEqual(partialRootIds);
  });

  test("reports an unsupported root distinctly from a complete feature root", () => {
    const spell = srdUnitCollection.units.find((unit) => unit.kind === "spell");
    if (spell === undefined) throw new Error("Expected an SRD spell fixture.");

    expect(projectPartialCharacterSheetFeature(spell)).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "unsupportedFeatureRoot" }],
    });
  });

  test("accumulates independent unsupported branches on a partial family", () => {
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
        duration: {
          kind: "timed",
          value: { amount: 1, unit: "hour" },
        },
      },
    });

    const projection = projectPartialCharacterSheetFeature(unsupported);
    expect(projection).toMatchObject({
      tag: "unreadable",
      issues: [
        { code: "unsupportedFeatureBranch" },
        { code: "unsupportedFeatureBranch" },
      ],
    });
    if (projection.tag === "unreadable") {
      expect(
        new Set(
          projection.issues.map((issue) => JSON.stringify(issue.mechanicsPath)),
        ).size,
      ).toBe(2);
    }
  });
});

function requireUnit(id: (typeof partialRootIds)[number]) {
  const root = srdUnitCollection.units.find((unit) => unit.id === id);
  if (root === undefined) throw new Error(`Expected SRD Unit ${id}.`);
  return root;
}

function evidenceCoordinate(
  evidence: Extract<
    ReturnType<typeof projectPartialCharacterSheetFeature>,
    { readonly tag: "readable" }
  >["value"]["evidence"][number],
): string {
  const path = evidence.mechanicsPath.nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
  return `${evidence.disposition}|${evidence.branch}|${path}`;
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
