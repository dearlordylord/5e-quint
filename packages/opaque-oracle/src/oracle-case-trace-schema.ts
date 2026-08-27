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
  AmmunitionKindSchema,
  CONDITIONS,
  StatBlockId as StatBlockIdSchema,
  UnitId as UnitIdSchema,
} from "@dnd/shared/game-facts";
import { Index, SIZES } from "@dnd/shared/types";
import { CombatantId } from "@dnd/battle-runtime";

import { validOracleTraceLifecycle } from "./oracle-lifecycle.ts";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const IntegerSchema = Schema.Number.pipe(Schema.int());

const CreationFillWithDistinctOptionIdsSchema = Schema.make<CreationFillFact>(
  CreationFillFactSchema.ast,
);

const DistinctCreationFillSchema = CreationFillWithDistinctOptionIdsSchema.pipe(
  Schema.filter(
    (fill) =>
      fill.kind !== "choice" ||
      new Set(fill.optionIds).size === fill.optionIds.length,
    {
      message: () => "choice optionIds must not contain duplicate members",
    },
  ),
);

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
      Schema.filter((values) => new Set(values).size === values.length, {
        message: () => "statBlockIds must not contain duplicate members",
      }),
    ),
  }),
);
export type FreshSheetInput = Schema.Schema.Type<typeof FreshSheetInputSchema>;

const AmmunitionStockInputSchema = Schema.Struct({
  ammunition: AmmunitionKindSchema,
  remaining: NonNegativeIntegerSchema,
});

const OracleBattleConditionsSchema = Schema.Array(Schema.Literal("prone")).pipe(
  Schema.filter(
    (conditions) => new Set(conditions).size === conditions.length,
    {
      message: () => "conditions must not contain duplicate members",
    },
  ),
);

const OracleCharacterSheetRosterEntrySchema = Schema.Struct({
  origin: Schema.Literal("characterSheet"),
  combatantId: CombatantId,
  displayName: Schema.NonEmptyTrimmedString,
  initiative: IntegerSchema,
  ammunitionStocks: Schema.Array(AmmunitionStockInputSchema),
});

const OracleStatBlockRosterEntrySchema = Schema.Struct({
  origin: Schema.Literal("statBlock"),
  combatantId: CombatantId,
  statBlockId: StatBlockIdSchema,
  initiative: IntegerSchema,
  ammunitionStocks: Schema.Array(AmmunitionStockInputSchema),
  conditions: OracleBattleConditionsSchema,
  currentHp: Schema.optional(NonNegativeIntegerSchema),
  tempHp: NonNegativeIntegerSchema,
});

/**
 * Every varying battle fact is explicit at the Case boundary. The origin
 * discriminant lives on the entry itself, so a participant cannot carry both
 * a Character Sheet and a Stat Block source.
 */
export const OracleBattleRosterEntrySchema = Schema.Union(
  OracleCharacterSheetRosterEntrySchema,
  OracleStatBlockRosterEntrySchema,
).annotations({ parseOptions: { onExcessProperty: "error" } });
export type OracleBattleRosterEntry = Schema.Schema.Type<
  typeof OracleBattleRosterEntrySchema
>;

const OracleBattleFillSchema = BattleFillSchema.annotations({
  parseOptions: { onExcessProperty: "error" },
});

export const OracleBattleInterruptDecisionFillSchema =
  BattleInterruptDecisionFillSchema.annotations({
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
  // domain failure. Keep that input representable so it can be projected
  // into the Trace; the refinement still admits at most one fresh Sheet.
  roster: Schema.Array(OracleBattleRosterEntrySchema).pipe(
    Schema.filter(
      (roster) =>
        roster.filter((entry) => entry.origin === "characterSheet").length <= 1,
      {
        message: () =>
          "a Case roster may contain at most one Character Sheet participant",
      },
    ),
  ),
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
  tag: Schema.Literal("creationFillRejected"),
  issues: Schema.NonEmptyArray(CreationBatchRejectionFactSchema),
});

const CreationFinalizationRejectionSchema = Schema.Struct({
  tag: Schema.Literal("creationFinalizationRejected"),
  issues: Schema.NonEmptyArray(CreationFinalizationIssueSchema),
});

