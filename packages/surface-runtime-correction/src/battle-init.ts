import { Either } from "effect";

import { InvalidBattleInitError } from "#/errors.ts";
import type {
  BattleCombatant,
  BattleInit,
  BattleInitiativeCount,
  BattleInitiativeTieResolution,
  BattleState,
} from "#/battle-types.ts";
import type { CreatureId } from "#/types.ts";

function duplicateIds(ids: ReadonlyArray<CreatureId>): ReadonlyArray<CreatureId> {
  const seen = new Set<CreatureId>();
  const duplicates = new Set<CreatureId>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }
    seen.add(id);
  }
  return [...duplicates];
}

function invalidBattleInit(
  message: string,
): Either.Either<never, InvalidBattleInitError> {
  return Either.left(new InvalidBattleInitError({ message }));
}

function sameActorSet(
  left: ReadonlyArray<CreatureId>,
  right: ReadonlyArray<CreatureId>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((actorId) => rightSet.has(actorId));
}

function validateTieResolutions(
  combatantIds: ReadonlyArray<CreatureId>,
  initiativeCounts: ReadonlyMap<CreatureId, number>,
  tieResolutions: ReadonlyArray<BattleInitiativeTieResolution>,
): Either.Either<ReadonlyMap<CreatureId, number>, InvalidBattleInitError> {
  const flattenedActorIds = tieResolutions.flatMap(
    (resolution) => resolution.actorIds,
  );
  const duplicates = duplicateIds(flattenedActorIds);
  if (duplicates.length > 0) {
    return invalidBattleInit(
      `tie resolutions contain duplicate actor ids: ${duplicates.join(", ")}`,
    );
  }

  const combatantIdSet = new Set(combatantIds);
  const unknownActorIds = flattenedActorIds.filter(
    (actorId) => !combatantIdSet.has(actorId),
  );
  if (unknownActorIds.length > 0) {
    return invalidBattleInit(
      `tie resolutions contain unknown actor ids: ${unknownActorIds.join(", ")}`,
    );
  }

  const groupsByCount = new Map<number, Array<CreatureId>>();
  for (const actorId of combatantIds) {
    const count = initiativeCounts.get(actorId)!;
    const group = groupsByCount.get(count);
    if (group === undefined) {
      groupsByCount.set(count, [actorId]);
      continue;
    }
    group.push(actorId);
  }

  const tiedGroups = [...groupsByCount.values()].filter(
    (group) => group.length > 1,
  );
  if (tieResolutions.length !== tiedGroups.length) {
    return invalidBattleInit(
      `tie resolutions must cover exactly the tied initiative groups: expected ${tiedGroups.length}, received ${tieResolutions.length}`,
    );
  }

  const tieResolutionIndex = new Map<CreatureId, number>();
  for (const tiedGroup of tiedGroups) {
    const resolution = tieResolutions.find((candidate) =>
      sameActorSet(candidate.actorIds, tiedGroup),
    );
    if (resolution === undefined) {
      return invalidBattleInit(
        `missing tie resolution for tied actors: ${tiedGroup.join(", ")}`,
      );
    }

    for (const [index, actorId] of resolution.actorIds.entries()) {
      tieResolutionIndex.set(actorId, index);
    }
  }

  return Either.right(tieResolutionIndex);
}

function validateInitiativeCounts(
  combatantIds: ReadonlyArray<CreatureId>,
  initiativeCounts: ReadonlyArray<BattleInitiativeCount>,
): Either.Either<ReadonlyMap<CreatureId, number>, InvalidBattleInitError> {
  const initiativeActorIds = initiativeCounts.map((entry) => entry.actorId);
  const duplicates = duplicateIds(initiativeActorIds);
  if (duplicates.length > 0) {
    return invalidBattleInit(
      `initiative counts contain duplicate actor ids: ${duplicates.join(", ")}`,
    );
  }

  const combatantIdSet = new Set(combatantIds);
  const unknownActorIds = initiativeActorIds.filter(
    (actorId) => !combatantIdSet.has(actorId),
  );
  if (unknownActorIds.length > 0) {
    return invalidBattleInit(
      `initiative counts contain unknown actor ids: ${unknownActorIds.join(", ")}`,
    );
  }

  const initiativeIdSet = new Set(initiativeActorIds);
  const missingActorIds = combatantIds.filter(
    (actorId) => !initiativeIdSet.has(actorId),
  );
  if (missingActorIds.length > 0) {
    return invalidBattleInit(
      `initiative counts are missing actor ids: ${missingActorIds.join(", ")}`,
    );
  }

  return Either.right(
    new Map(initiativeCounts.map((entry) => [entry.actorId, entry.count])),
  );
}

export function createInitiativeOrder(
  combatantIds: ReadonlyArray<CreatureId>,
  init: BattleInit,
): Either.Either<ReadonlyArray<CreatureId>, InvalidBattleInitError> {
  const validatedInitiativeCounts = validateInitiativeCounts(
    combatantIds,
    init.initiativeCounts,
  );
  if (Either.isLeft(validatedInitiativeCounts)) {
    return Either.left(validatedInitiativeCounts.left);
  }

  const validatedTieResolutions = validateTieResolutions(
    combatantIds,
    validatedInitiativeCounts.right,
    init.tieResolutions,
  );
  if (Either.isLeft(validatedTieResolutions)) {
    return Either.left(validatedTieResolutions.left);
  }

  if (combatantIds.length === 0) {
    return Either.right([]);
  }

  return Either.right(
    [...combatantIds].sort((leftActorId, rightActorId) => {
      const leftCount = validatedInitiativeCounts.right.get(leftActorId)!;
      const rightCount = validatedInitiativeCounts.right.get(rightActorId)!;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return (
        validatedTieResolutions.right.get(leftActorId)! -
        validatedTieResolutions.right.get(rightActorId)!
      );
    }),
  );
}

export function initializeBattleState(
  combatants: ReadonlyArray<BattleCombatant>,
  init: BattleInit,
): Either.Either<BattleState, InvalidBattleInitError> {
  const combatantIds = combatants.map((combatant) => combatant.id);
  const initiativeOrder = createInitiativeOrder(combatantIds, init);
  if (Either.isLeft(initiativeOrder)) {
    return Either.left(initiativeOrder.left);
  }

  return Either.right({
    combatants,
    initiativeCounts: init.initiativeCounts,
    initiativeOrder: initiativeOrder.right,
    round: initiativeOrder.right.length === 0 ? 0 : 1,
    turnNumber: initiativeOrder.right.length === 0 ? 0 : 1,
    turnActorId: initiativeOrder.right[0] ?? null,
    openPrompt: null,
  });
}

export function advanceBattleTurn(state: BattleState): BattleState {
  if (state.initiativeOrder.length === 0 || state.turnActorId === null) {
    return state;
  }

  const turnIndex = state.initiativeOrder.indexOf(state.turnActorId);
  if (turnIndex === -1) {
    return {
      ...state,
      turnActorId: state.initiativeOrder[0] ?? null,
    };
  }

  const nextTurnIndex = (turnIndex + 1) % state.initiativeOrder.length;
  const wrapsRound = nextTurnIndex === 0;

  return {
    ...state,
    round: wrapsRound ? state.round + 1 : state.round,
    turnNumber: state.turnNumber + 1,
    turnActorId: state.initiativeOrder[nextTurnIndex] ?? null,
    openPrompt: null,
  };
}
