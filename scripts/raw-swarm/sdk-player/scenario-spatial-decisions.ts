import { createHash } from "node:crypto";
import type {
  BattleCreatureSpaceTraversalMovementFact,
  BattleId,
  BattleMovementSpeedKind,
  BattleObjectId,
  BattleOpportunityAttackThreat,
  BattleTablePositionId,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  BattleAttackProcedureExecutionRef,
  BattleProcedureExecutionRef,
  BattleStatBlockProcedureExecutionRef,
  battleObjectId,
  battleTablePositionId,
  combatantId,
} from "../../../packages/battle-runtime/src/index.ts";
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
  type StateFingerprint,
} from "../../../packages/tactical-space/src/index.ts";
import { Either, Match, Schema } from "effect";

export type ScenarioTokenId = CombatantId | BattleObjectId;

const ScenarioSpatialDecisionId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("ScenarioSpatialDecisionId"),
);
export type ScenarioSpatialDecisionId = typeof ScenarioSpatialDecisionId.Type;

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
      readonly kind: "sleepShakeAwakeTarget";
      readonly actorId: CombatantId;
      readonly targetId: CombatantId;
    }>
  | Readonly<{
      readonly kind: "hypnoticPatternShakeAwakeTarget";
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
  readonly spatialFingerprint: StateFingerprint;
  readonly tableAuthoredDecisions: readonly ScenarioNonMovementSpatialDecisionInput[];
}>;

