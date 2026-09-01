import { createHash } from "node:crypto";
import type {
  BattleCreatureSpaceTraversalMovementFact,
  BattleId,
  BattleMovementSpeedKind,
  BattleObjectId,
  BattleOpportunityAttackThreat,
  BattleProcedureExecutionRef,
  BattleTablePositionId,
  CombatantId,
} from "../../../packages/battle-runtime/src/consumer-protocol.ts";
import {
  battleObjectId,
  battleTablePositionId,
  combatantId,
  isBattleAttackProcedureExecutionRef,
  isBattleProcedureExecutionRef,
  isBattleStatBlockProcedureExecutionRef,
} from "../../../packages/battle-runtime/src/consumer-protocol.ts";
import { StatBlockAttackDamageSelection } from "../../../packages/battle-runtime/src/stat-block-attack-damage-selection.ts";
import {
  ABILITIES,
  DAMAGE_TYPES,
  movementFeet,
  type CoverType,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
} from "../../../packages/shared/src/types.ts";
import {
  parseCoordinate,
  type ArenaSnapshot,
  type BoundaryOpenness,
  type CoordinateInput,
  type DistanceFeet,
  type SpatialSnapshot,
} from "../../../packages/tactical-space/src/index.ts";
import type { Result as ResultTypes } from "effect";
import { Result, Match, Schema } from "effect";

export type ScenarioTokenId = CombatantId | BattleObjectId;

const ScenarioSpatialDecisionId = Schema.Trimmed.check(
  Schema.isNonEmpty(),
).pipe(Schema.brand("ScenarioSpatialDecisionId"));
export type ScenarioSpatialDecisionId = typeof ScenarioSpatialDecisionId.Type;

const ScenarioTableSpatialFingerprint = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^sha256:[0-9a-f]{64}$/)),
  Schema.brand("ScenarioTableSpatialFingerprint"),
);
export type ScenarioTableSpatialFingerprint =
  typeof ScenarioTableSpatialFingerprint.Type;

const SCENARIO_DIRECTIONS = [
  "same-horizontal-position",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;
export type ScenarioDirection = (typeof SCENARIO_DIRECTIONS)[number];

export type ScenarioSpatialRelationAnswer = Readonly<{
  readonly direction: ScenarioDirection;
  readonly distanceFeet: DistanceFeet;
  readonly attackerCanSeeTarget: boolean;
  readonly cover: CoverType;
  readonly traversal: BoundaryOpenness;
}>;

export type ScenarioPhysicalReachabilityAnswer = Readonly<{
  readonly kind: "physicalReachability";
}>;

type ScenarioSpatialDecisionQuestionCore =
  | Readonly<{
      readonly kind: "relation";
      readonly sourceId: ScenarioTokenId;
      readonly targetId: ScenarioTokenId;
    }>
  | Readonly<{
      readonly kind: "spellTarget";
      readonly casterId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }>
  | Readonly<{
      readonly kind: "objectTarget";
      readonly actorId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }>
  | Readonly<{
      readonly kind: "attackTarget";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly targetConstraint: "meleeReach" | "rangedRange";
    }>
  | Readonly<{
      readonly kind: "grappleTarget";
      readonly grapplerId: CombatantId;
      readonly targetId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "shoveTarget";
      readonly shoverId: CombatantId;
      readonly targetId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "stagedConditionShakeAwakeTarget";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "areaControlShakeAwakeTarget";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "helpAttackTarget";
      readonly helperId: CombatantId;
      readonly targetEnemyId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "movementRoute";
      readonly moverId: CombatantId;
      readonly route: readonly [CoordinateInput, ...CoordinateInput[]];
      readonly speedKind: BattleMovementSpeedKind;
    }>;

export type ScenarioSpatialDecisionQuestion =
  ScenarioSpatialDecisionQuestionCore;

export type ScenarioTableSpatialPostMoveStateInput = Readonly<{
  readonly kind: "tableAuthored";
  readonly spatialFingerprint: ScenarioTableSpatialFingerprint;
  readonly tableAuthoredDecisions: readonly ScenarioNonMovementSpatialDecisionInput[];
}>;

export type ScenarioTableSpatialPostMoveState = Readonly<{
  readonly kind: "tableAuthored";
  readonly spatialFingerprint: ScenarioTableSpatialFingerprint;
  readonly tableAuthoredDecisions: readonly ScenarioNonMovementSpatialDecision[];
}>;

type ScenarioMovementRouteAnswerInput = Readonly<{
  readonly kind: "movementRoute";
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly creatureSpaceTraversal:
    | Readonly<{ readonly kind: "notRequired" }>
    | Readonly<{
        readonly kind: "fact";
        readonly value: BattleCreatureSpaceTraversalMovementFact;
      }>;
  readonly postMoveSpatialState: ScenarioTableSpatialPostMoveStateInput;
}>;

type ScenarioMovementRouteAnswer = Readonly<{
  readonly kind: "movementRoute";
  readonly movementCostFeet: MovementFeet;
  readonly provokedOpportunityAttacks: readonly BattleOpportunityAttackThreat[];
  readonly creatureSpaceTraversal:
    | Readonly<{ readonly kind: "notRequired" }>
    | Readonly<{
        readonly kind: "fact";
        readonly value: BattleCreatureSpaceTraversalMovementFact;
      }>;
  readonly postMoveSpatialState: ScenarioTableSpatialPostMoveState;
}>;

type ScenarioRelationSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "relation" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioSpellTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "spellTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioObjectTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "objectTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioAttackTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "attackTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioGrappleTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "grappleTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioShoveTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "shoveTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioStagedConditionShakeAwakeTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "stagedConditionShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioAreaControlShakeAwakeTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "areaControlShakeAwakeTarget" }
  >;
  readonly answer: ScenarioPhysicalReachabilityAnswer;
}>;
type ScenarioHelpAttackTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "helpAttackTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioMovementRouteSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "movementRoute" }
  >;
  readonly answer: ScenarioMovementRouteAnswerInput;
}>;

export type ScenarioSpatialDecisionInput =
  | ScenarioRelationSpatialDecisionInput
  | ScenarioSpellTargetSpatialDecisionInput
  | ScenarioObjectTargetSpatialDecisionInput
  | ScenarioAttackTargetSpatialDecisionInput
  | ScenarioGrappleTargetSpatialDecisionInput
  | ScenarioShoveTargetSpatialDecisionInput
  | ScenarioStagedConditionShakeAwakeTargetSpatialDecisionInput
  | ScenarioAreaControlShakeAwakeTargetSpatialDecisionInput
  | ScenarioHelpAttackTargetSpatialDecisionInput
  | ScenarioMovementRouteSpatialDecisionInput;

type ScenarioRelationSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "relation" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioSpellTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "spellTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioObjectTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "objectTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioAttackTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "attackTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioGrappleTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "grappleTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioShoveTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "shoveTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioStagedConditionShakeAwakeTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "stagedConditionShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioAreaControlShakeAwakeTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "areaControlShakeAwakeTarget" }
  >;
  readonly answer: ScenarioPhysicalReachabilityAnswer;
}>;
type ScenarioHelpAttackTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "helpAttackTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioMovementRouteSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "movementRoute" }
  >;
  readonly answer: ScenarioMovementRouteAnswer;
}>;

export type ScenarioSpatialDecision =
  | ScenarioRelationSpatialDecision
  | ScenarioSpellTargetSpatialDecision
  | ScenarioObjectTargetSpatialDecision
  | ScenarioAttackTargetSpatialDecision
  | ScenarioGrappleTargetSpatialDecision
  | ScenarioShoveTargetSpatialDecision
  | ScenarioStagedConditionShakeAwakeTargetSpatialDecision
  | ScenarioAreaControlShakeAwakeTargetSpatialDecision
  | ScenarioHelpAttackTargetSpatialDecision
  | ScenarioMovementRouteSpatialDecision;

/** Return every authored decision id, including canonical post-move decisions. */
export function scenarioSpatialDecisionIds(
  decision: ScenarioSpatialDecision,
): readonly ScenarioSpatialDecisionId[] {
  return Match.value(decision).pipe(
    Match.when({ question: { kind: "relation" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when({ question: { kind: "spellTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when({ question: { kind: "objectTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when({ question: { kind: "attackTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when({ question: { kind: "grappleTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when({ question: { kind: "shoveTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when(
      { question: { kind: "stagedConditionShakeAwakeTarget" } },
      ({ decisionId }) => [decisionId],
    ),
    Match.when(
      { question: { kind: "areaControlShakeAwakeTarget" } },
      ({ decisionId }) => [decisionId],
    ),
    Match.when({ question: { kind: "helpAttackTarget" } }, ({ decisionId }) => [
      decisionId,
    ]),
    Match.when(
      { question: { kind: "movementRoute" } },
      ({ decisionId, answer }) => [
        decisionId,
        ...answer.postMoveSpatialState.tableAuthoredDecisions.flatMap(
          scenarioSpatialDecisionIds,
        ),
      ],
    ),
    Match.exhaustive,
  );
}

export type ScenarioNonMovementSpatialDecisionInput =
  | ScenarioRelationSpatialDecisionInput
  | ScenarioSpellTargetSpatialDecisionInput
  | ScenarioObjectTargetSpatialDecisionInput
  | ScenarioAttackTargetSpatialDecisionInput
  | ScenarioGrappleTargetSpatialDecisionInput
  | ScenarioShoveTargetSpatialDecisionInput
  | ScenarioStagedConditionShakeAwakeTargetSpatialDecisionInput
  | ScenarioAreaControlShakeAwakeTargetSpatialDecisionInput
  | ScenarioHelpAttackTargetSpatialDecisionInput;
type ScenarioNonMovementSpatialDecision =
  | ScenarioRelationSpatialDecision
  | ScenarioSpellTargetSpatialDecision
  | ScenarioObjectTargetSpatialDecision
  | ScenarioAttackTargetSpatialDecision
  | ScenarioGrappleTargetSpatialDecision
  | ScenarioShoveTargetSpatialDecision
  | ScenarioStagedConditionShakeAwakeTargetSpatialDecision
  | ScenarioAreaControlShakeAwakeTargetSpatialDecision
  | ScenarioHelpAttackTargetSpatialDecision;

export type ScenarioSpatialBoundary =
  | Readonly<{
      readonly kind: "geometryDerived";
      readonly arena: ArenaSnapshot;
      readonly space: SpatialSnapshot;
    }>
  | Readonly<{
      readonly kind: "tableAuthored";
      readonly spatialFingerprint: ScenarioTableSpatialFingerprint;
      readonly tableAuthoredDecisions: readonly ScenarioTableSpatialDecision[];
    }>;

declare const scenarioSessionLineageIdBrand: unique symbol;
export type ScenarioSessionLineageId = string & {
  readonly [scenarioSessionLineageIdBrand]: true;
};

export type ScenarioTableSpatialDecision = Readonly<{
  readonly source: "tableAuthored";
  readonly decision: ScenarioSpatialDecision;
  readonly lineage: Readonly<{
    readonly battleId: BattleId;
    readonly scenarioSessionLineageId: ScenarioSessionLineageId;
    readonly battleRuntimeSessionIdentity: string;
    readonly spatialFingerprint: ScenarioTableSpatialFingerprint;
  }>;
}>;

export type ScenarioSpatialDecisionIssue = Readonly<{
  readonly tag:
    | "invalid-spatial-decision"
    | "duplicate-spatial-decision"
    | "contradictory-spatial-decision"
    | "spatial-decision-lineage-conflict";
  readonly decisionId: string;
  readonly message: string;
}>;

export type ScenarioSpatialDistanceFeetIssue = Readonly<{
  readonly tag: "invalid-spatial-distance-feet";
  readonly value: number;
  readonly message: string;
}>;

export type ScenarioSpatialWitnessSource =
  | Readonly<{
      readonly kind: "geometryDerived";
      readonly adapter: "tactical-space";
    }>
  | Readonly<{
      readonly kind: "tableAuthored";
      readonly decisionId: ScenarioSpatialDecisionId;
      readonly lineage: Readonly<{
        readonly battleId: BattleId;
        readonly scenarioSessionLineageId: ScenarioSessionLineageId;
        readonly battleRuntimeSessionIdentity: string;
        readonly spatialFingerprint: ScenarioTableSpatialFingerprint;
      }>;
    }>;

export type ScenarioSpatialWitness<A> = Readonly<{
  readonly source: ScenarioSpatialWitnessSource;
  readonly question: ScenarioSpatialDecisionQuestion;
  readonly value: A;
}>;

function isFiniteNonNegativeInteger(value: unknown): value is DistanceFeet {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isScenarioDirection(value: unknown): value is ScenarioDirection {
  return (
    typeof value === "string" &&
    SCENARIO_DIRECTIONS.some((direction) => direction === value)
  );
}

export function stableSpatialDecisionJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSpatialDecisionJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableSpatialDecisionJson(Reflect.get(value, key))}`,
    )
    .join(",")}}`;
}

export function scenarioTableSpatialFingerprint(
  value: unknown,
): ScenarioTableSpatialFingerprint {
  const digest = createHash("sha256")
    .update(stableSpatialDecisionJson(value))
    .digest("hex");
  const fingerprint = `sha256:${digest}`;
  const decoded = Schema.decodeUnknownResult(ScenarioTableSpatialFingerprint)(
    fingerprint,
  );
  if (Result.isFailure(decoded)) {
    // The digest is constructed locally; this branch asserts an internal hash invariant, not authored input.
    throw new Error(
      "SHA-256 digest did not produce a table spatial fingerprint.",
    );
  }
  return decoded.success;
}

export function scenarioDistanceFeet(
  value: number,
): ResultTypes.Result<DistanceFeet, ScenarioSpatialDistanceFeetIssue> {
  if (!isFiniteNonNegativeInteger(value)) {
    return Result.fail({
      tag: "invalid-spatial-distance-feet",
      value,
      message: "A spatial distance must be a finite non-negative integer.",
    });
  }
  return Result.succeed(value);
}

export function spatialQuestionKey(
  question: ScenarioSpatialDecisionQuestion,
): string {
  return Match.value(question).pipe(
    Match.when({ kind: "relation" }, ({ kind, sourceId, targetId }) =>
      JSON.stringify([kind, String(sourceId), String(targetId)]),
    ),
    Match.when(
      { kind: "spellTarget" },
      ({ kind, casterId, targetId, sourceProcedureRef }) =>
        JSON.stringify([
          kind,
          String(casterId),
          String(targetId),
          String(sourceProcedureRef),
        ]),
    ),
    Match.when(
      { kind: "objectTarget" },
      ({ kind, actorId, objectId, sourceProcedureRef }) =>
        JSON.stringify([
          kind,
          String(actorId),
          String(objectId),
          String(sourceProcedureRef),
        ]),
    ),
    Match.when(
      { kind: "attackTarget" },
      ({ kind, actorId, targetId, sourceProcedureRef, targetConstraint }) =>
        JSON.stringify([
          kind,
          String(actorId),
          String(targetId),
          String(sourceProcedureRef),
          targetConstraint,
        ]),
    ),
    Match.when({ kind: "grappleTarget" }, ({ kind, grapplerId, targetId }) =>
      JSON.stringify([kind, String(grapplerId), String(targetId)]),
    ),
    Match.when({ kind: "shoveTarget" }, ({ kind, shoverId, targetId }) =>
      JSON.stringify([kind, String(shoverId), String(targetId)]),
    ),
    Match.when(
      { kind: "stagedConditionShakeAwakeTarget" },
      ({ kind, actorId, targetId }) =>
        JSON.stringify([kind, String(actorId), String(targetId)]),
    ),
    Match.when(
      { kind: "areaControlShakeAwakeTarget" },
      ({ kind, actorId, targetId }) =>
        JSON.stringify([kind, String(actorId), String(targetId)]),
    ),
    Match.when(
      { kind: "helpAttackTarget" },
      ({ kind, helperId, targetEnemyId }) =>
        JSON.stringify([kind, String(helperId), String(targetEnemyId)]),
    ),
    Match.when(
      { kind: "movementRoute" },
      ({ kind, moverId, speedKind, route }) =>
        JSON.stringify([
          kind,
          String(moverId),
          speedKind,
          route.map(({ x, y }) => [x, y]),
        ]),
    ),
    Match.exhaustive,
  );
}

export function spatialDecisionValueKey(
  decision: Pick<ScenarioSpatialDecision, "question" | "answer">,
): string {
  return `${spatialQuestionKey(decision.question)}:${stableSpatialDecisionJson(decision.answer)}`;
}

export function spatialDecisionIssue(
  tag: ScenarioSpatialDecisionIssue["tag"],
  decisionId: string,
  message: string,
): ScenarioSpatialDecisionIssue {
  return { tag, decisionId, message };
}

export function isNonMovementSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioNonMovementSpatialDecision {
  return decision.question.kind !== "movementRoute";
}

function isMovementRouteSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioMovementRouteSpatialDecisionInput {
  return input.question.kind === "movementRoute";
}

function isNonMovementSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioNonMovementSpatialDecisionInput {
  return input.question.kind !== "movementRoute";
}

function isRelationSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioRelationSpatialDecision {
  return decision.question.kind === "relation";
}

function isSpellTargetSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioSpellTargetSpatialDecision {
  return decision.question.kind === "spellTarget";
}

function isObjectTargetSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioObjectTargetSpatialDecision {
  return decision.question.kind === "objectTarget";
}

function isAttackTargetSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioAttackTargetSpatialDecision {
  return decision.question.kind === "attackTarget";
}

function isMovementRouteSpatialDecision(
  decision: ScenarioSpatialDecision,
): decision is ScenarioMovementRouteSpatialDecision {
  return decision.question.kind === "movementRoute";
}

/**
 * Returns every scenario entity named by a normalized decision, including
 * movement witnesses and decisions carried by its canonical post-move state.
 * The setup boundary uses this complete set to reject stale or malformed
 * table facts before they can enter a session.
 */
export function scenarioSpatialDecisionEntityReferences(
  decision: ScenarioSpatialDecision,
): readonly ScenarioTokenId[] {
  return Match.value(decision).pipe(
    Match.when(isRelationSpatialDecision, ({ question }) => [
      question.sourceId,
      question.targetId,
    ]),
    Match.when(isSpellTargetSpatialDecision, ({ question }) => [
      question.casterId,
      question.targetId,
    ]),
    Match.when(isObjectTargetSpatialDecision, ({ question }) => [
      question.actorId,
      question.objectId,
    ]),
    Match.when(isAttackTargetSpatialDecision, ({ question }) => [
      question.actorId,
      question.targetId,
    ]),
    Match.when({ question: { kind: "grappleTarget" } }, ({ question }) => [
      question.grapplerId,
      question.targetId,
    ]),
    Match.when({ question: { kind: "shoveTarget" } }, ({ question }) => [
      question.shoverId,
      question.targetId,
    ]),
    Match.when(
      { question: { kind: "stagedConditionShakeAwakeTarget" } },
      ({ question }) => [question.actorId, question.targetId],
    ),
    Match.when(
      { question: { kind: "areaControlShakeAwakeTarget" } },
      ({ question }) => [question.actorId, question.targetId],
    ),
    Match.when({ question: { kind: "helpAttackTarget" } }, ({ question }) => [
      question.helperId,
      question.targetEnemyId,
    ]),
    Match.when(isMovementRouteSpatialDecision, (movement) => {
      const references: ScenarioTokenId[] = [movement.question.moverId];
      for (const threat of movement.answer.provokedOpportunityAttacks) {
        references.push(threat.reactorId);
      }
      const traversalReferences = Match.value(
        movement.answer.creatureSpaceTraversal,
      ).pipe(
        Match.when({ kind: "notRequired" }, (): ScenarioTokenId[] => []),
        Match.when({ kind: "fact" }, ({ value }) => {
          const factReferences: ScenarioTokenId[] = value.occupiedSpaces.map(
            ({ occupantId }) => occupantId,
          );
          const destinationReferences = Match.value(value.destination).pipe(
            Match.when({ kind: "unoccupiedSpace" }, () => []),
            Match.when({ kind: "occupiedCreatureSpace" }, ({ occupantId }) => [
              occupantId,
            ]),
            Match.exhaustive,
          );
          factReferences.push(...destinationReferences);
          return factReferences;
        }),
        Match.exhaustive,
      );
      references.push(...traversalReferences);
      for (const nestedDecision of movement.answer.postMoveSpatialState
        .tableAuthoredDecisions) {
        references.push(
          ...scenarioSpatialDecisionEntityReferences(nestedDecision),
        );
      }
      return references;
    }),
    Match.exhaustive,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function rememberObject(value: unknown, seen: WeakSet<object>): boolean {
  if (typeof value !== "object" || value === null) return true;
  if (seen.has(value)) return false;
  seen.add(value);
  return true;
}

function unknownDecisionId(value: unknown): string {
  return isRecord(value) && typeof value.decisionId === "string"
    ? value.decisionId
    : "<unknown-spatial-decision>";
}

function malformedDecision(
  input: unknown,
  message: string,
): ResultTypes.Result<never, ScenarioSpatialDecisionIssue> {
  return Result.fail(
    spatialDecisionIssue(
      "invalid-spatial-decision",
      unknownDecisionId(input),
      message,
    ),
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return isString(value) && value.length > 0 && value === value.trim();
}

function parseProcedureRef(
  value: unknown,
  input: unknown,
): ResultTypes.Result<
  BattleProcedureExecutionRef,
  ScenarioSpatialDecisionIssue
> {
  if (!isString(value) || value.trim().length === 0) {
    return malformedDecision(
      input,
      "A sourceProcedureRef must be a canonical Battle procedure execution reference.",
    );
  }
  const trimmed = value.trim();
  return !isBattleProcedureExecutionRef(trimmed)
    ? malformedDecision(
        input,
        "A sourceProcedureRef must be a canonical Battle procedure execution reference.",
      )
    : Result.succeed(trimmed);
}

function isCoordinateInput(value: unknown): value is CoordinateInput {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["x", "y"]) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

function isBattleMovementSpeedKind(
  value: unknown,
): value is BattleMovementSpeedKind {
  return (
    value === "walk" || value === "climb" || value === "swim" || value === "fly"
  );
}

type ScenarioAttackAbility = (typeof ABILITIES)[number] | "spellcasting";
type ScenarioAttackDamageType = (typeof DAMAGE_TYPES)[number];

function isScenarioAttackAbility(
  value: unknown,
): value is ScenarioAttackAbility {
  return (
    value === "spellcasting" || ABILITIES.some((ability) => ability === value)
  );
}

function isScenarioAttackDamageType(
  value: unknown,
): value is ScenarioAttackDamageType {
  return DAMAGE_TYPES.some((damageType) => damageType === value);
}

function parseSpatialQuestion(
  value: unknown,
  input: unknown,
): ResultTypes.Result<
  ScenarioSpatialDecisionQuestion,
  ScenarioSpatialDecisionIssue
> {
  if (!isRecord(value) || !isString(value.kind)) {
    return malformedDecision(
      input,
      "A spatial decision requires a tagged question object.",
    );
  }
  if (value.kind === "relation") {
    if (
      !hasOnlyKeys(value, ["kind", "sourceId", "targetId"]) ||
      !isNonEmptyTrimmedString(value.sourceId) ||
      !isNonEmptyTrimmedString(value.targetId)
    ) {
      return malformedDecision(
        input,
        "A relation question requires string sourceId and targetId values.",
      );
    }
    return Result.succeed({
      kind: "relation",
      sourceId: combatantId(value.sourceId),
      targetId: combatantId(value.targetId),
    });
  }
  if (value.kind === "spellTarget") {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "casterId",
        "targetId",
        "sourceProcedureRef",
      ]) ||
      !isNonEmptyTrimmedString(value.casterId) ||
      !isNonEmptyTrimmedString(value.targetId)
    ) {
      return malformedDecision(
        input,
        "A spell-target question requires string casterId and targetId values and a non-empty sourceProcedureRef.",
      );
    }
    const sourceProcedureRef = parseProcedureRef(
      value.sourceProcedureRef,
      input,
    );
    if (Result.isFailure(sourceProcedureRef)) {
      return Result.fail(sourceProcedureRef.failure);
    }
    return Result.succeed({
      kind: "spellTarget",
      casterId: combatantId(value.casterId),
      targetId: combatantId(value.targetId),
      sourceProcedureRef: sourceProcedureRef.success,
    });
  }
  if (value.kind === "objectTarget") {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "actorId",
        "objectId",
        "sourceProcedureRef",
      ]) ||
      !isNonEmptyTrimmedString(value.actorId) ||
      !isNonEmptyTrimmedString(value.objectId)
    ) {
      return malformedDecision(
        input,
        "An object-target question requires string actorId and objectId values and a non-empty sourceProcedureRef.",
      );
    }
    const sourceProcedureRef = parseProcedureRef(
      value.sourceProcedureRef,
      input,
    );
    if (Result.isFailure(sourceProcedureRef)) {
      return Result.fail(sourceProcedureRef.failure);
    }
    return Result.succeed({
      kind: "objectTarget",
      actorId: combatantId(value.actorId),
      objectId: battleObjectId(value.objectId),
      sourceProcedureRef: sourceProcedureRef.success,
    });
  }
  if (value.kind === "attackTarget") {
    if (
      !hasOnlyKeys(value, [
        "kind",
        "actorId",
        "targetId",
        "sourceProcedureRef",
        "targetConstraint",
      ]) ||
      !isNonEmptyTrimmedString(value.actorId) ||
      !isNonEmptyTrimmedString(value.targetId) ||
      (value.targetConstraint !== "meleeReach" &&
        value.targetConstraint !== "rangedRange")
    ) {
      return malformedDecision(
        input,
        "An attack-target question requires string actorId and targetId values, a non-empty sourceProcedureRef, and a supported targetConstraint.",
      );
    }
    const sourceProcedureRef = parseProcedureRef(
      value.sourceProcedureRef,
      input,
    );
    if (Result.isFailure(sourceProcedureRef)) {
      return Result.fail(sourceProcedureRef.failure);
    }
    return Result.succeed({
      kind: "attackTarget",
      actorId: combatantId(value.actorId),
      targetId: combatantId(value.targetId),
      sourceProcedureRef: sourceProcedureRef.success,
      targetConstraint: value.targetConstraint,
    });
  }
  if (
    value.kind === "grappleTarget" ||
    value.kind === "shoveTarget" ||
    value.kind === "stagedConditionShakeAwakeTarget" ||
    value.kind === "areaControlShakeAwakeTarget"
  ) {
    const actorField =
      value.kind === "grappleTarget"
        ? "grapplerId"
        : value.kind === "shoveTarget"
          ? "shoverId"
          : "actorId";
    if (
      !hasOnlyKeys(value, ["kind", actorField, "targetId"]) ||
      !isNonEmptyTrimmedString(value[actorField]) ||
      !isNonEmptyTrimmedString(value.targetId)
    ) {
      return malformedDecision(
        input,
        `A ${value.kind} question requires string ${actorField} and targetId values.`,
      );
    }
    const actorId = combatantId(value[actorField]);
    const targetId = combatantId(value.targetId);
    return Result.succeed(
      value.kind === "grappleTarget"
        ? {
            kind: "grappleTarget" as const,
            grapplerId: actorId,
            targetId,
          }
        : value.kind === "shoveTarget"
          ? {
              kind: "shoveTarget" as const,
              shoverId: actorId,
              targetId,
            }
          : value.kind === "stagedConditionShakeAwakeTarget"
            ? {
                kind: "stagedConditionShakeAwakeTarget" as const,
                actorId,
                targetId,
              }
            : {
                kind: "areaControlShakeAwakeTarget" as const,
                actorId,
                targetId,
              },
    );
  }
  if (value.kind === "helpAttackTarget") {
    if (
      !hasOnlyKeys(value, ["kind", "helperId", "targetEnemyId"]) ||
      !isNonEmptyTrimmedString(value.helperId) ||
      !isNonEmptyTrimmedString(value.targetEnemyId)
    ) {
      return malformedDecision(
        input,
        "A helpAttackTarget question requires string helperId and targetEnemyId values.",
      );
    }
    return Result.succeed({
      kind: "helpAttackTarget" as const,
      helperId: combatantId(value.helperId),
      targetEnemyId: combatantId(value.targetEnemyId),
    });
  }
  if (value.kind === "movementRoute") {
    if (
      !hasOnlyKeys(value, ["kind", "moverId", "route", "speedKind"]) ||
      !isNonEmptyTrimmedString(value.moverId) ||
      !isBattleMovementSpeedKind(value.speedKind) ||
      !Array.isArray(value.route) ||
      value.route.length === 0 ||
      !value.route.every(isCoordinateInput)
    ) {
      return malformedDecision(
        input,
        "A movement-route question requires a non-empty route of finite coordinate objects, a string moverId, and a supported speedKind.",
      );
    }
    const firstCoordinate = value.route[0];
    if (firstCoordinate === undefined) {
      return malformedDecision(input, "A movement route cannot be empty.");
    }
    return Result.succeed({
      kind: "movementRoute",
      moverId: combatantId(value.moverId),
      route: [
        { x: firstCoordinate.x, y: firstCoordinate.y },
        ...value.route.slice(1).map(({ x, y }) => ({ x, y })),
      ],
      speedKind: value.speedKind,
    });
  }
  return malformedDecision(
    input,
    `Spatial question kind ${JSON.stringify(value.kind)} is unsupported.`,
  );
}

function parseRelationAnswer(
  value: unknown,
  input: unknown,
): ResultTypes.Result<
  ScenarioSpatialRelationAnswer,
  ScenarioSpatialDecisionIssue
> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "direction",
      "distanceFeet",
      "attackerCanSeeTarget",
      "cover",
      "traversal",
    ])
  ) {
    return malformedDecision(
      input,
      "A non-movement spatial answer requires a finite non-negative integer distance, boolean sight, and supported Cover and traversal values.",
    );
  }
  const distanceFeet = value.distanceFeet;
  if (
    !isScenarioDirection(value.direction) ||
    !isFiniteNonNegativeInteger(distanceFeet) ||
    typeof value.attackerCanSeeTarget !== "boolean" ||
    (value.cover !== "none" &&
      value.cover !== "half" &&
      value.cover !== "threeQuarters" &&
      value.cover !== "total") ||
    (value.traversal !== "open" && value.traversal !== "blocked")
  ) {
    return malformedDecision(
      input,
      "A non-movement spatial answer requires a finite non-negative integer distance, boolean sight, and supported Cover and traversal values.",
    );
  }
  return Result.succeed({
    direction: value.direction,
    distanceFeet,
    attackerCanSeeTarget: value.attackerCanSeeTarget,
    cover: value.cover,
    traversal: value.traversal,
  });
}

function parseOpportunityAttackThreatInput(
  value: unknown,
): BattleOpportunityAttackThreat | undefined {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "reactorId",
      "distanceFeet",
      "procedureRef",
      "attackAbility",
      "attackDamageType",
      "attackName",
      "statBlockDamageSelection",
    ]) ||
    !isNonEmptyTrimmedString(value.reactorId) ||
    !isFiniteNonNegativeInteger(value.distanceFeet) ||
    !Number.isInteger(value.distanceFeet) ||
    !isNonEmptyTrimmedString(value.procedureRef)
  ) {
    return undefined;
  }
  const selection = value;
  const attackAbility = selection.attackAbility;
  const attackDamageType = selection.attackDamageType;
  const hasAttackAbility = attackAbility !== undefined;
  const hasAttackDamageType = attackDamageType !== undefined;
  if (hasAttackAbility !== hasAttackDamageType) {
    return undefined;
  }
  if (hasAttackAbility && !isScenarioAttackAbility(attackAbility)) {
    return undefined;
  }
  if (hasAttackDamageType && !isScenarioAttackDamageType(attackDamageType)) {
    return undefined;
  }
  if (selection.attackName !== undefined) return undefined;
  if (hasAttackAbility && selection.statBlockDamageSelection !== undefined) {
    return undefined;
  }
  if (!hasAttackAbility && selection.statBlockDamageSelection === undefined) {
    return undefined;
  }
  const reactorId = combatantId(value.reactorId);
  const distanceFeet = movementFeet(value.distanceFeet);
  if (hasAttackAbility && hasAttackDamageType) {
    if (!isBattleAttackProcedureExecutionRef(value.procedureRef)) {
      return undefined;
    }
    return {
      reactorId,
      distanceFeet,
      procedureRef: value.procedureRef,
      attackAbility,
      attackDamageType,
    };
  }
  if (!isBattleStatBlockProcedureExecutionRef(value.procedureRef)) {
    return undefined;
  }
  const statBlockDamageSelection = Schema.decodeUnknownResult(
    StatBlockAttackDamageSelection,
  )(selection.statBlockDamageSelection);
  if (Result.isFailure(statBlockDamageSelection)) return undefined;
  return {
    reactorId,
    distanceFeet,
    procedureRef: value.procedureRef,
    statBlockDamageSelection: statBlockDamageSelection.success,
  };
}

