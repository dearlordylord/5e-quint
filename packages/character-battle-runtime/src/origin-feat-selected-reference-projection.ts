// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import {
  characterBuildUnitRefs,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { readBackgroundCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

import {
  battleCreatureInitIssue,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";

export type CharacterBattleOriginFeatSelectedReferenceProjection = {
  readonly originFeatUnitIds: readonly UnitRecord["id"][];
};

export function characterBattleOriginFeatSelectedReferenceProjection(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBattleOriginFeatSelectedReferenceProjection,
  BattleCreatureInitIssue
> {
  const originFeatUnitIds = retainedBackgroundOriginFeatUnitIds(input);
  if (Either.isLeft(originFeatUnitIds)) {
    return Either.left(originFeatUnitIds.left);
  }

  return Either.right({
    originFeatUnitIds: originFeatUnitIds.right,
  });
}

function retainedBackgroundOriginFeatUnitIds(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<readonly UnitRecord["id"][], BattleCreatureInitIssue> {
  const backgroundUnit = input.unitLibrary.getUnit(input.build.background);
  if (Option.isNone(backgroundUnit)) {
    return battleCreatureInitIssue(
      "Character battle Origin feat selected-reference projection requires a readable background Origin feat.",
    );
  }
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (backgroundFacts.tag !== "readable") {
    return battleCreatureInitIssue(
      "Character battle Origin feat selected-reference projection requires a readable background Origin feat.",
    );
  }
  const backgroundOriginFeatUnitIds = [backgroundFacts.value.originFeatId];

  const retainedUnitIds = new Set(
    characterBuildUnitRefs(input.build, input.unitLibrary).map(
      (ref) => ref.unitId,
    ),
  );
  const retainedOriginFeatUnitIds = backgroundOriginFeatUnitIds.filter(
    (unitId: UnitRecord["id"]) => retainedUnitIds.has(unitId),
  );
  if (retainedOriginFeatUnitIds.length !== backgroundOriginFeatUnitIds.length) {
    return battleCreatureInitIssue(
      "Character battle Origin feat selected-reference projection requires the background Origin feat to be retained in CharacterBuild unit refs.",
    );
  }

  return Either.right(retainedOriginFeatUnitIds);
}