export type ScenarioTableSpatialPostMoveState = Readonly<{
  readonly kind: "tableAuthored";
  readonly spatialFingerprint: StateFingerprint;
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
type ScenarioSleepShakeAwakeTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "sleepShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioHypnoticPatternShakeAwakeTargetSpatialDecisionInput = Readonly<{
  readonly decisionId: string;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "hypnoticPatternShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
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
  | ScenarioSleepShakeAwakeTargetSpatialDecisionInput
  | ScenarioHypnoticPatternShakeAwakeTargetSpatialDecisionInput
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
type ScenarioSleepShakeAwakeTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "sleepShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
}>;
type ScenarioHypnoticPatternShakeAwakeTargetSpatialDecision = Readonly<{
  readonly decisionId: ScenarioSpatialDecisionId;
  readonly question: Extract<
    ScenarioSpatialDecisionQuestionCore,
    { readonly kind: "hypnoticPatternShakeAwakeTarget" }
  >;
  readonly answer: ScenarioSpatialRelationAnswer;
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
  | ScenarioSleepShakeAwakeTargetSpatialDecision
  | ScenarioHypnoticPatternShakeAwakeTargetSpatialDecision
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
      { question: { kind: "sleepShakeAwakeTarget" } },
      ({ decisionId }) => [decisionId],
    ),
    Match.when(
      { question: { kind: "hypnoticPatternShakeAwakeTarget" } },
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
  | ScenarioSleepShakeAwakeTargetSpatialDecisionInput
  | ScenarioHypnoticPatternShakeAwakeTargetSpatialDecisionInput
  | ScenarioHelpAttackTargetSpatialDecisionInput;
type ScenarioNonMovementSpatialDecision =
  | ScenarioRelationSpatialDecision
  | ScenarioSpellTargetSpatialDecision
  | ScenarioObjectTargetSpatialDecision
  | ScenarioAttackTargetSpatialDecision
  | ScenarioGrappleTargetSpatialDecision
  | ScenarioShoveTargetSpatialDecision
  | ScenarioSleepShakeAwakeTargetSpatialDecision
  | ScenarioHypnoticPatternShakeAwakeTargetSpatialDecision
  | ScenarioHelpAttackTargetSpatialDecision;

export type ScenarioSpatialBoundary =
  | Readonly<{
      readonly kind: "geometryDerived";
      readonly arena: ArenaSnapshot;
      readonly space: SpatialSnapshot;
    }>
  | Readonly<{
      readonly kind: "tableAuthored";
      readonly spatialFingerprint: StateFingerprint;
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
    readonly spatialFingerprint: StateFingerprint;
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
        readonly spatialFingerprint: StateFingerprint;
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
): StateFingerprint {
  const digest = createHash("sha256")
    .update(stableSpatialDecisionJson(value))
    .digest("hex");
  const fingerprint = `sha256:${digest}`;
  // This assertion covers only the digest generated above; authored
  // fingerprints cross the parser boundary and return a typed issue instead.
  /* v8 ignore next -- @preserve -- SHA-256 hex encoding guarantees this shape. */
  if (!isStateFingerprint(fingerprint)) {
    throw new Error("SHA-256 digest did not produce a StateFingerprint.");
  }
  return fingerprint;
}

export function scenarioDistanceFeet(
  value: number,
): Either.Either<DistanceFeet, ScenarioSpatialDistanceFeetIssue> {
  if (!isFiniteNonNegativeInteger(value)) {
    return Either.left({
      tag: "invalid-spatial-distance-feet",
      value,
      message: "A spatial distance must be a finite non-negative integer.",
    });
  }
  return Either.right(value);
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
      { kind: "sleepShakeAwakeTarget" },
      ({ kind, actorId, targetId }) =>
        JSON.stringify([kind, String(actorId), String(targetId)]),
    ),
    Match.when(
      { kind: "hypnoticPatternShakeAwakeTarget" },
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

function isRelationSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioRelationSpatialDecisionInput {
  return input.question.kind === "relation";
}

function isSpellTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioSpellTargetSpatialDecisionInput {
  return input.question.kind === "spellTarget";
}

function isObjectTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioObjectTargetSpatialDecisionInput {
  return input.question.kind === "objectTarget";
}

function isAttackTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioAttackTargetSpatialDecisionInput {
  return input.question.kind === "attackTarget";
}

function isGrappleTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioGrappleTargetSpatialDecisionInput {
  return input.question.kind === "grappleTarget";
}

function isShoveTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioShoveTargetSpatialDecisionInput {
  return input.question.kind === "shoveTarget";
}

function isSleepShakeAwakeTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioSleepShakeAwakeTargetSpatialDecisionInput {
  return input.question.kind === "sleepShakeAwakeTarget";
}

function isHypnoticPatternShakeAwakeTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioHypnoticPatternShakeAwakeTargetSpatialDecisionInput {
  return input.question.kind === "hypnoticPatternShakeAwakeTarget";
}

function isHelpAttackTargetSpatialDecisionInput(
  input: ScenarioSpatialDecisionInput,
): input is ScenarioHelpAttackTargetSpatialDecisionInput {
  return input.question.kind === "helpAttackTarget";
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
      { question: { kind: "sleepShakeAwakeTarget" } },
      ({ question }) => [question.actorId, question.targetId],
    ),
    Match.when(
      { question: { kind: "hypnoticPatternShakeAwakeTarget" } },
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
): Either.Either<never, ScenarioSpatialDecisionIssue> {
  return Either.left(
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

function isStateFingerprint(value: unknown): value is StateFingerprint {
  return isString(value) && /^sha256:[0-9a-f]{64}$/.test(value);
}

function parseProcedureRef(
  value: unknown,
  input: unknown,
): Either.Either<BattleProcedureExecutionRef, ScenarioSpatialDecisionIssue> {
  if (!isString(value) || value.trim().length === 0) {
    return malformedDecision(
      input,
      "A sourceProcedureRef must be a canonical Battle procedure execution reference.",
    );
  }
  const trimmed = value.trim();
  const decoded = Schema.decodeUnknownEither(BattleProcedureExecutionRef)(
    trimmed,
  );
  return Either.isLeft(decoded)
    ? malformedDecision(
        input,
        "A sourceProcedureRef must be a canonical Battle procedure execution reference.",
      )
    : Either.right(decoded.right);
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
): Either.Either<
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
    return Either.right({
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
    if (Either.isLeft(sourceProcedureRef)) {
      return Either.left(sourceProcedureRef.left);
    }
    return Either.right({
      kind: "spellTarget",
      casterId: combatantId(value.casterId),
      targetId: combatantId(value.targetId),
      sourceProcedureRef,
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
    if (Either.isLeft(sourceProcedureRef)) {
      return Either.left(sourceProcedureRef.left);
    }
    return Either.right({
      kind: "objectTarget",
      actorId: combatantId(value.actorId),
      objectId: battleObjectId(value.objectId),
      sourceProcedureRef,
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
    if (Either.isLeft(sourceProcedureRef)) {
      return Either.left(sourceProcedureRef.left);
    }
    return Either.right({
      kind: "attackTarget",
      actorId: combatantId(value.actorId),
      targetId: combatantId(value.targetId),
      sourceProcedureRef,
      targetConstraint: value.targetConstraint,
    });
  }
  if (
    value.kind === "grappleTarget" ||
    value.kind === "shoveTarget" ||
    value.kind === "sleepShakeAwakeTarget" ||
    value.kind === "hypnoticPatternShakeAwakeTarget"
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
    return Either.right(
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
          : value.kind === "sleepShakeAwakeTarget"
            ? {
                kind: "sleepShakeAwakeTarget" as const,
                actorId,
                targetId,
              }
            : {
                kind: "hypnoticPatternShakeAwakeTarget" as const,
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
    return Either.right({
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
    return Either.right({
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
): Either.Either<ScenarioSpatialRelationAnswer, ScenarioSpatialDecisionIssue> {
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
  return Either.right({
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
      "statBlockDamageNotation",
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
  if (
    selection.statBlockDamageNotation !== undefined &&
    selection.statBlockDamageNotation !== "static"
  ) {
    return undefined;
  }
  if (hasAttackAbility && selection.statBlockDamageNotation !== undefined) {
    return undefined;
  }
  const reactorId = combatantId(value.reactorId);
  const distanceFeet = movementFeet(value.distanceFeet);
  if (hasAttackAbility && hasAttackDamageType) {
    const procedureRef = Schema.decodeUnknownEither(
      BattleAttackProcedureExecutionRef,
    )(value.procedureRef);
    if (Either.isLeft(procedureRef)) return undefined;
    return {
      reactorId,
      distanceFeet,
      procedureRef: procedureRef.right,
      attackAbility,
      attackDamageType,
    };
  }
  const procedureRef = Schema.decodeUnknownEither(
    BattleStatBlockProcedureExecutionRef,
  )(value.procedureRef);
  if (Either.isLeft(procedureRef)) return undefined;
  return selection.statBlockDamageNotation === "static"
    ? {
        reactorId,
        distanceFeet,
        procedureRef: procedureRef.right,
        statBlockDamageNotation: "static",
      }
    : { reactorId, distanceFeet, procedureRef: procedureRef.right };
}

function parseCreatureSpaceTraversal(
  value: unknown,
  input: unknown,
  seen: WeakSet<object>,
): Either.Either<
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
    return Either.right({ kind: "notRequired" });
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
  return Either.right({
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
): Either.Either<
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
  if (Either.isLeft(traversal)) return Either.left(traversal.left);
  if (!isRecord(value.postMoveSpatialState)) {
    return malformedDecision(
      input,
      "A movement-route answer requires a canonical post-move spatial state object.",
    );
  }
  const postMove = value.postMoveSpatialState;
  const spatialFingerprint = postMove.spatialFingerprint;
  if (
    postMove.kind !== "tableAuthored" ||
    !hasOnlyKeys(postMove, [
      "kind",
      "spatialFingerprint",
      "tableAuthoredDecisions",
    ]) ||
    !isStateFingerprint(spatialFingerprint) ||
    !Array.isArray(postMove.tableAuthoredDecisions)
  ) {
    return malformedDecision(
      input,
      "A Table-authored movement route requires a tagged post-move state with a non-empty fingerprint and decision array.",
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
    if (Either.isLeft(parsed)) return Either.left(parsed.left);
    if (!isNonMovementSpatialDecisionInput(parsed.right)) {
      return malformedDecision(
        input,
        "A post-move spatial state cannot contain a movement-route decision.",
      );
    }
    nested.push(parsed.right);
  }
  return Either.right({
    kind: "movementRoute",
    movementCostFeet: movementFeet(value.movementCostFeet),
    provokedOpportunityAttacks,
    creatureSpaceTraversal: traversal.right,
    postMoveSpatialState: {
      kind: "tableAuthored",
      spatialFingerprint,
      tableAuthoredDecisions: nested,
    },
  });
}

function parseSpatialDecisionInput(
  input: unknown,
  nested = false,
  seen = new WeakSet<object>(),
): Either.Either<ScenarioSpatialDecisionInput, ScenarioSpatialDecisionIssue> {
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
  if (Either.isLeft(question)) return Either.left(question.left);
  if (question.right.kind === "movementRoute") {
    if (nested) {
      return malformedDecision(
        input,
        "A nested post-move spatial state cannot contain a movement-route question.",
      );
    }
    const answer = parseMovementAnswer(input.answer, input, seen);
    if (Either.isLeft(answer)) return Either.left(answer.left);
    return Either.right({
      decisionId: input.decisionId,
      question: question.right,
      answer: answer.right,
    });
  }
  const answer = parseRelationAnswer(input.answer, input);
  if (Either.isLeft(answer)) return Either.left(answer.left);
  // Cast proof: question.right is narrowed to every non-movement question and
  // answer.right is the shared relation-answer shape; TypeScript cannot retain
  // that correlation across the independently parsed values.
  return Either.right({
    decisionId: input.decisionId,
    question: question.right,
    answer: answer.right,
  } as ScenarioSpatialDecisionInput);
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
  if ("kind" in input.answer) {
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
    if (
      postMoveSpatialState.kind !== "tableAuthored" ||
      typeof postMoveSpatialState.spatialFingerprint !== "string" ||
      postMoveSpatialState.spatialFingerprint.length === 0 ||
      !Array.isArray(postMoveSpatialState.tableAuthoredDecisions)
    ) {
      return spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
        "A Table-authored movement route requires a canonical post-move spatial state.",
      );
    }
    const nestedDecisionsByQuestion = new Map<
      string,
      ScenarioNonMovementSpatialDecisionInput
    >();
    for (const nestedDecision of postMoveSpatialState.tableAuthoredDecisions) {
      if (nestedDecision.question.kind === "movementRoute") {
        return spatialDecisionIssue(
          "invalid-spatial-decision",
          decisionId,
          "A post-move spatial state cannot contain another movement-route decision.",
        );
      }
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
): Either.Either<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  const parsed = parseSpatialDecisionInput(rawInput);
  if (Either.isLeft(parsed)) return Either.left(parsed.left);
  const input = parsed.right;
  const issue = validateSpatialDecisionInput(input);
  if (issue !== undefined) return Either.left(issue);
  const decodedDecisionId = Schema.decodeUnknownEither(
    ScenarioSpatialDecisionId,
  )(input.decisionId);
  if (Either.isLeft(decodedDecisionId)) {
    return malformedDecision(
      input,
      "A Table-authored spatial decision requires a non-empty trimmed decision id.",
    );
  }
  if (isRelationSpatialDecisionInput(input)) {
    const decision: ScenarioRelationSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isSpellTargetSpatialDecisionInput(input)) {
    const decision: ScenarioSpellTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isObjectTargetSpatialDecisionInput(input)) {
    const decision: ScenarioObjectTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isAttackTargetSpatialDecisionInput(input)) {
    const decision: ScenarioAttackTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isGrappleTargetSpatialDecisionInput(input)) {
    const decision: ScenarioGrappleTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isShoveTargetSpatialDecisionInput(input)) {
    const decision: ScenarioShoveTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isSleepShakeAwakeTargetSpatialDecisionInput(input)) {
    const decision: ScenarioSleepShakeAwakeTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isHypnoticPatternShakeAwakeTargetSpatialDecisionInput(input)) {
    const decision: ScenarioHypnoticPatternShakeAwakeTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (isHelpAttackTargetSpatialDecisionInput(input)) {
    const decision: ScenarioHelpAttackTargetSpatialDecision = {
      decisionId: decodedDecisionId.right,
      question: input.question,
      answer: input.answer,
    };
    return Either.right(freezeParsedSpatialValue(decision));
  }
  if (!isMovementRouteSpatialDecisionInput(input)) {
    return Either.left(
      spatialDecisionIssue(
        "invalid-spatial-decision",
        decodedDecisionId.right,
        "A spatial decision question has no supported correlated answer variant.",
      ),
    );
  }
  const postMoveSpatialState = input.answer.postMoveSpatialState;
  const nestedDecisions: ScenarioNonMovementSpatialDecision[] = [];
  for (const nestedInput of postMoveSpatialState.tableAuthoredDecisions) {
    const nested = normalizeSpatialDecision(nestedInput);
    if (Either.isLeft(nested)) return Either.left(nested.left);
    if (!isNonMovementSpatialDecision(nested.right)) {
      return Either.left(
        spatialDecisionIssue(
          "invalid-spatial-decision",
          decodedDecisionId.right,
          "A post-move spatial state cannot contain another movement-route decision.",
        ),
      );
    }
    nestedDecisions.push(nested.right);
  }
  const decision: ScenarioMovementRouteSpatialDecision = {
    decisionId: decodedDecisionId.right,
    question: input.question,
    answer: {
      ...input.answer,
      postMoveSpatialState: {
        kind: "tableAuthored",
        spatialFingerprint: postMoveSpatialState.spatialFingerprint,
        tableAuthoredDecisions: nestedDecisions,
      },
    },
  };
  return Either.right(freezeParsedSpatialValue(decision));
}

export function tableAuthoredSpatialDecision(
  input: unknown,
): Either.Either<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  return normalizeSpatialDecision(input);
}
