import { PositiveInteger } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import type { UnitMechanicsPath } from "./mechanics-graph-path.ts";
import {
  SPELL_DURATION_BRANCH_COORDINATES,
  SPELL_DURATION_BRANCHES,
  SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES,
  SPELL_MATERIAL_COMPONENT_BRANCHES,
  SPELL_MECHANICS_HEADER_FACT_ORDINALS,
  SPELL_MECHANICS_HEADER_FACTS,
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellGlyphExplosiveReleasePath,
  spellGlyphOccurrencePath,
  spellGlyphReleasePath,
  spellGlyphStoredReleasePath,
  spellGlyphTriggerPath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  spellSpawnedCreatureControlPath,
  spellSpawnedCreatureDismissalPath,
  spellSpawnedCreaturePath,
  spellTemplatedSpawnCapacityPath,
  spellTemplatedSpawnControlPath,
  spellTemplatedSpawnReversionPath,
  spellTemplatedSpawnSizeTierPath,
  spellTemplatedSpawnStatBlockPath,
} from "./spell-mechanics-path.ts";

describe("spell mechanics paths", () => {
  test("owns the fixed spell header, material, and duration vocabulary", () => {
    expect(SPELL_MECHANICS_HEADER_FACTS).toEqual([
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
    ]);
    expect(SPELL_MECHANICS_HEADER_FACT_ORDINALS).toEqual({
      level: 1,
      school: 2,
      range: 3,
      components: 4,
      duration: 5,
      castingTime: 6,
      family: 7,
    });
    expect(SPELL_MATERIAL_COMPONENT_BRANCHES).toEqual(["cost", "consumption"]);
    expect(SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES).toEqual({
      cost: { role: "resource", ordinal: 1 },
      consumption: { role: "effect", ordinal: 1 },
    });
    expect(SPELL_DURATION_BRANCHES).toEqual(["value", "extension", "ending"]);
    expect(SPELL_DURATION_BRANCH_COORDINATES).toEqual({
      value: { role: "generalFact", firstOrdinal: 1 },
      extension: { role: "extension", firstOrdinal: 1 },
      ending: { role: "effect", firstOrdinal: 1 },
    });
  });

  test("builds root, header, material, and duration coordinates", () => {
    expectCoordinates([
      [spellMechanicsRootPath(), "recordMechanics"],
      [spellMechanicsHeaderPath("level"), "recordMechanics/generalFact:1"],
      [spellMechanicsHeaderPath("family"), "recordMechanics/generalFact:7"],
      [
        spellMaterialComponentPath("cost"),
        "recordMechanics/generalFact:4/resource:1",
      ],
      [
        spellMaterialComponentPath("consumption"),
        "recordMechanics/generalFact:4/effect:1",
      ],
      [spellDurationValuePath(), "recordMechanics/generalFact:5/generalFact:1"],
      [
        spellDurationExtensionPath(PositiveInteger(3)),
        "recordMechanics/generalFact:5/extension:3",
      ],
      [
        spellDurationEndingPath(PositiveInteger(2)),
        "recordMechanics/generalFact:5/effect:2",
      ],
    ]);
  });

  test("builds activation and ongoing coordinates", () => {
    expectCoordinates([
      [
        spellActivationPhasePath(PositiveInteger(2)),
        "recordMechanics/procedure:2",
      ],
      [
        spellActivationAttachmentPath(PositiveInteger(2)),
        "recordMechanics/procedure:2/generalFact:1",
      ],
      [
        spellActivationRepeatPath(PositiveInteger(2), PositiveInteger(3)),
        "recordMechanics/procedure:2/procedure:3",
      ],
      [
        spellActivationEffectPath(PositiveInteger(2), PositiveInteger(4)),
        "recordMechanics/procedure:2/effect:4",
      ],
      [spellOngoingAttachmentPath(), "recordMechanics/effect:1"],
      [spellOngoingInitialPhasePath(), "recordMechanics/action"],
      [
        spellOngoingOperationPath(PositiveInteger(3)),
        "recordMechanics/procedure:3",
      ],
      [
        spellOngoingOperationEffectPath(PositiveInteger(3)),
        "recordMechanics/procedure:3/effect:1",
      ],
    ]);
  });

  test("builds templated and spawned-creature coordinates", () => {
    expectCoordinates([
      [spellTemplatedSpawnCapacityPath(), "recordMechanics/resource"],
      [spellTemplatedSpawnStatBlockPath(), "recordMechanics/effect:1"],
      [
        spellTemplatedSpawnSizeTierPath(PositiveInteger(3)),
        "recordMechanics/extension:3",
      ],
      [spellTemplatedSpawnControlPath(), "recordMechanics/procedure:1"],
      [spellTemplatedSpawnReversionPath(), "recordMechanics/effect:2"],
      [spellSpawnedCreaturePath(), "recordMechanics/effect:1"],
      [spellSpawnedCreatureControlPath(), "recordMechanics/procedure:1"],
      [spellSpawnedCreatureDismissalPath(), "recordMechanics/effect:2"],
    ]);
  });

  test("builds sibling glyph occurrence, trigger, and release coordinates", () => {
    expectCoordinates([
      [spellGlyphOccurrencePath(), "recordMechanics/effect:1"],
      [spellGlyphTriggerPath(), "recordMechanics/procedure:1"],
      [spellGlyphReleasePath(), "recordMechanics/effect:2"],
      [spellGlyphExplosiveReleasePath(), "recordMechanics/procedure:2"],
      [spellGlyphStoredReleasePath(), "recordMechanics/procedure:3"],
    ]);
  });
});

function expectCoordinates(
  cases: readonly (readonly [UnitMechanicsPath, string])[],
): void {
  for (const [path, expected] of cases) {
    expect(coordinate(path)).toBe(expected);
  }
}

function coordinate(path: UnitMechanicsPath): string {
  return path.nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
}
