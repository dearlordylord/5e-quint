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
  UnitId as UnitIdSchema,
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

const OracleBattleConditionsSchema = Schema.Array(
  Schema.Literal("prone"),
).pipe(
  Schema.filter((conditions) => new Set(conditions).size === conditions.length, {
    message: () => "conditions must not contain duplicate members",
  }),
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
);
export type OracleBattleRosterEntry = Schema.Schema.Type<
  typeof OracleBattleRosterEntrySchema
>;

export const OracleBattleInputSchema = Schema.Struct({
  // The production composition owner reports an empty roster as a typed
  // domain failure. Keep that input representable so it can be projected
  // into the Trace; the refinement still admits at most one fresh Sheet.
  roster: Schema.Array(OracleBattleRosterEntrySchema).pipe(
    Schema.filter(
      (roster) =>
        roster.filter((entry) => entry.origin === "characterSheet").length <=
        1,
      {
        message: () =>
          "a Case roster may contain at most one Character Sheet participant",
      },
    ),
  ),
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

const CharacterBattleSpellAccessProjectionIssueSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("characterBattleSpellAccessProjectionIssue"),
    message: Schema.String,
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
    message: Schema.String,
    issueIndex: NonNegativeIntegerSchema,
    cause: Schema.Literal("invalidBuildSpellAccess"),
  }),
);

