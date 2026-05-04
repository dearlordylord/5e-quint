import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  classLevelForUnit,
  startingClassUnitId,
} from "@dnd/character-creation-runtime";
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
  const classUnitId = startingClassUnitId(build.progression);
  const classUnit = unitLibrary.getUnit(classUnitId);
  const className = Option.isSome(classUnit)
    ? classUnit.value.name
    : classUnitId;
  const classLevel = classLevelForUnit(build.progression, classUnitId);
  const classLabel =
    classLevel === 1 ? className : `${className} ${classLevel}`;

  return `${speciesName} ${backgroundName} ${classLabel}`;
}