function parseCreatureSpaceTraversal(
  value: unknown,
  input: unknown,
  seen: WeakSet<object>,
): ResultTypes.Result<
  ScenarioMovementRouteAnswerInput["creatureSpaceTraversal"],
  ScenarioSpatialDecisionIssue
> {
  if (!isRecord(value) || !isString(value.kind)) {
    return malformedDecision(
      input,
      "A movement answer requires a tagged creature-space traversal value.",
    );
  }
  if (!rememberObject(value, seen)) {
    return malformedDecision(
      input,
      "A movement answer graph must not contain cyclic nested values.",
    );
  }
  if (value.kind === "notRequired" && hasOnlyKeys(value, ["kind"]))
    return Result.succeed({ kind: "notRequired" });
  if (value.kind !== "fact" || !isRecord(value.value)) {
    return malformedDecision(
      input,
      "A creature-space traversal fact must contain a nested value object.",
    );
  }
  if (!rememberObject(value.value, seen)) {
    return malformedDecision(
      input,
      "A creature-space traversal graph must not contain cyclic nested values.",
    );
  }
  const fact = value.value;
  if (
    !hasOnlyKeys(value, ["kind", "value"]) ||
    !hasOnlyKeys(fact, ["kind", "occupiedSpaces", "destination"]) ||
    fact.kind !== "occupiedCreatureSpaceTraversal" ||
    !Array.isArray(fact.occupiedSpaces) ||
    fact.occupiedSpaces.length === 0 ||
    !fact.occupiedSpaces.every(
      (space) =>
        isRecord(space) &&
        hasOnlyKeys(space, ["occupantId", "positionId"]) &&
        isNonEmptyTrimmedString(space.occupantId) &&
        isNonEmptyTrimmedString(space.positionId),
    ) ||
    !isRecord(fact.destination) ||
    !hasOnlyKeys(
      fact.destination,
      fact.destination.kind === "occupiedCreatureSpace"
        ? ["kind", "occupantId", "positionId"]
        : ["kind", "positionId"],
    ) ||
    !isString(fact.destination.kind) ||
    !isNonEmptyTrimmedString(fact.destination.positionId) ||
    (fact.destination.kind === "occupiedCreatureSpace" &&
      !isNonEmptyTrimmedString(fact.destination.occupantId)) ||
    (fact.destination.kind !== "occupiedCreatureSpace" &&
      fact.destination.kind !== "unoccupiedSpace")
  ) {
    return malformedDecision(
      input,
      "A creature-space traversal fact has an invalid occupied-space or destination shape.",
    );
  }
  const occupiedSpaces = fact.occupiedSpaces.map((space) => ({
    occupantId: combatantId(space.occupantId),
    positionId: battleTablePositionId(space.positionId),
  }));
  const firstOccupiedSpace = occupiedSpaces[0];
  if (firstOccupiedSpace === undefined) {
    return malformedDecision(
      input,
      "A creature-space traversal fact requires at least one occupied space.",
    );
  }
  const nonEmptyOccupiedSpaces: ReadonlyNonEmptyArray<{
    readonly occupantId: CombatantId;
    readonly positionId: BattleTablePositionId;
  }> = [firstOccupiedSpace, ...occupiedSpaces.slice(1)];
  const destination =
    fact.destination.kind === "occupiedCreatureSpace" &&
    isNonEmptyTrimmedString(fact.destination.occupantId)
      ? {
          kind: "occupiedCreatureSpace" as const,
          occupantId: combatantId(fact.destination.occupantId),
          positionId: battleTablePositionId(fact.destination.positionId),
        }
      : {
          kind: "unoccupiedSpace" as const,
          positionId: battleTablePositionId(fact.destination.positionId),
        };
  return Result.succeed({
    kind: "fact",
    value: {
      kind: "occupiedCreatureSpaceTraversal",
      occupiedSpaces: nonEmptyOccupiedSpaces,
      destination,
    },
  });
}

