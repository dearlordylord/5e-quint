import { CharacterSheetRetainedCompanionId } from "@dnd/character-sheet-runtime";
import { TIME_SPAN_UNITS } from "@dnd/shared/elapsed-time";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { DAMAGE_TYPES } from "@dnd/shared/types";
import { DRUID_CIRCLE_LAND_CHOICES } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import {
  CHARACTER_SESSION_PHYSICAL_EXERTION_TAG_VALUES,
  CHARACTER_SESSION_REST_ACTIVITY_INTERRUPTION_VALUES,
} from "./character-session-rest-contract.ts";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

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

const RestRecoveryArgsFields = {
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
          spellLevel: Schema.Number.pipe(
            Schema.int(),
            Schema.greaterThanOrEqualTo(1),
            Schema.lessThanOrEqualTo(9),
          ),
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

const LongRestTimingArgsSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("noPriorLongRest"),
  }),
  Schema.Struct({
    tag: Schema.Literal("elapsedSinceLastLongRest"),
    elapsedTicks: NonNegativeIntegerSchema,
  }),
);

const ShortRestInterruptionArgsSchema = Schema.Literal(
  ...CHARACTER_SESSION_REST_ACTIVITY_INTERRUPTION_VALUES,
);
const LongRestInterruptionArgsSchema = Schema.Union(
  ShortRestInterruptionArgsSchema,
  Schema.Struct({
    tag: Schema.Literal(...CHARACTER_SESSION_PHYSICAL_EXERTION_TAG_VALUES),
    durationTicks: NonNegativeIntegerSchema,
  }),
);

const WeaponMasteryReselectionArgsSchema = Schema.Struct({
  featureUnitId: UnitId,
  selectedWeaponUnitIds: Schema.NonEmptyArray(UnitId),
});

const CalendarTimeDurationArgsSchema = Schema.Struct({
  kind: Schema.Literal("timeSpan"),
  unit: Schema.Literal(...TIME_SPAN_UNITS),
  amount: PositiveIntegerSchema,
});

const StableRecoveryFillArgsSchema = Schema.Struct({
  kind: Schema.Literal("rolledDice"),
  holeId: Schema.String,
  value: Schema.NonEmptyArray(
    Schema.Struct({
      results: Schema.Array(PositiveIntegerSchema),
    }),
  ),
});

const CompleteShortRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("completeShortRest"),
  restedTicks: NonNegativeIntegerSchema,
  fiendishResilienceDamageType: Schema.optionalWith(
    Schema.Literal(...DAMAGE_TYPES),
    { exact: true },
  ),
  ...RestRecoveryArgsFields,
});
const InterruptShortRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("interruptShortRest"),
  interruption: ShortRestInterruptionArgsSchema,
});
const CompleteLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("completeLongRest"),
  timing: LongRestTimingArgsSchema,
  restedTicks: NonNegativeIntegerSchema,
  weaponMasteryReselections: Schema.optionalWith(
    Schema.NonEmptyArray(WeaponMasteryReselectionArgsSchema),
    { exact: true },
  ),
  druidWildShapeKnownFormReplacement: Schema.optionalWith(
    Schema.Struct({
      replaceStatBlockId: StatBlockId,
      selectedStatBlockId: StatBlockId,
    }),
    { exact: true },
  ),
  druidCircleLandChoice: Schema.optionalWith(
    Schema.Literal(...DRUID_CIRCLE_LAND_CHOICES),
    { exact: true },
  ),
  fiendishResilienceDamageType: Schema.optionalWith(
    Schema.Literal(...DAMAGE_TYPES),
    { exact: true },
  ),
});
const InterruptLongRestOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("interruptLongRest"),
  timing: LongRestTimingArgsSchema,
  restedTicks: NonNegativeIntegerSchema,
  interruption: LongRestInterruptionArgsSchema,
  ...RestRecoveryArgsFields,
});
const PassCalendarTimeOperationArgsSchema = Schema.Struct({
  kind: Schema.Literal("passCalendarTime"),
  duration: CalendarTimeDurationArgsSchema,
  fills: Schema.Array(StableRecoveryFillArgsSchema),
});
const CharacterSessionOperationArgsSchema = Schema.Union(
  RetainOneAtATimeCompanionOperationArgsSchema,
  CompleteShortRestOperationArgsSchema,
  InterruptShortRestOperationArgsSchema,
  CompleteLongRestOperationArgsSchema,
  InterruptLongRestOperationArgsSchema,
  PassCalendarTimeOperationArgsSchema,
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
