import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";

export function characterBuildDisplayName(
  unitLibrary: UnitCatalog,
  build: CharacterBuild,
): string {
  const speciesName = unitLibrary.requireUnit(build.species).name;
  const backgroundName = unitLibrary.requireUnit(build.background).name;
  const className = build.advancement.entries
    .map((entry) => unitLibrary.requireUnit(entry.classUnitId).name)
    .join("/");

  return `${speciesName} ${backgroundName} ${className}`;
}
