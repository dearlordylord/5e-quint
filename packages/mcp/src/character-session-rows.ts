import type { CharacterId } from "@dnd/battle-runtime";
import type { CharacterBuildDisplayNameIssues } from "@dnd/character-creation-runtime";
import {
  characterSheetCompanion,
  characterSheetHitDice,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetResources,
  type CharacterSheetHitDieState,
  type CharacterSheetPactSlotState,
  type CharacterSheetResourceState,
  type CharacterSheetSpellSlotState,
  type CharacterSheetIssue,
} from "@dnd/character-sheet-runtime";
import type { Hp } from "@dnd/shared/types";
import { Result, Match } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  type CharacterSessionCompanionManifestationTag,
  type CharacterSessionRow,
} from "./character-tool-output.ts";
import {
  characterBattleSpellSlots,
  characterSessionCurrentHp,
  type AvailableCharacterSession,
  type CharacterSession,
} from "./session-store.ts";

export function characterListRows(
  root: McpPlaySessionRoot,
): Result.Result<
  readonly CharacterSessionRow[],
  CharacterSessionProjectionIssue
> {
  const rows: CharacterSessionRow[] = [];
  for (const [characterId, session] of root.sessionStore.characters.entries()) {
    if (session.tag === "inBattle") {
      rows.push({
        characterId,
        status: session.tag,
        displayName: null,
        build: session.sheet.build,
        battleId: session.battleId,
        companion: characterSheetCompanion(session.sheet),
      });
      continue;
    }
    const detail = availableCharacterSessionDetail(root, session);
    if (Result.isFailure(detail)) {
      return Result.fail(detail.failure);
    }
    rows.push(availableCharacterListRow(detail.success));
  }
  return Result.succeed(rows);
}

export type CharacterSessionProjectionIssue =
  | {
      readonly tag: "hitPointMaximumUnavailable";
      readonly issue: CharacterSheetIssue;
    }
  | {
      readonly tag: "hitDiceUnavailable";
      readonly issue: CharacterSheetIssue;
    }
  | {
      readonly tag: "resourcesUnavailable";
      readonly issue: CharacterSheetIssue;
    }
  | {
      readonly tag: "characterDisplayUnavailable";
      readonly issues: CharacterBuildDisplayNameIssues;
    };

export type CharacterSessionDetailIssue =
  | CharacterSessionProjectionIssue
  | {
      readonly tag: "unknownCharacterSession";
      readonly characterId: CharacterId;
    };

type CharacterSessionSheetProjection = {
  readonly currentHp: Hp;
  readonly companion:
    | { readonly tag: "none" }
    | {
        readonly tag: "retainedOneAtATime";
        readonly companion: {
          readonly companionId: string;
          readonly manifestation: {
            readonly tag: CharacterSessionCompanionManifestationTag;
            readonly resolvedStatBlockId: string;
          };
        };
      };
  readonly hitPointMaximum: Hp;
  readonly hitDice: readonly CharacterSheetHitDieState[];
  readonly spellSlots?: readonly CharacterSheetSpellSlotState[];
  readonly pactSlots?: CharacterSheetPactSlotState;
  readonly resources: readonly ReturnType<
    typeof characterSheetResourceDisplayRow
  >[];
};

export type CharacterSessionDetail =
  | {
      readonly tag: "available";
      readonly characterId: CharacterId;
      readonly displayName: string;
      readonly sheet: AvailableCharacterSession;
      readonly sheetProjection: CharacterSessionSheetProjection;
    }
  | {
      readonly tag: "inBattle";
      readonly characterId: CharacterId;
      readonly displayName: string;
      readonly battleId: Extract<
        CharacterSession,
        { readonly tag: "inBattle" }
      >["battleId"];
      readonly build: AvailableCharacterSession["build"];
    };

export function characterSessionDetail(
  root: McpPlaySessionRoot,
  characterId: CharacterId,
): Result.Result<CharacterSessionDetail, CharacterSessionDetailIssue> {
  const session = root.sessionStore.characters.get(characterId);
  if (session === undefined) {
    return Result.fail({
      tag: "unknownCharacterSession",
      characterId,
    });
  }
  if (session.tag === "inBattle") {
    const displayName = characterBuildDisplayName(
      root.unitLibrary,
      session.sheet.build,
    );
    if (Result.isFailure(displayName)) {
      return Result.fail({
        tag: "characterDisplayUnavailable",
        issues: displayName.failure,
      });
    }
    return Result.succeed({
      tag: session.tag,
      characterId: session.sheet.characterId,
      displayName: displayName.success,
      battleId: session.battleId,
      build: session.sheet.build,
    });
  }
  return availableCharacterSessionDetail(root, session);
}

export function characterSessionDetailForAvailableSheet(
  root: McpPlaySessionRoot,
  sheet: AvailableCharacterSession,
): Result.Result<
  Extract<CharacterSessionDetail, { readonly tag: "available" }>,
  CharacterSessionProjectionIssue
