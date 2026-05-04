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
  const classUnit = unitLibrary.getUnit(build.progression.classUnitId);
  const className = Option.isSome(classUnit)
    ? classUnit.value.name
    : build.progression.classUnitId;
  const classLabel =
    build.progression.classLevel === 1
      ? className
      : `${className} ${build.progression.classLevel}`;

  return `${speciesName} ${backgroundName} ${classLabel}`;
}