function parseMovementAnswer(
  value: unknown,
  input: unknown,
  seen: WeakSet<object>,
): ResultTypes.Result<
  ScenarioMovementRouteAnswerInput,
  ScenarioSpatialDecisionIssue
> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "kind",
      "movementCostFeet",
      "provokedOpportunityAttacks",
      "creatureSpaceTraversal",
      "postMoveSpatialState",
    ]) ||
    value.kind !== "movementRoute" ||
    !isFiniteNonNegativeInteger(value.movementCostFeet) ||
    !Number.isInteger(value.movementCostFeet)
  ) {
    return malformedDecision(
      input,
      "A movement-route answer requires a finite non-negative movement cost.",
    );
  }
  if (!Array.isArray(value.provokedOpportunityAttacks)) {
    return malformedDecision(
      input,
      "A movement-route answer requires an array of Opportunity Attack threats.",
    );
  }
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  for (const threatInput of value.provokedOpportunityAttacks) {
    const threat = parseOpportunityAttackThreatInput(threatInput);
    if (threat === undefined) {
      return malformedDecision(
        input,
        "A movement-route answer contains a malformed Opportunity Attack threat selection.",
      );
    }
    provokedOpportunityAttacks.push(threat);
  }
  if (!rememberObject(value, seen)) {
    return malformedDecision(
      input,
      "A movement-route answer graph must not contain cyclic nested values.",
    );
  }
  const traversal = parseCreatureSpaceTraversal(
    value.creatureSpaceTraversal,
    input,
    seen,
  );
  if (Result.isFailure(traversal)) return Result.fail(traversal.failure);
  if (!isRecord(value.postMoveSpatialState)) {
    return malformedDecision(
      input,
      "A movement-route answer requires a canonical post-move spatial state object.",
    );
  }
  const postMove = value.postMoveSpatialState;
  if (
    postMove.kind !== "tableAuthored" ||
    !hasOnlyKeys(postMove, [
      "kind",
      "spatialFingerprint",
      "tableAuthoredDecisions",
    ]) ||
    !Array.isArray(postMove.tableAuthoredDecisions)
  ) {
    return malformedDecision(
      input,
      "A Table-authored movement route requires a tagged post-move state with a fingerprint and decision array.",
    );
  }
  const spatialFingerprint = Schema.decodeUnknownResult(
    ScenarioTableSpatialFingerprint,
  )(postMove.spatialFingerprint);
  if (Result.isFailure(spatialFingerprint)) {
    return malformedDecision(
      input,
      "A Table-authored movement route requires a canonical table spatial fingerprint.",
    );
  }
  if (!rememberObject(postMove, seen)) {
    return malformedDecision(
      input,
      "A post-move spatial state graph must not contain cyclic nested values.",
    );
  }
  const nested: ScenarioNonMovementSpatialDecisionInput[] = [];
  for (const nestedInput of postMove.tableAuthoredDecisions) {
    const parsed = parseSpatialDecisionInput(nestedInput, true, seen);
    if (Result.isFailure(parsed)) return Result.fail(parsed.failure);
    if (!isNonMovementSpatialDecisionInput(parsed.success)) {
      return malformedDecision(
        input,
        "A post-move spatial state cannot contain a movement-route decision.",
      );
    }
    nested.push(parsed.success);
  }
  return Result.succeed({
    kind: "movementRoute",
    movementCostFeet: movementFeet(value.movementCostFeet),
    provokedOpportunityAttacks,
    creatureSpaceTraversal: traversal.success,
    postMoveSpatialState: {
      kind: "tableAuthored",
      spatialFingerprint: spatialFingerprint.success,
      tableAuthoredDecisions: nested,
    },
  });
}

