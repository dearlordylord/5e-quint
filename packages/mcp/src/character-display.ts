import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";

export function characterBuildDisplayName(
  unitLibrary: UnitCatalog,
  build: CharacterBuild,
): string {
  const speciesName = unitLibrary.requireUnit(build.species).name;
  const backgroundName = unitLibrary.requireUnit(build.background).name;
  const className = [
    build.progression.startingClass,
    ...build.progression.advancements,
  ]
    .map(
      (className) =>
        unitLibrary
          .listUnits()
          .find((unit) => unit.kind === "class" && unit.className === className)
          ?.name ?? className,
    )
    .join("/");

  return `${speciesName} ${backgroundName} ${className}`;
}
