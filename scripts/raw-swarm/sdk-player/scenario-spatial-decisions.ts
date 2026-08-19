import { createHash } from "node:crypto";
import type {
  BattleCreatureSpaceTraversalMovementFact,
  BattleId,
  BattleMovementSpeedKind,
  BattleObjectId,
  BattleOpportunityAttackThreat,
  BattleTablePositionId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  ABILITIES,
  DAMAGE_TYPES,
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
import { Either, Match } from "effect";

export type ScenarioTokenId = CombatantId | BattleObjectId;

declare const scenarioSpatialDecisionIdBrand: unique symbol;

export type ScenarioSpatialDecisionId = string & {
  readonly [scenarioSpatialDecisionIdBrand]: true;
};

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

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isScenarioDirection(value: unknown): value is ScenarioDirection {
  return (
    typeof value === "string" &&
    (SCENARIO_DIRECTIONS as readonly string[]).includes(value)
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
  return `sha256:${digest}` as StateFingerprint;
}

export function scenarioDistanceFeet(
  value: number,
): Either.Either<DistanceFeet, ScenarioSpatialDistanceFeetIssue> {
  if (!isFiniteNonNegativeNumber(value)) {
    return Either.left({
      tag: "invalid-spatial-distance-feet",
      value,
      message: "A spatial distance must be a finite non-negative number.",
    });
  }
  return Either.right(value as DistanceFeet);
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

function scenarioSpatialDecisionId(value: string): ScenarioSpatialDecisionId {
  return value as ScenarioSpatialDecisionId;
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
        Match.when({ kind: "notRequired" }, () => [] as ScenarioTokenId[]),
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

function parseProcedureRef(
  value: unknown,
): BattleProcedureExecutionRef | undefined {
  if (!isString(value)) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0
    ? undefined
    : (trimmed as BattleProcedureExecutionRef);
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
      !isString(value.sourceId) ||
      !isString(value.targetId)
    ) {
      return malformedDecision(
        input,
        "A relation question requires string sourceId and targetId values.",
      );
    }
    return Either.right({
      kind: "relation",
      sourceId: value.sourceId as ScenarioTokenId,
      targetId: value.targetId as ScenarioTokenId,
    });
  }
  if (value.kind === "spellTarget") {
    const sourceProcedureRef = parseProcedureRef(value.sourceProcedureRef);
    if (
      !hasOnlyKeys(value, [
        "kind",
        "casterId",
        "targetId",
        "sourceProcedureRef",
      ]) ||
      !isString(value.casterId) ||
      !isString(value.targetId) ||
      sourceProcedureRef === undefined
    ) {
      return malformedDecision(
        input,
        "A spell-target question requires string casterId and targetId values and a non-empty sourceProcedureRef.",
      );
    }
    return Either.right({
      kind: "spellTarget",
      casterId: value.casterId as CombatantId,
      targetId: value.targetId as CombatantId,
      sourceProcedureRef,
    });
  }
  if (value.kind === "objectTarget") {
    const sourceProcedureRef = parseProcedureRef(value.sourceProcedureRef);
    if (
      !hasOnlyKeys(value, [
        "kind",
        "actorId",
        "objectId",
        "sourceProcedureRef",
      ]) ||
      !isString(value.actorId) ||
      !isString(value.objectId) ||
      sourceProcedureRef === undefined
    ) {
      return malformedDecision(
        input,
        "An object-target question requires string actorId and objectId values and a non-empty sourceProcedureRef.",
      );
    }
    return Either.right({
      kind: "objectTarget",
      actorId: value.actorId as CombatantId,
      objectId: value.objectId as BattleObjectId,
      sourceProcedureRef,
    });
  }
  if (value.kind === "attackTarget") {
    const sourceProcedureRef = parseProcedureRef(value.sourceProcedureRef);
    if (
      !hasOnlyKeys(value, [
        "kind",
        "actorId",
        "targetId",
        "sourceProcedureRef",
        "targetConstraint",
      ]) ||
      !isString(value.actorId) ||
      !isString(value.targetId) ||
      sourceProcedureRef === undefined ||
      (value.targetConstraint !== "meleeReach" &&
        value.targetConstraint !== "rangedRange")
    ) {
      return malformedDecision(
        input,
        "An attack-target question requires string actorId and targetId values, a non-empty sourceProcedureRef, and a supported targetConstraint.",
      );
    }
    return Either.right({
      kind: "attackTarget",
      actorId: value.actorId as CombatantId,
      targetId: value.targetId as CombatantId,
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
      !isString(value[actorField]) ||
      !isString(value.targetId)
    ) {
      return malformedDecision(
        input,
        `A ${value.kind} question requires string ${actorField} and targetId values.`,
      );
    }
    return Either.right(
      value.kind === "grappleTarget"
        ? {
            kind: "grappleTarget" as const,
            grapplerId: value.grapplerId as CombatantId,
            targetId: value.targetId as CombatantId,
          }
        : value.kind === "shoveTarget"
          ? {
              kind: "shoveTarget" as const,
              shoverId: value.shoverId as CombatantId,
              targetId: value.targetId as CombatantId,
            }
          : value.kind === "sleepShakeAwakeTarget"
            ? {
                kind: "sleepShakeAwakeTarget" as const,
                actorId: value.actorId as CombatantId,
                targetId: value.targetId as CombatantId,
              }
            : {
                kind: "hypnoticPatternShakeAwakeTarget" as const,
                actorId: value.actorId as CombatantId,
                targetId: value.targetId as CombatantId,
              },
    );
  }
  if (value.kind === "helpAttackTarget") {
    if (
      !hasOnlyKeys(value, ["kind", "helperId", "targetEnemyId"]) ||
      !isString(value.helperId) ||
      !isString(value.targetEnemyId)
    ) {
      return malformedDecision(
        input,
        "A helpAttackTarget question requires string helperId and targetEnemyId values.",
      );
    }
    return Either.right({
      kind: "helpAttackTarget" as const,
      helperId: value.helperId as CombatantId,
      targetEnemyId: value.targetEnemyId as CombatantId,
    });
  }
  if (value.kind === "movementRoute") {
    if (
      !hasOnlyKeys(value, ["kind", "moverId", "route", "speedKind"]) ||
      !isString(value.moverId) ||
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
    return Either.right({
      kind: "movementRoute",
      moverId: value.moverId as CombatantId,
      route: value.route.map(({ x, y }) => ({ x, y })) as [
        CoordinateInput,
        ...CoordinateInput[],
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
    ]) ||
    !isScenarioDirection(value.direction) ||
    !isFiniteNonNegativeNumber(value.distanceFeet) ||
    typeof value.attackerCanSeeTarget !== "boolean" ||
    (value.cover !== "none" &&
      value.cover !== "half" &&
      value.cover !== "threeQuarters" &&
      value.cover !== "total") ||
    (value.traversal !== "open" && value.traversal !== "blocked")
  ) {
    return malformedDecision(
      input,
      "A non-movement spatial answer requires finite distance, boolean sight, and supported Cover and traversal values.",
    );
  }
  return Either.right({
    direction: value.direction,
    distanceFeet: value.distanceFeet as DistanceFeet,
    attackerCanSeeTarget: value.attackerCanSeeTarget,
    cover: value.cover,
    traversal: value.traversal,
  });
}

function isOpportunityAttackThreatInput(
  value: unknown,
): value is BattleOpportunityAttackThreat {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "reactorId",
      "procedureRef",
      "attackAbility",
      "attackDamageType",
      "attackName",
      "statBlockDamageNotation",
    ]) ||
    !isString(value.reactorId) ||
    !isString(value.procedureRef) ||
    value.procedureRef.trim().length === 0
  ) {
    return false;
  }
  const selection = value;
  const attackAbility = selection.attackAbility;
  const attackDamageType = selection.attackDamageType;
  const hasAttackAbility = attackAbility !== undefined;
  const hasAttackDamageType = attackDamageType !== undefined;
  if (hasAttackAbility !== hasAttackDamageType) {
    return false;
  }
  if (
    hasAttackAbility &&
    (typeof attackAbility !== "string" ||
      (!(ABILITIES as readonly string[]).includes(attackAbility) &&
        attackAbility !== "spellcasting"))
  ) {
    return false;
  }
  if (
    hasAttackDamageType &&
    (typeof attackDamageType !== "string" ||
      !(DAMAGE_TYPES as readonly string[]).includes(attackDamageType))
  ) {
    return false;
  }
  if (selection.attackName !== undefined) return false;
  if (
    selection.statBlockDamageNotation !== undefined &&
    selection.statBlockDamageNotation !== "static"
  ) {
    return false;
  }
  return true;
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
        isString(space.occupantId) &&
        isString(space.positionId),
    ) ||
    !isRecord(fact.destination) ||
    !hasOnlyKeys(
      fact.destination,
      fact.destination.kind === "occupiedCreatureSpace"
        ? ["kind", "occupantId", "positionId"]
        : ["kind", "positionId"],
    ) ||
    !isString(fact.destination.kind) ||
    !isString(fact.destination.positionId) ||
    (fact.destination.kind === "occupiedCreatureSpace" &&
      !isString(fact.destination.occupantId)) ||
    (fact.destination.kind !== "occupiedCreatureSpace" &&
      fact.destination.kind !== "unoccupiedSpace")
  ) {
    return malformedDecision(
      input,
      "A creature-space traversal fact has an invalid occupied-space or destination shape.",
    );
  }
  const occupiedSpaces = fact.occupiedSpaces.map((space) => ({
    occupantId: space.occupantId as CombatantId,
    positionId: space.positionId as BattleTablePositionId,
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
  return Either.right({
    kind: "fact",
    value: {
      kind: "occupiedCreatureSpaceTraversal",
      occupiedSpaces: nonEmptyOccupiedSpaces,
      destination:
        fact.destination.kind === "occupiedCreatureSpace"
          ? {
              kind: "occupiedCreatureSpace",
              occupantId: fact.destination.occupantId as CombatantId,
              positionId: fact.destination.positionId as BattleTablePositionId,
            }
          : {
              kind: "unoccupiedSpace",
              positionId: fact.destination.positionId as BattleTablePositionId,
            },
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
    !isFiniteNonNegativeNumber(value.movementCostFeet)
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
  if (!value.provokedOpportunityAttacks.every(isOpportunityAttackThreatInput)) {
    return malformedDecision(
      input,
      "A movement-route answer contains a malformed Opportunity Attack threat selection.",
    );
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
  if (
    postMove.kind !== "tableAuthored" ||
    !hasOnlyKeys(postMove, [
      "kind",
      "spatialFingerprint",
      "tableAuthoredDecisions",
    ]) ||
    !isString(postMove.spatialFingerprint) ||
    postMove.spatialFingerprint.length === 0 ||
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
    if (parsed.right.question.kind === "movementRoute") {
      return malformedDecision(
        input,
        "A post-move spatial state cannot contain a movement-route decision.",
      );
    }
    nested.push(parsed.right as ScenarioNonMovementSpatialDecisionInput);
  }
  return Either.right({
    kind: "movementRoute",
    movementCostFeet: value.movementCostFeet as MovementFeet,
    provokedOpportunityAttacks: value.provokedOpportunityAttacks.map(
      (threat) => ({ ...threat }) as BattleOpportunityAttackThreat,
    ),
    creatureSpaceTraversal: traversal.right,
    postMoveSpatialState: {
      kind: "tableAuthored",
      spatialFingerprint: postMove.spatialFingerprint as StateFingerprint,
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
    if (!isFiniteNonNegativeNumber(input.answer.movementCostFeet)) {
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
  if (!isFiniteNonNegativeNumber(input.answer.distanceFeet)) {
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

function cloneAndFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneAndFreeze(entry))) as T;
  }
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[key] = cloneAndFreeze(Reflect.get(value, key));
  }
  return Object.freeze(copy) as T;
}

function normalizeSpatialDecision(
  rawInput: unknown,
): Either.Either<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  const parsed = parseSpatialDecisionInput(rawInput);
  if (Either.isLeft(parsed)) return Either.left(parsed.left);
  const input = parsed.right;
  const issue = validateSpatialDecisionInput(input);
  if (issue !== undefined) return Either.left(issue);
  const decisionId = scenarioSpatialDecisionId(input.decisionId);
  if (isRelationSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioRelationSpatialDecision,
    );
  }
  if (isSpellTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioSpellTargetSpatialDecision,
    );
  }
  if (isObjectTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioObjectTargetSpatialDecision,
    );
  }
  if (isAttackTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioAttackTargetSpatialDecision,
    );
  }
  if (isGrappleTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioGrappleTargetSpatialDecision,
    );
  }
  if (isShoveTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioShoveTargetSpatialDecision,
    );
  }
  if (isSleepShakeAwakeTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioSleepShakeAwakeTargetSpatialDecision,
    );
  }
  if (isHypnoticPatternShakeAwakeTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioHypnoticPatternShakeAwakeTargetSpatialDecision,
    );
  }
  if (isHelpAttackTargetSpatialDecisionInput(input)) {
    return Either.right(
      cloneAndFreeze({
        decisionId,
        question: input.question,
        answer: input.answer,
      }) as ScenarioHelpAttackTargetSpatialDecision,
    );
  }
  if (!isMovementRouteSpatialDecisionInput(input)) {
    return Either.left(
      spatialDecisionIssue(
        "invalid-spatial-decision",
        decisionId,
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
          input.decisionId,
          "A post-move spatial state cannot contain another movement-route decision.",
        ),
      );
    }
    nestedDecisions.push(nested.right);
  }
  return Either.right(
    cloneAndFreeze({
      decisionId,
      question: input.question,
      answer: {
        ...input.answer,
        postMoveSpatialState: Object.freeze({
          kind: "tableAuthored" as const,
          spatialFingerprint: postMoveSpatialState.spatialFingerprint,
          tableAuthoredDecisions: Object.freeze(nestedDecisions),
        }),
      },
    }) as ScenarioMovementRouteSpatialDecision,
  );
}

export function tableAuthoredSpatialDecision(
  input: unknown,
): Either.Either<ScenarioSpatialDecision, ScenarioSpatialDecisionIssue> {
  return normalizeSpatialDecision(input);
}
