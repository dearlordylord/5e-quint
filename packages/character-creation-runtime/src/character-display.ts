import { Option, Result } from "effect";

import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import { progressionClassLevels } from "./character-progression-types.ts";
import type { CharacterBuild } from "./types.ts";

/**
 * The stable human-readable label for a built character belongs to the
 * character-creation projection that owns the build and its progression.
 * Consumers such as MCP may present this label without reimplementing the
 * identity algorithm.
 */
export function characterBuildDisplayName(
  unitLibrary: UnitCatalog,
  build: CharacterBuild,
): Result.Result<string, CharacterBuildDisplayNameIssues> {
  const issues: CharacterBuildDisplayNameIssue[] = [];
  const speciesName = displayUnitName({
    unitLibrary,
    unitId: build.species,
    role: "species",
    issues,
  });
  const backgroundName = displayUnitName({
    unitLibrary,
    unitId: build.background,
    role: "background",
    issues,
  });
  const classLevels = progressionClassLevels(build.progression);
  const classLabel = classLevels
    .map((entry) => {
      const className = displayUnitName({
        unitLibrary,
        unitId: entry.classUnitId,
        role: "class",
        issues,
      });
      return classLevels.length === 1 && entry.classLevel === 1
        ? className
        : `${className} ${entry.classLevel}`;
    })
    .join(" / ");

  return issues.length > 0
    ? Result.fail([issues[0], ...issues.slice(1)])
    : Result.succeed(`${speciesName} ${backgroundName} ${classLabel}`);
}

export type CharacterBuildDisplayNameIssue =
  | {
      readonly tag: "characterBuildDisplayUnitMissing";
      readonly role: "species" | "background" | "class";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly tag: "characterBuildDisplayUnitKindMismatch";
      readonly role: "species" | "background" | "class";
      readonly unitId: UnitRecord["id"];
      readonly actualKind: UnitRecord["kind"];
    };

export type CharacterBuildDisplayNameIssues = readonly [
  CharacterBuildDisplayNameIssue,
  ...CharacterBuildDisplayNameIssue[],
];

function displayUnitName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly unitId: UnitRecord["id"];
  readonly role: CharacterBuildDisplayNameIssue["role"];
  readonly issues: CharacterBuildDisplayNameIssue[];
}): string {
  const unit = input.unitLibrary.getUnit(input.unitId);
  if (Option.isNone(unit)) {
    input.issues.push({
      tag: "characterBuildDisplayUnitMissing",
      role: input.role,
      unitId: input.unitId,
    });
    return "";
  }
  if (unit.value.kind !== input.role) {
    input.issues.push({
      tag: "characterBuildDisplayUnitKindMismatch",
      role: input.role,
      unitId: input.unitId,
      actualKind: unit.value.kind,
    });
    return "";
  }
  return unit.value.name;
}
