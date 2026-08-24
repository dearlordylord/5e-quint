// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
import type {
  AttackTargetConstraint,
  BattleIllumination,
  BattleId,
  BattleObjectDamageDisposition,
  BattleObjectDamageOutcome,
  BattleObjectId,
  BattleOrdinaryMovementRouteOccupant,
  BattleOpportunityAttackThreat,
  BattleFill,
  BattleHole,
  BattleTargetChoiceHole,
  BattleMovementSpeedKind,
  BattleProcedureExecutionRef,
  BattleReadyResponse,
  BattleResolvedMovement,
  BattleRuntimeSession,
  BattleStatBlockProcedureExecutionRef,
  BattleSubject,
  BattleTargetSpatialFact,
  BattleTablePositionId,
  CombatantId,
  StatBlockDamageNotation,
  AvailableBattleAct,
  TableD20TestCircumstanceDecision,
  TableD20TestCircumstanceSource,
  BattleRuntimeTableD20TestResolutionResult,
  BattleD20TestCircumstanceRequest,
  D20TestResolutionId,
} from "@dnd/battle-runtime";
import {
  BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
  battleTablePositionId,
  battleRuntimeSessionFollows,
  combatantEffectiveSize,
  deriveOrdinaryMovementTableRouteFacts,
  discoverBattleActs,
  isBattleRuntimeSession,
  opportunityAttackExecutionCandidates,
  opportunityAttackLeavesReach,
  opportunityAttackThreatIdentityEqual,
  opportunityAttackThreatEqual,
  resolveBattleRuntimeSubject,
  admitTableD20TestCircumstanceDecisions,
  battleHolesWithTableD20TestCircumstances,
  battleD20TestCircumstanceRequests,
  d20TestResolutionId,
  sameBattleSubject,
  zeroHpLifecycleIsTerminal,
} from "../../../packages/battle-runtime/src/index.ts";
import type { ArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { isIncapacitated } from "../../../packages/shared-algebras/src/conditions-algebra.ts";
import {
  movementFeet,
  type CoverType,
  type Hp,
  type MovementFeet,
} from "../../../packages/shared/src/types.ts";
import {
  arenaSnapshot,
  createState,
  interveningTokens,
  parseArena,
  parseCoordinate,
  parseTokenId,
  placeToken,
  previewStep,
  commitPreview,
  relationBetween,
  restoreState,
  snapshot,
  type ArenaDefinition,
  type BoundaryOpenness,
  type CellCoordinate,
  type CoverDegree,
  type PlaceTokenError,
  type SpatialSnapshot,
  type TokenId,
  type CoordinateInput,
  type DistanceFeet,
  type StateFingerprint,
  type SpatialState,
} from "../../../packages/tactical-space/src/index.ts";
import { Either, Match } from "effect";
import { sha256Canonical } from "../transcript.ts";
import {
  scenarioTableSpatialFingerprint,
  scenarioSpatialDecisionEntityReferences,
  scenarioSpatialDecisionIds,
  spatialDecisionIssue,
  spatialDecisionValueKey,
  spatialQuestionKey,
  tableAuthoredSpatialDecision,
  type ScenarioDirection,
  type ScenarioSpatialBoundary,
  type ScenarioSpatialDecisionInput,
  type ScenarioSpatialDecisionIssue,
  type ScenarioSpatialDecisionQuestion,
  type ScenarioSpatialRelationAnswer,
  type ScenarioSessionLineageId,
  type ScenarioSpatialWitnessSource,
  type ScenarioTableSpatialDecision,
  type ScenarioTableSpatialPostMoveState,
  type ScenarioTokenId,
} from "./scenario-spatial-decisions.ts";
import { jsonValue } from "./json-value.ts";

export type {
  ScenarioDirection,
  ScenarioSpatialBoundary,
  ScenarioSpatialDecision,
  ScenarioSpatialDecisionId,
  ScenarioSpatialDecisionInput,
  ScenarioSpatialDecisionIssue,
  ScenarioSpatialDistanceFeetIssue,
  ScenarioNonMovementSpatialDecisionInput,
  ScenarioSpatialDecisionQuestion,
  ScenarioSessionLineageId,
  ScenarioSpatialRelationAnswer,
  ScenarioSpatialWitness,
  ScenarioSpatialWitnessSource,
  ScenarioTableSpatialDecision,
  ScenarioTableSpatialPostMoveState,
  ScenarioTableSpatialPostMoveStateInput,
  ScenarioTokenId,
} from "./scenario-spatial-decisions.ts";

export {
  scenarioDistanceFeet,
  scenarioSpatialDecisionIds,
  scenarioSpatialDecisionEntityReferences,
  scenarioTableSpatialFingerprint,
  tableAuthoredSpatialDecision,
} from "./scenario-spatial-decisions.ts";

declare const scenarioSessionBrand: unique symbol;

export type ScenarioBattleObject = Readonly<{
  readonly objectId: BattleObjectId;
  readonly armorClass: ArmorClass;
  readonly damageDisposition: BattleObjectDamageDisposition;
  readonly traversal: BoundaryOpenness;
  readonly sight: BoundaryOpenness;
  readonly interveningCover: CoverDegree;
}>;

export type ScenarioBarrierHeight = Readonly<{
  readonly between: readonly [CoordinateInput, CoordinateInput];
  readonly heightFeet: MovementFeet;
}>;

export type ScenarioEnvironment = Readonly<{
  readonly overhead:
    | Readonly<{ readonly kind: "open" }>
    | Readonly<{
        readonly kind: "ceiling";
        readonly heightFeet: MovementFeet;
      }>;
  readonly barrierHeights: readonly ScenarioBarrierHeight[];
}>;

export type ScenarioInitialRangedAttackEnemyRelationship = Readonly<{
  readonly attackerId: CombatantId;
  readonly enemyId: CombatantId;
}>;

export type ScenarioMovementAllyRelationship = Readonly<{
  readonly moverId: CombatantId;
  readonly allyId: CombatantId;
}>;

export type ScenarioOpportunityAttackEnemyRelationship = Readonly<{
  readonly reactorId: CombatantId;
  readonly moverId: CombatantId;
}>;

export type ScenarioBattlefield = Readonly<{
  /** Canonical spatial ownership boundary; geometry is optional by construction. */
  readonly spatial: ScenarioSpatialBoundary;
  readonly ambientIllumination: BattleIllumination;
  readonly statBlockDamageNotation: StatBlockDamageNotation;
  readonly environment: ScenarioEnvironment;
  readonly initialRangedAttackEnemyRelationships: readonly ScenarioInitialRangedAttackEnemyRelationship[];
  readonly movementAllyRelationships: readonly ScenarioMovementAllyRelationship[];
  readonly opportunityAttackEnemyRelationships: readonly ScenarioOpportunityAttackEnemyRelationship[];
  readonly objects: readonly ScenarioBattleObject[];
}>;

export type ScenarioPlacement = Readonly<{
  readonly tokenId: CombatantId | BattleObjectId;
  readonly coordinate: CoordinateInput;
}>;

export type ScenarioSpatialSetupInput =
  | Readonly<{
      readonly kind: "geometryDerived";
      readonly arena: ArenaDefinition;
      readonly placements: readonly ScenarioPlacement[];
      /** Geometry is the sole source for every supported spatial question. */
      readonly spatialDecisions: readonly [];
    }>
  | Readonly<{
      readonly kind: "tableAuthored";
      readonly spatialDecisions: readonly ScenarioSpatialDecisionInput[];
    }>;

type ScenarioMovementResolution =
  | Readonly<{ readonly kind: "idle" }>
  | Readonly<{
      readonly kind: "geometryDerivedPending";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "move" }
      >;
      readonly fill: Extract<BattleFill, { readonly kind: "movement" }>;
      readonly originFingerprint: StateFingerprint;
      readonly plannedSpace: SpatialSnapshot;
    }>
  | Readonly<{
      readonly kind: "tableAuthoredPending";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "move" }
      >;
      readonly fill: Extract<BattleFill, { readonly kind: "movement" }>;
      readonly decision: ScenarioTableSpatialDecision;
      readonly postMoveSpatial: ScenarioSpatialBoundary;
    }>;

export type ScenarioSession = Readonly<{
  readonly battle: BattleRuntimeSession;
  readonly battlefield: ScenarioBattlefield;
  readonly movementResolution: ScenarioMovementResolution;
  readonly tableD20TestCircumstances: ScenarioTableD20TestCircumstanceState;
  readonly lineage: Readonly<{
    readonly scenarioSessionLineageId: ScenarioSessionLineageId;
    readonly battleRuntimeSessionIdentity: string;
  }>;
  readonly [scenarioSessionBrand]: true;
}>;

export type ScenarioTableD20TestCircumstanceBinding = Readonly<{
  readonly selection:
    | Readonly<{ readonly kind: "subject"; readonly subject: BattleSubject }>
    | Readonly<{
        readonly kind: "nextD20TestForActor";
        readonly testKind: "abilityCheck" | "savingThrow" | "attackRoll";
        readonly actorId: CombatantId;
      }>;
  readonly targetId?: CombatantId;
  readonly source: TableD20TestCircumstanceSource;
}>;

export type ScenarioTableD20TestCircumstanceState = Readonly<{
  readonly resolutionOrdinal: number;
  readonly bindings: readonly ScenarioTableD20TestCircumstanceBinding[];
  readonly activeDecisions: readonly TableD20TestCircumstanceDecision[];
}>;

type ScenarioStatBlockAttackSubject = Extract<
  BattleSubject,
  | Readonly<{
      readonly tag: "action";
      readonly action: "attack";
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
    }>
  | Readonly<{ readonly tag: "pactOfTheChainFamiliarAttack" }>
>;

function isStatBlockAttackSubject(
  subject: BattleSubject,
): subject is ScenarioStatBlockAttackSubject {
  return (
    subject.tag === "pactOfTheChainFamiliarAttack" ||
    (subject.tag === "action" &&
      subject.action === "attack" &&
      !("attackAbility" in subject))
  );
}

function statBlockAttackDamageNotation(
  selection: Readonly<{ readonly statBlockDamageNotation?: "static" }>,
): StatBlockDamageNotation {
  return selection.statBlockDamageNotation === "static" ? "static" : "rolled";
}

type ScenarioStatBlockDamageOption = Readonly<{
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly statBlockDamageNotation?: "static";
}>;

function scenarioStatBlockDamageOptionIsAdmitted(input: {
  readonly selected: StatBlockDamageNotation;
  readonly option: ScenarioStatBlockDamageOption;
  readonly available: readonly ScenarioStatBlockDamageOption[];
}): boolean {
  const selectedNotationIsAvailable = input.available.some(
    (candidate) =>
      candidate.procedureRef === input.option.procedureRef &&
      statBlockAttackDamageNotation(candidate) === input.selected,
  );
  return (
    !selectedNotationIsAvailable ||
    statBlockAttackDamageNotation(input.option) === input.selected
  );
}

function scenarioReadyResponseChoices(input: {
  readonly selected: StatBlockDamageNotation;
  readonly choices: readonly BattleReadyResponse[];
}): readonly BattleReadyResponse[] {
  const statBlockOptions = input.choices.flatMap((choice) =>
    choice.kind === "attack" && choice.selection.attackAbility === undefined
      ? [choice.selection]
      : [],
  );
  return input.choices.filter((choice) => {
    if (
      choice.kind !== "attack" ||
      choice.selection.attackAbility !== undefined
    ) {
      return true;
    }
    return scenarioStatBlockDamageOptionIsAdmitted({
      selected: input.selected,
      option: choice.selection,
      available: statBlockOptions,
    });
  });
}

function sameStatBlockAttackProcedure(
  left: ScenarioStatBlockAttackSubject,
  right: ScenarioStatBlockAttackSubject,
): boolean {
  return (
    left.tag === right.tag &&
    left.actorId === right.actorId &&
    left.procedureRef === right.procedureRef &&
    (left.tag !== "pactOfTheChainFamiliarAttack" ||
      (right.tag === "pactOfTheChainFamiliarAttack" &&
        left.familiarId === right.familiarId))
  );
}

export type ScenarioAvailableBattleAct = AvailableBattleAct & {
  readonly d20TestCircumstanceRequests: readonly BattleD20TestCircumstanceRequest[];
};

