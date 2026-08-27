import { Schema } from "effect";
import * as AST from "effect/SchemaAST";
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
  BattleHoleSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  type BattleCreatureSnapshot,
  type BattleSnapshot,
} from "@dnd/battle-runtime";
import {
  CharacterSheetConstructionIssueSchema,
  FreshCharacterSheetProjectionSchema,
} from "@dnd/character-sheet-runtime";
import {
  AmmunitionKindSchema,
  StatBlockId as StatBlockIdSchema,
} from "@dnd/shared/game-facts";
import { Index } from "@dnd/shared/types";
import { CombatantId } from "@dnd/battle-runtime";

import { validOracleTraceLifecycle } from "./oracle-lifecycle.ts";

const BATTLE_SNAPSHOT_INTERNAL_PROPERTIES = new Set<PropertyKey>([
  "battleId",
  "executionScopeCursors",
  "retiredExecutionScopeAllocations",
  "acts",
  "pendingInterrupt",
  "displayName",
]);

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const IntegerSchema = Schema.Number.pipe(Schema.int());

const CreationFillWithDistinctOptionIdsSchema = Schema.make<CreationFillFact>(
  annotateOptionIdsAst(CreationFillFactSchema.ast),
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
        jsonSchema: { uniqueItems: true },
      }),
    ),
  }),
);
export type FreshSheetInput = Schema.Schema.Type<typeof FreshSheetInputSchema>;

const AmmunitionStockInputSchema = Schema.Struct({
  ammunition: AmmunitionKindSchema,
  remaining: NonNegativeIntegerSchema,
});

/**
 * Every varying battle fact is explicit at the Case boundary. The origin
 * discriminant lives on the entry itself, so a participant cannot carry both
 * a Character Sheet and a Stat Block source.
 */
export const OracleBattleRosterEntrySchema = Schema.Union(
  Schema.Struct({
    origin: Schema.Literal("characterSheet"),
    combatantId: CombatantId,
    displayName: Schema.NonEmptyTrimmedString,
    initiative: IntegerSchema,
    ammunitionStocks: Schema.Array(AmmunitionStockInputSchema),
  }),
  Schema.Struct({
    origin: Schema.Literal("statBlock"),
    combatantId: CombatantId,
    statBlockId: StatBlockIdSchema,
    initiative: IntegerSchema,
    ammunitionStocks: Schema.Array(AmmunitionStockInputSchema),
    conditions: Schema.Array(Schema.Literal("prone")),
    currentHp: Schema.optional(NonNegativeIntegerSchema),
    tempHp: Schema.optional(NonNegativeIntegerSchema),
  }),
);
export type OracleBattleRosterEntry = Schema.Schema.Type<
  typeof OracleBattleRosterEntrySchema
>;

export const OracleBattleInputSchema = Schema.Struct({
  roster: Schema.NonEmptyArray(OracleBattleRosterEntrySchema),
});
export type OracleBattleInput = Schema.Schema.Type<
  typeof OracleBattleInputSchema
>;

export const OracleCaseSchema = Schema.Struct({
  creation: Schema.Struct({
    fillBatches: Schema.Array(CreationFillBatchSchema),
  }),
  sheet: FreshSheetInputSchema,
  battle: OracleBattleInputSchema,
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

const BattleCreatureProjectionIssueSchema = Schema.Struct({
  tag: Schema.Literal("battleCreatureInitIssue"),
  message: Schema.String,
});
const BattleStateInitLeafIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("battleStateInitIssue"),
    message: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("weaponLoadoutMismatch"),
    slot: Schema.Literal("main-hand", "off-hand"),
  }),
);
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

const BattleProjectionIssueSchema = Schema.Struct({
  tag: Schema.Literal("characterBattleEncounterProjectionIssue"),
  origin: Schema.Literal("characterSheet", "statBlock"),
  combatantId: CombatantId,
  issue: Schema.Union(
    BattleCreatureProjectionIssueSchema,
    BattleStateInitIssueSchema,
  ),
});

const BattleProjectionIssuesSchema = Schema.Struct({
  tag: Schema.Literal("characterBattleEncounterProjectionIssues"),
  issues: Schema.NonEmptyArray(BattleProjectionIssueSchema),
});

const BattleEntryIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("statBlockUnavailable"),
    statBlockId: StatBlockIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("battleCreatureInitRejected"),
    issue: BattleCreatureProjectionIssueSchema,
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
);

export type OracleBattleCreatureSnapshot = Omit<
  BattleCreatureSnapshot,
  "displayName" | "origin"
> & {
  readonly origin: Omit<BattleCreatureSnapshot["origin"], "displayName">;
};

export type OracleBattleCheckpoint = Omit<
  BattleSnapshot,
  | "battleId"
  | "executionScopeCursors"
  | "retiredExecutionScopeAllocations"
  | "acts"
  | "pendingInterrupt"
  | "combatants"
> & {
  readonly combatants: readonly OracleBattleCreatureSnapshot[];
};

/** A production Battle Act with all presentation-only fields removed. */
export const OracleBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});
export type OracleBattleAct = Schema.Schema.Type<typeof OracleBattleActSchema>;

export const OracleBattleActsFrontierSchema = Schema.Struct({
  acts: Schema.Array(OracleBattleActSchema),
});
export type OracleBattleActsFrontier = Schema.Schema.Type<
  typeof OracleBattleActsFrontierSchema
