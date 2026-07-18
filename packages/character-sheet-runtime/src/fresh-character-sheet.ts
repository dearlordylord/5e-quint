import { DAMAGE_TYPES } from "@dnd/shared/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES,
  DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES,
} from "@dnd/character-creation-runtime";
import { DRUID_CIRCLE_LAND_CHOICES } from "@dnd/surface/surface/types";
import { Brand, Schema } from "effect";

import {
  CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES,
  type CharacterSheet,
  type CharacterSheetConstructionIssue,
} from "./sheet-types.ts";

const PositiveHpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);
const EmptySchema = Schema.Tuple();
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
  druidWildShapeKnownForms: Schema.optionalWith(
    Schema.Struct({
      statBlockIds: Schema.Array(Schema.NonEmptyTrimmedString).pipe(
        Schema.filter((values) => values.length > 0, {
          jsonSchema: { minItems: 1 },
        }),
      ),
    }),
    { exact: true },
  ),
  druidCircleLand: Schema.optionalWith(
    Schema.Struct({ land: Schema.Literal(...DRUID_CIRCLE_LAND_CHOICES) }),
    { exact: true },
  ),
  fiendishResilience: Schema.optionalWith(
    Schema.Struct({ damageType: Schema.Literal(...DAMAGE_TYPES) }),
    { exact: true },
  ),
};

const FreshNonSpellcastingCharacterSheetProjectionSchema = Schema.Struct(
  CommonFreshCharacterSheetProjectionFields,
);
const FreshSpellcastingCharacterSheetProjectionSchema = Schema.Struct({
  ...CommonFreshCharacterSheetProjectionFields,
  bookOfShadowsPresence: Schema.UndefinedOr(
    Schema.Union(
      Schema.Struct({ tag: Schema.Literal("onPerson") }),
      Schema.Struct({ tag: Schema.Literal("notOnPerson") }),
    ),
  ),
  spellSlotExpenditures: EmptySchema,
  createdSpellSlots: EmptySchema,
  pactSlotExpenditure: Schema.Undefined,
});

export const FreshCharacterSheetProjectionSchema = Schema.Union(
  FreshNonSpellcastingCharacterSheetProjectionSchema,
  FreshSpellcastingCharacterSheetProjectionSchema,
);

const WildShapeKnownFormIssueSchema = Schema.Union(
  Schema.Struct({
    code: Schema.Literal(...DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES),
  }),
  Schema.Struct({
    code: Schema.Literal(...DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES),
    statBlockId: Schema.NonEmptyTrimmedString,
  }),
);
export const CharacterSheetConstructionIssueSchema = Schema.Union(
  Schema.Struct({
    code: Schema.Literal(...CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES),
  }),
  WildShapeKnownFormIssueSchema,
);
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
export type FreshSpellcastingCharacterSheet = SpellcastingCharacterSheet &
  FreshSpellcastingCharacterSheetProjection &
  Brand.Brand<"FreshCharacterSheet">;
export type FreshNonSpellcastingCharacterSheet = NonSpellcastingCharacterSheet &
  FreshNonSpellcastingCharacterSheetProjection &
  Brand.Brand<"FreshCharacterSheet">;
export type FreshCharacterSheet =
  | FreshSpellcastingCharacterSheet
  | FreshNonSpellcastingCharacterSheet;

export const freshCharacterSheet = Brand.nominal<FreshCharacterSheet>();

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
  return Schema.decodeUnknownSync(FreshCharacterSheetProjectionSchema, {
    onExcessProperty: "error",
  })(facts);
}