export function scenarioBattleActs(
  session: ScenarioSession,
): readonly ScenarioAvailableBattleAct[] {
  const acts = discoverBattleActs(session.battle);
  const statBlockOptions = acts.flatMap(({ subject }) =>
    isStatBlockAttackSubject(subject) ? [subject] : [],
  );
  return acts
    .filter(({ subject }) => {
      if (!isStatBlockAttackSubject(subject)) return true;
      return scenarioStatBlockDamageOptionIsAdmitted({
        selected: session.battlefield.statBlockDamageNotation,
        option: subject,
        available: statBlockOptions,
      });
    })
    .map((act) => {
      const initialHoles = projectGeometryTargetHoles({
        session,
        subject: act.subject,
        holes: act.initialHoles,
      }).map((hole) =>
        hole.kind === "readyDeclaration"
          ? {
              ...hole,
              responseChoices: scenarioReadyResponseChoices({
                selected: session.battlefield.statBlockDamageNotation,
                choices: hole.responseChoices,
              }),
            }
          : hole,
      );
      const requests = battleD20TestCircumstanceRequests({
        resolutionId: scenarioD20TestResolutionId(session),
        holes: initialHoles,
        resolvedFills: [],
      });
      const preparation = scenarioD20TestCircumstancePreparation({
        session,
        subject: act.subject,
        fills: [],
        requests,
      });
      const currentRequestRefs = new Set(
        requests.map(({ requestRef }) => requestRef),
      );
      const admitted = admitTableD20TestCircumstanceDecisions({
        requests,
        decisions: preparation.decisions.filter(({ requestRef }) =>
          currentRequestRefs.has(requestRef),
        ),
      });
      return {
        ...act,
        initialHoles: Either.isLeft(admitted)
          ? initialHoles
          : battleHolesWithTableD20TestCircumstances({
              holes: initialHoles,
              requests,
              admitted: admitted.right,
            }),
        d20TestCircumstanceRequests: requests,
      };
    });
}

export function projectGeometryTargetHoles(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly holes: readonly BattleHole[];
}): readonly BattleHole[] {
  if (input.session.battlefield.spatial.kind !== "geometryDerived") {
    return input.holes;
  }
  return input.holes.map((hole) => {
    if (hole.kind !== "targetChoice") {
      return hole;
    }
    if (hole.attack !== undefined) {
      const attack = hole.attack;
      const choices = hole.choices.filter((targetId) => {
        const eligibility = scenarioAttackTargetEligibility({
          session: input.session,
          attack,
          targetId,
        });
        return (
          Either.isRight(eligibility) && eligibility.right.tag === "eligible"
        );
      });
      const { requiresTableSpatialFact: _tableSpatialFact, ...geometryHole } =
        hole;
      return { ...geometryHole, choices };
    }
    const targetQuestionForSubject =
      scenarioTableSpatialFactQuestionFactoryForSubject(input.subject);
    if (targetQuestionForSubject === undefined) {
      return hole;
    }
    const choices = hole.choices.filter((targetId) => {
      const question = targetQuestionForSubject(targetId);
      const relation = scenarioRelationForSpatialQuestion(
        input.session,
        question,
      );
      return (
        relation.tag === "relation" &&
        Number(relation.relation.distanceFeet) <=
          scenarioTableSpatialFactDistanceLimitFeet(question)
      );
    });
    const { requiresTableSpatialFact: _tableSpatialFact, ...geometryHole } =
      hole;
    return { ...geometryHole, choices };
  });
}

export function scenarioBattleFills(
  session: ScenarioSession,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  if (
    subject.tag !== "action" ||
    subject.action !== "ready" ||
    fills[0]?.kind !== "readyDeclaration"
  ) {
    return fills;
  }
  const fill = fills[0];
  const selectedResponse = fill.value.response;
  if (
    selectedResponse.kind !== "attack" ||
    selectedResponse.selection.attackAbility !== undefined
  ) {
    return fills;
  }
  const readyHole = scenarioBattleActs(session)
    .find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "ready" &&
        act.subject.actorId === subject.actorId,
    )
    ?.initialHoles.find((hole) => hole.kind === "readyDeclaration");
  const projectedResponse = readyHole?.responseChoices.find(
    (candidate) =>
      candidate.kind === "attack" &&
      candidate.selection.attackAbility === undefined &&
      candidate.selection.procedureRef ===
        selectedResponse.selection.procedureRef,
  );
  return projectedResponse === undefined
    ? fills
    : [
        {
          ...fill,
          value: { ...fill.value, response: projectedResponse },
        },
      ];
}

export function scenarioBattleSubject(
  session: ScenarioSession,
  subject: BattleSubject,
): BattleSubject {
  if (!isStatBlockAttackSubject(subject)) return subject;
  const resolutionPhase = session.battle.state.subjectResolutionPhase;
  if (
    resolutionPhase.kind === "subjectContinuation" &&
    isStatBlockAttackSubject(resolutionPhase.subject) &&
    sameStatBlockAttackProcedure(subject, resolutionPhase.subject)
  ) {
    return resolutionPhase.subject;
  }
  const available = discoverBattleActs(session.battle).flatMap(({ subject }) =>
    isStatBlockAttackSubject(subject) ? [subject] : [],
  );
  const sameProcedure = available.filter((candidate) =>
    sameStatBlockAttackProcedure(subject, candidate),
  );
  return (
    sameProcedure.find(
      (candidate) =>
        statBlockAttackDamageNotation(candidate) ===
        session.battlefield.statBlockDamageNotation,
    ) ??
    sameProcedure[0] ??
    subject
  );
}

export function scenarioOpportunityAttackExecutionCandidates(input: {
  readonly session: ScenarioSession;
  readonly reactorId: CombatantId;
  readonly moverId: CombatantId;
}): ReturnType<typeof opportunityAttackExecutionCandidates> {
  const candidates = opportunityAttackExecutionCandidates(
    input.session.battle.state,
    input.reactorId,
    input.moverId,
  );
  const statBlockOptions = candidates.flatMap(({ selection }) =>
    selection.attackAbility === undefined ? [selection] : [],
  );
  return candidates.filter(({ selection }) => {
    if (selection.attackAbility !== undefined) return true;
    return scenarioStatBlockDamageOptionIsAdmitted({
      selected: input.session.battlefield.statBlockDamageNotation,
      option: selection,
      available: statBlockOptions,
    });
  });
}

export type ScenarioSessionFactIssue =
  | Readonly<{
      readonly tag: "arena-definition";
      readonly path: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "placement";
      readonly tokenId: string;
      readonly coordinate: CoordinateInput;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "duplicate-object-id" | "combatant-object-id-collision";
      readonly objectId: BattleObjectId;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "barrier-height";
      readonly between: readonly [CoordinateInput, CoordinateInput];
      readonly heightFeet: MovementFeet;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "missing-placement";
      readonly tokenId: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "unexpected-placement";
      readonly tokenId: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag:
        | "duplicate-ranged-attack-enemy-relationship"
        | "self-ranged-attack-enemy-relationship"
        | "unknown-ranged-attack-relationship-combatant";
      readonly combatantId: CombatantId;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag:
        | "duplicate-movement-ally-relationship"
        | "self-movement-ally-relationship"
        | "unknown-movement-ally-relationship-combatant"
        | "duplicate-opportunity-attack-enemy-relationship"
        | "self-opportunity-attack-enemy-relationship"
        | "unknown-opportunity-attack-enemy-relationship-combatant";
      readonly combatantId: CombatantId;
      readonly message: string;
    }>
  | ScenarioSpatialDecisionIssue;

export type ScenarioSessionIssue = Readonly<{
  readonly tag: "invalid-scenario-session";
  readonly issues: readonly [
    ScenarioSessionFactIssue,
    ...ScenarioSessionFactIssue[],
  ];
}>;

export type ScenarioSessionUpdateIssue =
  | Readonly<{
      readonly tag: "battle-lineage-conflict";
      readonly expectedBattleId: BattleId;
      readonly receivedBattleId: BattleId;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "unknown-object-damage";
      readonly objectId: BattleObjectId;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "object-damage-state-conflict";
      readonly objectId: BattleObjectId;
      readonly outcomePriorHitPoints: Hp;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag:
        | "unexpected-battle-movement"
        | "movement-outcome-conflict"
        | "multiple-battle-movements";
      readonly message: string;
    }>
  | Readonly<ScenarioSpatialDecisionIssue>;

export type ScenarioMovementIssue =
  | Readonly<{
      readonly tag: "scenario-movement-rejected";
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "spatial-decision-lineage-conflict";
      readonly decisionId: string;
      readonly question: ScenarioSpatialDecisionQuestion;
      readonly message: string;
    }>;

export type ScenarioMovementPlan = Readonly<{
  readonly session: ScenarioSession;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
  readonly fills: readonly BattleFill[];
}>;

const sessions = new WeakSet<object>();
let nextScenarioSessionLineage = 0;

function runtimeValueIdentity(value: object): string {
  return `runtime-object:${sha256Canonical(jsonValue(value))}`;
}

function newScenarioSessionLineageId(): ScenarioSessionLineageId {
  nextScenarioSessionLineage += 1;
  return `scenario-session:${String(nextScenarioSessionLineage)}` as ScenarioSessionLineageId;
}

function freezeObject(object: ScenarioBattleObject): ScenarioBattleObject {
  return Object.freeze({
    ...object,
    damageDisposition: Object.freeze({ ...object.damageDisposition }),
  });
}

function makeScenarioSession(
  battle: BattleRuntimeSession,
  battlefield: ScenarioBattlefield,
  movementResolution: ScenarioMovementResolution = Object.freeze({
    kind: "idle",
  }),
  sessionLineageId: ScenarioSessionLineageId = newScenarioSessionLineageId(),
  tableD20TestCircumstances: ScenarioTableD20TestCircumstanceState = Object.freeze(
    {
      resolutionOrdinal: 0,
      bindings: Object.freeze([]),
      activeDecisions: Object.freeze([]),
    },
  ),
): ScenarioSession {
  const session = Object.freeze({
    battle,
    battlefield,
    movementResolution,
    tableD20TestCircumstances,
    lineage: Object.freeze({
      scenarioSessionLineageId: sessionLineageId,
      battleRuntimeSessionIdentity: runtimeValueIdentity(battle),
    }),
  });
  sessions.add(session);
  // The brand is compile-time only; WeakSet membership is the runtime proof
  // that this value passed createScenarioSession's composition checks.
  return session as ScenarioSession;
}

export type ScenarioTableD20TestCircumstanceBindingIssue = Readonly<{
  readonly tag: "unknown-d20-test-actor" | "duplicate-d20-test-binding";
  readonly message: string;
}>;

function sameScenarioD20TestSelection(
  left: ScenarioTableD20TestCircumstanceBinding["selection"],
  right: ScenarioTableD20TestCircumstanceBinding["selection"],
): boolean {
  return Match.value(left).pipe(
    Match.when(
      { kind: "subject" },
      ({ subject }) =>
        right.kind === "subject" && sameBattleSubject(subject, right.subject),
    ),
    Match.when(
      { kind: "nextD20TestForActor" },
      ({ testKind, actorId }) =>
        right.kind === "nextD20TestForActor" &&
        right.testKind === testKind &&
        right.actorId === actorId,
    ),
    Match.exhaustive,
  );
}

export function scenarioSessionWithTableD20TestCircumstance(input: {
  readonly session: ScenarioSession;
  readonly binding: ScenarioTableD20TestCircumstanceBinding;
}): Either.Either<
  ScenarioSession,
  ScenarioTableD20TestCircumstanceBindingIssue
> {
  const selectedActorId =
    input.binding.selection.kind === "nextD20TestForActor"
      ? input.binding.selection.actorId
      : input.binding.selection.subject.actorId;
  if (!input.session.battle.state.combatants.has(selectedActorId)) {
    return Either.left({
      tag: "unknown-d20-test-actor",
      message: `A Table D20 Test circumstance binding names unknown combatant ${String(selectedActorId)}.`,
    });
  }
  const duplicate = input.session.tableD20TestCircumstances.bindings.some(
    (binding) =>
      sameScenarioD20TestSelection(
        binding.selection,
        input.binding.selection,
      ) && binding.targetId === input.binding.targetId,
  );
  if (duplicate) {
    return Either.left({
      tag: "duplicate-d20-test-binding",
      message:
        "A battle subject and target can have only one pending Table D20 Test circumstance binding.",
    });
  }
  return Either.right(
    makeScenarioSession(
      input.session.battle,
      input.session.battlefield,
      input.session.movementResolution,
      input.session.lineage.scenarioSessionLineageId,
      Object.freeze({
        ...input.session.tableD20TestCircumstances,
        bindings: Object.freeze([
          ...input.session.tableD20TestCircumstances.bindings,
          Object.freeze({ ...input.binding }),
        ]),
      }),
    ),
  );
}

export function scenarioD20TestResolutionId(
  session: ScenarioSession,
): D20TestResolutionId {
  return d20TestResolutionId(
    `${session.lineage.scenarioSessionLineageId}:d20-resolution:${String(session.tableD20TestCircumstances.resolutionOrdinal)}`,
  );
}

export type ScenarioD20TestCircumstancePreparation = Readonly<{
  readonly decisions: readonly TableD20TestCircumstanceDecision[];
  readonly state: ScenarioTableD20TestCircumstanceState;
}>;