function parseSpatialDecisionInput(
  input: unknown,
  nested = false,
  seen = new WeakSet<object>(),
): ResultTypes.Result<
  ScenarioSpatialDecisionInput,
  ScenarioSpatialDecisionIssue
> {
  if (!isRecord(input) || !isString(input.decisionId)) {
    return malformedDecision(
      input,
      "A spatial decision requires a string decisionId and a correlated question/answer pair.",
    );
  }
  if (!hasOnlyKeys(input, ["decisionId", "question", "answer"])) {
    return malformedDecision(
      input,
      "A spatial decision contains an unsupported structural field.",
    );
  }
  if (seen.has(input)) {
    return malformedDecision(
      input,
      "A spatial decision graph must not contain cyclic nested values.",
    );
  }
  seen.add(input);
  if (input.decisionId.trim().length === 0) {
    return malformedDecision(
      input,
      "A spatial decision requires a non-empty decisionId.",
    );
  }
  const question = parseSpatialQuestion(input.question, input);
  if (Result.isFailure(question)) return Result.fail(question.failure);
  if (question.success.kind === "movementRoute") {
    if (nested) {
      return malformedDecision(
        input,
        "A nested post-move spatial state cannot contain a movement-route question.",
      );
    }
    const answer = parseMovementAnswer(input.answer, input, seen);
    if (Result.isFailure(answer)) return Result.fail(answer.failure);
    return Result.succeed({
      decisionId: input.decisionId,
      question: question.success,
      answer: answer.success,
    });
  }
  if (question.success.kind === "areaControlShakeAwakeTarget") {
    if (
      !isRecord(input.answer) ||
      !hasOnlyKeys(input.answer, ["kind"]) ||
      input.answer.kind !== "physicalReachability"
    ) {
      return malformedDecision(
        input,
        "An area-control shake-awake decision requires a physicalReachability answer with no geometry fields.",
      );
    }
    return Result.succeed({
      decisionId: input.decisionId,
      question: question.success,
      answer: { kind: "physicalReachability" },
    });
  }
  const answer = parseRelationAnswer(input.answer, input);
  if (Result.isFailure(answer)) return Result.fail(answer.failure);
  return Result.succeed({
    ...makeNonMovementSpatialDecisionInput(
      input.decisionId,
      question.success,
      answer.success,
    ),
  });
}

