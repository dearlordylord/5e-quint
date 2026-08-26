import { Schema } from "effect";
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
  CharacterSheetConstructionIssueSchema,
  FreshCharacterSheetProjectionSchema,
} from "@dnd/character-sheet-runtime";
import { StatBlockId as StatBlockIdSchema } from "@dnd/shared/game-facts";

import { validOracleTraceLifecycle } from "./oracle-lifecycle.ts";

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const DistinctCreationFillSchema = CreationFillFactSchema.pipe(
  Schema.filter(
    (fill) =>
      fill.kind !== "choice" ||
      new Set(fill.optionIds).size === fill.optionIds.length,
    {
      message: () => "choice optionIds must not contain duplicate members",
      jsonSchema: { uniqueItems: true },
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
        jsonSchema: { uniqueItems: true },
      }),
    ),
  }),
);
export type FreshSheetInput = Schema.Schema.Type<typeof FreshSheetInputSchema>;

export const OracleCaseSchema = Schema.Struct({
  creation: Schema.Struct({
    fillBatches: Schema.Array(CreationFillBatchSchema),
  }),
  sheet: FreshSheetInputSchema,
});
export type OracleCase = Schema.Schema.Type<typeof OracleCaseSchema>;

export const OracleEvaluationBatchSchema = Schema.Struct({
  cases: Schema.NonEmptyArray(OracleCaseSchema),
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

export const WorkflowRejectionSchema = Schema.Union(
  Schema.Struct({ code: Schema.Literal("creationInputExhausted") }),
  Schema.Struct({
    code: Schema.Literal("creationInputSurplus"),
    firstUnusedBatchIndex: NonNegativeIntegerSchema,
  }),
);

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
  Schema.Struct({
    tag: Schema.Literal("workflowRejected"),
    reason: WorkflowRejectionSchema,
  }),
);

export type OracleTraceStep = Schema.Schema.Type<typeof OracleTraceStepSchema>;

export const OracleTraceStructureSchema = Schema.Struct({
  steps: Schema.NonEmptyArray(OracleTraceStepSchema),
});
export const OracleTraceSchema = OracleTraceStructureSchema.pipe(
  Schema.filter(validOracleTraceLifecycle, {
    message: () => "trace steps do not form a valid Oracle lifecycle",
  }),
);
export type OracleTrace = Schema.Schema.Type<typeof OracleTraceStructureSchema>;

// Lower-case names keep the schema exports convenient for structural consumers.
export const oracleCaseSchema = OracleCaseSchema;
export const oracleEvaluationBatchSchema = OracleEvaluationBatchSchema;
export const oracleTraceSchema = OracleTraceStructureSchema;

export type OracleCreationFrontier = CreationFrontierFact;
export type OracleCharacterBuild = CharacterBuildFact;
export type OracleCreationFill = CreationFillFact;
export type OracleCreationFinalizationIssue = CreationFinalizationRejectionFact;
export type OracleTraceFrontier = CreationFrontierFact;
export type OracleFreshSheetProjection = Schema.Schema.Type<
  typeof FreshCharacterSheetProjectionSchema
>;
export type OracleCharacterSheet = OracleFreshSheetProjection;
export type OracleCreationBatchFact = Schema.Schema.Type<
  typeof CharacterCreationBatchFactSchema
>;