>;

export const OracleBattleEnteredSchema = Schema.Struct({
  tag: Schema.Literal("battleEntered"),
  checkpoint: Schema.make<OracleBattleCheckpoint>(
    stripBattleSnapshotAst(BattleSnapshotSchema.ast),
  ),
  frontier: OracleBattleActsFrontierSchema,
});
export type OracleBattleEntered = Schema.Schema.Type<
  typeof OracleBattleEnteredSchema
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
  Schema.Struct({
    tag: Schema.Literal("workflowRejected"),
    reason: WorkflowRejectionSchema,
  }),
);

export type OracleTraceStep = Schema.Schema.Type<typeof OracleTraceStepSchema>;

// This shape is deliberately private. Public callers only receive the
// lifecycle-refined schema/type below, so an invalid sequence cannot be
// constructed through a weaker exported alias.
const OracleTraceShapeSchema = Schema.Struct({
  steps: Schema.NonEmptyArray(OracleTraceStepSchema),
});
export const OracleTraceSchema = OracleTraceShapeSchema.pipe(
  Schema.filter(validOracleTraceLifecycle, {
    message: () => "trace steps do not form a valid Oracle lifecycle",
  }),
);
export type OracleTrace = Schema.Schema.Type<typeof OracleTraceSchema>;

export const oracleCaseSchema = OracleCaseSchema;
export const oracleEvaluationBatchSchema = OracleEvaluationBatchSchema;
export const oracleTraceSchema = OracleTraceSchema;

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

function stripBattleSnapshotAst(ast: AST.AST): AST.AST {
  // The root refinement checks ownership against fields removed above. Its
  // underlying type remains the complete production shape, but the invariant
  // predicate cannot run on a stripped projection.
  const root = AST.isRefinement(ast) ? ast.from : ast;
  return stripBattleSnapshotAstProperties(root);
}

function stripBattleSnapshotAstProperties(ast: AST.AST): AST.AST {
  switch (ast._tag) {
    case "TypeLiteral":
      return new AST.TypeLiteral(
        ast.propertySignatures
          .filter(
            (property) =>
              !BATTLE_SNAPSHOT_INTERNAL_PROPERTIES.has(property.name),
          )
          .map(
            (property) =>
              new AST.PropertySignature(
                property.name,
                stripBattleSnapshotAstProperties(property.type),
                property.isOptional,
                property.isReadonly,
                property.annotations,
              ),
          ),
        ast.indexSignatures.map(
          (signature) =>
            new AST.IndexSignature(
              signature.parameter,
              stripBattleSnapshotAstProperties(signature.type),
              signature.isReadonly,
            ),
        ),
        ast.annotations,
      );
    case "Union":
      return AST.Union.make(
        ast.types.map(stripBattleSnapshotAstProperties),
        ast.annotations,
      );
    case "TupleType":
      return new AST.TupleType(
        ast.elements.map(
          (element) =>
            new AST.OptionalType(
              stripBattleSnapshotAstProperties(element.type),
              element.isOptional,
              element.annotations,
            ),
        ),
        ast.rest.map(
          (element) =>
            new AST.Type(
              stripBattleSnapshotAstProperties(element.type),
              element.annotations,
            ),
        ),
        ast.isReadonly,
        ast.annotations,
      );
    case "Refinement":
      return new AST.Refinement(
        stripBattleSnapshotAstProperties(ast.from),
        ast.filter,
        ast.annotations,
      );
    case "Transformation":
      return new AST.Transformation(
        stripBattleSnapshotAstProperties(ast.from),
        stripBattleSnapshotAstProperties(ast.to),
        ast.transformation,
        ast.annotations,
      );
    default:
      return ast;
  }
}

function annotateOptionIdsAst(ast: AST.AST): AST.AST {
  switch (ast._tag) {
    case "TypeLiteral":
      return new AST.TypeLiteral(
        ast.propertySignatures.map(
          (property) =>
            new AST.PropertySignature(
              property.name,
              property.name === "optionIds"
                ? AST.annotations(property.type, {
                    [AST.JSONSchemaAnnotationId]: { uniqueItems: true },
                  })
                : annotateOptionIdsAst(property.type),
              property.isOptional,
              property.isReadonly,
              property.annotations,
            ),
        ),
        ast.indexSignatures,
        ast.annotations,
      );
    case "Union":
      return AST.Union.make(
        ast.types.map(annotateOptionIdsAst),
        ast.annotations,
      );
    case "TupleType":
      return new AST.TupleType(
        ast.elements.map(
          (element) =>
            new AST.OptionalType(
              annotateOptionIdsAst(element.type),
              element.isOptional,
              element.annotations,
            ),
        ),
        ast.rest.map(
          (element) =>
            new AST.Type(
              annotateOptionIdsAst(element.type),
              element.annotations,
            ),
        ),
        ast.isReadonly,
        ast.annotations,
      );
    case "Refinement":
      return new AST.Refinement(
        annotateOptionIdsAst(ast.from),
        ast.filter,
        ast.annotations,
      );
    case "Transformation":
      return new AST.Transformation(
        annotateOptionIdsAst(ast.from),
        annotateOptionIdsAst(ast.to),
        ast.transformation,
        ast.annotations,
      );
    default:
      return ast;
  }
}
