import { DAMAGE_TYPES } from "@dnd/shared/types";
import { Hp, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { hasDuplicateStructuralValues } from "@dnd/shared/structural-value";
import {
  DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES,
  DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES,
} from "@dnd/character-creation-runtime";
import { DRUID_CIRCLE_LAND_CHOICES } from "@dnd/surface/surface/types";
import { Brand, Result, Schema } from "effect";

import {
  CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES,
  type CharacterSheet,
  type CharacterSheetConstructionIssue,
} from "./sheet-types.ts";
import {
  isNonSpellcastingBuild,
  isSpellcastingBuild,
} from "./stored-sheet-parser.ts";

// Hp validates the branded value; the assertion retains the proven literal zero.
export const FRESH_CHARACTER_SHEET_ZERO_HP = Hp(0) as Hp & 0;

const PositiveHpSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0)),
);
const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);
const EmptySchema = Schema.Tuple([]);
const CommonFreshCharacterSheetProjectionFields = {
  hitPointMaximumReduction: Schema.Literal(0),
  exhaustionLevel: Schema.Literal(0),
  hitPoints: Schema.Struct({
    tag: Schema.Literal("positive"),
    currentHp: PositiveHpSchema,
    tempHp: Schema.Literal(0),
  }),
  conditions: EmptySchema,
  spentHitDice: EmptySchema,
  restFeatureUses: EmptySchema,
  resourceExpenditures: EmptySchema,
  heroicInspiration: Schema.Struct({ tag: Schema.Literal("none") }),
  companion: Schema.Struct({ tag: Schema.Literal("none") }),
  druidWildShapeKnownForms: Schema.optionalKey(
    Schema.Struct({
      statBlockIds: Schema.Array(NonEmptyTrimmedStringSchema).pipe(
        Schema.check(
          Schema.makeFilter(
            (values) =>
              values.length > 0 && !hasDuplicateStructuralValues(values),
            {
              message:
                "druidWildShapeKnownForms.statBlockIds must be nonempty and must not contain duplicate members",
              toJsonSchema: () => ({ minItems: 1, uniqueItems: true }),
            },
          ),
        ),
      ),
    }),
  ),
  druidCircleLand: Schema.optionalKey(
    Schema.Struct({ land: Schema.Literals(DRUID_CIRCLE_LAND_CHOICES) }),
  ),
  fiendishResilience: Schema.optionalKey(
    Schema.Struct({ damageType: Schema.Literals(DAMAGE_TYPES) }),
  ),
};

const FreshNonSpellcastingCharacterSheetProjectionSchema = Schema.Struct(
  CommonFreshCharacterSheetProjectionFields,
);
const FreshSpellcastingCharacterSheetProjectionSchema = Schema.Struct({
  ...CommonFreshCharacterSheetProjectionFields,
  bookOfShadowsPresence: Schema.optionalKey(
    Schema.Union([
      Schema.Struct({ tag: Schema.Literal("onPerson") }),
      Schema.Struct({ tag: Schema.Literal("notOnPerson") }),
    ]),
  ),
  spellSlotExpenditures: EmptySchema,
  createdSpellSlots: EmptySchema,
});

export const FreshCharacterSheetProjectionSchema = Schema.Union([
  FreshNonSpellcastingCharacterSheetProjectionSchema,
  FreshSpellcastingCharacterSheetProjectionSchema,
]);

const WildShapeKnownFormIssueSchema = Schema.Union([
  Schema.Struct({
    code: Schema.Literals(DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES),
  }),
  Schema.Struct({
    code: Schema.Literals(DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES),
    statBlockId: NonEmptyTrimmedStringSchema,
  }),
]);
export const CharacterSheetConstructionIssueSchema = Schema.Union([
  Schema.Struct({
    code: Schema.Literals(CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES),
  }),
  WildShapeKnownFormIssueSchema,
]);
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