const SheetConstructionRejectionSchema = Schema.Struct({
  tag: Schema.Literal("characterSheetConstructionRejected"),
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
  spellAccessIssues: Schema.optional(
    Schema.Array(CharacterBattleSpellAccessProjectionIssueSchema).pipe(
      Schema.filter((issues) => issues.length > 0, {
        message: () => "spellAccessIssues must contain at least one issue",
      }),
    ),
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
  tag: Schema.Literal("battleEntryRejected"),
  issues: Schema.NonEmptyArray(BattleEntryIssueSchema),
});
export type OracleBattleEntryRejection = Schema.Schema.Type<
  typeof BattleEntryRejectionSchema
>;

export const WorkflowRejectionSchema = Schema.Union(
  Schema.Struct({ code: Schema.Literal("creationInputExhausted") }),
  Schema.Struct({
    code: Schema.Literal("creationInputSurplus"),
    firstUnusedBatchIndex: Schema.fromBrand(Index)(NonNegativeIntegerSchema),
  }),
  Schema.Struct({
    code: Schema.Literal("battleInputSurplus"),
    firstUnusedAttemptIndex: Schema.fromBrand(Index)(NonNegativeIntegerSchema),
  }),
).annotations({
  identifier: "OracleWorkflowRejection",
  parseOptions: { onExcessProperty: "error" },
});

const OracleBattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  origin: Schema.Struct({ kind: Schema.Literal("character", "statBlock") }),
  initiative: IntegerSchema,
  hp: NonNegativeIntegerSchema,
  maxHp: NonNegativeIntegerSchema,
  tempHp: NonNegativeIntegerSchema,
  armorClass: Schema.Number,
  size: Schema.Literal(...SIZES),
  conditions: Schema.Array(Schema.Literal(...CONDITIONS)).pipe(
    Schema.filter(
      (conditions) => new Set(conditions).size === conditions.length,
      { message: () => "conditions must not contain duplicate members" },
    ),
  ),
});
export type OracleBattleCreatureSnapshot = Schema.Schema.Type<
  typeof OracleBattleCreatureSnapshotSchema
>;

const OracleBattleCheckpointShapeSchema = Schema.Struct({
  round: NonNegativeIntegerSchema.pipe(Schema.greaterThan(0)),
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  combatants: Schema.NonEmptyArray(OracleBattleCreatureSnapshotSchema),
});

export const OracleBattleCheckpointSchema =
  OracleBattleCheckpointShapeSchema.pipe(
    Schema.filter(oracleBattleCheckpointInvariantsHold, {
      message: () =>
        "Battle checkpoint combatants, turn order, and current actor must agree.",
    }),
  );
export type OracleBattleCheckpoint = Schema.Schema.Type<
  typeof OracleBattleCheckpointSchema
>;

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

const OracleBattleEnteredShapeSchema = Schema.Struct({
  tag: Schema.Literal("battleEntered"),
  checkpoint: OracleBattleCheckpointSchema,
  frontier: OracleBattleActsFrontierSchema,
}).annotations({ parseOptions: { onExcessProperty: "error" } });
export const OracleBattleEnteredSchema = OracleBattleEnteredShapeSchema.pipe(
  Schema.filter(oracleBattleEnteredInvariantsHold, {
    message: () =>
      "Battle frontier subjects must reference combatants in the checkpoint.",
  }),
).annotations({
  identifier: "OracleBattleEntered",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleEntered = Schema.Schema.Type<
  typeof OracleBattleEnteredSchema
>;

export const OracleBattleProgressedSchema = Schema.Struct({
  tag: Schema.Literal("battleProgressed"),
  checkpoint: OracleBattleCheckpointSchema,
  frontier: OracleBattleNonterminalFrontierSchema,
})
  .pipe(
    Schema.filter(oracleBattleCheckpointFrontierInvariantsHold, {
      message: () =>
        "Battle frontier references must agree with the projected checkpoint.",
    }),
  )
  .annotations({
    identifier: "OracleBattleProgressed",
    parseOptions: { onExcessProperty: "error" },
  });
export type OracleBattleProgressed = Schema.Schema.Type<
  typeof OracleBattleProgressedSchema
>;

export const OracleBattleAttemptRejectionSchema = Schema.Struct({
  tag: Schema.Literal("battleAttemptRejected"),
  checkpoint: OracleBattleCheckpointSchema,
  frontier: OracleBattleNonterminalFrontierSchema,
  reason: Schema.Literal(
    "staleSubject",
    "wrongActor",
    "missingCombatant",
    "invalidFill",
    "unsupportedSubject",
    "unsupportedActOption",
  ),
})
  .pipe(
    Schema.filter(oracleBattleCheckpointFrontierInvariantsHold, {
      message: () =>
        "Battle frontier references must agree with the projected checkpoint.",
    }),
  )
  .annotations({
    identifier: "OracleBattleAttemptRejection",
    parseOptions: { onExcessProperty: "error" },
  });
export type OracleBattleAttemptRejection = Schema.Schema.Type<
  typeof OracleBattleAttemptRejectionSchema
>;

export const OracleBattleResolvedSchema = Schema.Struct({
  tag: Schema.Literal("battleResolved"),
  checkpoint: OracleBattleCheckpointSchema,
}).annotations({
  identifier: "OracleBattleResolved",
  parseOptions: { onExcessProperty: "error" },
});
export type OracleBattleResolved = Schema.Schema.Type<
  typeof OracleBattleResolvedSchema
>;

export const OracleTraceStepSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("creationStarted", "creationProgressed"),
    frontier: CreationFrontierFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterBuilt"),
    build: CharacterBuildFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterSheetConstructed"),
    sheet: FreshCharacterSheetProjectionSchema,
  }),
  CreationFillRejectionSchema,
  CreationFinalizationRejectionSchema,
  SheetConstructionRejectionSchema,
  BattleEntryRejectionSchema,
  OracleBattleEnteredSchema,
  OracleBattleProgressedSchema,
  OracleBattleAttemptRejectionSchema,
  OracleBattleResolvedSchema,
  Schema.Struct({
    tag: Schema.Literal("workflowRejected"),
    reason: WorkflowRejectionSchema,
  }),
).annotations({
  identifier: "OracleTraceStep",
  parseOptions: { onExcessProperty: "error" },
});