function makeNonMovementSpatialDecisionInput(
  decisionId: string,
  question: Exclude<
    ScenarioSpatialDecisionQuestionCore,
    | { readonly kind: "movementRoute" }
    | { readonly kind: "areaControlShakeAwakeTarget" }
  >,
  answer: ScenarioSpatialRelationAnswer,
): ScenarioNonMovementSpatialDecisionInput {
  return Match.value(question).pipe(
    Match.when({ kind: "relation" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "spellTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "objectTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "attackTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "grappleTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "shoveTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "stagedConditionShakeAwakeTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.when({ kind: "helpAttackTarget" }, (question) => ({
      decisionId,
      question,
      answer,
    })),
    Match.exhaustive,
  );
}

function validateSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): ScenarioSpatialDecisionIssue | undefined {
  const decisionId = input.decisionId;
  if (typeof decisionId !== "string" || decisionId.trim().length === 0) {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      "A Table-authored spatial decision requires a non-empty decision id.",
    );
  }
  if (input.question.kind === "areaControlShakeAwakeTarget") {
    return "kind" in input.answer &&
      input.answer.kind === "physicalReachability"
      ? undefined
      : spatialDecisionIssue(
          "invalid-spatial-decision",
          decisionId,
          "An area-control shake-awake decision requires physical reachability for its exact actor/target pair.",
        );
  }
  if ("kind" in input.answer) {
    if (input.answer.kind !== "movementRoute") {
      return spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
        "A physical-reachability answer requires an area-control shake-awake question.",
      );
    }
    const question = input.question;
    if (question.kind !== "movementRoute") {
      return spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
        "A non-movement spatial question cannot carry a movement-route answer.",
      );
    }
    if (!Array.isArray(question.route) || question.route.length === 0) {
      return spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
        "A Table-authored movement route requires at least one destination step.",
      );
    }
    for (const coordinate of question.route) {
      const parsed = parseCoordinate(coordinate);
      if (parsed.tag === "error") {
        return spatialDecisionIssue(
          "invalid-spatial-decision",
          decisionId,
          `The Table-authored movement route contains an invalid coordinate: ${parsed.error.message}`,
        );
      }
    }
    if (!isFiniteNonNegativeInteger(input.answer.movementCostFeet)) {
      return spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
        "A movement-route decision must provide a non-negative movement cost.",
      );
    }
    const postMoveSpatialState = input.answer.postMoveSpatialState;
    const nestedDecisionsByQuestion = new Map<
      string,
      ScenarioNonMovementSpatialDecisionInput
    >();
    for (const nestedDecision of postMoveSpatialState.tableAuthoredDecisions) {
      const nestedIssue = validateSpatialDecisionInput(nestedDecision);
      if (nestedIssue !== undefined) return nestedIssue;
      const nestedQuestionKey = spatialQuestionKey(nestedDecision.question);
      const previous = nestedDecisionsByQuestion.get(nestedQuestionKey);
      if (previous !== undefined) {
        const sameAnswer =
          stableSpatialDecisionJson(previous.answer) ===
          stableSpatialDecisionJson(nestedDecision.answer);
        return spatialDecisionIssue(
          sameAnswer
            ? "duplicate-spatial-decision"
            : "contradictory-spatial-decision",
          nestedDecision.decisionId,
          `Post-move spatial state repeats the exact ${nestedDecision.question.kind} question ${nestedDecision.decisionId}.`,
        );
      }
      nestedDecisionsByQuestion.set(nestedQuestionKey, nestedDecision);
    }
    return undefined;
  }
  if (input.question.kind === "movementRoute") {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      "A movement-route question requires a movement-route answer.",
    );
  }
  if (!isScenarioDirection(input.answer.direction)) {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      `Spatial decision ${decisionId} has an unsupported direction.`,
    );
  }
  if (!isFiniteNonNegativeInteger(input.answer.distanceFeet)) {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      `Spatial decision ${decisionId} must provide a finite non-negative distance.`,
    );
  }
  if (
    input.answer.cover !== "none" &&
    input.answer.cover !== "half" &&
    input.answer.cover !== "threeQuarters" &&
    input.answer.cover !== "total"
  ) {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      `Spatial decision ${decisionId} has an unsupported Cover value.`,
    );
  }
  if (
    input.answer.traversal !== "open" &&
    input.answer.traversal !== "blocked"
  ) {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      `Spatial decision ${decisionId} has an unsupported traversal value.`,
    );
  }
  if (input.question.kind === "attackTarget" && input.answer.cover !== "none") {
    return spatialDecisionIssue(
      "invalid-spatial-decision",
      decisionId,
      `Attack-target decision ${decisionId} cannot author Cover: creature attack fills expose range and sight facts, but no public creature-attack Cover fact. Use cover \"none\" or a geometry-derived boundary.`,
    );
  }
  return undefined;
}

