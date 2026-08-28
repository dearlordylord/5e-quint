import { Match, Schema } from "effect";
import {
  CharacterBuildFactSchema,
  CharacterCreationBatchFactSchema,
  CreationBatchRejectionFactSchema,
  CreationFillFactSchema,
  CreationFinalizationIssueSchema,
  CreationFrontierFactSchema,
  type CharacterBuildFact,
  type CreationFillFact,
  type CreationFinalizationRejectionFact,
  type CreationFrontierFact,
} from "@dnd/character-creation-runtime";
import {
  BattleFillSchema,
  BattleInterruptDecisionFillSchema,
  BattleMechanicalFrontierSchema,
  BattleSubjectSchema,
  battleProcedureExecutionRefBelongsToCombatant,
  battleSubjectProcedureRefsBelongToOwners,
  interruptChoiceResponderId,
  type BattleInterruptSubject,
  type BattleMechanicalInterruptChoice,
  type BattleMechanicalFrontier,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  CharacterSheetConstructionIssueSchema,
  FreshCharacterSheetProjectionSchema,
} from "@dnd/character-sheet-runtime";
import {
  CONDITIONS,
  StatBlockId as StatBlockIdSchema,
  UnitId as UnitIdSchema,
  type AmmunitionKind,
} from "@dnd/shared/game-facts";
import { Index, SIZES } from "@dnd/shared/types";
import { semanticRefinement } from "@dnd/shared/semantic-refinement";
import { hasDuplicateStructuralValues } from "@dnd/shared/structural-value";
import { CombatantId } from "@dnd/battle-runtime";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const IntegerSchema = Schema.Number.pipe(Schema.int());
const OracleIndexSchema = Schema.fromBrand(Index, {
  ...semanticRefinement("constraintFreeBrand"),
})(NonNegativeIntegerSchema);

const CreationFillWithDistinctOptionIdsSchema = Schema.make<CreationFillFact>(
  CreationFillFactSchema.ast,
);

// CreationFillFactSchema owns the choice optionIds set refinement and its
// uniqueItems annotation. Reuse that schema directly so the surrounding fill
// batch remains an ordered sequence rather than inheriting set semantics.
const DistinctCreationFillSchema = CreationFillWithDistinctOptionIdsSchema;

export const CreationFillBatchSchema = Schema.NonEmptyArray(
  DistinctCreationFillSchema,
);
export type CreationFillBatch = Schema.Schema.Type<
  typeof CreationFillBatchSchema
>;

export const FreshSheetInputSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("ordinary") }),
  Schema.Struct({
    tag: Schema.Literal("wildShapeKnownForms"),
    statBlockIds: Schema.NonEmptyArray(StatBlockIdSchema).pipe(
      Schema.filter((values) => !hasDuplicateStructuralValues(values), {
        message: () => "statBlockIds must not contain duplicate members",
        jsonSchema: { minItems: 1, uniqueItems: true },
      }),
    ),
  }),
);
export type FreshSheetInput = Schema.Schema.Type<typeof FreshSheetInputSchema>;

const AmmunitionStockValueSchema = NonNegativeIntegerSchema;
const OracleAmmunitionStockFields = {
  arrow: Schema.optionalWith(AmmunitionStockValueSchema, { exact: true }),
  bolt: Schema.optionalWith(AmmunitionStockValueSchema, { exact: true }),
  bullet: Schema.optionalWith(AmmunitionStockValueSchema, { exact: true }),
  needle: Schema.optionalWith(AmmunitionStockValueSchema, { exact: true }),
  sling_bullet: Schema.optionalWith(AmmunitionStockValueSchema, {
    exact: true,
  }),
} satisfies Record<AmmunitionKind, object>;

export const OracleAmmunitionStocksSchema = Schema.Struct(
  OracleAmmunitionStockFields,
).annotations({ parseOptions: { onExcessProperty: "error" } });
export type OracleAmmunitionStocks = Schema.Schema.Type<
  typeof OracleAmmunitionStocksSchema
>;

const OracleBattleConditionsSchema = Schema.Array(Schema.Literal("prone")).pipe(
  Schema.filter((conditions) => !hasDuplicateStructuralValues(conditions), {
    message: () => "conditions must not contain duplicate members",
    jsonSchema: { uniqueItems: true },
  }),
);

