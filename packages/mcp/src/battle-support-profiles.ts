import {
  battleUnitRefWithSupportProfiles,
  type BattleUnitRef,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<readonly BattleUnitRef[], BattleSupportProfileIssue> {
  const refs: BattleUnitRef[] = [];
  for (const unitRef of characterBuildUnitRefs(build)) {
    const profiled = withBattleSupportProfiles(unitRef, unitLibrary);
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
  });
  return Either.isLeft(battleUnitRef)
    ? battleSupportProfileIssue(battleUnitRef.left.message)
    : Either.right(battleUnitRef.right);
}