function bindingMatchesD20TestRequest(input: {
  readonly binding: ScenarioTableD20TestCircumstanceBinding;
  readonly request: BattleD20TestCircumstanceRequest;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): boolean {
  const selectionMatches =
    input.binding.selection.kind === "subject"
      ? sameBattleSubject(input.binding.selection.subject, input.subject)
      : input.binding.selection.actorId === input.subject.actorId &&
        input.binding.selection.testKind === input.request.testKind;
  if (!selectionMatches) return false;
  if (input.binding.targetId === undefined) return true;
  if (input.request.targetId !== undefined) {
    return input.request.targetId === input.binding.targetId;
  }
  return (
    input.request.testKind === "attackRoll" &&
    [...input.fills].reverse().find((fill) => fill.kind === "targetChoice")
      ?.value === input.binding.targetId
  );
}

export function scenarioD20TestCircumstancePreparation(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly requests: readonly BattleD20TestCircumstanceRequest[];
}): ScenarioD20TestCircumstancePreparation {
  const remainingBindings = [
    ...input.session.tableD20TestCircumstances.bindings,
  ];
  const decisions = [
    ...input.session.tableD20TestCircumstances.activeDecisions,
  ];
  for (const request of input.requests) {
    if (decisions.some(({ requestRef }) => requestRef === request.requestRef)) {
      continue;
    }
    const bindingIndex = remainingBindings.findIndex((binding) =>
      bindingMatchesD20TestRequest({
        binding,
        request,
        subject: input.subject,
        fills: input.fills,
      }),
    );
    const binding = remainingBindings[bindingIndex];
    if (binding === undefined) continue;
    decisions.push({
      requestRef: request.requestRef,
      testKind: request.testKind,
      source: binding.source,
    });
    remainingBindings.splice(bindingIndex, 1);
  }
  return {
    decisions: Object.freeze(decisions),
    state: Object.freeze({
      ...input.session.tableD20TestCircumstances,
      bindings: Object.freeze(remainingBindings),
      activeDecisions: Object.freeze(decisions),
    }),
  };
}

export function scenarioBattleResultWithD20TestCircumstances(input: {
  readonly result: BattleRuntimeTableD20TestResolutionResult;
  readonly decisions: readonly TableD20TestCircumstanceDecision[];
}): BattleRuntimeTableD20TestResolutionResult {
  if (input.result.tag !== "needsHoles") return input.result;
  const currentDecisionRefs = new Set(
    input.result.d20TestCircumstanceRequests.map(
      ({ requestRef }) => requestRef,
    ),
  );
  const currentDecisions = input.decisions.filter(({ requestRef }) =>
    currentDecisionRefs.has(requestRef),
  );
  const admitted = admitTableD20TestCircumstanceDecisions({
    requests: input.result.d20TestCircumstanceRequests,
    decisions: currentDecisions,
  });
  if (Either.isLeft(admitted)) return input.result;
  return {
    ...input.result,
    holes: battleHolesWithTableD20TestCircumstances({
      holes: input.result.holes,
      requests: input.result.d20TestCircumstanceRequests,
      admitted: admitted.right,
    }),
  };
}

export function scenarioSessionAfterD20TestCircumstanceResolution(input: {
  readonly session: ScenarioSession;
  readonly state: ScenarioTableD20TestCircumstanceState;
  readonly resolutionTag: BattleRuntimeTableD20TestResolutionResult["tag"];
}): ScenarioSession {
  const state =
    input.resolutionTag === "resolved"
      ? Object.freeze({
          resolutionOrdinal: input.state.resolutionOrdinal + 1,
          bindings: input.state.bindings,
          activeDecisions: Object.freeze([]),
        })
      : input.state;
  return makeScenarioSession(
    input.session.battle,
    input.session.battlefield,
    input.session.movementResolution,
    input.session.lineage.scenarioSessionLineageId,
    state,
  );
}

function nonEmptyIssues(
  issues: readonly ScenarioSessionFactIssue[],
):
  | readonly [ScenarioSessionFactIssue, ...ScenarioSessionFactIssue[]]
  | undefined {
  const first = issues[0];
  return first === undefined ? undefined : [first, ...issues.slice(1)];
}

function placementIssueMessage(
  error: PlaceTokenError,
  tokenId: string,
): string {
  const byTag = Match.discriminator("tag");
  return Match.value(error).pipe(
    byTag("invalid-coordinate", ({ message }) => message),
    byTag(
      "missing-cell",
      () => `Scenario token ${tokenId} was placed outside the tactical arena.`,
    ),
    byTag(
      "duplicate-token",
      () => `Scenario token ${tokenId} has more than one placement.`,
    ),
    byTag("revision-limit", ({ message }) => message),
    Match.exhaustive,
  );
}

export function createScenarioSession(input: {
  readonly battle: BattleRuntimeSession;
  readonly spatial: ScenarioSpatialSetupInput;
  readonly ambientIllumination: BattleIllumination;
  readonly statBlockDamageNotation: StatBlockDamageNotation;
  readonly environment: ScenarioEnvironment;
  readonly initialRangedAttackEnemyRelationships: readonly ScenarioInitialRangedAttackEnemyRelationship[];
  readonly movementAllyRelationships: readonly ScenarioMovementAllyRelationship[];
  readonly opportunityAttackEnemyRelationships: readonly ScenarioOpportunityAttackEnemyRelationship[];
  readonly objects: readonly ScenarioBattleObject[];
}): Either.Either<ScenarioSession, ScenarioSessionIssue> {
  const issues: ScenarioSessionFactIssue[] = [];
  const geometrySupplied = input.spatial.kind === "geometryDerived";
  const suppliedArena = geometrySupplied ? input.spatial.arena : undefined;
  const suppliedPlacements = geometrySupplied ? input.spatial.placements : [];
  const parsedArena =
    suppliedArena === undefined ? undefined : parseArena(suppliedArena);
  if (parsedArena?.tag === "error") {
    const [first, ...rest] = parsedArena.issues;
    const arenaFactIssue = ({ path, message }: typeof first) => ({
      tag: "arena-definition" as const,
      path,
      message,
    });
    issues.push(arenaFactIssue(first), ...rest.map(arenaFactIssue));
  }

  const combatantIds = new Set(
    [...input.battle.state.combatants.keys()].map(String),
  );
  const rangedAttackEnemyRelationships = new Set<string>();
  for (const relationship of input.initialRangedAttackEnemyRelationships) {
    const relationshipKey = `${String(relationship.attackerId)}\u0000${String(relationship.enemyId)}`;
    for (const combatantId of [relationship.attackerId, relationship.enemyId]) {
      if (!combatantIds.has(String(combatantId))) {
        issues.push({
          tag: "unknown-ranged-attack-relationship-combatant",
          combatantId,
          message: `Initial ranged-attack enemy relationship names unknown scenario combatant ${String(combatantId)}.`,
        });
      }
    }
    if (relationship.attackerId === relationship.enemyId) {
      issues.push({
        tag: "self-ranged-attack-enemy-relationship",
        combatantId: relationship.attackerId,
        message: `Scenario combatant ${String(relationship.attackerId)} cannot be its own enemy for the initial ranged-attack proximity decision.`,
      });
    }
    if (rangedAttackEnemyRelationships.has(relationshipKey)) {
      issues.push({
        tag: "duplicate-ranged-attack-enemy-relationship",
        combatantId: relationship.attackerId,
        message: `Initial ranged-attack enemy relationship ${String(relationship.attackerId)} to ${String(relationship.enemyId)} is declared more than once.`,
      });
    }
    rangedAttackEnemyRelationships.add(relationshipKey);
  }
  const movementAllyRelationships = new Set<string>();
  for (const relationship of input.movementAllyRelationships) {
    const relationshipKey = `${String(relationship.moverId)}\u0000${String(relationship.allyId)}`;
    for (const combatantId of [relationship.moverId, relationship.allyId]) {
      if (!combatantIds.has(String(combatantId))) {
        issues.push({
          tag: "unknown-movement-ally-relationship-combatant",
          combatantId,
          message: `Movement ally relationship names unknown scenario combatant ${String(combatantId)}.`,
        });
      }
    }
    if (relationship.moverId === relationship.allyId) {
      issues.push({
        tag: "self-movement-ally-relationship",
        combatantId: relationship.moverId,
        message: `Scenario combatant ${String(relationship.moverId)} cannot be its own movement ally.`,
      });
    }
    if (movementAllyRelationships.has(relationshipKey)) {
      issues.push({
        tag: "duplicate-movement-ally-relationship",
        combatantId: relationship.moverId,
        message: `Movement ally relationship ${String(relationship.moverId)} to ${String(relationship.allyId)} is declared more than once.`,
      });
    }
    movementAllyRelationships.add(relationshipKey);
  }
  const opportunityAttackEnemyRelationships = new Set<string>();
  for (const relationship of input.opportunityAttackEnemyRelationships) {
    const relationshipKey = `${String(relationship.reactorId)}\u0000${String(relationship.moverId)}`;
    for (const combatantId of [relationship.reactorId, relationship.moverId]) {
      if (!combatantIds.has(String(combatantId))) {
        issues.push({
          tag: "unknown-opportunity-attack-enemy-relationship-combatant",
          combatantId,
          message: `Movement Opportunity Attack enemy relationship names unknown scenario combatant ${String(combatantId)}.`,
        });
      }
    }
    if (relationship.reactorId === relationship.moverId) {
      issues.push({
        tag: "self-opportunity-attack-enemy-relationship",
        combatantId: relationship.reactorId,
        message: `Scenario combatant ${String(relationship.reactorId)} cannot be its own enemy for a movement Opportunity Attack.`,
      });
    }
    if (opportunityAttackEnemyRelationships.has(relationshipKey)) {
      issues.push({
        tag: "duplicate-opportunity-attack-enemy-relationship",
        combatantId: relationship.reactorId,
        message: `Movement Opportunity Attack enemy relationship ${String(relationship.reactorId)} to ${String(relationship.moverId)} is declared more than once.`,
      });
    }
    opportunityAttackEnemyRelationships.add(relationshipKey);
  }
  const objectIds = new Set<string>();
  for (const object of input.objects) {
    const objectId = String(object.objectId);
    if (objectIds.has(objectId)) {
      issues.push({
        tag: "duplicate-object-id",
        objectId: object.objectId,
        message: `Scenario object ${objectId} is declared more than once.`,
      });
    }
    objectIds.add(objectId);
    if (combatantIds.has(objectId)) {
      issues.push({
        tag: "combatant-object-id-collision",
        objectId: object.objectId,
        message: `Scenario object ${objectId} collides with a combatant id.`,
      });
    }
  }

  const parsedPlacements: Array<{
    readonly token: TokenId;
    readonly coordinate: CellCoordinate;
    readonly supplied: ScenarioPlacement;
  }> = [];
  for (const placement of suppliedPlacements) {
    const token = parseTokenId(String(placement.tokenId));
    const coordinate = parseCoordinate(placement.coordinate);
    if (token.tag === "error") {
      issues.push({
        tag: "placement",
        tokenId: String(placement.tokenId),
        coordinate: placement.coordinate,
        message: token.error.message,
      });
    }
    if (coordinate.tag === "error") {
      issues.push({
        tag: "placement",
        tokenId: String(placement.tokenId),
        coordinate: placement.coordinate,
        message: coordinate.error.message,
      });
    }
    if (token.tag === "ok" && coordinate.tag === "ok") {
      parsedPlacements.push({
        token: token.value,
        coordinate: coordinate.value,
        supplied: placement,
      });
    }
  }

  if (parsedArena?.tag === "error") {
    // The arena parser's nonempty issue list was appended above.
    return Either.left({
      tag: "invalid-scenario-session",
      issues: [issues[0]!, ...issues.slice(1)],
    });
  }

  const arena =
    parsedArena === undefined ? undefined : arenaSnapshot(parsedArena.value);
  let spatialState =
    parsedArena === undefined ? undefined : createState(parsedArena.value);
  for (const placement of parsedPlacements) {
    if (spatialState === undefined) continue;
    const placed = placeToken(
      spatialState,
      placement.token,
      placement.coordinate,
    );
    if (placed.tag === "error") {
      issues.push({
        tag: "placement",
        tokenId: String(placement.supplied.tokenId),
        coordinate: placement.supplied.coordinate,
        message: placementIssueMessage(
          placed.error,
          String(placement.supplied.tokenId),
        ),
      });
      continue;
    }
    spatialState = placed.value;
  }
  const space = spatialState === undefined ? undefined : snapshot(spatialState);

  for (const barrier of input.environment.barrierHeights) {
    if (arena === undefined) {
      issues.push({
        tag: "invalid-spatial-decision",
        decisionId: "scenario-geometry",
        message:
          "Barrier heights require a tactical-space arena; Table-authored spatial decisions cannot retain a geometry boundary.",
      });
      break;
    }
    const matchingBoundary = arena.boundaries.some(
      ({ between, traversal }) =>
        traversal === "blocked" && sameUndirectedEdge(between, barrier.between),
    );
    if (!matchingBoundary) {
      const subject = barrier.between.map(({ x, y }) => `${x},${y}`).join("–");
      issues.push({
        tag: "barrier-height",
        between: barrier.between,
        heightFeet: barrier.heightFeet,
        message: `Barrier height ${subject} does not identify a blocked tactical-space boundary.`,
      });
    }
  }

  const expectedTokens = new Set([...combatantIds, ...objectIds]);
  const placedTokens = new Set(
    space?.placements.map(({ token }) => String(token)) ?? [],
  );
  if (geometrySupplied) {
    for (const token of expectedTokens) {
      if (!placedTokens.has(token)) {
        issues.push({
          tag: "missing-placement",
          tokenId: token,
          message: `Scenario token ${token} has no tactical-space placement.`,
        });
      }
    }
    for (const token of placedTokens) {
      if (!expectedTokens.has(token)) {
        issues.push({
          tag: "unexpected-placement",
          tokenId: token,
          message: `Tactical-space token ${token} is neither a combatant nor a scenario object.`,
        });
      }
    }
  }

  const spatialDecisions: ScenarioTableSpatialDecision[] = [];
  const decisionByQuestion = new Map<string, ScenarioTableSpatialDecision>();
  const decisionIds = new Set<string>();
  const sessionLineageId = newScenarioSessionLineageId();
  const battleRuntimeSessionIdentity = runtimeValueIdentity(input.battle);
  const initialSpatialFingerprint =
    space?.fingerprint ??
    scenarioTableSpatialFingerprint({
      kind: "initial-table-authored-spatial-state",
      battleId: String(input.battle.state.battleId),
    });
  for (const suppliedDecision of input.spatial.spatialDecisions) {
    const normalized = tableAuthoredSpatialDecision(suppliedDecision);
    if (Either.isLeft(normalized)) {
      issues.push(normalized.left);
      continue;
    }
    const decision = normalized.right;
    if (geometrySupplied) {
      issues.push(
        spatialDecisionIssue(
          "contradictory-spatial-decision",
          decision.decisionId,
          `Table-authored spatial decision ${decision.decisionId} cannot be combined with a geometry-derived spatial boundary; geometry owns every supported spatial question.`,
        ),
      );
      continue;
    }
    const unknownReference = scenarioSpatialDecisionEntityReferences(
      decision,
    ).find(
      (tokenId) =>
        !combatantIds.has(String(tokenId)) && !objectIds.has(String(tokenId)),
    );
    if (unknownReference !== undefined) {
      issues.push(
        spatialDecisionIssue(
          "invalid-spatial-decision",
          decision.decisionId,
          `Table-authored spatial decision ${decision.decisionId} names unknown scenario entity ${String(unknownReference)}.`,
        ),
      );
      continue;
    }
    const candidateDecisionIds =
      scenarioSpatialDecisionIds(decision).map(String);
    const candidateDecisionIdSet = new Set<string>();
    const reusedDecisionId = candidateDecisionIds.find((candidateId) => {
      if (candidateDecisionIdSet.has(candidateId)) return true;
      candidateDecisionIdSet.add(candidateId);
      return decisionIds.has(candidateId);
    });
    if (reusedDecisionId !== undefined) {
      issues.push(
        spatialDecisionIssue(
          "duplicate-spatial-decision",
          reusedDecisionId,
          `Table-authored spatial decision id ${reusedDecisionId} is reused across distinct or nested questions.`,
        ),
      );
      continue;
    }
    const questionKey = spatialQuestionKey(decision.question);
    const previous = decisionByQuestion.get(questionKey);
    if (previous !== undefined) {
      issues.push(
        spatialDecisionIssue(
          spatialDecisionValueKey(previous.decision) ===
            spatialDecisionValueKey(decision)
            ? "duplicate-spatial-decision"
            : "contradictory-spatial-decision",
          decision.decisionId,
          `Table-authored spatial decision ${decision.decisionId} answers the same exact question as ${previous.decision.decisionId}.`,
        ),
      );
      continue;
    }
    const bound: ScenarioTableSpatialDecision = Object.freeze({
      source: "tableAuthored",
      decision,
      lineage: Object.freeze({
        battleId: input.battle.state.battleId,
        scenarioSessionLineageId: sessionLineageId,
        battleRuntimeSessionIdentity,
        spatialFingerprint: initialSpatialFingerprint,
      }),
    });
    decisionByQuestion.set(questionKey, bound);
    for (const decisionId of candidateDecisionIds) {
      decisionIds.add(decisionId);
    }
    spatialDecisions.push(bound);
  }

  const invalid = nonEmptyIssues(issues);
  if (invalid !== undefined) {
    return Either.left({ tag: "invalid-scenario-session", issues: invalid });
  }
  let spatial: ScenarioSpatialBoundary;
  if (input.spatial.kind === "geometryDerived") {
    if (arena === undefined || space === undefined) {
      return Either.left({
        tag: "invalid-scenario-session",
        issues: [
          {
            tag: "invalid-spatial-decision",
            decisionId: "scenario-geometry",
            message:
              "A geometry-derived spatial setup must produce both an arena and a spatial snapshot.",
          },
        ],
      });
    }
    spatial = Object.freeze({
      kind: "geometryDerived" as const,
      arena,
      space,
    });
  } else {
    spatial = Object.freeze({
      kind: "tableAuthored" as const,
      spatialFingerprint: initialSpatialFingerprint,
      tableAuthoredDecisions: Object.freeze(spatialDecisions),
    });
  }
  const battlefieldValue = {
    spatial,
    ambientIllumination: input.ambientIllumination,
    statBlockDamageNotation: input.statBlockDamageNotation,
    environment: Object.freeze({
      overhead: Object.freeze({ ...input.environment.overhead }),
      barrierHeights: Object.freeze(
        input.environment.barrierHeights.map((barrier) =>
          Object.freeze({
            between: Object.freeze([
              Object.freeze({ ...barrier.between[0] }),
              Object.freeze({ ...barrier.between[1] }),
            ] as const),
            heightFeet: barrier.heightFeet,
          }),
        ),
      ),
    }),
    initialRangedAttackEnemyRelationships: Object.freeze(
      input.initialRangedAttackEnemyRelationships.map((relationship) =>
        Object.freeze({ ...relationship }),
      ),
    ),
    movementAllyRelationships: Object.freeze(
      input.movementAllyRelationships.map((relationship) =>
        Object.freeze({ ...relationship }),
      ),
    ),
    opportunityAttackEnemyRelationships: Object.freeze(
      input.opportunityAttackEnemyRelationships.map((relationship) =>
        Object.freeze({ ...relationship }),
      ),
    ),
    objects: Object.freeze(input.objects.map(freezeObject)),
  };
  const battlefield = Object.freeze(battlefieldValue);
  return Either.right(
    makeScenarioSession(
      input.battle,
      battlefield,
      Object.freeze({ kind: "idle" }),
      sessionLineageId,
    ),
  );
}

