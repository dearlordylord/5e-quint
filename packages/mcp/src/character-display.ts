import type { CharacterBuild } from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option } from "effect";

export function characterBuildDisplayName(
  unitLibrary: UnitCatalog,
  build: CharacterBuild,
): string {
  const species = unitLibrary.getUnit(build.species);
  const background = unitLibrary.getUnit(build.background);
  const speciesName = Option.isSome(species)
    ? species.value.name
    : build.species;
  const backgroundName = Option.isSome(background)
    ? background.value.name
    : build.background;
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
