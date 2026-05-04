import type { CharacterBuild } from "@dnd/character-creation-runtime";
import { progressionClassLevels } from "@dnd/character-creation-runtime";
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
  const classLevels = progressionClassLevels(build.progression);
  const classLabel = classLevels
    .map((entry) => {
      const classUnit = unitLibrary.getUnit(entry.classUnitId);
      const className = Option.isSome(classUnit)
        ? classUnit.value.name
        : entry.classUnitId;
      return classLevels.length === 1 && entry.classLevel === 1
        ? className
        : `${className} ${entry.classLevel}`;
    })
    .join(" / ");

  return `${speciesName} ${backgroundName} ${classLabel}`;
}