> {
  return availableCharacterSessionDetail(root, sheet);
}

export function characterSessionDetailOutput(detail: CharacterSessionDetail) {
  return Match.value(detail).pipe(
    Match.when({ tag: "available" }, (available) => ({
      tag: available.tag,
      characterId: available.characterId,
      displayName: available.displayName,
      build: available.sheet.build,
      sheetProjection: available.sheetProjection,
    })),
    Match.when({ tag: "inBattle" }, (inBattle) => inBattle),
    Match.exhaustive,
  );
}

function availableCharacterSessionDetail(
  root: McpPlaySessionRoot,
  sheet: AvailableCharacterSession,
): Result.Result<
  Extract<CharacterSessionDetail, { readonly tag: "available" }>,
  CharacterSessionProjectionIssue
> {
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet,
    unitLibrary: root.unitLibrary,
  });
  if (Result.isFailure(hitPointMaximum)) {
    return Result.fail({
      tag: "hitPointMaximumUnavailable",
      issue: hitPointMaximum.failure,
    });
  }
  const hitDice = characterSheetHitDice(sheet, root.unitLibrary);
  /* v8 ignore next -- @preserve -- The immediately preceding HP maximum projection proved the same build/catalog Hit Die facts. */
  if (Result.isFailure(hitDice)) {
    return Result.fail({
      tag: "hitDiceUnavailable",
      issue: hitDice.failure,
    });
  }
  const resources = characterSheetResources(sheet, root.unitLibrary);
  if (Result.isFailure(resources)) {
    return Result.fail({
      tag: "resourcesUnavailable",
      issue: resources.failure,
    });
  }
  const spellSlots = characterBattleSpellSlots(sheet);
  const pactSlots = characterSheetPactSlots(sheet);
  const displayName = characterBuildDisplayName(root.unitLibrary, sheet.build);
  if (Result.isFailure(displayName)) {
    return Result.fail({
      tag: "characterDisplayUnavailable",
      issues: displayName.failure,
    });
  }
  return Result.succeed({
    tag: sheet.tag,
    characterId: sheet.characterId,
    displayName: displayName.success,
    sheet,
    sheetProjection: {
      currentHp: characterSessionCurrentHp(sheet),
      companion: characterSheetCompanionProjection(sheet),
      hitPointMaximum: hitPointMaximum.success,
      hitDice: hitDice.success,
      ...(spellSlots === undefined ? {} : { spellSlots }),
      ...(pactSlots === undefined ? {} : { pactSlots }),
      resources: resources.success.map(characterSheetResourceDisplayRow),
    },
  });
}

function characterSheetCompanionProjection(
  sheet: AvailableCharacterSession,
): CharacterSessionSheetProjection["companion"] {
  if (sheet.companion.tag === "none") return { tag: "none" };
  return {
    tag: sheet.companion.tag,
    companion: {
      companionId: sheet.companion.companion.companionId,
      manifestation: {
        tag: sheet.companion.companion.manifestation.tag,
        resolvedStatBlockId:
          sheet.companion.companion.manifestation.resolvedStatBlockId,
      },
    },
  };
}

function availableCharacterListRow(
  detail: Extract<CharacterSessionDetail, { readonly tag: "available" }>,
): CharacterSessionRow {
  return {
    characterId: detail.characterId,
    status: detail.tag,
    displayName: detail.displayName,
    build: detail.sheet.build,
    hitPoints: {
      current: characterSessionCurrentHp(detail.sheet),
      maximum: detail.sheetProjection.hitPointMaximum,
      state: detail.sheet.hitPoints,
    },
    hitDice: detail.sheetProjection.hitDice,
    ...(detail.sheetProjection.spellSlots === undefined
      ? {}
      : { spellSlots: detail.sheetProjection.spellSlots }),
    ...(detail.sheetProjection.pactSlots === undefined
      ? {}
      : { pactSlots: detail.sheetProjection.pactSlots }),
    resources: detail.sheetProjection.resources,
    companion: characterSheetCompanion(detail.sheet),
  };
}

function characterSheetResourceDisplayRow(
  resource: CharacterSheetResourceState,
) {
  return Match.value(resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, (freeCast) => ({
      tag: freeCast.tag,
      sourceUnitId: freeCast.sourceUnitId,
      spellId: freeCast.spellId,
      count: freeCast.count,
      expended: freeCast.expended,
    })),
    Match.when(
      { tag: "layOnHandsHealingPool" },
      ({ tag, unitId, count, expended }) => ({
        tag,
        unitId,
        count,
        expended,
      }),
    ),
    Match.when(
      { tag: "useCountResource" },
      ({ tag, unitId, count, expended }) => ({
        tag,
        unitId,
        count,
        expended,
      }),
    ),
    Match.when(
      { tag: "pointPoolResource" },
      ({ tag, unitId, count, expended }) => ({
        tag,
        unitId,
        count,
        expended,
      }),
    ),
    Match.exhaustive,
  );
}