export type ScenarioRelationResult =
  | Readonly<{
      readonly tag: "relation";
      readonly relation: ScenarioSpatialRelation;
    }>
  | Readonly<{
      readonly tag: "unknown-token";
      readonly tokenId: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "spatial-decision-required";
      readonly question: ScenarioSpatialDecisionQuestion;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "stale-spatial-decision";
      readonly decisionId: string;
      readonly question: ScenarioSpatialDecisionQuestion;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "spatial-decision-lineage-conflict";
      readonly decisionId: string;
      readonly question: ScenarioSpatialDecisionQuestion;
      readonly message: string;
    }>;

export type ScenarioSpatialRelation = Readonly<{
  readonly source: TokenId;
  readonly target: TokenId;
  readonly direction: ScenarioDirection;
  readonly distanceFeet: DistanceFeet;
  readonly attackerCanSeeTarget: boolean;
  readonly cover: CoverType;
  readonly traversal: BoundaryOpenness;
  readonly spatialSource: ScenarioSpatialWitnessSource;
}>;

export function scenarioTokenId(
  session: ScenarioSession,
  input: string,
): ScenarioTokenId | undefined {
  const combatantId = [...session.battle.state.combatants.keys()].find(
    (candidate) => String(candidate) === input,
  );
  if (combatantId !== undefined) return combatantId;
  return session.battlefield.objects.find(
    ({ objectId }) => String(objectId) === input,
  )?.objectId;
}

export function scenarioRelation(input: {
  readonly session: ScenarioSession;
  readonly sourceId: ScenarioTokenId;
  readonly targetId: ScenarioTokenId;
}): ScenarioRelationResult {
  const question: Extract<
    ScenarioSpatialDecisionQuestion,
    { readonly kind: "relation" }
  > = {
    kind: "relation",
    sourceId: input.sourceId,
    targetId: input.targetId,
  };
  return scenarioRelationForSpatialQuestion(input.session, question);
}

type ScenarioRelationSpatialQuestion = Exclude<
  ScenarioSpatialDecisionQuestion,
  Extract<ScenarioSpatialDecisionQuestion, { readonly kind: "movementRoute" }>
>;

function scenarioSpatialQuestionEndpoints(
  question: ScenarioRelationSpatialQuestion,
): Readonly<{
  readonly sourceId: ScenarioTokenId;
  readonly targetId: ScenarioTokenId;
}> {
  return Match.value(question).pipe(
    Match.when({ kind: "relation" }, ({ sourceId, targetId }) => ({
      sourceId,
      targetId,
    })),
    Match.when({ kind: "spellTarget" }, ({ casterId, targetId }) => ({
      sourceId: casterId,
      targetId,
    })),
    Match.when({ kind: "objectTarget" }, ({ actorId, objectId }) => ({
      sourceId: actorId,
      targetId: objectId,
    })),
    Match.when({ kind: "attackTarget" }, ({ actorId, targetId }) => ({
      sourceId: actorId,
      targetId,
    })),
    Match.when({ kind: "grappleTarget" }, ({ grapplerId, targetId }) => ({
      sourceId: grapplerId,
      targetId,
    })),
    Match.when({ kind: "shoveTarget" }, ({ shoverId, targetId }) => ({
      sourceId: shoverId,
      targetId,
    })),
    Match.when({ kind: "sleepShakeAwakeTarget" }, ({ actorId, targetId }) => ({
      sourceId: actorId,
      targetId,
    })),
    Match.when(
      { kind: "hypnoticPatternShakeAwakeTarget" },
      ({ actorId, targetId }) => ({ sourceId: actorId, targetId }),
    ),
    Match.when({ kind: "helpAttackTarget" }, ({ helperId, targetEnemyId }) => ({
      sourceId: helperId,
      targetId: targetEnemyId,
    })),
    Match.exhaustive,
  );
}

function scenarioRelationForSpatialQuestion(
  session: ScenarioSession,
  question: ScenarioRelationSpatialQuestion,
): ScenarioRelationResult {
  const tableDecision =
    session.battlefield.spatial.kind === "tableAuthored"
      ? scenarioSpatialDecision(session, question)
      : ({ tag: "none" } as const);
  if (tableDecision.tag === "lineageConflict") {
    return {
      tag: "spatial-decision-lineage-conflict",
      decisionId: tableDecision.decision.decision.decisionId,
      question,
      message: `Table-authored spatial decision ${tableDecision.decision.decision.decisionId} belongs to a different ScenarioSession/BattleRuntime lineage.`,
    };
  }
  if (tableDecision.tag === "stale") {
    return {
      tag: "stale-spatial-decision",
      decisionId: tableDecision.decision.decision.decisionId,
      question,
      message: `Table-authored spatial decision ${tableDecision.decision.decision.decisionId} is stale for the current ScenarioSession spatial lineage.`,
    };
  }
  if (tableDecision.tag === "found") {
    if ("kind" in tableDecision.decision.decision.answer) {
      return {
        tag: "unknown-token",
        tokenId: "scenario-spatial-decision",
        message:
          "A movement-route answer cannot satisfy a relation, spell-target, or object-target question.",
      };
    }
    return scenarioRelationFromAnswer(
      session,
      question,
      tableDecision.decision.decision.answer,
      {
        kind: "tableAuthored",
        decisionId: tableDecision.decision.decision.decisionId,
        lineage: tableDecision.decision.lineage,
      },
    );
  }
  const geometry = spatialBoundary(session);
  if (geometry === undefined) {
    return {
      tag: "spatial-decision-required",
      question,
      message: `Scenario ${question.kind} requires a Table-authored spatial decision when tactical-space is not selected.`,
    };
  }
  const spatial = restoreSpatialState(geometry);
  if (spatial === undefined) {
    return {
      tag: "unknown-token",
      tokenId: "scenario-spatial-state",
      message:
        "Scenario geometry-derived spatial evidence could not be restored from its canonical snapshots.",
    };
  }
  const { sourceId, targetId } = scenarioSpatialQuestionEndpoints(question);
  return scenarioRelationInSpace(session, spatial, sourceId, targetId);
}

type ScenarioSpatialDecisionLookup =
  | Readonly<{ readonly tag: "none" }>
  | Readonly<{
      readonly tag: "found";
      readonly decision: ScenarioTableSpatialDecision;
    }>
  | Readonly<{
      readonly tag: "stale";
      readonly decision: ScenarioTableSpatialDecision;
    }>
  | Readonly<{
      readonly tag: "lineageConflict";
      readonly decision: ScenarioTableSpatialDecision;
    }>;

function spatialBoundary(
  session: ScenarioSession,
):
  | Extract<ScenarioSpatialBoundary, { readonly kind: "geometryDerived" }>
  | undefined {
  return session.battlefield.spatial.kind === "geometryDerived"
    ? session.battlefield.spatial
    : undefined;
}

function currentSpatialFingerprint(session: ScenarioSession): StateFingerprint {
  const spatial = session.battlefield.spatial;
  return spatial.kind === "geometryDerived"
    ? spatial.space.fingerprint
    : spatial.spatialFingerprint;
}

