// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import { type CharacterBuild } from "@dnd/character-creation-runtime";
import { readBackgroundCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";

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
}): Result.Result<
  CharacterBattleOriginFeatSelectedReferenceProjection,
  BattleCreatureInitIssue
> {
  const originFeatUnitIds = backgroundOriginFeatUnitIds(input);
  if (Result.isFailure(originFeatUnitIds)) {
    return Result.fail(originFeatUnitIds.failure);
  }

  return Result.succeed({
    originFeatUnitIds: originFeatUnitIds.success,
  });
}

function backgroundOriginFeatUnitIds(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<readonly UnitRecord["id"][], BattleCreatureInitIssue> {
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
  return Result.succeed([backgroundFacts.value.originFeatId]);
}
