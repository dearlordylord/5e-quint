import { describe, expect, it } from "vitest";

import {
  characterSheetAntilifeShellBarrierId,
  characterSheetArcaneHandObjectId,
  characterSheetAwakenTargetId,
  characterSheetCreationObjectId,
  characterSheetDominatePersonTargetId,
  characterSheetDreamMessengerId,
  characterSheetDreamTargetId,
  characterSheetGeasTargetId,
  characterSheetHallowAreaId,
  characterSheetModifyMemoryTargetId,
  characterSheetPasswallSurfaceId,
  characterSheetScryingLocationId,
  characterSheetScryingTargetId,
  characterSheetSeemingTargetId,
  characterSheetSpellLifecycleCreatureId,
  characterSheetSpellLifecycleObjectId,
  characterSheetTelekinesisTargetId,
  characterSheetTelepathicBondTargetId,
  characterSheetTeleportationCircleSigilSequenceId,
  characterSheetTreeStrideTreeId,
  characterSheetTreeStrideTreeKind,
  characterSheetWallOfForceBarrierId,
  characterSheetWallOfStoneWallId,
} from "./sheet-types.ts";

describe("Character Sheet invocation identity parsers", () => {
  it("rejects an empty identity at every invocation boundary", () => {
    const parsers = [
      characterSheetAntilifeShellBarrierId,
      characterSheetArcaneHandObjectId,
      characterSheetAwakenTargetId,
      characterSheetCreationObjectId,
      characterSheetDominatePersonTargetId,
      characterSheetDreamMessengerId,
      characterSheetDreamTargetId,
      characterSheetGeasTargetId,
      characterSheetHallowAreaId,
      characterSheetModifyMemoryTargetId,
      characterSheetPasswallSurfaceId,
      characterSheetScryingLocationId,
      characterSheetScryingTargetId,
      characterSheetSeemingTargetId,
      characterSheetSpellLifecycleCreatureId,
      characterSheetSpellLifecycleObjectId,
      characterSheetTelekinesisTargetId,
      characterSheetTelepathicBondTargetId,
      characterSheetTeleportationCircleSigilSequenceId,
      characterSheetTreeStrideTreeId,
      characterSheetTreeStrideTreeKind,
      characterSheetWallOfForceBarrierId,
      characterSheetWallOfStoneWallId,
    ] as const;

    for (const parseIdentity of parsers) {
      expect(parseIdentity("")).toMatchObject({ _tag: "Left" });
    }
  });
});