export type OracleTraceStep = Schema.Schema.Type<typeof OracleTraceStepSchema>;

// This shape is deliberately private. Public callers only receive the
// lifecycle-refined schema/type below, so an invalid sequence cannot be
// constructed through a weaker exported alias.
const OracleTraceShapeSchema = Schema.Struct({
  steps: Schema.NonEmptyArray(OracleTraceStepSchema),
}).annotations({ parseOptions: { onExcessProperty: "error" } });
export const OracleTraceSchema = OracleTraceShapeSchema.pipe(
  Schema.filter(validOracleTraceLifecycle, {
    message: () => "trace steps do not form a valid Oracle lifecycle",
  }),
  Schema.brand("OracleTrace"),
).annotations({
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
  readonly currentActorId: string;
  readonly turnOrder: readonly string[];
  readonly combatants: readonly OracleBattleCreatureSnapshot[];
}): boolean {
  const combatantIds = checkpoint.combatants.map(
    (combatant) => combatant.combatantId,
  );
  const turnOrder = checkpoint.turnOrder;
  const liveCombatantIds: ReadonlySet<string> = new Set(combatantIds);

  return (
    combatantIds.length > 0 &&
    turnOrder.length > 0 &&
    uniqueValues(combatantIds) &&
    uniqueValues(turnOrder) &&
    turnOrder.length === combatantIds.length &&
    checkpoint.combatants.every(
      (combatant) => combatant.hp <= combatant.maxHp,
    ) &&
    checkpoint.combatants.every(
      (combatant, index) => combatant.combatantId === turnOrder[index],
    ) &&
    liveCombatantIds.has(checkpoint.currentActorId) &&
    turnOrder.every((combatantId) => liveCombatantIds.has(combatantId))
  );
}

function uniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
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
    readonly currentActorId: string;
    readonly turnOrder: readonly string[];
    readonly combatants: readonly { readonly combatantId: string }[];
  };
  readonly frontier: {
    readonly kind: "acts";
    readonly acts: readonly [BattleSubject, ...BattleSubject[]];
  };
}): boolean {
  return (
    entered.checkpoint.currentActorId === entered.checkpoint.turnOrder[0] &&
    oracleBattleCheckpointFrontierInvariantsHold({
      checkpoint: entered.checkpoint,
      frontier: entered.frontier,
    })
  );
}

function oracleBattleCheckpointFrontierInvariantsHold(input: {
  readonly checkpoint: {
    readonly currentActorId: string;
    readonly turnOrder: readonly string[];
    readonly combatants: readonly { readonly combatantId: string }[];
  };
  readonly frontier: OracleBattleNonterminalFrontier;
}): boolean {
  const liveCombatantIds = new Set(
    input.checkpoint.combatants.map(({ combatantId }) => combatantId),
  );
  return Match.value(input.frontier).pipe(
    Match.discriminatorsExhaustive("kind")({
      acts: ({ acts }) =>
        acts.every(
          (subject) =>
            battleSubjectBelongsToCurrentActor(
              subject,
              input.checkpoint.currentActorId,
            ) &&
            battleSubjectReferencesAreLive(subject, liveCombatantIds) &&
            battleSubjectProcedureRefsBelongToOwners(subject),
        ),
      ordinaryHoles: ({ subject }) =>
        battleSubjectBelongsToCurrentActor(
          subject,
          input.checkpoint.currentActorId,
        ) &&
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
            input.checkpoint.currentActorId,
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
