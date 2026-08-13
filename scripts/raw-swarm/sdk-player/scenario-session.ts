// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import type {
  BattleIllumination,
  BattleId,
  BattleObjectDamageDisposition,
  BattleObjectDamageOutcome,
  BattleObjectId,
  BattleOrdinaryMovementRouteOccupant,
  BattleOpportunityAttackThreat,
  BattleFill,
  BattleMovementSpeedKind,
  BattleResolvedMovement,
  BattleRuntimeSession,
  BattleSubject,
  BattleTablePositionId,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  battleTablePositionId,
  combatantEffectiveSize,
  deriveOrdinaryMovementTableRouteFacts,
  isBattleRuntimeSession,
  opportunityAttackExecutionCandidates,
  opportunityAttackLeavesReach,
  opportunityAttackThreatEqual,
  resolveBattleRuntimeSubject,
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
  type ArenaSnapshot,
  type BoundaryOpenness,
  type CellCoordinate,
  type CoverDegree,
  type PlaceTokenError,
  type SpatialSnapshot,
  type TokenId,
  type CoordinateInput,
  type StateFingerprint,
  type SpatialState,
} from "../../../packages/tactical-space/src/index.ts";
import { Either, Match } from "effect";

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
  readonly arena: ArenaSnapshot;
  readonly space: SpatialSnapshot;
  readonly ambientIllumination: BattleIllumination;
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

export type ScenarioTokenId = CombatantId | BattleObjectId;

type ScenarioMovementResolution =
  | Readonly<{ readonly kind: "idle" }>
  | Readonly<{
      readonly kind: "pending";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "move" }
      >;
      readonly fill: Extract<BattleFill, { readonly kind: "movement" }>;
      readonly originFingerprint: StateFingerprint;
      readonly plannedSpace: SpatialSnapshot;
    }>;

export type ScenarioSession = Readonly<{
  readonly battle: BattleRuntimeSession;
  readonly battlefield: ScenarioBattlefield;
  readonly movementResolution: ScenarioMovementResolution;
  readonly [scenarioSessionBrand]: true;
}>;

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
    }>;

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
    }>;