function scenarioSpatialDecision(
  session: ScenarioSession,
  question: ScenarioSpatialDecisionQuestion,
): ScenarioSpatialDecisionLookup {
  if (session.battlefield.spatial.kind !== "tableAuthored") {
    return { tag: "none" };
  }
  const decision = session.battlefield.spatial.tableAuthoredDecisions.find(
    (candidate) =>
      spatialQuestionKey(candidate.decision.question) ===
      spatialQuestionKey(question),
  );
  if (decision === undefined) return { tag: "none" };
  if (
    decision.lineage.battleId !== session.battle.state.battleId ||
    decision.lineage.spatialFingerprint !== currentSpatialFingerprint(session)
  ) {
    return { tag: "stale", decision };
  }
  if (
    decision.lineage.scenarioSessionLineageId !==
      session.lineage.scenarioSessionLineageId ||
    decision.lineage.battleRuntimeSessionIdentity !==
      session.lineage.battleRuntimeSessionIdentity
  ) {
    return { tag: "lineageConflict", decision };
  }
  return { tag: "found", decision };
}

function scenarioTablePostMoveSpatialBoundary(
  session: ScenarioSession,
  state: ScenarioTableSpatialPostMoveState,
): ScenarioSpatialBoundary {
  const decisions = state.tableAuthoredDecisions.map((decision) =>
    Object.freeze({
      source: "tableAuthored" as const,
      decision,
      lineage: Object.freeze({
        battleId: session.battle.state.battleId,
        scenarioSessionLineageId: session.lineage.scenarioSessionLineageId,
        battleRuntimeSessionIdentity:
          session.lineage.battleRuntimeSessionIdentity,
        spatialFingerprint: state.spatialFingerprint,
      }),
    }),
  );
  return Object.freeze({
    kind: "tableAuthored" as const,
    spatialFingerprint: state.spatialFingerprint,
    tableAuthoredDecisions: Object.freeze(decisions),
  });
}

function scenarioRelationFromAnswer(
  _session: ScenarioSession,
  question: ScenarioRelationSpatialQuestion,
  answer: ScenarioSpatialRelationAnswer,
  source: ScenarioSpatialWitnessSource,
): ScenarioRelationResult {
  const { sourceId, targetId } = scenarioSpatialQuestionEndpoints(question);
  const sourceToken = parseTokenId(String(sourceId));
  const targetToken = parseTokenId(String(targetId));
  if (sourceToken.tag === "error") {
    return {
      tag: "unknown-token",
      tokenId: String(sourceId),
      message: sourceToken.error.message,
    };
  }
  if (targetToken.tag === "error") {
    return {
      tag: "unknown-token",
      tokenId: String(targetId),
      message: targetToken.error.message,
    };
  }
  return {
    tag: "relation",
    relation: {
      source: sourceToken.value,
      target: targetToken.value,
      ...answer,
      spatialSource: source,
    },
  };
}

function scenarioRelationInSpace(
  session: ScenarioSession,
  space: SpatialState,
  sourceId: ScenarioTokenId,
  targetId: ScenarioTokenId,
): ScenarioRelationResult {
  const source = parseTokenId(String(sourceId));
  const target = parseTokenId(String(targetId));
  if (source.tag === "error") {
    return {
      tag: "unknown-token",
      tokenId: String(sourceId),
      message: source.error.message,
    };
  }
  if (target.tag === "error") {
    return {
      tag: "unknown-token",
      tokenId: String(targetId),
      message: target.error.message,
    };
  }
  const relationResult = relationBetween(space, source.value, target.value);
  if (relationResult.tag === "error") {
    return {
      tag: "unknown-token",
      tokenId: String(relationResult.error.token),
      message: `Scenario token ${String(relationResult.error.token)} has no current placement.`,
    };
  }
  const relation = relationResult.value;
  const interveningObjects = scenarioObjectsBetween(
    session,
    space,
    source.value,
    target.value,
  );
  return {
    tag: "relation",
    relation: {
      source: relation.source,
      target: relation.target,
      direction: relation.direction,
      distanceFeet: relation.distanceFeet,
      attackerCanSeeTarget:
        relation.sight === "clear" &&
        interveningObjects.every(({ sight }) => sight === "open"),
      cover: battleCover(
        interveningObjects.reduce(
          (cover, object) =>
            moreProtectiveCover(cover, object.interveningCover),
          relation.cover,
        ),
      ),
      traversal: interveningObjects.some(
        ({ traversal }) => traversal === "blocked",
      )
        ? "blocked"
        : "open",
      spatialSource: { kind: "geometryDerived", adapter: "tactical-space" },
    },
  };
}

export function planScenarioMovement(input: {
  readonly session: ScenarioSession;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
  readonly route: readonly [CoordinateInput, ...CoordinateInput[]];
  readonly speedKind: BattleMovementSpeedKind;
  readonly fills: readonly BattleFill[];
}): Either.Either<ScenarioMovementPlan, ScenarioMovementIssue> {
  if (input.session.movementResolution.kind !== "idle") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "Resolve the pending scenario movement interrupt before planning another route.",
    });
  }
  if (input.speedKind !== "walk") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "Scenario route composition currently supports ordinary walking on its two-dimensional grid only.",
    });
  }
  const mover = parseTokenId(String(input.subject.actorId));
  if (mover.tag === "error") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: mover.error.message,
    });
  }
  const frontier = resolveBattleRuntimeSubject({
    session: input.session.battle,
    subject: input.subject,
    fills: [],
  });
  const movementHole =
    frontier.tag === "needsHoles"
      ? frontier.holes.find((hole) => hole.kind === "movement")
      : undefined;
  if (movementHole?.kind !== "movement") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "The selected battle subject does not currently expose an ordinary Movement frontier.",
    });
  }

  const movementQuestion: Extract<
    ScenarioSpatialDecisionQuestion,
    { readonly kind: "movementRoute" }
  > = {
    kind: "movementRoute",
    moverId: input.subject.actorId,
    route: input.route,
    speedKind: input.speedKind,
  };
  const tableDecision = scenarioSpatialDecision(
    input.session,
    movementQuestion,
  );
  if (tableDecision.tag === "stale") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: `Table-authored movement route decision ${String(tableDecision.decision.decision.decisionId)} is stale for the current spatial fingerprint.`,
    });
  }
  if (tableDecision.tag === "lineageConflict") {
    return Either.left({
      tag: "spatial-decision-lineage-conflict",
      decisionId: String(tableDecision.decision.decision.decisionId),
      question: tableDecision.decision.decision.question,
      message: `Table-authored movement route decision ${String(tableDecision.decision.decision.decisionId)} belongs to a different ScenarioSession/BattleRuntime lineage.`,
    });
  }
  if (tableDecision.tag === "found") {
    const decision = tableDecision.decision;
    if (!("kind" in decision.decision.answer)) {
      return Either.left({
        tag: "scenario-movement-rejected",
        message:
          "A relation answer cannot satisfy the exact movement-route question.",
      });
    }
    const answer = decision.decision.answer;
    const creatureSpaceTraversal =
      answer.creatureSpaceTraversal.kind === "fact"
        ? answer.creatureSpaceTraversal.value
        : undefined;
    const fill: Extract<BattleFill, { readonly kind: "movement" }> =
      Object.freeze({
        kind: "movement",
        holeId: movementHole.holeId,
        value: Object.freeze({
          speedKind: input.speedKind,
          movementCostFeet: answer.movementCostFeet,
          provokedOpportunityAttacks: Object.freeze(
            answer.provokedOpportunityAttacks.map((threat) =>
              Object.freeze({ ...threat }),
            ),
          ),
          ...(creatureSpaceTraversal === undefined
            ? {}
            : { creatureSpaceTraversal }),
        }),
      });
    const postMoveSpatial = scenarioTablePostMoveSpatialBoundary(
      input.session,
      answer.postMoveSpatialState,
    );
    const movementResolution = Object.freeze({
      kind: "tableAuthoredPending" as const,
      subject: Object.freeze({ ...input.subject }),
      fill,
      decision,
      postMoveSpatial,
    });
    return Either.right({
      session: makeScenarioSession(
        input.session.battle,
        input.session.battlefield,
        movementResolution,
        input.session.lineage.scenarioSessionLineageId,
        input.session.tableD20TestCircumstances,
      ),
      subject: movementResolution.subject,
      fills: [fill, ...input.fills],
    });
  }

  const geometry = spatialBoundary(input.session);
  if (geometry === undefined) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "Scenario movement requires a Table-authored route when tactical-space is not selected.",
    });
  }
  const restoredSpatialState = restoreSpatialState(geometry);
  if (restoredSpatialState === undefined) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "Scenario geometry-derived spatial evidence could not be restored from its canonical snapshots.",
    });
  }

  let routeState = restoredSpatialState;
  const originFingerprint = geometry.space.fingerprint;
  let movementCost = 0;
  const objectByToken = new Map(
    input.session.battlefield.objects.map((object) => [
      String(object.objectId),
      object,
    ]),
  );
  const combatantByToken = new Map(
    [...input.session.battle.state.combatants].map(
      ([combatantId, combatant]) => [String(combatantId), combatant],
    ),
  );
  const routeSteps: Array<{
    readonly positionId: BattleTablePositionId;
    readonly distanceFeet: MovementFeet;
  }> = [];
  const tacticalDifficultTerrainPositions = new Set<BattleTablePositionId>();
  const provokedOpportunityAttacks: BattleOpportunityAttackThreat[] = [];
  const moverState = input.session.battle.state.combatants.get(
    input.subject.actorId,
  );
  if (moverState === undefined) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: `Scenario movement actor ${String(input.subject.actorId)} is not a current battle combatant.`,
    });
  }
  const moverSize = combatantEffectiveSize(moverState);
  const opportunityAttackEnemyRelationships =
    input.session.battlefield.opportunityAttackEnemyRelationships.filter(
      ({ moverId }) => moverId === input.subject.actorId,
    );
  if (
    opportunityAttackEnemyRelationships.length > 0 &&
    input.session.battlefield.ambientIllumination !== "brightLight"
  ) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message:
        "Scenario Opportunity Attack route projection currently supports bright-light encounters only.",
    });
  }
  for (const { reactorId } of opportunityAttackEnemyRelationships) {
    const reactor = input.session.battle.state.combatants.get(reactorId);
    if (
      reactor !== undefined &&
      combatantEffectiveSize(reactor) !== "small" &&
      combatantEffectiveSize(reactor) !== "medium"
    ) {
      return Either.left({
        tag: "scenario-movement-rejected",
        message: `Scenario Opportunity Attack route projection supports only Small or Medium reactors; ${String(reactorId)} has a larger tactical footprint.`,
      });
    }
  }
  if (
    opportunityAttackEnemyRelationships.length > 0 &&
    moverSize !== "small" &&
    moverSize !== "medium"
  ) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: `Scenario Opportunity Attack route projection supports only Small or Medium movers; ${String(input.subject.actorId)} has a different tactical footprint.`,
    });
  }
  const movementOccupants = [
    ...combatantByToken.values(),
  ].flatMap<BattleOrdinaryMovementRouteOccupant>((combatant) => {
    const placement = geometry.space.placements.find(
      ({ token }) => String(token) === String(combatant.combatantId),
    );
    if (placement === undefined) return [];
    const occupiedPositions = [
      scenarioPositionId(placement.coordinate),
    ] as const;
    if (zeroHpLifecycleIsTerminal(combatant)) {
      return [
        {
          kind: "corpse" as const,
          tokenId: combatant.combatantId,
          occupiedPositions,
        },
      ];
    }
    const occupantSize = combatantEffectiveSize(combatant);
    return [
      {
        kind: "livingCreature" as const,
        occupantId: combatant.combatantId,
        creatureSize: occupantSize,
        incapacitated: isIncapacitated(combatant.conditions),
        allyOfMover: input.session.battlefield.movementAllyRelationships.some(
          ({ moverId, allyId }) =>
            moverId === input.subject.actorId &&
            allyId === combatant.combatantId,
        ),
        occupiedPositions,
      },
    ];
  });
  for (const suppliedCoordinate of input.route) {
    const coordinate = parseCoordinate(suppliedCoordinate);
    if (coordinate.tag === "error") {
      return Either.left({
        tag: "scenario-movement-rejected",
        message: coordinate.error.message,
      });
    }
    let tableRejection: string | undefined;
    const preview = previewStep(
      routeState,
      mover.value,
      coordinate.value,
      (step) => {
        const blockingObject = step.occupants
          .map(String)
          .map((token) => objectByToken.get(token))
          .find((object) => object?.traversal === "blocked");
        if (blockingObject !== undefined) {
          tableRejection = `Scenario object ${String(blockingObject.objectId)} blocks movement into the requested square.`;
          return { tag: "impassable" };
        }
        const cost =
          Number(step.distanceFeet) * (step.terrain === "difficult" ? 2 : 1);
        return { tag: "passable", weight: cost };
      },
    );
    if (preview.tag === "error") {
      return Either.left({
        tag: "scenario-movement-rejected",
        message:
          tableRejection ??
          `Scenario route step is invalid: ${preview.error.tag}.`,
      });
    }
    movementCost += Number(preview.value.step.weight);
    const routePosition = scenarioPositionId(preview.value.step.to);
    routeSteps.push({
      positionId: routePosition,
      distanceFeet: movementFeet(Number(preview.value.step.distanceFeet)),
    });
    if (preview.value.step.terrain === "difficult") {
      tacticalDifficultTerrainPositions.add(routePosition);
    }
    const committed = commitPreview(routeState, preview.value);
    if (committed.tag === "error") {
      return Either.left({
        tag: "scenario-movement-rejected",
        message: `Scenario route could not commit its planned step: ${committed.error.tag}.`,
      });
    }
    for (const relationship of opportunityAttackEnemyRelationships) {
      const candidates = scenarioOpportunityAttackExecutionCandidates({
        session: input.session,
        reactorId: relationship.reactorId,
        moverId: input.subject.actorId,
      });
      for (const candidate of candidates) {
        const before = scenarioRelationInSpace(
          input.session,
          routeState,
          relationship.reactorId,
          input.subject.actorId,
        );
        const after = scenarioRelationInSpace(
          input.session,
          committed.value,
          relationship.reactorId,
          input.subject.actorId,
        );
        if (
          before.tag === "relation" &&
          after.tag === "relation" &&
          before.relation.attackerCanSeeTarget &&
          opportunityAttackLeavesReach({
            beforeDistanceFeet: movementFeet(
              Number(before.relation.distanceFeet),
            ),
            afterDistanceFeet: movementFeet(
              Number(after.relation.distanceFeet),
            ),
            reachFeet: candidate.reachFeet,
          })
        ) {
          const threat = {
            reactorId: candidate.reactorId,
            distanceFeet: movementFeet(Number(before.relation.distanceFeet)),
            ...candidate.selection,
          };
          if (
            provokedOpportunityAttacks.some((threat) =>
              opportunityAttackThreatIdentityEqual(threat, {
                reactorId: candidate.reactorId,
                distanceFeet: movementFeet(
                  Number(before.relation.distanceFeet),
                ),
                ...candidate.selection,
              }),
            )
          ) {
            return Either.left({
              tag: "scenario-movement-rejected",
              message: `Scenario route leaves ${String(relationship.reactorId)}'s reach more than once; split the movement after resolving the first Opportunity Attack window.`,
            });
          }
          provokedOpportunityAttacks.push(threat);
        }
      }
    }
    routeState = committed.value;
  }
  const destination = routeSteps.at(-1);
  if (destination === undefined) {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: "Scenario movement requires a nonempty route.",
    });
  }
  const routeFacts = deriveOrdinaryMovementTableRouteFacts({
    moverId: input.subject.actorId,
    moverSize,
    route: {
      positionsEnteredBeforeDestination: routeSteps.slice(0, -1),
      destination,
    },
    occupants: movementOccupants,
  });
  if (routeFacts.tag === "invalid") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: routeFacts.message,
    });
  }
  movementCost += routeFacts.difficultTerrainSteps
    .filter(
      ({ positionId }) => !tacticalDifficultTerrainPositions.has(positionId),
    )
    .reduce((total, { distanceFeet }) => total + Number(distanceFeet), 0);
  const creatureSpaceTraversal = routeFacts.creatureSpaceTraversal;
  const fill: Extract<BattleFill, { readonly kind: "movement" }> =
    Object.freeze({
      kind: "movement",
      holeId: movementHole.holeId,
      value: Object.freeze({
        speedKind: input.speedKind,
        movementCostFeet: movementFeet(movementCost),
        provokedOpportunityAttacks: Object.freeze(
          provokedOpportunityAttacks.map((threat) =>
            Object.freeze({ ...threat }),
          ),
        ),
        ...(creatureSpaceTraversal === undefined
          ? {}
          : { creatureSpaceTraversal }),
      }),
    });
  const movementResolution = Object.freeze({
    kind: "geometryDerivedPending" as const,
    subject: Object.freeze({ ...input.subject }),
    fill,
    originFingerprint,
    plannedSpace: snapshot(routeState),
  });
  return Either.right({
    session: makeScenarioSession(
      input.session.battle,
      input.session.battlefield,
      movementResolution,
      input.session.lineage.scenarioSessionLineageId,
      input.session.tableD20TestCircumstances,
    ),
    subject: movementResolution.subject,
    fills: [fill, ...input.fills],
  });
}

