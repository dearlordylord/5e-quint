import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  CharacterSheetIssueSchema,
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

describe("Character Sheet issue boundary", () => {
  const decodeIssue = Schema.decodeUnknownResult(CharacterSheetIssueSchema, {
    onExcessProperty: "error",
  });

  it("accepts generic issues and rejects unowned issue codes", () => {
    expect(
      Result.isSuccess(
        decodeIssue({
          tag: "characterSheetIssue",
          message: "Synthetic Character Sheet failure.",
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        decodeIssue({
          tag: "characterSheetIssue",
          code: "unknownCharacterSheetIssue",
          message: "Unknown Character Sheet issue.",
        }),
      ),
    ).toBe(true);
  });
});

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
      expect(parseIdentity("")).toMatchObject({ _tag: "Failure" });
    }
  });
});