/* parseSpatialDecisionInput rebuilds every object and array before this boundary. */
function freezeParsedSpatialValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (const entry of value) freezeParsedSpatialValue(entry);
  } else {
    for (const key of Object.keys(value)) {
      freezeParsedSpatialValue(Reflect.get(value, key));
    }
  }
  Object.freeze(value);
  return value;
}

function normalizeSpatialDecision(
  rawInput: unknown,
): ResultTypes.Result<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  const parsed = parseSpatialDecisionInput(rawInput);
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure);
  const input = parsed.success;
  const issue = validateSpatialDecisionInput(input);
  if (issue !== undefined) return Result.fail(issue);
  const decodedDecisionId = Schema.decodeUnknownResult(
    ScenarioSpatialDecisionId,
  )(input.decisionId);
  if (Result.isFailure(decodedDecisionId)) {
    return malformedDecision(
      input,
      "A Table-authored spatial decision requires a non-empty trimmed decision id.",
    );
  }
  return Match.value(input).pipe(
    Match.when(isNonMovementSpatialDecisionInput, (nonMovement) =>
      Result.succeed(
        freezeParsedSpatialValue(
          normalizeNonMovementSpatialDecision(
            nonMovement,
            decodedDecisionId.success,
          ),
        ),
      ),
    ),
    Match.when(isMovementRouteSpatialDecisionInput, (movement) => {
      const postMoveSpatialState = movement.answer.postMoveSpatialState;
      const nestedDecisions: ScenarioNonMovementSpatialDecision[] = [];
      for (const nestedInput of postMoveSpatialState.tableAuthoredDecisions) {
        const nested = normalizeSpatialDecision(nestedInput);
        if (Result.isFailure(nested)) return Result.fail(nested.failure);
        if (!isNonMovementSpatialDecision(nested.success)) {
          return Result.fail(
            spatialDecisionIssue(
              "invalid-spatial-decision",
              decodedDecisionId.success,
              "A post-move spatial state cannot contain another movement-route decision.",
            ),
          );
        }
        nestedDecisions.push(nested.success);
      }
      const decision: ScenarioMovementRouteSpatialDecision = {
        decisionId: decodedDecisionId.success,
        question: movement.question,
        answer: {
          ...movement.answer,
          postMoveSpatialState: {
            kind: "tableAuthored",
            spatialFingerprint:
              movement.answer.postMoveSpatialState.spatialFingerprint,
            tableAuthoredDecisions: nestedDecisions,
          },
        },
      };
      return Result.succeed(freezeParsedSpatialValue(decision));
    }),
    Match.exhaustive,
  );
}

function normalizeNonMovementSpatialDecision(
  input: ScenarioNonMovementSpatialDecisionInput,
  decisionId: ScenarioSpatialDecisionId,
): ScenarioNonMovementSpatialDecision {
  return { ...input, decisionId };
}

export function tableAuthoredSpatialDecision(
  input: unknown,
): ResultTypes.Result<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  return normalizeSpatialDecision(input);
}
