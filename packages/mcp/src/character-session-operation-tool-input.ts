import {
  CharacterSheetRetainedCompanionId,
  FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES,
} from "@dnd/character-sheet-runtime";
import { CharacterIdSchema, type CharacterId } from "@dnd/battle-runtime";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const RestBenefitRecoveryFields = {
  spendHitDice: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        classUnitId: UnitId,
        roll: PositiveIntegerSchema,
      }),
    ),
    { exact: true },
  ),
  arcaneRecovery: Schema.optionalWith(
    Schema.Struct({
      refundSpellSlots: Schema.Array(
        Schema.Struct({
          spellLevel: PositiveIntegerSchema.pipe(Schema.lessThanOrEqualTo(9)),
          count: NonNegativeIntegerSchema,
        }),
      ),
    }),
    { exact: true },
  ),
  sorcerousRestoration: Schema.optionalWith(
    Schema.Struct({
      recoverSorceryPoints: NonNegativeIntegerSchema,
    }),
    { exact: true },
  ),
} as const;

const LayOnHandsOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("applyLayOnHands"),
  targetCharacterId: CharacterIdSchema,
  restoreHp: NonNegativeIntegerSchema,
  removePoisoned: Schema.Boolean,
});

const SpellRestBenefitRecipientArgsSchema = Schema.Struct({
  characterId: CharacterIdSchema,
  eligibility: Schema.Struct({
    remainedWithinRangeForEntireCasting: Schema.Literal(true),
  }),
  healingRolls: Schema.Array(PositiveIntegerSchema),
  ...RestBenefitRecoveryFields,
});

const SpellRestBenefitOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("applySpellRestBenefit"),
  spellId: UnitId,
  castLevel: PositiveIntegerSchema.pipe(Schema.lessThanOrEqualTo(9)),
  spellSlotSource: Schema.optionalWith(
    Schema.Literal(...FONT_OF_MAGIC_SPELL_SLOT_SOURCE_VALUES),
    { exact: true },
  ),
  recipients: Schema.NonEmptyArray(SpellRestBenefitRecipientArgsSchema),
});

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
  companionId: CharacterSheetRetainedCompanionId,
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
  LayOnHandsOperationArgsSchema,
  SpellRestBenefitOperationArgsSchema,
);

export const ApplyCharacterSessionOperationArgsSchema = Schema.Struct({
  characterId: CharacterIdSchema,
  operation: CharacterSessionOperationArgsSchema,
});

type ApplyCharacterSessionOperationArgs = Schema.Schema.Type<
  typeof ApplyCharacterSessionOperationArgsSchema
>;
type CharacterSessionOperationArgs =
  ApplyCharacterSessionOperationArgs["operation"];

export type ApplyCharacterSessionOperationToolInput = {
  readonly characterId: CharacterId;
  readonly operation: CharacterSessionOperationArgs;
};
