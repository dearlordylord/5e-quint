// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
//
// Movement path pricing: the runtime derives a move's cost from the path
// segments the table supplies, instead of accepting a caller-supplied total.
//
// SRD 5.2.1 "Movement and Position": "Your movement can include climbing,
// crawling, jumping, and swimming ... These different modes of movement can be
// combined with your regular movement", and "you deduct the distance of each
// part of your move from it". The Rules Glossary prices each part: Climbing,
// Crawling and Swimming cost 1 extra foot per foot (Climbing and Swimming
// ignore it with the matching Speed), Difficult Terrain costs 1 extra foot per
// foot and isn't cumulative, and a Grappled creature that is dragged costs its
// grappler 1 extra foot per foot unless it is Tiny or two or more sizes
// smaller. Route and terrain adjudication stay with the table: the table says
// which segments are Difficult Terrain and how the creature moves along each.
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  movementCost,
  type MovementActivity,
} from "@dnd/shared-algebras/movement-cost-algebra";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import { Match } from "effect";
import type {
  BattleActiveEffect,
  BattleAreaDifficultTerrainMovementFact,
  BattleAreaDifficultTerrainSource,
  BattleCreatureState,
  BattleDirectionalPersistentAreaMovementFact,
  BattleMovementFillValueCommon,
  BattleMovementPath,
  BattleMovementPathActivity,
  BattleMovementPathSegment,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleMovementSpeedKind } from "../active-effect/execution-vocabulary.ts";
import type { CombatantId } from "../identity.ts";
import { grappleTargetExemptFromDragCost } from "./movement-speed.ts";
import {
  boundDirectionalPersistentAreaEffect,
  type BoundDirectionalPersistentAreaEffect,
} from "./persistent-spell-area-binding.ts";

/** The priced path of one move. */
export type BattleMovementPathCost = {
  /** The sum of the path's segment distances. */
  readonly distanceFeet: MovementFeet;
  /** The feet the path costs beyond its distance. */
  readonly extraCostFeet: MovementFeet;
};

export type BattleMovementPathCostResult =
  | ({ readonly tag: "ok" } & BattleMovementPathCost)
  | { readonly tag: "invalid"; readonly message: string };

/** The cost of a priced path when every foot is spent at its own price. */
export function battleMovementPathCostFeet(
  cost: BattleMovementPathCost,
): MovementFeet {
  return movementFeet(Number(cost.distanceFeet) + Number(cost.extraCostFeet));
}

/**
 * The activity of a mover's plain steps: Rules Glossary "Prone" leaves a Prone
 * creature only crawling, and every other mover walks them.
 */
export function plainStepMovementActivity(
  mover: BattleCreatureState,
): Extract<BattleMovementPathActivity, "crawling" | "ordinary"> {
  return hasCondition(mover.conditions, "prone") ? "crawling" : "ordinary";
}

export const PRONE_MOVEMENT_PATH_MESSAGE =
  "A Prone mover can only crawl, so every movement path segment must be crawling.";

/**
 * Validates a move's path and the area facts it cites, and prices it.
 *
 * Each segment must be a positive whole number of feet. A Prone creature's
 * only movement option is to crawl (Rules Glossary "Prone"), so its segments
 * must all be crawling. A segment inside a cited spell area's Difficult
 * Terrain needs the `areaDifficultTerrain` fact, and that fact needs at least
 * one such segment. The same holds for moving closer through a directional
 * persistent area and its `directionalPersistentAreaMovement` fact. A dragged
 * creature must be Grappled by the mover.
 */