export type ScenarioMovementIssue = Readonly<{
  readonly tag: "scenario-movement-rejected";
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
): ScenarioSession {
  const session = Object.freeze({ battle, battlefield, movementResolution });
  sessions.add(session);
  // The brand is compile-time only; WeakSet membership is the runtime proof
  // that this value passed createScenarioSession's composition checks.
  return session as ScenarioSession;
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
  readonly arena: ArenaDefinition;
  readonly placements: readonly ScenarioPlacement[];
  readonly ambientIllumination: BattleIllumination;
  readonly environment: ScenarioEnvironment;
  readonly initialRangedAttackEnemyRelationships: readonly ScenarioInitialRangedAttackEnemyRelationship[];
  readonly movementAllyRelationships: readonly ScenarioMovementAllyRelationship[];
  readonly opportunityAttackEnemyRelationships: readonly ScenarioOpportunityAttackEnemyRelationship[];
  readonly objects: readonly ScenarioBattleObject[];
}): Either.Either<ScenarioSession, ScenarioSessionIssue> {
  const issues: ScenarioSessionFactIssue[] = [];
  const parsedArena = parseArena(input.arena);
  if (parsedArena.tag === "error") {
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
  for (const placement of input.placements) {
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

  if (parsedArena.tag === "error") {
    // The arena parser's nonempty issue list was appended above.
    return Either.left({
      tag: "invalid-scenario-session",
      issues: [issues[0]!, ...issues.slice(1)],
    });
  }

  const arena = arenaSnapshot(parsedArena.value);
  let spatialState = createState(parsedArena.value);
  for (const placement of parsedPlacements) {
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
  const space = snapshot(spatialState);

  for (const barrier of input.environment.barrierHeights) {
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
    space.placements.map(({ token }) => String(token)),
  );
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

  const invalid = nonEmptyIssues(issues);
  if (invalid !== undefined) {
    return Either.left({ tag: "invalid-scenario-session", issues: invalid });
  }
  const battlefield = Object.freeze({
    arena,
    space: space,
    ambientIllumination: input.ambientIllumination,
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
  });
  return Either.right(makeScenarioSession(input.battle, battlefield));
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
    }>;

export type ScenarioSpatialRelation = Readonly<{
  readonly source: TokenId;
  readonly target: TokenId;
  readonly direction: import("../../../packages/tactical-space/src/index.ts").Direction;
  readonly distanceFeet: import("../../../packages/tactical-space/src/index.ts").DistanceFeet;
  readonly attackerCanSeeTarget: boolean;
  readonly cover: CoverType;
  readonly traversal: BoundaryOpenness;
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
  return scenarioRelationInSpace(
    input.session,
    spatialState(input.session),
    input.sourceId,
    input.targetId,
  );
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
  if (input.session.movementResolution.kind === "pending") {
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

  let routeState = spatialState(input.session);
  const originFingerprint = input.session.battlefield.space.fingerprint;
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
    const placement = input.session.battlefield.space.placements.find(
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
      const candidates = opportunityAttackExecutionCandidates(
        input.session.battle.state,
        relationship.reactorId,
        input.subject.actorId,
      );
      for (const candidate of candidates) {
        const threat = {
          reactorId: candidate.reactorId,
          ...candidate.selection,
        };
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
          if (
            provokedOpportunityAttacks.some((threat) =>
              opportunityAttackThreatEqual(threat, {
                reactorId: candidate.reactorId,
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
  const destination = routeSteps.at(-1)!;
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
    kind: "pending" as const,
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
  if (pending.kind !== "pending") {
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
}): readonly BattleFill[] {
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
    const canonicalFacts = [...new Set(targetIds)].flatMap((targetId) => {
      const relation = scenarioRelation({
        session: input.session,
        sourceId: request.casterId,
        targetId,
      });
      if (
        relation.tag !== "relation" ||
        Number(relation.relation.distanceFeet) > Number(request.rangeFeet) ||
        relation.relation.cover === "total" ||
        (request.visibility === "requiresSight" &&
          !relation.relation.attackerCanSeeTarget)
      ) {
        return [];
      }
      return [
        {
          kind: "spellTarget" as const,
          casterId: request.casterId,
          targetId,
          sourceProcedureRef: request.sourceProcedureRef,
        },
      ];
    });
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
  return projectedFills;
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
  const relation = scenarioRelation({
    session: input.session,
    sourceId: attack.actorId,
    targetId: object.objectId,
  });
  if (relation.tag !== "relation") {
    return Either.left({
      tag: "object-attack-projection",
      message: relation.message,
    });
  }
  const distanceFeet = Number(relation.relation.distanceFeet);
  const range = Match.value(attack.targetConstraint).pipe(
    Match.when({ kind: "meleeReach" }, ({ reachFeet }) =>
      distanceFeet <= Number(reachFeet)
        ? Either.right({ kind: "meleeReach" } as const)
        : Either.left(
            `Object is ${distanceFeet} feet away, outside ${Number(reachFeet)}-foot reach.`,
          ),
    ),
    Match.when({ kind: "rangedRange" }, ({ normalFeet, longFeet }) =>
      distanceFeet <= Number(normalFeet)
        ? Either.right({
            kind: "rangedRange" as const,
            band: "normal" as const,
            enemyWithin5FeetCanSeeAttacker:
              scenarioEnemyWithinFiveFeetCanSeeAttacker(
                input.session,
                attack.actorId,
              ),
          })
        : distanceFeet <= Number(longFeet)
          ? Either.right({
              kind: "rangedRange" as const,
              band: "long" as const,
              enemyWithin5FeetCanSeeAttacker:
                scenarioEnemyWithinFiveFeetCanSeeAttacker(
                  input.session,
                  attack.actorId,
                ),
            })
          : Either.left(
              `Object is ${distanceFeet} feet away, outside ${Number(longFeet)}-foot long range.`,
            ),
    ),
    Match.exhaustive,
  );
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
        range: range.right,
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

export function scenarioSessionWithBattleResult(
  session: ScenarioSession,
  battle: BattleRuntimeSession,
  objectDamages: readonly BattleObjectDamageOutcome[] = [],
  movements: readonly BattleResolvedMovement[] = [],
): Either.Either<ScenarioSession, ScenarioSessionUpdateIssue> {
  if (session.battle.state.battleId !== battle.state.battleId) {
    return Either.left({
      tag: "battle-lineage-conflict",
      expectedBattleId: session.battle.state.battleId,
      receivedBattleId: battle.state.battleId,
      message: `Scenario battle ${String(session.battle.state.battleId)} cannot adopt battle ${String(battle.state.battleId)}.`,
    });
  }
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
  if (movement !== undefined && session.movementResolution.kind === "idle") {
    return Either.left({
      tag: "unexpected-battle-movement",
      message: "Battle resolved movement without a table-owned scenario route.",
    });
  }
  if (
    movement !== undefined &&
    session.movementResolution.kind === "pending" &&
    (session.battlefield.space.fingerprint !==
      session.movementResolution.originFingerprint ||
      !sameScenarioMovement(movement, session.movementResolution))
  ) {
    return Either.left({
      tag: "movement-outcome-conflict",
      message:
        "Battle resolved movement that does not match the pending scenario route.",
    });
  }
  const movementResolution =
    movement === undefined
      ? session.movementResolution
      : ({ kind: "idle" } as const);
  const battlefield =
    movement === undefined || session.movementResolution.kind === "idle"
      ? Object.freeze({ ...session.battlefield, objects })
      : Object.freeze({
          ...session.battlefield,
          objects,
          space: session.movementResolution.plannedSpace,
        });
  return Either.right(
    makeScenarioSession(battle, battlefield, movementResolution),
  );
}

export function scenarioSessionAfterRejectedMovement(
  session: ScenarioSession,
  battle: BattleRuntimeSession,
): Either.Either<ScenarioSession, ScenarioSessionUpdateIssue> {
  if (session.battle.state.battleId !== battle.state.battleId) {
    return Either.left({
      tag: "battle-lineage-conflict",
      expectedBattleId: session.battle.state.battleId,
      receivedBattleId: battle.state.battleId,
      message: `Scenario battle ${String(session.battle.state.battleId)} cannot adopt battle ${String(battle.state.battleId)}.`,
    });
  }
  return Either.right(
    makeScenarioSession(battle, session.battlefield, { kind: "idle" }),
  );
}

function spatialState(session: ScenarioSession) {
  const restored = restoreState(
    session.battlefield.arena,
    session.battlefield.space,
  );
  if (restored.tag === "error") {
    throw new Error(
      "A recognized scenario session must retain internally consistent spatial evidence.",
    );
  }
  return restored.value;
}

function sameScenarioMovement(
  movement: BattleResolvedMovement,
  pending: Extract<ScenarioMovementResolution, { readonly kind: "pending" }>,
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
      Number(relation.relation.distanceFeet) <= 5 &&
      relation.relation.attackerCanSeeTarget
    );
  });
}
