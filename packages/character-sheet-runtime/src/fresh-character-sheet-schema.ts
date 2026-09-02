import {
  DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES,
  DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES,
} from "@dnd/character-creation-runtime/consumer-protocol";
import { DAMAGE_TYPES } from "@dnd/shared/types";
import { hasDuplicateStructuralValues } from "@dnd/shared/structural-value";
import { DRUID_CIRCLE_LAND_CHOICES } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import { CHARACTER_SHEET_CONSTRUCTION_ISSUE_NO_DETAIL_CODES } from "./sheet-types.ts";

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

export const FreshNonSpellcastingCharacterSheetProjectionSchema = Schema.Struct(
  CommonFreshCharacterSheetProjectionFields,
);
export const FreshSpellcastingCharacterSheetProjectionSchema = Schema.Struct({
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