const CharacterBattleCreatureInitIssueSchema = Schema.Struct({
  tag: Schema.Literal("battleCreatureInitIssue"),
  message: Schema.String,
  spellAccessIssues: Schema.optional(
    Schema.Array(CharacterBattleSpellAccessProjectionIssueSchema).pipe(
      Schema.filter((issues) => issues.length > 0, {
        message: () => "spellAccessIssues must contain at least one issue",
      }),
    ),
  ),
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
);

export type OracleBattleCreatureSnapshot =
  | (Omit<
      Extract<
        BattleCreatureSnapshot,
        { readonly origin: { readonly kind: "character" } }
      >,
      "displayName" | "origin"
    > & {
      readonly origin: Omit<
        Extract<
          BattleCreatureSnapshot["origin"],
          { readonly kind: "character" }
        >,
        "displayName"
      >;
    })
  | Omit<
      Extract<
        BattleCreatureSnapshot,
        { readonly origin: { readonly kind: "statBlock" } }
      >,
      "displayName"
    >;

type OracleBattleCheckpointShape = Omit<
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

/**
 * The public checkpoint is a projection of the production snapshot. Because
 * projection removes the production root refinement together with private
 * fields, it owns an explicit refinement for the invariants that survive the
 * projection (identity, turn order, and retained cross references).
 */
const OracleBattleCheckpointShapeSchema = Schema.make<
  OracleBattleCheckpointShape
>(stripBattleSnapshotAst(BattleSnapshotSchema.ast));

export const OracleBattleCheckpointSchema =
  OracleBattleCheckpointShapeSchema.pipe(
    Schema.filter(oracleBattleCheckpointInvariantsHold, {
      message: () =>
        "Battle checkpoint combatants, turn order, current actor, and cross references must agree.",
    }),
  );
export type OracleBattleCheckpoint = Schema.Schema.Type<
  typeof OracleBattleCheckpointSchema
>;

/** Available Battle subjects, without presentation or Runtime Hole details. */
export const OracleBattleActsFrontierSchema = Schema.Struct({
  acts: Schema.Array(BattleSubjectSchema),
});
export type OracleBattleActsFrontier = Schema.Schema.Type<
  typeof OracleBattleActsFrontierSchema
>;

export const OracleBattleEnteredSchema = Schema.Struct({
  tag: Schema.Literal("battleEntered"),
  checkpoint: OracleBattleCheckpointSchema,
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
  Schema.brand("OracleTrace"),
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

const COMBATANT_REFERENCE_PROPERTIES = new Set([
  "actorId",
  "affectedTargetId",
  "affectedTargetIds",
  "allyId",
  "afterTurnActorId",
  "attackerId",
  "beneficiaryId",
  "carriedCreatureId",
  "carrierId",
  "casterId",
  "combatantId",
  "companionId",
  "currentActorId",
  "damagedId",
  "fallingCreatureId",
  "familiarId",
  "grapplerId",
  "helperId",
  "holderCombatantId",
  "moverId",
  "observerId",
  "obscuringCreatureId",
  "occupantId",
  "ownerId",
  "originalTargetId",
  "previousTargetId",
  "reactorId",
  "readiedActorId",
  "readiedMovementActorId",
  "readiedSpellCasterId",
  "reappearanceCombatantId",
  "responderId",
  "shoverId",
  "sourceCombatantId",
  "sourceOwnerId",
  "targetEnemyId",
  "targetId",
  "targetIds",
  "triggeringCombatantId",
  "wardedCombatantId",
]);

function oracleBattleCheckpointInvariantsHold(
  checkpoint: OracleBattleCheckpointShape,
): boolean {
  const combatantIds = checkpoint.combatants.map(
    (combatant) => combatant.combatantId,
  );
  const turnOrder = checkpoint.turnOrder;
  const liveCombatantIds = new Set(combatantIds);

  return (
    combatantIds.length > 0 &&
    turnOrder.length > 0 &&
    uniqueValues(combatantIds) &&
    uniqueValues(turnOrder) &&
    turnOrder.length === combatantIds.length &&
    turnOrder.every((combatantId, index) =>
      liveCombatantIds.has(combatantId) &&
      checkpoint.combatants[index]?.combatantId === combatantId,
    ) &&
    liveCombatantIds.has(checkpoint.currentActorId) &&
    allCombatantReferencesAreLive(checkpoint, liveCombatantIds) &&
    executionReferencesAreOwned(checkpoint.combatants)
  );
}

function uniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function allCombatantReferencesAreLive(
  value: unknown,
  liveCombatantIds: ReadonlySet<string>,
): boolean {
  if (Array.isArray(value)) {
    return value.every((member) =>
      allCombatantReferencesAreLive(member, liveCombatantIds),
    );
  }
  if (typeof value !== "object" || value === null) return true;

  return Object.entries(value).every(([property, member]) => {
    if (COMBATANT_REFERENCE_PROPERTIES.has(property)) {
      return Array.isArray(member)
        ? member.every(
            (reference) =>
              typeof reference === "string" &&
              liveCombatantIds.has(reference),
          )
        : typeof member === "string" && liveCombatantIds.has(member);
    }
    return allCombatantReferencesAreLive(member, liveCombatantIds);
  });
}

function executionReferencesAreOwned(
  combatants: readonly OracleBattleCreatureSnapshot[],
): boolean {
  const scopeRefs: string[] = [];
  const nestedScopeRefs: string[] = [];

  for (const combatant of combatants) {
    const originScopeRefs =
      combatant.origin.kind === "character"
        ? [
            combatant.origin.execution.scopeRef,
            combatant.origin.attackExecution.scopeRef,
            ...combatant.origin.druidWildShapeAvailableForms.map(
              (form) => form.execution.scopeRef,
            ),
          ]
        : [combatant.origin.execution.scopeRef];
    if (
      !originScopeRefs.every((scopeRef) =>
        executionScopeBelongsToCombatant(scopeRef, combatant.combatantId),
      )
    ) {
      return false;
    }
    scopeRefs.push(...originScopeRefs);

    if (combatant.origin.kind === "character") {
      nestedScopeRefs.push(
        ...combatant.origin.execution.procedureBindings.map(
          (binding) => binding.procedureRef,
        ),
        ...combatant.origin.resources.map(
          (resource) => resource.resourcePoolRef,
        ),
        ...[
          combatant.origin.attackExecution.attackProcedureRef,
          combatant.origin.attackExecution.unarmedStrikeProcedureRef,
          combatant.origin.attackExecution.offHandAttackProcedureRef,
        ].flatMap((procedureRef) =>
          procedureRef === null ? [] : [procedureRef],
        ),
        ...combatant.origin.druidWildShapeAvailableForms.flatMap((form) => [
          ...form.execution.procedureBindings.map(
            (binding) => binding.procedureRef,
          ),
          ...form.execution.resourcePools.map((pool) => pool.resourcePoolRef),
        ]),
      );
      continue;
    }

    nestedScopeRefs.push(
      ...combatant.origin.execution.procedureBindings.map(
        (binding) => binding.procedureRef,
      ),
      ...combatant.origin.execution.resourcePools.map(
        (pool) => pool.resourcePoolRef,
      ),
    );
  }

  const ownedScopes = new Set(scopeRefs);
  return (
    ownedScopes.size === scopeRefs.length &&
    nestedScopeRefs.every((reference) => {
      const parsed = parseExecutionReference(reference);
      return (
        parsed !== undefined &&
        typeof parsed.scopeRef === "string" &&
        ownedScopes.has(parsed.scopeRef)
      );
    })
  );
}

function executionScopeBelongsToCombatant(
  scopeRef: string,
  combatantId: string,
): boolean {
  return parseExecutionReference(scopeRef)?.combatantId === combatantId;
}

function parseExecutionReference(
  reference: string,
): { readonly combatantId?: unknown; readonly scopeRef?: unknown } | undefined {
  try {
    const parsed: unknown = JSON.parse(reference);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    return parsed as {
      readonly combatantId?: unknown;
      readonly scopeRef?: unknown;
    };
  } catch {
    return undefined;
  }
}