export function continueScenarioMovement(input: {
  readonly session: ScenarioSession;
  readonly fills: readonly BattleFill[];
}): Either.Either<ScenarioMovementPlan, ScenarioMovementIssue> {
  const pending = input.session.movementResolution;
  if (pending.kind === "idle") {
    return Either.left({
      tag: "scenario-movement-rejected",
      message: "No scenario movement transaction is awaiting continuation.",
    });
  }
  return Either.right({
    session: input.session,
    subject: pending.subject,
    fills: [pending.fill, ...input.fills],
  });
}

export type ScenarioObjectAttackProjectionIssue = Readonly<{
  readonly tag: "object-attack-projection";
  readonly message: string;
}>;

type ScenarioCreatureSpellTargetFill = Extract<
  BattleFill,
  {
    readonly kind: "targetChoice" | "spellTargetAllocation" | "spellTargetList";
  }
>;

export type ScenarioCreatureSpellTargetProjectionIssue = Readonly<{
  readonly tag: "spell-target-projection";
  readonly message: string;
}>;

function isScenarioCreatureSpellTargetFill(
  fill: BattleFill,
): fill is ScenarioCreatureSpellTargetFill {
  return (
    fill.kind === "targetChoice" ||
    fill.kind === "spellTargetAllocation" ||
    fill.kind === "spellTargetList"
  );
}

export function scenarioCreatureSpellTargetFills(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): Either.Either<
  readonly BattleFill[],
  ScenarioCreatureSpellTargetProjectionIssue
> {
  const projectedFills: BattleFill[] = [];
  for (const fill of input.fills) {
    const frontier = resolveBattleRuntimeSubject({
      session: input.session.battle,
      subject: input.subject,
      fills: projectedFills,
    });
    if (frontier.tag !== "needsHoles") {
      projectedFills.push(fill);
      continue;
    }
    const hole = frontier.holes.find(
      (candidate) =>
        candidate.holeId === fill.holeId && candidate.kind === fill.kind,
    );
    if (
      hole === undefined ||
      !("spellTargetSpatialFactRequest" in hole) ||
      hole.spellTargetSpatialFactRequest === undefined ||
      !isScenarioCreatureSpellTargetFill(fill)
    ) {
      projectedFills.push(fill);
      continue;
    }
    const request = hole.spellTargetSpatialFactRequest;
    const targetIds = Match.value(fill).pipe(
      Match.when({ kind: "targetChoice" }, ({ value }) => [value]),
      Match.when({ kind: "spellTargetAllocation" }, ({ value }) =>
        value.allocations.map(({ targetId }) => targetId),
      ),
      Match.when({ kind: "spellTargetList" }, ({ value }) => value.targetIds),
      Match.exhaustive,
    );
    const canonicalFacts: Array<
      Extract<BattleTargetSpatialFact, { readonly kind: "spellTarget" }>
    > = [];
    for (const targetId of [...new Set(targetIds)]) {
      const relation = scenarioRelationForSpatialQuestion(input.session, {
        kind: "spellTarget",
        casterId: request.casterId,
        targetId,
        sourceProcedureRef: request.sourceProcedureRef,
      });
      if (relation.tag !== "relation") {
        return Either.left({
          tag: "spell-target-projection",
          message: relation.message,
        });
      }
      if (
        Number(relation.relation.distanceFeet) > Number(request.rangeFeet) ||
        relation.relation.cover === "total" ||
        (request.visibility === "requiresSight" &&
          !relation.relation.attackerCanSeeTarget)
      ) {
        continue;
      }
      canonicalFacts.push({
        kind: "spellTarget" as const,
        casterId: request.casterId,
        targetId,
        sourceProcedureRef: request.sourceProcedureRef,
      });
    }
    projectedFills.push(
      Match.value(fill).pipe(
        Match.when({ kind: "targetChoice" }, (targetChoice) => ({
          ...targetChoice,
          spatialFacts: [
            ...(targetChoice.spatialFacts ?? []).filter(
              ({ kind }) => kind !== "spellTarget",
            ),
            ...canonicalFacts,
          ],
        })),
        Match.when({ kind: "spellTargetAllocation" }, (allocation) => ({
          ...allocation,
          spatialFacts: [
            ...allocation.spatialFacts.filter(
              ({ kind }) => kind !== "spellTarget",
            ),
            ...canonicalFacts,
          ],
        })),
        Match.when({ kind: "spellTargetList" }, (targetList) => ({
          ...targetList,
          spatialFacts: [
            ...targetList.spatialFacts.filter(
              ({ kind }) => kind !== "spellTarget",
            ),
            ...canonicalFacts,
          ],
        })),
        Match.exhaustive,
      ),
    );
  }
  return Either.right(projectedFills);
}

export type ScenarioAttackTargetProjectionIssue = Readonly<{
  readonly tag: "attack-target-projection";
  readonly message: string;
}>;

export type ScenarioTableSpatialFactProjectionIssue = Readonly<{
  readonly tag: "table-spatial-fact-projection";
  readonly message: string;
}>;

type ScenarioTableSpatialFactQuestion = Extract<
  ScenarioSpatialDecisionQuestion,
  | { readonly kind: "grappleTarget" }
  | { readonly kind: "shoveTarget" }
  | { readonly kind: "sleepShakeAwakeTarget" }
  | { readonly kind: "hypnoticPatternShakeAwakeTarget" }
  | { readonly kind: "helpAttackTarget" }
>;

type ScenarioTableSpatialFactQuestionForSubject = Extract<
  ScenarioTableSpatialFactQuestion,
  | { readonly kind: "grappleTarget" }
  | { readonly kind: "shoveTarget" }
  | { readonly kind: "sleepShakeAwakeTarget" }
  | { readonly kind: "hypnoticPatternShakeAwakeTarget" }
>;

function scenarioTableSpatialFactDistanceLimitFeet(
  question: ScenarioTableSpatialFactQuestion,
): typeof BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET {
  return Match.value(question).pipe(
    Match.when(
      { kind: "grappleTarget" },
      () => BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
    ),
    Match.when(
      { kind: "shoveTarget" },
      () => BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
    ),
    Match.when(
      { kind: "sleepShakeAwakeTarget" },
      () => BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
    ),
    Match.when(
      { kind: "hypnoticPatternShakeAwakeTarget" },
      () => BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
    ),
    Match.when(
      { kind: "helpAttackTarget" },
      () => BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET,
    ),
    Match.exhaustive,
  );
}

function scenarioTableSpatialFactForQuestion(
  question: ScenarioTableSpatialFactQuestion,
): BattleTargetSpatialFact {
  return Match.value(question).pipe(
    Match.when({ kind: "grappleTarget" }, ({ grapplerId, targetId }) => ({
      kind: "grappleTargetWithinReach" as const,
      grapplerId,
      targetId,
    })),
    Match.when({ kind: "shoveTarget" }, ({ shoverId, targetId }) => ({
      kind: "shoveTargetWithinReach" as const,
      shoverId,
      targetId,
    })),
    Match.when({ kind: "sleepShakeAwakeTarget" }, ({ actorId, targetId }) => ({
      kind: "sleepShakeAwakeActorWithin5Feet" as const,
      actorId,
      targetId,
    })),
    Match.when(
      { kind: "hypnoticPatternShakeAwakeTarget" },
      ({ actorId, targetId }) => ({
        kind: "hypnoticPatternShakeAwakeActorWithin5Feet" as const,
        actorId,
        targetId,
      }),
    ),
    Match.when({ kind: "helpAttackTarget" }, ({ helperId, targetEnemyId }) => ({
      kind: "helpAttackTargetWithin5Feet" as const,
      helperId,
      targetEnemyId,
    })),
    Match.exhaustive,
  );
}

type ScenarioTableSpatialFactQuestionFactory = (
  targetId: CombatantId,
) => ScenarioTableSpatialFactQuestionForSubject;

function scenarioTableSpatialFactQuestionFactoryForSubject(
  subject: BattleSubject,
): ScenarioTableSpatialFactQuestionFactory | undefined {
  if (subject.tag !== "action") return undefined;
  return Match.value(subject).pipe(
    Match.when(
      { tag: "action", action: "grapple" },
      ({ actorId }) =>
        (targetId: CombatantId) => ({
          kind: "grappleTarget" as const,
          grapplerId: actorId,
          targetId,
        }),
    ),
    Match.when(
      { tag: "action", action: "shove" },
      ({ actorId }) =>
        (targetId: CombatantId) => ({
          kind: "shoveTarget" as const,
          shoverId: actorId,
          targetId,
        }),
    ),
    Match.when(
      { tag: "action", action: "shakeAwakeFromSleep" },
      ({ actorId }) =>
        (targetId: CombatantId) => ({
          kind: "sleepShakeAwakeTarget" as const,
          actorId,
          targetId,
        }),
    ),
    Match.when(
      { tag: "action", action: "shakeAwakeFromHypnoticPattern" },
      ({ actorId }) =>
        (targetId: CombatantId) => ({
          kind: "hypnoticPatternShakeAwakeTarget" as const,
          actorId,
          targetId,
        }),
    ),
    Match.orElse(() => undefined),
  );
}

