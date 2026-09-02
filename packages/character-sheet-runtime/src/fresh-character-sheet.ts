import { Hp, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Brand, Result, Schema } from "effect";

import {
  type CharacterSheet,
  type CharacterSheetConstructionIssue,
} from "./sheet-types.ts";
import {
  CharacterSheetConstructionIssueSchema,
  FreshCharacterSheetProjectionSchema,
  FreshNonSpellcastingCharacterSheetProjectionSchema,
  FreshSpellcastingCharacterSheetProjectionSchema,
} from "./fresh-character-sheet-schema.ts";
import {
  isNonSpellcastingBuild,
  isSpellcastingBuild,
} from "./character-build-shape.ts";

// Hp validates the branded value; the assertion retains the proven literal zero.
export const FRESH_CHARACTER_SHEET_ZERO_HP = Hp(0) as Hp & 0;

export {
  CharacterSheetConstructionIssueSchema,
  FreshCharacterSheetProjectionSchema,
};
export const CharacterSheetConstructionIssuesSchema = Schema.NonEmptyArray(
  CharacterSheetConstructionIssueSchema,
);

export type FreshCharacterSheetProjection = Schema.Schema.Type<
  typeof FreshCharacterSheetProjectionSchema
>;
type SpellcastingCharacterSheet = Extract<
  CharacterSheet,
  { readonly spellSlotExpenditures: readonly unknown[] }
>;
type NonSpellcastingCharacterSheet = Exclude<
  CharacterSheet,
  SpellcastingCharacterSheet
>;
type FreshSpellcastingCharacterSheetProjection = Schema.Schema.Type<
  typeof FreshSpellcastingCharacterSheetProjectionSchema
>;
type FreshNonSpellcastingCharacterSheetProjection = Schema.Schema.Type<
  typeof FreshNonSpellcastingCharacterSheetProjectionSchema
>;
export type FreshSpellcastingCharacterSheet = Omit<
  SpellcastingCharacterSheet,
  "pactSlotExpenditure"
> & {
  readonly pactSlotExpenditure: undefined;
} & FreshSpellcastingCharacterSheetProjection &
  Brand.Brand<"FreshCharacterSheet">;
export type FreshNonSpellcastingCharacterSheet = NonSpellcastingCharacterSheet &
  FreshNonSpellcastingCharacterSheetProjection &
  Brand.Brand<"FreshCharacterSheet">;
export type FreshCharacterSheet =
  | FreshSpellcastingCharacterSheet
  | FreshNonSpellcastingCharacterSheet;

export const freshCharacterSheet = Brand.nominal<FreshCharacterSheet>();

export function freshCharacterSheetFromParsedState(
  sheet: CharacterSheet,
): Result.Result<FreshCharacterSheet, string> {
  if (isNonSpellcastingCharacterSheet(sheet)) {
    return freshNonSpellcastingCharacterSheetFromParsedState(sheet);
  }
  if (isSpellcastingCharacterSheet(sheet)) {
    return freshSpellcastingCharacterSheetFromParsedState(sheet);
  }
  return Result.fail("Fresh Character Sheet requires a supported build.");
}

function freshNonSpellcastingCharacterSheetFromParsedState(
  sheet: NonSpellcastingCharacterSheet,
): Result.Result<FreshCharacterSheet, string> {
  const {
    tag: _tag,
    characterId: _characterId,
    build: _build,
    ...facts
  } = sheet;
  const decoded = Schema.decodeUnknownResult(
    FreshNonSpellcastingCharacterSheetProjectionSchema,
    { onExcessProperty: "error" },
  )(facts);
  if (Result.isFailure(decoded)) {
    return Result.fail(
      "Fresh Character Sheet requires unspent initial play state.",
    );
  }
  const { druidWildShapeKnownForms: _decodedKnownForms, ...decodedFacts } =
    decoded.success;
  return Result.succeed(
    freshCharacterSheet({
      tag: sheet.tag,
      characterId: sheet.characterId,
      build: sheet.build,
      ...decodedFacts,
      hitPointMaximumReduction: FRESH_CHARACTER_SHEET_ZERO_HP,
      hitPoints: {
        ...decodedFacts.hitPoints,
        currentHp: Hp(decodedFacts.hitPoints.currentHp),
        tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
      },
      ...(sheet.druidWildShapeKnownForms === undefined
        ? {}
        : { druidWildShapeKnownForms: sheet.druidWildShapeKnownForms }),
    }),
  );
}