export function priceBattleMovementPath(
  state: BattleState,
  mover: BattleCreatureState,
  value: BattleMovementFillValueCommon,
): BattleMovementPathCostResult {
  const segments = value.path;
  for (const segment of segments) {
    const issue = movementPathSegmentIssue(mover, segment);
    if (issue !== null) {
      return { tag: "invalid", message: issue };
    }
  }
  const distanceFeet = sumFeet(segments, (segment) => segment.distanceFeet);
  const areaDifficultTerrainDistanceFeet = sumFeet(
    segments.filter(
      (segment) => segment.difficultTerrain === "areaDifficultTerrain",
    ),
    (segment) => segment.distanceFeet,
  );
  const areaIssue = areaDifficultTerrainMovementFactIssue(
    state,
    value.areaDifficultTerrain,
    { distanceFeet, areaDifficultTerrainDistanceFeet },
  );
  if (areaIssue !== null) {
    return { tag: "invalid", message: areaIssue };
  }
  const directional = directionalPersistentAreaMovementFactResult(
    state,
    value.directionalPersistentAreaMovement,
    segments.some((segment) => segment.movesCloserThroughDirectionalArea),
  );
  if (directional.tag === "invalid") {
    return directional;
  }
  const dragCosts: number[] = [];
  for (const segment of segments) {
    const drag = grappleDragExtraCostPerFoot(state, mover, segment);
    if (drag.tag === "invalid") {
      return drag;
    }
    dragCosts.push(drag.extraCostPerFoot);
  }
  let extraCostFeet = 0;
  segments.forEach((segment, index) => {
    const directionalExtraCostPerFoot =
      segment.movesCloserThroughDirectionalArea && directional.tag === "ok"
        ? directional.effect.movementCost.multiplier - 1
        : 0;
    const priced = movementCost({
      distanceFeet: segment.distanceFeet,
      activity: movementPathActivity(segment.activity, value.speedKind),
      difficultTerrain: segment.difficultTerrain !== "none",
      effectExtraCostPerFoot:
        (dragCosts[index] ?? 0) + directionalExtraCostPerFoot,
    });
    extraCostFeet += Number(priced.costFeet) - Number(priced.distanceFeet);
  });
  return {
    tag: "ok",
    distanceFeet,
    extraCostFeet: movementFeet(extraCostFeet),
  };
}

/**
 * A path of one segment: ordinary movement over `distanceFeet` outside any
 * Difficult Terrain, dragging nothing.
 */
export function ordinaryMovementPath(
  distanceFeet: MovementFeet,
): BattleMovementPath {
  return [
    {
      distanceFeet,
      activity: "ordinary",
      difficultTerrain: "none",
      movesCloserThroughDirectionalArea: false,
      draggedGrappledTargetIds: [],
    },
  ];
}

/** Whether any segment of the path drags a Grappled creature. */
export function battleMovementPathDragsGrappledCreature(
  value: BattleMovementFillValueCommon,
): boolean {
  return value.path.some(
    (segment) => segment.draggedGrappledTargetIds.length > 0,
  );
}

/** Whether every segment of the path is climbing. */
export function battleMovementPathIsClimbing(
  path: BattleMovementPath,
): boolean {
  return path.every((segment) => segment.activity === "climbing");
}

/**
 * The Speed a segment's activity is priced against. Climbing and swimming
 * ignore their extra cost only when the mover uses its Climb or Swim Speed
 * (Rules Glossary "Climbing", "Swimming"); crawling always costs extra.
 */
function movementPathActivity(
  activity: BattleMovementPathActivity,
  speedKind: BattleMovementSpeedKind,
): MovementActivity {
  return Match.value(activity).pipe(
    Match.when("ordinary", () => ({
      kind: "ordinary" as const,
      speedType: speedKind,
    })),
    Match.when("climbing", () => ({
      kind: "climbing" as const,
      speedType: speedKind === "climb" ? ("climb" as const) : ("walk" as const),
    })),
    Match.when("swimming", () => ({
      kind: "swimming" as const,
      speedType: speedKind === "swim" ? ("swim" as const) : ("walk" as const),
    })),
    Match.when("crawling", () => ({
      kind: "crawling" as const,
      speedType: "walk" as const,
    })),
    Match.exhaustive,
  );
}

function movementPathSegmentIssue(
  mover: BattleCreatureState,
  segment: BattleMovementPathSegment,
): string | null {
  if (
    !Number.isInteger(segment.distanceFeet) ||
    Number(segment.distanceFeet) <= 0
  ) {
    return "Movement path segment distance must be a positive integer.";
  }
  if (
    plainStepMovementActivity(mover) === "crawling" &&
    segment.activity !== "crawling"
  ) {
    return PRONE_MOVEMENT_PATH_MESSAGE;
  }
  return null;
}

function sumFeet<T>(
  items: readonly T[],
  feet: (item: T) => MovementFeet,
): MovementFeet {
  return movementFeet(
    items.reduce((total, item) => total + Number(feet(item)), 0),
  );
}

type GrappleDragExtraCostResult =
  | { readonly tag: "ok"; readonly extraCostPerFoot: number }
  | { readonly tag: "invalid"; readonly message: string };