function scenarioTableSpatialFactQuestionForSubject(
  subject: BattleSubject,
  targetId: CombatantId,
): ScenarioTableSpatialFactQuestionForSubject | undefined {
  return scenarioTableSpatialFactQuestionFactoryForSubject(subject)?.(targetId);
}

/**
 * Projects the exact Table/geometry spatial witness for ordinary target
 * choices whose Battle hole consumes a reach or adjacency fact. The caller
 * still supplies the ordinary target choice; only the spatial witness is
 * automatic and canonical.
 */
export function scenarioTableSpatialFactFills(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): Either.Either<
  readonly BattleFill[],
  ScenarioTableSpatialFactProjectionIssue
> {
  const projectedFills: BattleFill[] = [];
  for (const fill of input.fills) {
    const frontier = resolveBattleRuntimeSubject({
      session: input.session.battle,
      subject: input.subject,
      fills: projectedFills,
    });
    if (frontier.tag !== "needsHoles") {
      projectedFills.push(fill);
      continue;
    }

    if (
      fill.kind === "helpAttackEnemyDecision" &&
      input.subject.tag === "action" &&
      input.subject.action === "helpAttack"
    ) {
      const targetQuestion: Extract<
        ScenarioSpatialDecisionQuestion,
        { readonly kind: "helpAttackTarget" }
      > = {
        kind: "helpAttackTarget",
        helperId: input.subject.actorId,
        targetEnemyId: fill.targetEnemyId,
      };
      const relation = scenarioRelationForSpatialQuestion(
        input.session,
        targetQuestion,
      );
      if (relation.tag !== "relation") {
        return Either.left({
          tag: "table-spatial-fact-projection",
          message: relation.message,
        });
      }
      if (
        Number(relation.relation.distanceFeet) >
        scenarioTableSpatialFactDistanceLimitFeet(targetQuestion)
      ) {
        return Either.left({
          tag: "table-spatial-fact-projection",
          message: `The helpAttackTarget spatial witness is outside the supported ${BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET}-foot adjacency boundary.`,
        });
      }
      // The helper's adjacency is a Table-owned fact.  The player may choose
      // the ordinary target, but cannot override the distance witness.
      projectedFills.push({
        ...fill,
        targetWithinFiveFeetOfHelper: true,
      });
      continue;
    }

    if (
      fill.kind === "abilityCheck" &&
      input.subject.tag === "action" &&
      input.subject.action === "escapeSpellRestraint" &&
      input.subject.actorId !== input.subject.targetId
    ) {
      return Either.left({
        tag: "table-spatial-fact-projection",
        message:
          "Escape Spell Restraint by a helper is unsupported: the public Battle hole exposes no canonical reach constraint, so spatial facts cannot be player-authored.",
      });
    }

    if (fill.kind !== "targetChoice") {
      projectedFills.push(fill);
      continue;
    }
    const targetQuestion = scenarioTableSpatialFactQuestionForSubject(
      input.subject,
      fill.value,
    );
    if (targetQuestion === undefined) {
      projectedFills.push(fill);
      continue;
    }
    const targetHole = frontier.holes.find(
      (hole) => hole.kind === "targetChoice" && hole.holeId === fill.holeId,
    );
    if (targetHole?.kind !== "targetChoice") {
      projectedFills.push(fill);
      continue;
    }
    const relation = scenarioRelationForSpatialQuestion(
      input.session,
      targetQuestion,
    );
    if (relation.tag !== "relation") {
      return Either.left({
        tag: "table-spatial-fact-projection",
        message: relation.message,
      });
    }
    if (
      Number(relation.relation.distanceFeet) >
      scenarioTableSpatialFactDistanceLimitFeet(targetQuestion)
    ) {
      return Either.left({
        tag: "table-spatial-fact-projection",
        message: `The ${targetQuestion.kind} spatial witness is outside the supported ${BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET}-foot reach/adjacency boundary.`,
      });
    }
    const fact = scenarioTableSpatialFactForQuestion(targetQuestion);
    const canonicalKinds = new Set([
      "grappleTargetWithinReach",
      "shoveTargetWithinReach",
      "sleepShakeAwakeActorWithin5Feet",
      "hypnoticPatternShakeAwakeActorWithin5Feet",
      "helpAttackTargetWithin5Feet",
    ]);
    projectedFills.push({
      ...fill,
      spatialFacts: [
        ...(fill.spatialFacts ?? []).filter(
          (candidate) => !canonicalKinds.has(candidate.kind),
        ),
        fact,
      ],
    });
  }
  return Either.right(projectedFills);
}

type ScenarioAttackRange =
  | Readonly<{ readonly kind: "meleeReach" }>
  | Readonly<{
      readonly kind: "rangedRange";
      readonly band: "normal" | "long";
    }>;

function scenarioAttackRange(input: {
  readonly constraint: AttackTargetConstraint;
  readonly distanceFeet: number;
  readonly targetLabel: "Target" | "Object";
}): Either.Either<ScenarioAttackRange, string> {
  return Match.value(input.constraint).pipe(
    Match.when({ kind: "meleeReach" }, ({ reachFeet }) =>
      input.distanceFeet <= Number(reachFeet)
        ? Either.right({ kind: "meleeReach" as const })
        : Either.left(
            `${input.targetLabel} is ${input.distanceFeet} feet away, outside ${Number(reachFeet)}-foot reach.`,
          ),
    ),
    Match.when({ kind: "rangedRange" }, ({ normalFeet, longFeet }) =>
      input.distanceFeet <= Number(normalFeet)
        ? Either.right({
            kind: "rangedRange" as const,
            band: "normal" as const,
          })
        : input.distanceFeet <= Number(longFeet)
          ? Either.right({
              kind: "rangedRange" as const,
              band: "long" as const,
            })
          : Either.left(
              `${input.targetLabel} is ${input.distanceFeet} feet away, outside ${Number(longFeet)}-foot long range.`,
            ),
    ),
    Match.exhaustive,
  );
}

type ScenarioAttackTargetEligibility =
  | Readonly<{
      readonly tag: "eligible";
      readonly relation: ScenarioSpatialRelation;
      readonly range: ScenarioAttackRange;
    }>
  | Readonly<{
      readonly tag: "out-of-range";
      readonly message: string;
    }>;

function scenarioAttackTargetEligibility(input: {
  readonly session: ScenarioSession;
  readonly attack: NonNullable<BattleTargetChoiceHole["attack"]>;
  readonly targetId: CombatantId;
}): Either.Either<
  ScenarioAttackTargetEligibility,
  ScenarioAttackTargetProjectionIssue
> {
  const relation = scenarioRelationForSpatialQuestion(input.session, {
    kind: "attackTarget",
    actorId: input.attack.actorId,
    targetId: input.targetId,
    sourceProcedureRef: input.attack.selection.procedureRef,
    targetConstraint: input.attack.targetConstraint.kind,
  });
  if (relation.tag !== "relation") {
    return Either.left({
      tag: "attack-target-projection",
      message: relation.message,
    });
  }
  const range = scenarioAttackRange({
    constraint: input.attack.targetConstraint,
    distanceFeet: Number(relation.relation.distanceFeet),
    targetLabel: "Target",
  });
  if (Either.isLeft(range)) {
    return Either.right({
      tag: "out-of-range",
      message: range.left,
    });
  }
  return Either.right({
    tag: "eligible",
    relation: relation.relation,
    range: range.right,
  });
}

export function scenarioAttackTargetFills(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): Either.Either<readonly BattleFill[], ScenarioAttackTargetProjectionIssue> {
  const projectedFills: BattleFill[] = [];
  for (const fill of input.fills) {
    const frontier = resolveBattleRuntimeSubject({
      session: input.session.battle,
      subject: input.subject,
      fills: projectedFills,
    });
    if (frontier.tag !== "needsHoles" || fill.kind !== "targetChoice") {
      projectedFills.push(fill);
      continue;
    }
    const targetHole = frontier.holes.find(
      (hole) =>
        hole.kind === "targetChoice" &&
        hole.holeId === fill.holeId &&
        hole.attack !== undefined,
    );
    if (
      targetHole?.kind !== "targetChoice" ||
      targetHole.attack === undefined
    ) {
      projectedFills.push(fill);
      continue;
    }
    const attack = targetHole.attack;
    const eligibility = scenarioAttackTargetEligibility({
      session: input.session,
      attack,
      targetId: fill.value,
    });
    if (Either.isLeft(eligibility)) {
      return Either.left({
        tag: "attack-target-projection",
        message: eligibility.left.message,
      });
    }
    if (eligibility.right.tag === "out-of-range") {
      return Either.left({
        tag: "attack-target-projection",
        message: eligibility.right.message,
      });
    }
    const { relation } = eligibility.right;
    const distanceFact = {
      kind: "attackTargetDistance" as const,
      actorId: attack.actorId,
      targetId: fill.value,
      ...attack.selection,
      distanceFeet: movementFeet(Number(relation.distanceFeet)),
    };
    const canonicalSightFact = relation.attackerCanSeeTarget
      ? undefined
      : {
          kind: "attackAttackerCannotSeeTarget" as const,
          attackerId: attack.actorId,
          targetId: fill.value,
        };
    projectedFills.push({
      ...fill,
      spatialFacts: [
        ...(fill.spatialFacts ?? []).filter(
          (fact) =>
            fact.kind !== "attackTargetDistance" &&
            fact.kind !== "attackAttackerCannotSeeTarget" &&
            fact.kind !== "attackTargetCannotSeeAttacker",
        ),
        distanceFact,
        ...(canonicalSightFact === undefined ? [] : [canonicalSightFact]),
      ],
    });
  }
  return Either.right(projectedFills);
}

