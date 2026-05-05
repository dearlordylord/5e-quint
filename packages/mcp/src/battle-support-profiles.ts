import {
  battleUnitRefWithSupportProfiles,
  type BattleUnitRef,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  progressionClassLevels,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<readonly BattleUnitRef[], BattleSupportProfileIssue> {
  const classLevelsByUnitId = battleClassLevelsByUnitId(build, unitLibrary);
  if (Either.isLeft(classLevelsByUnitId)) {
    return Either.left(classLevelsByUnitId.left);
  }
  const refs: BattleUnitRef[] = [];
  for (const unitRef of characterBuildUnitRefs(build)) {
    const profiled = withBattleSupportProfiles(
      unitRef,
      classLevelsByUnitId.right,
      unitLibrary,
    );
    if (Either.isLeft(profiled)) return Either.left(profiled.left);
    refs.push(profiled.right);
  }
  return Either.right(refs);
}

export type BattleSupportProfileIssue = {
  readonly tag: "battleSupportProfileIssue";
  readonly message: string;
};

function battleSupportProfileIssue(
  message: string,
): Either.Either<never, BattleSupportProfileIssue> {
  return Either.left({ tag: "battleSupportProfileIssue", message });
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  classLevelsByUnitId: ReadonlyMap<string, number>,
  unitLibrary: UnitCatalog,
): Either.Either<BattleUnitRef, BattleSupportProfileIssue> {
  const unitOption = unitLibrary.getUnit(unitRef.unitId);
  if (Option.isNone(unitOption)) {
    return battleSupportProfileIssue(
      `Unknown Unit for battle support profile: ${unitRef.unitId}.`,
    );
  }
  const battleUnitRef = battleUnitRefWithSupportProfiles({
    unitRef,
    unit: unitOption.value,
    ...(classLevelsByUnitId.has(unitRef.unitId)
      ? { classLevel: classLevelsByUnitId.get(unitRef.unitId) }
      : {}),
  });
  return Either.isLeft(battleUnitRef)
    ? battleSupportProfileIssue(battleUnitRef.left.message)
    : Either.right(battleUnitRef.right);
}

function battleClassLevelsByUnitId(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<ReadonlyMap<string, number>, BattleSupportProfileIssue> {
  const classLevelsByUnitId = new Map<string, number>();
  for (const entry of progressionClassLevels(build.progression)) {
    const unit = unitLibrary.getUnit(entry.classUnitId);
    if (Option.isNone(unit)) {
      return battleSupportProfileIssue(
        `Unknown Unit for battle support profile: ${entry.classUnitId}.`,
      );
    }
    if (unit.value.kind === "class") {
      classLevelsByUnitId.set(entry.classUnitId, entry.classLevel);
    }
  }

  return Either.right(classLevelsByUnitId);
}
