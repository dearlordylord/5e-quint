import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";

const RetainedCompanionNormalFormSelectionArgsSchema = Schema.Struct({
  tag: Schema.Literal("normalNamedForm"),
  formId: UnitId,
});
const RetainedCompanionChallengeRatingZeroBeastSelectionArgsSchema =
  Schema.Struct({
    tag: Schema.Literal("challengeRatingZeroBeast"),
    statBlockId: StatBlockId,
  });
const RetainedCompanionSpecialFormSelectionArgsSchema = Schema.Struct({
  tag: Schema.Literal("pactOfTheChainSpecialForm"),
  formId: Schema.NonEmptyTrimmedString,
});
const RetainedCompanionFormSelectionArgsSchema = Schema.Union(
  RetainedCompanionNormalFormSelectionArgsSchema,
  RetainedCompanionChallengeRatingZeroBeastSelectionArgsSchema,
  RetainedCompanionSpecialFormSelectionArgsSchema,
);
const RetainedCompanionSourceArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("spellSlotSpellCast"),
    spellId: UnitId,
    spellLevel: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(1),
      Schema.lessThanOrEqualTo(9),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("ritualSpell"),
    spellId: UnitId,
  }),
  Schema.Struct({
    tag: Schema.Literal("invocationSpellAccess"),
    spellId: UnitId,
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureSpellCast"),
    featureUnitId: UnitId,
    spend: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("spellSlot"),
        spellLevel: Schema.Number.pipe(
          Schema.int(),
          Schema.greaterThanOrEqualTo(1),
          Schema.lessThanOrEqualTo(9),
        ),
      }),
      Schema.Struct({
        tag: Schema.Literal("useCountResource"),
        resourceUnitId: UnitId,
      }),
    ),
  }),
);
const RetainOneAtATimeCompanionOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("retainOneAtATimeCompanion"),
  companionId: Schema.NonEmptyTrimmedString,
  source: RetainedCompanionSourceArgsSchema,
  selectedForm: RetainedCompanionFormSelectionArgsSchema,
  creatureTypeOverrideChoiceId: Schema.optionalWith(
    Schema.NonEmptyTrimmedString,
    {
      exact: true,
    },
  ),
});
const CharacterSessionOperationArgsSchema = Schema.Union(
  RetainOneAtATimeCompanionOperationArgsSchema,
);

export const ApplyCharacterSessionOperationArgsSchema = Schema.Struct({
  characterId: Schema.String,
  operation: CharacterSessionOperationArgsSchema,
});

type ApplyCharacterSessionOperationArgs = Schema.Schema.Type<
  typeof ApplyCharacterSessionOperationArgsSchema
>;
type CharacterSessionOperationArgs =
  ApplyCharacterSessionOperationArgs["operation"];

export type ApplyCharacterSessionOperationToolInput = {
  readonly characterId: string;
  readonly operation: CharacterSessionOperationArgs;
};
