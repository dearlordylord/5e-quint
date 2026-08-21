import type { CharacterId } from "@dnd/battle-runtime";
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
} from "@dnd/character-sheet-runtime";
import type { Hp } from "@dnd/shared/types";
import { Either, Match } from "effect";

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
): Either.Either<readonly CharacterSessionRow[], string> {
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
    if (Either.isLeft(detail)) {
      return Either.left(characterSessionDetailIssueMessage(detail.left));
    }
    rows.push(availableCharacterListRow(detail.right));
  }
  return Either.right(rows);
}

type CharacterSessionDetailIssue =
  | {
      readonly tag: "unknownCharacterSession";
      readonly characterId: CharacterId;
    }
  | {
      readonly tag: "characterSessionDetailInvalid";
      readonly message: string;
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

type CharacterSessionDetail =
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
): Either.Either<CharacterSessionDetail, CharacterSessionDetailIssue> {
  const session = root.sessionStore.characters.get(characterId);
  if (session === undefined) {
    return Either.left({
      tag: "unknownCharacterSession",
      characterId,
    });
  }
  if (session.tag === "inBattle") {
    return Either.right({
      tag: session.tag,
      characterId: session.sheet.characterId,
      displayName: characterBuildDisplayName(
        root.unitLibrary,
        session.sheet.build,
      ),
      battleId: session.battleId,
      build: session.sheet.build,
    });
  }
  return availableCharacterSessionDetail(root, session);
}

function availableCharacterSessionDetail(
  root: McpPlaySessionRoot,
  sheet: AvailableCharacterSession,
): Either.Either<
  Extract<CharacterSessionDetail, { readonly tag: "available" }>,
  Extract<
    CharacterSessionDetailIssue,
    { readonly tag: "characterSessionDetailInvalid" }
  >
> {
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet,
    unitLibrary: root.unitLibrary,
  });
  if (Either.isLeft(hitPointMaximum)) {
    return Either.left({
      tag: "characterSessionDetailInvalid",
      message: hitPointMaximum.left.message,
    });
  }
  const hitDice = characterSheetHitDice(sheet, root.unitLibrary);
  /* v8 ignore next -- The immediately preceding HP maximum projection proved the same build/catalog Hit Die facts. */
  if (Either.isLeft(hitDice)) {
    return Either.left({
      tag: "characterSessionDetailInvalid",
      message: hitDice.left.message,
    });
  }
  const resources = characterSheetResources(sheet, root.unitLibrary);
  if (Either.isLeft(resources)) {
    return Either.left({
      tag: "characterSessionDetailInvalid",
      message: resources.left.message,
    });
  }
  const spellSlots = characterBattleSpellSlots(sheet);
  const pactSlots = characterSheetPactSlots(sheet);
  return Either.right({
    tag: sheet.tag,
    characterId: sheet.characterId,
    displayName: characterBuildDisplayName(root.unitLibrary, sheet.build),
    sheet,
    sheetProjection: {
      currentHp: characterSessionCurrentHp(sheet),
      companion: characterSheetCompanionProjection(sheet),
      hitPointMaximum: hitPointMaximum.right,
      hitDice: hitDice.right,
      ...(spellSlots === undefined ? {} : { spellSlots }),
      ...(pactSlots === undefined ? {} : { pactSlots }),
      resources: resources.right.map(characterSheetResourceDisplayRow),
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

function characterSessionDetailIssueMessage(
  issue: CharacterSessionDetailIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "unknownCharacterSession" },
      ({ characterId }) => `Unknown character session: ${characterId}`,
    ),
    Match.when(
      { tag: "characterSessionDetailInvalid" },
      ({ message }) => message,
    ),
    Match.exhaustive,
  );
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
