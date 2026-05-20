import { Either, Option } from "effect";
import type { ClassFeatureRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";
import type { CharacterBuild } from "./types.ts";
import {
  classLevelForUnit,
  progressionClassUnitIds,
} from "./character-progression-types.ts";

export type CharacterBuildClassFeatureOwnerLevelIssue = {
  readonly tag: "classFeatureOwnerLevelIssue";
  readonly message: string;
};

export function characterBuildClassFeatureOwnerLevel(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
  readonly feature: Pick<ClassFeatureRecord, "className" | "name">;
}): Either.Either<number, CharacterBuildClassFeatureOwnerLevelIssue> {
  for (const classUnitId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = input.unitLibrary.getUnit(classUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.feature.className
    ) {
      return Either.right(
        classLevelForUnit(input.build.progression, classUnitId),
      );
    }
  }
  return Either.left({
    tag: "classFeatureOwnerLevelIssue",
    message: `${input.feature.name} projection requires ${classNameLabel(input.feature.className)} class progression.`,
  });
}

function classNameLabel(className: ClassFeatureRecord["className"]): string {
  return `${className.slice(0, 1).toUpperCase()}${className.slice(1)}`;
}