const OracleCharacterSheetRosterEntrySchema = Schema.Struct({
  combatantId: CombatantId,
  initiative: IntegerSchema,
  ammunitionStocks: OracleAmmunitionStocksSchema,
});

const OracleStatBlockRosterEntrySchema = Schema.Struct({
  combatantId: CombatantId,
  statBlockId: StatBlockIdSchema,
  initiative: IntegerSchema,
  ammunitionStocks: OracleAmmunitionStocksSchema,
  conditions: OracleBattleConditionsSchema,
  currentHp: Schema.optional(NonNegativeIntegerSchema),
  tempHp: NonNegativeIntegerSchema,
});

/**
 * Every varying battle fact is explicit at the Case boundary. The roster
 * shape preserves the input order while making the single Character Sheet
 * position structural: a roster either contains only Stat Blocks or has one
 * Character Sheet between the two Stat Block sequences.
 */
export const OracleBattleRosterSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("statBlocks"),
    entries: Schema.Array(OracleStatBlockRosterEntrySchema),
  }),
  Schema.Struct({
    tag: Schema.Literal("characterSheet"),
    precedingStatBlocks: Schema.Array(OracleStatBlockRosterEntrySchema),
    characterSheet: OracleCharacterSheetRosterEntrySchema,
    followingStatBlocks: Schema.Array(OracleStatBlockRosterEntrySchema),
  }),
).annotations({ parseOptions: { onExcessProperty: "error" } });
export type OracleBattleCharacterSheetRosterEntry = Schema.Schema.Type<
  typeof OracleCharacterSheetRosterEntrySchema
>;
export type OracleBattleStatBlockRosterEntry = Schema.Schema.Type<
  typeof OracleStatBlockRosterEntrySchema
>;
export type OracleBattleRoster = Schema.Schema.Type<
  typeof OracleBattleRosterSchema
>;

const OracleBattleFillSchema = BattleFillSchema.annotations({
  identifier: "BattleFill",
  parseOptions: { onExcessProperty: "error" },
});

export const OracleBattleInterruptDecisionFillSchema =
  BattleInterruptDecisionFillSchema.annotations({
    identifier: "BattleInterruptDecisionFill",
    parseOptions: { onExcessProperty: "error" },
  });
export type OracleBattleInterruptDecisionFill =
  typeof OracleBattleInterruptDecisionFillSchema.Type;