function freshSpellcastingCharacterSheetFromParsedState(
  sheet: SpellcastingCharacterSheet,
): Result.Result<FreshCharacterSheet, string> {
  if (sheet.pactSlotExpenditure !== undefined) {
    return Result.fail(
      "Fresh Character Sheet requires unspent initial play state.",
    );
  }
  const {
    tag: _tag,
    characterId: _characterId,
    build: _build,
    bookOfShadowsPresence: _bookOfShadowsPresence,
    pactSlotExpenditure: _pactSlotExpenditure,
    ...spellcastingFacts
  } = sheet;
  const decoded = Schema.decodeUnknownResult(
    FreshSpellcastingCharacterSheetProjectionSchema,
    { onExcessProperty: "error" },
  )({
    ...spellcastingFacts,
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
  });
  if (Result.isFailure(decoded)) {
    return Result.fail(
      "Fresh Character Sheet requires unspent initial play state.",
    );
  }
  const { druidWildShapeKnownForms: _decodedKnownForms, ...decodedFacts } =
    decoded.success;
  return Result.succeed(
    freshCharacterSheet({
      tag: sheet.tag,
      characterId: sheet.characterId,
      build: sheet.build,
      ...decodedFacts,
      hitPointMaximumReduction: FRESH_CHARACTER_SHEET_ZERO_HP,
      hitPoints: {
        ...decodedFacts.hitPoints,
        currentHp: Hp(decodedFacts.hitPoints.currentHp),
        tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
      },
      ...(sheet.druidWildShapeKnownForms === undefined
        ? {}
        : { druidWildShapeKnownForms: sheet.druidWildShapeKnownForms }),
      bookOfShadowsPresence: sheet.bookOfShadowsPresence,
      pactSlotExpenditure: undefined,
    }),
  );
}

function isSpellcastingCharacterSheet(
  sheet: CharacterSheet,
): sheet is SpellcastingCharacterSheet {
  return isSpellcastingBuild(sheet.build);
}

function isNonSpellcastingCharacterSheet(
  sheet: CharacterSheet,
): sheet is NonSpellcastingCharacterSheet {
  return isNonSpellcastingBuild(sheet.build);
}

export function isFreshSpellcastingCharacterSheet(
  sheet: FreshCharacterSheet,
): sheet is FreshSpellcastingCharacterSheet {
  return "spellSlotExpenditures" in sheet;
}

export function characterSheetConstructionIssuesSummary(
  issues: ReadonlyNonEmptyArray<CharacterSheetConstructionIssue>,
): string {
  return issues
    .map((issue) =>
      "statBlockId" in issue
        ? `${issue.code}: ${issue.statBlockId}`
        : issue.code,
    )
    .join("; ");
}

export function freshCharacterSheetProjection(
  sheet: FreshCharacterSheet,
): FreshCharacterSheetProjection {
  const {
    tag: _tag,
    characterId: _characterId,
    build: _build,
    ...facts
  } = sheet;
  const projectionFacts = isSpellcastingBuild(sheet.build)
    ? (() => {
        const {
          bookOfShadowsPresence: _bookOfShadowsPresence,
          pactSlotExpenditure: _pactSlotExpenditure,
          ...factsWithoutUndefinedSpellcastingAbsence
        } = facts;
        return {
          ...factsWithoutUndefinedSpellcastingAbsence,
          ...(sheet.bookOfShadowsPresence === undefined
            ? {}
            : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
        };
      })()
    : facts;
  return Schema.decodeUnknownSync(FreshCharacterSheetProjectionSchema, {
    onExcessProperty: "error",
  })(projectionFacts);
}