/**
 * The extra feet each foot of a segment costs the mover for the Grappled
 * creatures it drags along that segment (Rules Glossary "Grappled",
 * _Movable_). Each dragged creature that isn't exempt adds its own extra foot.
 */
function grappleDragExtraCostPerFoot(
  state: BattleState,
  mover: BattleCreatureState,
  segment: BattleMovementPathSegment,
): GrappleDragExtraCostResult {
  const seenTargets = new Set<CombatantId>();
  let extraCostPerFoot = 0;
  for (const targetId of segment.draggedGrappledTargetIds) {
    if (seenTargets.has(targetId)) {
      return {
        tag: "invalid",
        message:
          "Movement path segment drags the same Grappled creature twice.",
      };
    }
    seenTargets.add(targetId);
    const link = state.grapples.find(
      (candidate) =>
        candidate.grapplerId === mover.combatantId &&
        candidate.targetId === targetId,
    );
    const draggedTarget = state.combatants.get(targetId);
    if (link === undefined || draggedTarget === undefined) {
      return {
        tag: "invalid",
        message:
          "Movement path segment can only drag a creature Grappled by the mover.",
      };
    }
    if (!grappleTargetExemptFromDragCost(mover, draggedTarget)) {
      extraCostPerFoot += 1;
    }
  }
  return { tag: "ok", extraCostPerFoot };
}

const byAreaDifficultTerrainSourceKind = Match.discriminator("kind");

function activeAreaDifficultTerrainSourceMatches(
  state: BattleState,
  source: BattleAreaDifficultTerrainSource,
): boolean {
  const sourceCombatant = state.combatants.get(source.sourceCombatantId);
  const effect = sourceCombatant?.activeEffects.find(
    (candidate) => candidate.effectRef === source.effectRef,
  );
  return Match.value(source).pipe(
    byAreaDifficultTerrainSourceKind(
      "persistentAreaSaveCondition",
      (terrainSource) =>
        effect?.kind === "persistentAreaSaveCondition" &&
        effect.sourceCombatantId === terrainSource.sourceCombatantId &&
        effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
        effect.areaId === terrainSource.areaId,
    ),
    byAreaDifficultTerrainSourceKind(
      "persistentAreaSaveConditionEscape",
      (terrainSource) =>
        effect?.kind === "persistentAreaSaveConditionEscape" &&
        effect.sourceCombatantId === terrainSource.sourceCombatantId &&
        effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
        effect.areaId === terrainSource.areaId,
    ),
    byAreaDifficultTerrainSourceKind(
      "persistentAreaSaveComposite",
      (terrainSource) =>
        effect?.kind === "persistentAreaSaveComposite" &&
        effect.sourceCombatantId === terrainSource.sourceCombatantId &&
        effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
        effect.areaId === terrainSource.areaId,
    ),
    byAreaDifficultTerrainSourceKind(
      "persistentAreaSaveDamage",
      (terrainSource) =>
        effect?.kind === "persistentAreaSaveDamage" &&
        effect.sourceCombatantId === terrainSource.sourceCombatantId &&
        effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
        effect.areaId === terrainSource.areaId,
    ),
    byAreaDifficultTerrainSourceKind(
      "areaMovementDistanceDamage",
      (terrainSource) =>
        effect?.kind === "areaMovementDistanceDamage" &&
        effect.sourceCombatantId === terrainSource.sourceCombatantId &&
        effect.sourceProcedureRef === terrainSource.sourceProcedureRef &&
        effect.areaId === terrainSource.areaId,
    ),
    Match.exhaustive,
  );
}

function areaDifficultTerrainSourceKey(
  source: BattleAreaDifficultTerrainSource,
): string {
  return `${source.kind}\u0000${source.effectRef}`;
}

function areaDifficultTerrainMovementFactIssue(
  state: BattleState,
  fact: BattleAreaDifficultTerrainMovementFact | undefined,
  path: {
    readonly distanceFeet: MovementFeet;
    readonly areaDifficultTerrainDistanceFeet: MovementFeet;
  },
): string | null {
  if (fact === undefined) {
    return Number(path.areaDifficultTerrainDistanceFeet) === 0
      ? null
      : "A movement path segment in a spell area's Difficult Terrain requires the areaDifficultTerrain fact naming that area.";
  }
  if (fact.sources.length === 0) {
    return "Area Difficult Terrain movement fact requires a source.";
  }
  if (Number(path.areaDifficultTerrainDistanceFeet) === 0) {
    return "Area Difficult Terrain movement fact requires a movement path segment in that area's Difficult Terrain.";
  }
  return areaDifficultTerrainSourcesIssue(
    state,
    fact.sources,
    path.areaDifficultTerrainDistanceFeet,
  );
}

