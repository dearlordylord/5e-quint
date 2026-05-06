import {
  battleUnitRefWithSupportProfiles,
  type BattleUnitRef,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

export function characterUnitRefsWithBattleSupportProfiles(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly BattleUnitRef[],
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  return traverseValidation(characterBuildUnitRefs(build), (unitRef) =>
    withBattleSupportProfiles(unitRef, unitLibrary),
  );
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