export const OracleBattleOrdinaryAttemptSchema = Schema.Struct({
  kind: Schema.Literal("ordinarySubject"),
  subject: BattleSubjectSchema,
  fills: Schema.Array(OracleBattleFillSchema),
}).annotations({
  identifier: "OracleBattleOrdinaryAttempt",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleOrdinaryAttempt = Schema.Schema.Type<
  typeof OracleBattleOrdinaryAttemptSchema
>;

export const OracleBattleInterruptAttemptSchema = Schema.Struct({
  kind: Schema.Literal("interruptDecision"),
  fill: OracleBattleInterruptDecisionFillSchema,
}).annotations({
  identifier: "OracleBattleInterruptAttempt",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleInterruptAttempt = Schema.Schema.Type<
  typeof OracleBattleInterruptAttemptSchema
>;

export const OracleBattleAttemptSchema = Schema.Union(
  OracleBattleOrdinaryAttemptSchema,
  OracleBattleInterruptAttemptSchema,
).annotations({
  identifier: "OracleBattleAttempt",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleAttempt = Schema.Schema.Type<
  typeof OracleBattleAttemptSchema
>;

export const OracleBattleInputSchema = Schema.Struct({
  // The production composition owner reports an empty roster as a typed
  // domain failure. Keep an empty Stat Block sequence representable so it can
  // be projected into the Trace.
  roster: OracleBattleRosterSchema,
  attempts: Schema.Array(OracleBattleAttemptSchema),
}).annotations({
  identifier: "OracleBattleInput",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleInput = Schema.Schema.Type<
  typeof OracleBattleInputSchema
>;

const OracleCaseShapeSchema = Schema.Struct({
  creation: Schema.Struct({
    fillBatches: Schema.Array(CreationFillBatchSchema),
  }),
  sheet: FreshSheetInputSchema,
  battle: OracleBattleInputSchema,
}).annotations({ parseOptions: { onExcessProperty: "error" } });
export const OracleCaseSchema = OracleCaseShapeSchema.pipe(
  Schema.brand("OracleCase"),
).annotations({
  identifier: "OracleCase",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleCase = Schema.Schema.Type<typeof OracleCaseSchema>;

export const OracleEvaluationBatchSchema = Schema.Struct({
  cases: Schema.NonEmptyArray(OracleCaseSchema),
}).annotations({
  identifier: "OracleEvaluationBatch",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleEvaluationBatch = Schema.Schema.Type<
  typeof OracleEvaluationBatchSchema
>;

const CreationFillRejectionSchema = Schema.Struct({
  tag: Schema.Literal("fillRejected"),
  issues: Schema.NonEmptyArray(CreationBatchRejectionFactSchema),
});

const CreationFinalizationRejectionSchema = Schema.Struct({
  tag: Schema.Literal("finalizationRejected"),
  issues: Schema.NonEmptyArray(CreationFinalizationIssueSchema),
});

const SheetConstructionRejectionSchema = Schema.Struct({
  tag: Schema.Literal("rejected"),
  issues: Schema.NonEmptyArray(CharacterSheetConstructionIssueSchema),
});

const CharacterBattleSpellAccessProjectionIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("characterBattleSpellAccessProjectionIssue"),
    accessIndex: NonNegativeIntegerSchema,
    featUnitId: UnitIdSchema,
    cause: Schema.Literal(
      "missingSourceUnit",
      "unsupportedSourceUnit",
      "missingSpellListSource",
      "invalidSpellSelection",
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("characterBattleSpellAccessProjectionIssue"),
    issueIndex: NonNegativeIntegerSchema,
    cause: Schema.Literal("invalidBuildSpellAccess"),
  }),
);

const CharacterBattleCreatureInitIssueSchema = Schema.Struct({
  tag: Schema.Literal("battleCreatureInitIssue"),
  spellAccessIssues: Schema.optionalWith(
    Schema.NonEmptyArray(CharacterBattleSpellAccessProjectionIssueSchema),
    { exact: true },
  ),
});
export type OracleBattleCreatureInitIssue = Schema.Schema.Type<
  typeof CharacterBattleCreatureInitIssueSchema
>;
const BattleStateInitLeafIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("battleStateInitIssue"),
  }),
  Schema.Struct({
    tag: Schema.Literal("weaponLoadoutMismatch"),
    slot: Schema.Literal("main-hand", "off-hand"),
  }),
);
export type OracleBattleStateInitLeafIssue = Schema.Schema.Type<
  typeof BattleStateInitLeafIssueSchema
>;
const BattleStateInitIssueSchema = Schema.Union(
  BattleStateInitLeafIssueSchema,
  Schema.Struct({
    tag: Schema.Literal("battleStateInitIssues"),
    issues: Schema.Array(BattleStateInitLeafIssueSchema).pipe(
      Schema.filter((issues) => issues.length >= 2, {
        message: () => "battleStateInitIssues must contain at least two issues",
        jsonSchema: { minItems: 2 },
      }),
    ),
  }),
);
export type OracleBattleStateInitIssue = Schema.Schema.Type<
  typeof BattleStateInitIssueSchema
>;

const BattleProjectionIssueSchema = Schema.Struct({
  tag: Schema.Literal("characterBattleEncounterProjectionIssue"),
  origin: Schema.Literal("characterSheet"),
  combatantId: CombatantId,
  issue: CharacterBattleCreatureInitIssueSchema,
});
const StatBlockBattleProjectionIssueSchema = Schema.Struct({
  tag: Schema.Literal("characterBattleEncounterProjectionIssue"),
  origin: Schema.Literal("statBlock"),
  combatantId: CombatantId,
  issue: BattleStateInitIssueSchema,
});

const BattleProjectionIssuesSchema = Schema.Struct({
  tag: Schema.Literal("characterBattleEncounterProjectionIssues"),
  issues: Schema.NonEmptyArray(
    Schema.Union(
      BattleProjectionIssueSchema,
      StatBlockBattleProjectionIssueSchema,
    ),
  ),
});
export type OracleBattleProjectionIssue = Schema.Schema.Type<
  typeof BattleProjectionIssuesSchema
>["issues"][number];

const BattleEntryIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("statBlockUnavailable"),
    statBlockId: StatBlockIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterBattleEncounterEmptyRoster"),
  }),
  Schema.Struct({
    tag: Schema.Literal("battleCreatureInitRejected"),
    issue: CharacterBattleCreatureInitIssueSchema,
  }),
  BattleProjectionIssuesSchema,
  Schema.Struct({
    tag: Schema.Literal("battleStateInitRejected"),
    issue: BattleStateInitIssueSchema,
  }),
);

export const BattleEntryRejectionSchema = Schema.Struct({
  tag: Schema.Literal("rejected"),
  issues: Schema.NonEmptyArray(BattleEntryIssueSchema),
});
export type OracleBattleEntryRejection = Schema.Schema.Type<
  typeof BattleEntryRejectionSchema
>;

const OracleBattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  origin: Schema.Struct({ kind: Schema.Literal("character", "statBlock") }),
  hp: NonNegativeIntegerSchema,
  maxHp: NonNegativeIntegerSchema,
  tempHp: NonNegativeIntegerSchema,
  armorClass: Schema.Number,
  size: Schema.Literal(...SIZES),
  conditions: Schema.Array(Schema.Literal(...CONDITIONS)).pipe(
    Schema.filter((conditions) => !hasDuplicateStructuralValues(conditions), {
      message: () => "conditions must not contain duplicate members",
      jsonSchema: { uniqueItems: true },
    }),
  ),
});
export type OracleBattleCreatureSnapshot = Schema.Schema.Type<
  typeof OracleBattleCreatureSnapshotSchema
>;

export const OracleBattleInitiativeEntrySchema = Schema.Struct({
  creature: OracleBattleCreatureSnapshotSchema,
  initiative: IntegerSchema,
});
export type OracleBattleInitiativeEntry = Schema.Schema.Type<
  typeof OracleBattleInitiativeEntrySchema
>;

const OracleBattleCheckpointFields = {
  round: NonNegativeIntegerSchema.pipe(Schema.greaterThan(0)),
  alreadyActed: Schema.Array(OracleBattleInitiativeEntrySchema),
  stillToAct: Schema.NonEmptyArray(OracleBattleInitiativeEntrySchema),
};
const OracleBattleCheckpointShapeSchema = Schema.Struct(
  OracleBattleCheckpointFields,
);

export const OracleBattleCheckpointSchema =
  OracleBattleCheckpointShapeSchema.pipe(
    Schema.filter(oracleBattleCheckpointInvariantsHold, {
      message: () =>
        "Battle checkpoint initiative entries must be unique and have valid hit points.",
      ...semanticRefinement("checkpointFrontierCorrelation"),
    }),
  );
export type OracleBattleCheckpoint = Schema.Schema.Type<
  typeof OracleBattleCheckpointSchema
>;
export type OracleBattleEnteredCheckpoint = Omit<
  OracleBattleCheckpoint,
  "alreadyActed"
> & { readonly alreadyActed: readonly [] };

const OracleBattleEnteredCheckpointShapeSchema = Schema.Struct({
  ...OracleBattleCheckpointFields,
  alreadyActed: Schema.Tuple(),
});
const OracleBattleEnteredCheckpointSchema =
  OracleBattleEnteredCheckpointShapeSchema.pipe(
    Schema.filter(oracleBattleCheckpointInvariantsHold, {
      message: () =>
        "Battle checkpoint initiative entries must be unique and have valid hit points.",
      ...semanticRefinement("checkpointFrontierCorrelation"),
    }),
  );

/** Available Battle subjects, without presentation or Runtime Hole details. */
export const OracleBattleActsFrontierSchema = Schema.Struct({
  kind: Schema.Literal("acts"),
  acts: Schema.NonEmptyArray(BattleSubjectSchema),
}).annotations({
  identifier: "OracleBattleActsFrontier",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleActsFrontier = Schema.Schema.Type<
  typeof OracleBattleActsFrontierSchema
>;

export const OracleBattleNonterminalFrontierSchema = Schema.Union(
  OracleBattleActsFrontierSchema,
  BattleMechanicalFrontierSchema,
).annotations({
  identifier: "OracleBattleNonterminalFrontier",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleNonterminalFrontier =
  | OracleBattleActsFrontier
  | BattleMechanicalFrontier;

export const OracleBattleAttemptRejectionReasonSchema = Schema.Literal(
  "staleSubject",
  "wrongActor",
  "missingCombatant",
  "invalidFill",
  "unsupportedSubject",
  "unsupportedActOption",
).annotations({ identifier: "OracleBattleAttemptRejectionReason" });
export type OracleBattleAttemptRejectionReason = Schema.Schema.Type<
  typeof OracleBattleAttemptRejectionReasonSchema
>;

export interface OracleBattleAttemptSegment {
  readonly rejections: readonly OracleBattleAttemptRejectionReason[];
  readonly outcome: OracleBattleAttemptSegmentOutcome;
}

export type OracleBattleAttemptSegmentOutcome =
  | { readonly tag: "awaitingInput" }
  | {
      readonly tag: "next";
      readonly continuation: OracleBattleContinuation;
    };

export interface OracleBattleContinuation {
  readonly checkpoint: OracleBattleCheckpoint;
  readonly frontier: OracleBattleNonterminalFrontier;
  readonly segment: OracleBattleAttemptSegment;
}

interface OracleBattleAttemptSegmentEncoded {
  readonly rejections: readonly OracleBattleAttemptRejectionReason[];
  readonly outcome:
    | { readonly tag: "awaitingInput" }
    | {
        readonly tag: "next";
        readonly continuation: OracleBattleContinuationEncoded;
      };
}

interface OracleBattleContinuationEncoded {
  readonly checkpoint: Schema.Schema.Encoded<
    typeof OracleBattleCheckpointSchema
  >;
  readonly frontier: Schema.Schema.Encoded<
    typeof OracleBattleNonterminalFrontierSchema
  >;
  readonly segment: OracleBattleAttemptSegmentEncoded;
}

export interface OracleBattleEntered {
  readonly tag: "entered";
  readonly checkpoint: OracleBattleEnteredCheckpoint;
  readonly frontier: OracleBattleActsFrontier;
  readonly segment: OracleBattleAttemptSegment;
}

export type OracleBattleEntryOutcome =
  | OracleBattleEntryRejection
  | OracleBattleEntered;

export type OracleSheetOutcome =
  | Schema.Schema.Type<typeof SheetConstructionRejectionSchema>
  | {
      readonly tag: "constructed";
      readonly sheet: Schema.Schema.Type<
        typeof FreshCharacterSheetProjectionSchema
      >;
      readonly battle: OracleBattleEntryOutcome;
    };

export type OracleCreationOutcome =
  | Schema.Schema.Type<typeof CreationFillRejectionSchema>
  | Schema.Schema.Type<typeof CreationFinalizationRejectionSchema>
  | { readonly tag: "inputExhausted" }
  | {
      readonly tag: "inputSurplus";
      readonly build: CharacterBuildFact;
      readonly index: Index;
    }
  | {
      readonly tag: "built";
      readonly build: CharacterBuildFact;
      readonly sheet: OracleSheetOutcome;
    };

export interface OracleCreationTrace {
  readonly started: CreationFrontierFact;
  readonly progression: readonly CreationFrontierFact[];
  readonly outcome: OracleCreationOutcome;
}

export const OracleBattleContinuationSchema: Schema.suspend<
  OracleBattleContinuation,
  OracleBattleContinuationEncoded,
  never
> = Schema.suspend(() =>
  Schema.Struct({
    checkpoint: OracleBattleCheckpointSchema,
    frontier: OracleBattleNonterminalFrontierSchema,
    segment: OracleBattleAttemptSegmentSchema,
  }).pipe(
    Schema.filter(oracleBattleCheckpointFrontierInvariantsHold, {
      message: () =>
        "Battle frontier references must agree with the projected checkpoint.",
      ...semanticRefinement("checkpointFrontierCorrelation"),
    }),
  ),
).annotations({
  identifier: "OracleBattleContinuation",
  parseOptions: { onExcessProperty: "error" },
});

export const OracleBattleAttemptSegmentSchema = Schema.Struct({
  rejections: Schema.Array(OracleBattleAttemptRejectionReasonSchema),
  outcome: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("awaitingInput") }),
    Schema.Struct({
      tag: Schema.Literal("next"),
      continuation: OracleBattleContinuationSchema,
    }),
  ),
}).annotations({
  identifier: "OracleBattleAttemptSegment",
  parseOptions: { onExcessProperty: "error" },
});
const OracleBattleEnteredShapeSchema = Schema.Struct({
  tag: Schema.Literal("entered"),
  checkpoint: OracleBattleEnteredCheckpointSchema,
  frontier: OracleBattleActsFrontierSchema,
  segment: OracleBattleAttemptSegmentSchema,
}).pipe(
  Schema.filter(oracleBattleEnteredInvariantsHold, {
    message: () =>
      "Battle frontier subjects must reference combatants in the checkpoint.",
    ...semanticRefinement("checkpointFrontierCorrelation"),
  }),
);
export const OracleBattleEnteredSchema =
  OracleBattleEnteredShapeSchema.annotations({
    identifier: "OracleBattleEntered",
    parseOptions: { onExcessProperty: "error" },
  });

const OracleSheetConstructionSuccessSchema = Schema.Struct({
  tag: Schema.Literal("constructed"),
  sheet: FreshCharacterSheetProjectionSchema,
  battle: Schema.Union(BattleEntryRejectionSchema, OracleBattleEnteredSchema),
});

export const OracleSheetOutcomeSchema = Schema.Union(
  SheetConstructionRejectionSchema,
  OracleSheetConstructionSuccessSchema,
).annotations({
  identifier: "OracleSheetOutcome",
  parseOptions: { onExcessProperty: "error" },
});

export const OracleCreationOutcomeSchema = Schema.Union(
  CreationFillRejectionSchema,
  CreationFinalizationRejectionSchema,
  Schema.Struct({ tag: Schema.Literal("inputExhausted") }),
  Schema.Struct({
    tag: Schema.Literal("inputSurplus"),
    build: CharacterBuildFactSchema,
    index: OracleIndexSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("built"),
    build: CharacterBuildFactSchema,
    sheet: OracleSheetOutcomeSchema,
  }),
).annotations({
  identifier: "OracleCreationOutcome",
  parseOptions: { onExcessProperty: "error" },
});

export const OracleCreationTraceSchema = Schema.Struct({
  started: CreationFrontierFactSchema,
  progression: Schema.Array(CreationFrontierFactSchema),
  outcome: OracleCreationOutcomeSchema,
}).annotations({
  identifier: "OracleCreationTrace",
  parseOptions: { onExcessProperty: "error" },
});

export const OracleTraceSchema = Schema.Struct({
  creation: OracleCreationTraceSchema,
})
  .pipe(Schema.brand("OracleTrace"))
  .annotations({
    identifier: "OracleTrace",
    parseOptions: { onExcessProperty: "error" },
  });
export type OracleTrace = Schema.Schema.Type<typeof OracleTraceSchema>;

export const oracleCaseSchema = OracleCaseSchema;
export const oracleEvaluationBatchSchema = OracleEvaluationBatchSchema;
export const oracleTraceSchema = OracleTraceSchema;

export type OracleCreationFrontier = CreationFrontierFact;
export type OracleCharacterBuild = CharacterBuildFact;
export type OracleCreationFill = CreationFillFact;
export type OracleCreationFinalizationIssue = CreationFinalizationRejectionFact;
export type OracleFreshSheetProjection = Schema.Schema.Type<
  typeof FreshCharacterSheetProjectionSchema
>;
export type OracleCharacterSheet = OracleFreshSheetProjection;
export type OracleCreationBatchFact = Schema.Schema.Type<
  typeof CharacterCreationBatchFactSchema
>;

function oracleBattleCheckpointInvariantsHold(checkpoint: {
  readonly alreadyActed: readonly OracleBattleInitiativeEntry[];
  readonly stillToAct: readonly OracleBattleInitiativeEntry[];
}): boolean {
  const stack = [...checkpoint.alreadyActed, ...checkpoint.stillToAct];
  const combatantIds = stack.map(({ creature }) => creature.combatantId);

  return (
    checkpoint.stillToAct.length > 0 &&
    !hasDuplicateStructuralValues(combatantIds) &&
    stack.every((entry, index) => {
      if (index === 0) return true;
      const previous = stack[index - 1];
      return previous !== undefined && previous.initiative >= entry.initiative;
    }) &&
    stack.every(({ creature }) => creature.hp <= creature.maxHp)
  );
}

type CombatantReferenceProperty<Value> = Value extends unknown
  ? {
      [Property in keyof Value]-?: [NonNullable<Value[Property]>] extends [
        never,
      ]
        ? never
        : NonNullable<Value[Property]> extends
              | CombatantId
              | readonly CombatantId[]
          ? Property
          : never;
    }[keyof Value]
  : never;

const BATTLE_SUBJECT_REFERENCE_PROPERTIES = {
  actorId: true,
  casterId: true,
  companionId: true,
  fallingCreatureId: true,
  familiarId: true,
  reactorId: true,
  readiedActorId: true,
  readiedMovementActorId: true,
  readiedSpellCasterId: true,
  sourceCombatantId: true,
  targetId: true,
} satisfies Record<
  CombatantReferenceProperty<BattleSubject | BattleInterruptSubject>,
  true
>;

function oracleBattleEnteredInvariantsHold(entered: {
  readonly checkpoint: {
    readonly alreadyActed: readonly OracleBattleInitiativeEntry[];
    readonly stillToAct: readonly OracleBattleInitiativeEntry[];
  };
  readonly frontier: {
    readonly kind: "acts";
    readonly acts: readonly [BattleSubject, ...BattleSubject[]];
  };
}): boolean {
  return oracleBattleCheckpointFrontierInvariantsHold({
    checkpoint: entered.checkpoint,
    frontier: entered.frontier,
  });
}

function oracleBattleCheckpointFrontierInvariantsHold(input: {
  readonly checkpoint: {
    readonly alreadyActed: readonly OracleBattleInitiativeEntry[];
    readonly stillToAct: readonly OracleBattleInitiativeEntry[];
  };
  readonly frontier: OracleBattleNonterminalFrontier;
}): boolean {
  const stack = [
    ...input.checkpoint.alreadyActed,
    ...input.checkpoint.stillToAct,
  ];
  const liveCombatantIds = new Set(
    stack.map(({ creature }) => creature.combatantId),
  );
  const currentActorId = input.checkpoint.stillToAct[0]?.creature.combatantId;
  if (currentActorId === undefined) return false;
  return Match.value(input.frontier).pipe(
    Match.discriminatorsExhaustive("kind")({
      acts: ({ acts }) =>
        acts.every(
          (subject) =>
            battleSubjectBelongsToCurrentActor(subject, currentActorId) &&
            battleSubjectReferencesAreLive(subject, liveCombatantIds) &&
            battleSubjectProcedureRefsBelongToOwners(subject),
        ),
      ordinaryHoles: ({ subject }) =>
        battleSubjectBelongsToCurrentActor(subject, currentActorId) &&
        battleSubjectReferencesAreLive(subject, liveCombatantIds) &&
        battleSubjectProcedureRefsBelongToOwners(subject),
      interruptDecision: ({ decisionHole, choices }) =>
        decisionHole.eligibleResponders.every((responderId) =>
          liveCombatantIds.has(responderId),
        ) &&
        choices.every((choice) =>
          oracleBattleInterruptChoiceIsValid(
            choice,
            liveCombatantIds,
            currentActorId,
          ),
        ),
    }),
  );
}

function oracleBattleInterruptChoiceIsValid(
  choice: BattleMechanicalInterruptChoice,
  liveCombatantIds: ReadonlySet<string>,
  currentActorId: string,
): boolean {
  const responderId = interruptChoiceResponderId(choice);
  if (!liveCombatantIds.has(responderId)) return false;
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        oracleBattleInterruptSubjectIsValid(
          subject,
          liveCombatantIds,
          currentActorId,
        ),
      reactionModifier: ({ responderId: modifierResponderId, modifier }) =>
        modifierResponderId === responderId &&
        battleProcedureExecutionRefBelongsToCombatant(
          modifier.procedureRef,
          modifierResponderId,
        ),
    }),
  );
}

function oracleBattleInterruptSubjectIsValid(
  subject: BattleInterruptSubject,
  liveCombatantIds: ReadonlySet<string>,
  currentActorId: string,
): boolean {
  if (
    !battleSubjectBelongsToCurrentActor(subject, currentActorId) ||
    !battleSubjectReferencesAreLive(subject, liveCombatantIds)
  ) {
    return false;
  }
  return battleSubjectProcedureRefsBelongToOwners(subject);
}

function battleSubjectBelongsToCurrentActor(
  subject: BattleSubject,
  currentActorId: string,
): boolean {
  return !("actorId" in subject) || subject.actorId === currentActorId;
}

function battleSubjectReferencesAreLive(
  subject: BattleSubject,
  liveCombatantIds: ReadonlySet<string>,
): boolean {
  return Object.entries(subject).every(([property, value]) => {
    if (!(property in BATTLE_SUBJECT_REFERENCE_PROPERTIES)) return true;
    return Array.isArray(value)
      ? value.every(
          (reference) =>
            typeof reference === "string" && liveCombatantIds.has(reference),
        )
      : typeof value === "string" && liveCombatantIds.has(value);
  });
}