export function scenarioObjectAttackFills(input: {
  readonly session: ScenarioSession;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): Either.Either<readonly BattleFill[], ScenarioObjectAttackProjectionIssue> {
  const objectTargetFill = input.fills.find(
    (fill) =>
      fill.kind === "objectTargetChoice" &&
      (fill.spatialFacts.length === 0 ||
        fill.spatialFacts.some(({ kind }) => kind === "attackObjectTarget")),
  );
  if (objectTargetFill?.kind !== "objectTargetChoice") {
    return Either.right(input.fills);
  }
  const object = input.session.battlefield.objects.find(
    ({ objectId }) => objectId === objectTargetFill.value,
  );
  if (object === undefined) {
    return Either.left({
      tag: "object-attack-projection",
      message: `Unknown scenario object ${String(objectTargetFill.value)}.`,
    });
  }
  const frontier = resolveBattleRuntimeSubject({
    session: input.session.battle,
    subject: input.subject,
    fills: [],
  });
  const targetHole =
    frontier.tag === "needsHoles"
      ? frontier.holes.find(
          (hole) =>
            hole.kind === "targetChoice" &&
            hole.holeId === objectTargetFill.holeId &&
            hole.attack?.acceptsObjectTarget === true,
        )
      : undefined;
  if (targetHole?.kind !== "targetChoice" || targetHole.attack === undefined) {
    return Either.left({
      tag: "object-attack-projection",
      message:
        "The selected battle procedure has no ordinary-object target frontier.",
    });
  }
  const attack = targetHole.attack;
  const relation = scenarioRelationForSpatialQuestion(input.session, {
    kind: "objectTarget",
    actorId: attack.actorId,
    objectId: object.objectId,
    sourceProcedureRef: attack.selection.procedureRef,
  });
  if (relation.tag !== "relation") {
    return Either.left({
      tag: "object-attack-projection",
      message: relation.message,
    });
  }
  const distanceFeet = Number(relation.relation.distanceFeet);
  const range = scenarioAttackRange({
    constraint: attack.targetConstraint,
    distanceFeet,
    targetLabel: "Object",
  });
  if (Either.isLeft(range)) {
    return Either.left({
      tag: "object-attack-projection",
      message: range.left,
    });
  }
  const canonicalFill: BattleFill = {
    ...objectTargetFill,
    spatialFacts: [
      {
        kind: "attackObjectTarget",
        actorId: attack.actorId,
        objectId: object.objectId,
        range: Match.value(range.right).pipe(
          Match.when({ kind: "meleeReach" }, () => ({
            kind: "meleeReach" as const,
          })),
          Match.when({ kind: "rangedRange" }, ({ band }) => ({
            kind: "rangedRange" as const,
            band,
            enemyWithin5FeetCanSeeAttacker:
              scenarioEnemyWithinFiveFeetCanSeeAttacker(
                input.session,
                attack.actorId,
              ),
          })),
          Match.exhaustive,
        ),
        attackerCanSeeObject: relation.relation.attackerCanSeeTarget,
        cover: relation.relation.cover,
        armorClass: object.armorClass,
        damageDisposition: object.damageDisposition,
      },
    ],
  };
  return Either.right(
    input.fills.map((fill) =>
      fill === objectTargetFill ? canonicalFill : fill,
    ),
  );
}

export function scenarioSessionIssueMessage(
  issue: ScenarioSessionIssue,
): string {
  return issue.issues.map(({ message }) => message).join(" ");
}

export function isScenarioSession(value: unknown): value is ScenarioSession {
  return (
    typeof value === "object" &&
    value !== null &&
    sessions.has(value) &&
    isBattleRuntimeSession(Reflect.get(value, "battle"))
  );
}

function admitScenarioBattleSuccessor(
  session: ScenarioSession,
  battle: BattleRuntimeSession,
): Either.Either<void, ScenarioSessionUpdateIssue> {
  if (session.battle.state.battleId !== battle.state.battleId) {
    return Either.left({
      tag: "battle-lineage-conflict",
      expectedBattleId: session.battle.state.battleId,
      receivedBattleId: battle.state.battleId,
      message: `Scenario battle ${String(session.battle.state.battleId)} cannot adopt battle ${String(battle.state.battleId)}.`,
    });
  }
  if (
    battle !== session.battle &&
    !battleRuntimeSessionFollows(battle, session.battle)
  ) {
    return Either.left(
      spatialDecisionIssue(
        "spatial-decision-lineage-conflict",
        "scenario-session",
        "ScenarioSession cannot adopt an unrelated same-battle BattleRuntime session; results must follow the current runtime session directly.",
      ),
    );
  }
  if (battle.context !== session.battle.context) {
    return Either.left(
      spatialDecisionIssue(
        "spatial-decision-lineage-conflict",
        "scenario-session",
        "ScenarioSession cannot adopt a same-battle BattleRuntime session from a different admitted context.",
      ),
    );
  }
  return Either.right(undefined);
}

export function scenarioSessionWithBattleResult(
  session: ScenarioSession,
  battle: BattleRuntimeSession,
  objectDamages: readonly BattleObjectDamageOutcome[] = [],
  movements: readonly BattleResolvedMovement[] = [],
): Either.Either<ScenarioSession, ScenarioSessionUpdateIssue> {
  const admittedBattle = admitScenarioBattleSuccessor(session, battle);
  if (Either.isLeft(admittedBattle)) return Either.left(admittedBattle.left);
  let objects = session.battlefield.objects;
  for (const outcome of objectDamages) {
    const index = objects.findIndex(
      ({ objectId }) => objectId === outcome.objectId,
    );
    if (index < 0) {
      return Either.left({
        tag: "unknown-object-damage",
        objectId: outcome.objectId,
        message: `Battle damage referred to unknown scenario object ${String(outcome.objectId)}.`,
      });
    }
    if (outcome.kind === "tableResolved") continue;
    const object = objects[index]!;
    if (
      object.damageDisposition.kind === "tableResolved" ||
      object.damageDisposition.hitPoints !== outcome.priorHitPoints
    ) {
      return Either.left({
        tag: "object-damage-state-conflict",
        objectId: outcome.objectId,
        outcomePriorHitPoints: outcome.priorHitPoints,
        message: `Battle damage for scenario object ${String(outcome.objectId)} does not continue from its current Hit Points.`,
      });
    }
    const replacement = freezeObject({
      ...object,
      damageDisposition:
        object.damageDisposition.kind === "hitPointsWithDamageThreshold"
          ? {
              kind: "hitPointsWithDamageThreshold",
              hitPoints: outcome.nextHitPoints,
              damageThreshold: object.damageDisposition.damageThreshold,
            }
          : { kind: "hitPoints", hitPoints: outcome.nextHitPoints },
    });
    objects = Object.freeze([
      ...objects.slice(0, index),
      replacement,
      ...objects.slice(index + 1),
    ]);
  }
  if (movements.length > 1) {
    return Either.left({
      tag: "multiple-battle-movements",
      message:
        "One scenario operation cannot commit more than one tactical movement.",
    });
  }
  const [movement] = movements;
  const pendingMovement = session.movementResolution;
  if (movement !== undefined && pendingMovement.kind === "idle") {
    return Either.left({
      tag: "unexpected-battle-movement",
      message: "Battle resolved movement without a table-owned scenario route.",
    });
  }
  if (
    movement !== undefined &&
    pendingMovement.kind === "geometryDerivedPending" &&
    (session.battlefield.spatial.kind !== "geometryDerived" ||
      session.battlefield.spatial.space.fingerprint !==
        pendingMovement.originFingerprint ||
      !sameScenarioMovement(movement, pendingMovement))
  ) {
    return Either.left({
      tag: "movement-outcome-conflict",
      message:
        "Battle resolved movement that does not match the pending scenario route.",
    });
  }
  if (
    movement !== undefined &&
    pendingMovement.kind === "tableAuthoredPending" &&
    !sameScenarioMovement(movement, pendingMovement)
  ) {
    return Either.left({
      tag: "movement-outcome-conflict",
      message:
        "Battle resolved movement that does not match the Table-authored route consequence.",
    });
  }
  const movementResolution =
    movement === undefined
      ? session.movementResolution
      : ({ kind: "idle" } as const);
  if (
    movement !== undefined &&
    pendingMovement.kind === "geometryDerivedPending"
  ) {
    if (session.battlefield.spatial.kind !== "geometryDerived") {
      return Either.left({
        tag: "movement-outcome-conflict",
        message:
          "Geometry-derived movement cannot commit against a Table-authored spatial boundary.",
      });
    }
    const battlefield: ScenarioBattlefield = Object.freeze({
      ...session.battlefield,
      objects,
      spatial: Object.freeze({
        ...session.battlefield.spatial,
        space: pendingMovement.plannedSpace,
      }),
    });
    return Either.right(
      makeScenarioSession(
        battle,
        battlefield,
        movementResolution,
        session.lineage.scenarioSessionLineageId,
        session.tableD20TestCircumstances,
      ),
    );
  }
  const nextSpatialBoundary =
    movement !== undefined && pendingMovement.kind === "tableAuthoredPending"
      ? pendingMovement.postMoveSpatial
      : session.battlefield.spatial;
  const spatial =
    nextSpatialBoundary.kind === "tableAuthored"
      ? rebindTableSpatialBoundary(
          nextSpatialBoundary,
          battle,
          session.lineage.scenarioSessionLineageId,
        )
      : nextSpatialBoundary;
  const battlefield: ScenarioBattlefield = Object.freeze({
    ...session.battlefield,
    objects,
    spatial,
  });
  return Either.right(
    makeScenarioSession(
      battle,
      battlefield,
      movementResolution,
      session.lineage.scenarioSessionLineageId,
      session.tableD20TestCircumstances,
    ),
  );
}

export function scenarioSessionAfterRejectedMovement(
  session: ScenarioSession,
  battle: BattleRuntimeSession,
): Either.Either<ScenarioSession, ScenarioSessionUpdateIssue> {
  const admittedBattle = admitScenarioBattleSuccessor(session, battle);
  if (Either.isLeft(admittedBattle)) return Either.left(admittedBattle.left);
  return Either.right(
    makeScenarioSession(
      battle,
      session.battlefield,
      { kind: "idle" },
      session.lineage.scenarioSessionLineageId,
      session.tableD20TestCircumstances,
    ),
  );
}

function rebindTableSpatialBoundary(
  boundary: Extract<
    ScenarioSpatialBoundary,
    { readonly kind: "tableAuthored" }
  >,
  battle: BattleRuntimeSession,
  sessionLineageId: ScenarioSessionLineageId,
): ScenarioSpatialBoundary {
  const battleRuntimeSessionIdentity = runtimeValueIdentity(battle);
  return Object.freeze({
    kind: "tableAuthored" as const,
    spatialFingerprint: boundary.spatialFingerprint,
    tableAuthoredDecisions: Object.freeze(
      boundary.tableAuthoredDecisions.map((candidate) =>
        Object.freeze({
          ...candidate,
          lineage: Object.freeze({
            ...candidate.lineage,
            battleId: battle.state.battleId,
            scenarioSessionLineageId: sessionLineageId,
            battleRuntimeSessionIdentity,
          }),
        }),
      ),
    ),
  });
}

function restoreSpatialState(
  boundary: Extract<
    ScenarioSpatialBoundary,
    { readonly kind: "geometryDerived" }
  >,
): SpatialState | undefined {
  const restored = restoreState(boundary.arena, boundary.space);
  return restored.tag === "error" ? undefined : restored.value;
}

function sameScenarioMovement(
  movement: BattleResolvedMovement,
  pending: Extract<
    ScenarioMovementResolution,
    { readonly kind: "geometryDerivedPending" | "tableAuthoredPending" }
  >,
): boolean {
  const value = pending.fill.value;
  return (
    movement.moverId === pending.subject.actorId &&
    movement.speedKind === value.speedKind &&
    movement.movementCostFeet === value.movementCostFeet &&
    sameOpportunityAttackThreats(
      movement.provokedOpportunityAttacks,
      value.provokedOpportunityAttacks,
    ) &&
    movement.spendsTurnMovement === true &&
    movement.acrobaticMovement === undefined &&
    movement.areaDifficultTerrain === undefined &&
    movement.grappleDrag === undefined &&
    sameCreatureSpaceTraversal(
      movement.creatureSpaceTraversal,
      value.creatureSpaceTraversal,
    ) &&
    movement.jumpMovementReplacement === undefined &&
    movement.levitatedMovement === undefined
  );
}

function sameCreatureSpaceTraversal(
  first: BattleResolvedMovement["creatureSpaceTraversal"],
  second: BattleResolvedMovement["creatureSpaceTraversal"],
): boolean {
  if (first === undefined || second === undefined) return first === second;
  const sameDestination =
    first.destination.kind === second.destination.kind &&
    first.destination.positionId === second.destination.positionId &&
    (first.destination.kind === "unoccupiedSpace" ||
      (second.destination.kind === "occupiedCreatureSpace" &&
        first.destination.occupantId === second.destination.occupantId));
  return (
    sameDestination &&
    first.occupiedSpaces.length === second.occupiedSpaces.length &&
    first.occupiedSpaces.every((space, index) => {
      const counterpart = second.occupiedSpaces[index];
      return (
        counterpart !== undefined &&
        space.occupantId === counterpart.occupantId &&
        space.positionId === counterpart.positionId
      );
    })
  );
}

function scenarioPositionId(
  coordinate: CoordinateInput,
): BattleTablePositionId {
  return battleTablePositionId(`scenario-cell:${coordinate.x},${coordinate.y}`);
}

function sameOpportunityAttackThreats(
  first: readonly BattleOpportunityAttackThreat[],
  second: readonly BattleOpportunityAttackThreat[],
): boolean {
  return (
    first.length === second.length &&
    first.every((threat, index) => {
      const counterpart = second[index];
      return (
        counterpart !== undefined &&
        opportunityAttackThreatEqual(threat, counterpart)
      );
    })
  );
}

function sameUndirectedEdge(
  first: readonly [CoordinateInput, CoordinateInput],
  second: readonly [CoordinateInput, CoordinateInput],
): boolean {
  const sameCoordinate = (a: CoordinateInput, b: CoordinateInput): boolean =>
    a.x === b.x && a.y === b.y;
  return (
    (sameCoordinate(first[0], second[0]) &&
      sameCoordinate(first[1], second[1])) ||
    (sameCoordinate(first[0], second[1]) && sameCoordinate(first[1], second[0]))
  );
}

function scenarioObjectsBetween(
  session: ScenarioSession,
  space: SpatialState,
  source: TokenId,
  target: TokenId,
): readonly ScenarioBattleObject[] {
  const result = interveningTokens(space, source, target);
  if (result.tag === "error") return [];
  const tokenIds = new Set(result.value.tokens.map(String));
  return session.battlefield.objects.filter(({ objectId }) =>
    tokenIds.has(String(objectId)),
  );
}

function moreProtectiveCover(
  first: CoverDegree,
  second: CoverDegree,
): CoverDegree {
  const rank: Readonly<Record<CoverDegree, number>> = {
    none: 0,
    half: 1,
    "three-quarters": 2,
    total: 3,
  };
  return rank[first] >= rank[second] ? first : second;
}

function battleCover(cover: CoverDegree): CoverType {
  return Match.value(cover).pipe(
    Match.when("none", () => "none" as const),
    Match.when("half", () => "half" as const),
    Match.when("three-quarters", () => "threeQuarters" as const),
    Match.when("total", () => "total" as const),
    Match.exhaustive,
  );
}

export function scenarioEnemyWithinFiveFeetCanSeeAttacker(
  session: ScenarioSession,
  attackerId: CombatantId,
): boolean {
  const enemyIds = session.battlefield.initialRangedAttackEnemyRelationships
    .filter((relationship) => relationship.attackerId === attackerId)
    .map((relationship) => relationship.enemyId);
  return enemyIds.some((enemyId) => {
    const enemy = session.battle.state.combatants.get(enemyId);
    if (enemy === undefined || isIncapacitated(enemy.conditions)) return false;
    const relation = scenarioRelation({
      session,
      sourceId: enemyId,
      targetId: attackerId,
    });
    return (
      relation.tag === "relation" &&
      Number(relation.relation.distanceFeet) <=
        Number(BATTLE_STANDARD_FIVE_FOOT_DISTANCE_FEET) &&
      relation.relation.attackerCanSeeTarget
    );
  });
}