function areaDifficultTerrainSourcesIssue(
  state: BattleState,
  sources: BattleAreaDifficultTerrainMovementFact["sources"],
  areaDifficultTerrainDistanceFeet: MovementFeet,
): string | null {
  const sourceKeys = new Set<string>();
  let damageDistanceFeet = 0;
  for (const source of sources) {
    const key = areaDifficultTerrainSourceKey(source);
    if (sourceKeys.has(key)) {
      return "Area Difficult Terrain movement fact repeats a source.";
    }
    sourceKeys.add(key);
    if (source.kind === "areaMovementDistanceDamage") {
      const damageIssue = areaMovementDistanceDamageSourceIssue(
        source,
        areaDifficultTerrainDistanceFeet,
      );
      if (damageIssue !== null) return damageIssue;
      damageDistanceFeet += Number(source.damageDistanceFeet);
    }
  }
  if (damageDistanceFeet > Number(areaDifficultTerrainDistanceFeet)) {
    return "area movement-distance damage movement damage distances cannot exceed the path's area Difficult Terrain distance.";
  }
  return sources.every((source) =>
    activeAreaDifficultTerrainSourceMatches(state, source),
  )
    ? null
    : "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.";
}

function areaMovementDistanceDamageSourceIssue(
  source: Extract<
    BattleAreaDifficultTerrainSource,
    { readonly kind: "areaMovementDistanceDamage" }
  >,
  areaDifficultTerrainDistanceFeet: MovementFeet,
): string | null {
  if (
    !Number.isInteger(source.damageDistanceFeet) ||
    source.damageDistanceFeet <= 0
  ) {
    return "area movement-distance damage movement damage distance must be a positive integer.";
  }
  if (
    Number(source.damageDistanceFeet) > Number(areaDifficultTerrainDistanceFeet)
  ) {
    return "area movement-distance damage movement damage distance cannot exceed the path's area Difficult Terrain distance.";
  }
  return null;
}

type DirectionalPersistentAreaMovementFactResult =
  | { readonly tag: "notApplicable" }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly effect: BoundDirectionalPersistentAreaEffect;
    };

function directionalPersistentAreaMovementFactResult(
  state: BattleState,
  fact: BattleDirectionalPersistentAreaMovementFact | undefined,
  pathMovesCloser: boolean,
): DirectionalPersistentAreaMovementFactResult {
  if (fact === undefined) {
    return pathMovesCloser
      ? {
          tag: "invalid",
          message:
            "A movement path segment moving closer through a directional persistent area requires the directionalPersistentAreaMovement fact naming that area.",
        }
      : { tag: "notApplicable" };
  }
  if (!pathMovesCloser) {
    return {
      tag: "invalid",
      message:
        "directional persistent area Line movement fact requires a movement path segment moving closer through that Line.",
    };
  }
  const effect = activeDirectionalPersistentAreaForMovementFact(state, fact);
  if (effect === null) {
    return {
      tag: "invalid",
      message:
        "directional persistent area Line movement fact does not match an active directional persistent area Line.",
    };
  }
  return { tag: "ok", effect };
}

function activeDirectionalPersistentAreaForMovementFact(
  state: BattleState,
  fact: BattleDirectionalPersistentAreaMovementFact,
): BoundDirectionalPersistentAreaEffect | null {
  const source = state.combatants.get(fact.sourceCombatantId);
  const effect = source?.activeEffects.find(
    (candidate) => candidate.effectRef === fact.effectRef,
  );
  if (effect?.kind !== "directionalPersistentArea") return null;
  if (!directionalPersistentAreaEffectMatchesMovementFact(effect, fact)) {
    return null;
  }
  return boundDirectionalPersistentAreaEffect(state, effect) ?? null;
}

function directionalPersistentAreaEffectMatchesMovementFact(
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "directionalPersistentArea" }
  >,
  fact: BattleDirectionalPersistentAreaMovementFact,
): boolean {
  return (
    effect.sourceCombatantId === fact.sourceCombatantId &&
    effect.sourceProcedureRef === fact.sourceProcedureRef &&
    effect.areaId === fact.areaId &&
    effect.directionId === fact.directionId
  );
}
