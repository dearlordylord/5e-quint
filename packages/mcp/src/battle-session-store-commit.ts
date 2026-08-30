import type { BattleRuntimeSession } from "@dnd/battle-runtime";
import { Match, Result } from "effect";

import type { BattleCharacterSessionSettlement } from "./battle-handoff.ts";
import { projectCharacterSessionInBattle } from "./character-session-occupancy.ts";
import type {
  AvailableCharacterSession,
  CharacterSessionRegistry,
  McpBattleState,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";
import { invalidBattleStateTransition } from "./session-store-state-transition.ts";

type CharacterId = AvailableCharacterSession["characterId"];

export function commitBattleStartTransition(input: {
  readonly currentBattleState: McpBattleState;
  readonly nextBattleState: Exclude<McpBattleState, { readonly tag: "none" }>;
  readonly characterSessions: readonly AvailableCharacterSession[];
  readonly characters: CharacterSessionRegistry;
}): Result.Result<McpBattleState, McpBattleStateTransitionIssue> {
  if (input.currentBattleState.tag !== "none") {
    return invalidBattleStateTransition(
      input.currentBattleState.tag,
      input.nextBattleState.tag,
    );
  }
  const changedCharacterIds = input.characterSessions
    .filter((session) => input.characters.get(session.characterId) !== session)
    .map((session) => session.characterId);
  if (changedCharacterIds.length > 0) {
    return Result.fail({
      tag: "battleStateCharacterSessionChanged",
      affectedCharacterIds: changedCharacterIds,
    });
  }
  const battleId = Match.value(input.nextBattleState).pipe(
    Match.when(
      { tag: "initialInitiativeSetup" },
      ({ setup }) => setup.state.battleId,
    ),
    Match.when(
      { tag: "activeBattle" },
      ({ session }) => session.state.battleId,
    ),
    Match.exhaustive,
  );
  const battleCharacterIds = battleCharacterIdsFromState(input.nextBattleState);
  const transitionCharacterIds = input.characterSessions.map(
    ({ characterId }) => characterId,
  );
  if (!sameUniqueCharacterIdSet(battleCharacterIds, transitionCharacterIds)) {
    return Result.fail({
      tag: "battleStateCharacterRosterMismatch",
      battleCharacterIds,
      transitionCharacterIds,
    });
  }
  const nextCharacterSessions = input.characterSessions.map((session) =>
    projectCharacterSessionInBattle({ session, battleId }),
  );
  const committed = input.characters.setAll(nextCharacterSessions);
  if (Result.isFailure(committed)) {
    return Result.fail({
      tag: "battleStateCharacterSessionRegistryConflict",
      registryIssue: committed.failure,
      affectedCharacterIds: nextCharacterSessions.map(
        ({ sheet }) => sheet.characterId,
      ),
    });
  }
  return Result.succeed(input.nextBattleState);
}

export function commitBattleEndTransition(input: {
  readonly currentBattleState: McpBattleState;
  readonly battleSession: BattleRuntimeSession;
  readonly characterSettlements: readonly BattleCharacterSessionSettlement[];
  readonly characters: CharacterSessionRegistry;
}): Result.Result<McpBattleState, McpBattleStateTransitionIssue> {
  if (input.currentBattleState.tag !== "activeBattle") {
    return invalidBattleStateTransition(input.currentBattleState.tag, "none");
  }
  if (input.currentBattleState.session !== input.battleSession) {
    return Result.fail({
      tag: "battleStateSessionChanged",
      battleId: input.currentBattleState.session.state.battleId,
    });
  }
  const mismatchedSettlement = input.characterSettlements.find(
    ({ expected, next }) => expected.sheet.characterId !== next.characterId,
  );
  if (mismatchedSettlement !== undefined) {
    return Result.fail({
      tag: "battleStateCharacterSettlementMismatch",
      expectedCharacterId: mismatchedSettlement.expected.sheet.characterId,
      nextCharacterId: mismatchedSettlement.next.characterId,
    });
  }
  const battleCharacterIds = battleCharacterIdsFromState(
    input.currentBattleState,
  );
  const transitionCharacterIds = input.characterSettlements.map(
    ({ expected }) => expected.sheet.characterId,
  );
  const settledCharacterIds = input.characterSettlements.map(
    ({ next }) => next.characterId,
  );
  if (
    !sameUniqueCharacterIdSet(battleCharacterIds, transitionCharacterIds) ||
    !sameUniqueCharacterIdSet(transitionCharacterIds, settledCharacterIds)
  ) {
    return Result.fail({
      tag: "battleStateCharacterRosterMismatch",
      battleCharacterIds,
      transitionCharacterIds: settledCharacterIds,
    });
  }
  const changedCharacterIds = input.characterSettlements
    .filter(
      ({ expected }) =>
        input.characters.get(expected.sheet.characterId) !== expected,
    )
    .map(({ expected }) => expected.sheet.characterId);
  if (changedCharacterIds.length > 0) {
    return Result.fail({
      tag: "battleStateCharacterSessionChanged",
      affectedCharacterIds: changedCharacterIds,
    });
  }
  const committed = input.characters.setAll(
    input.characterSettlements.map(({ next }) => next),
  );
  if (Result.isFailure(committed)) {
    return Result.fail({
      tag: "battleStateCharacterSessionRegistryConflict",
      registryIssue: committed.failure,
      affectedCharacterIds: input.characterSettlements.map(
        ({ next }) => next.characterId,
      ),
    });
  }
  return Result.succeed({ tag: "none" });
}

function battleCharacterIdsFromState(
  state: Exclude<McpBattleState, { readonly tag: "none" }>,
): readonly CharacterId[] {
  const combatants = Match.value(state).pipe(
    Match.when(
      { tag: "initialInitiativeSetup" },
      ({ setup }) => setup.state.combatants,
    ),
    Match.when(
      { tag: "activeBattle" },
      ({ session }) => session.state.combatants,
    ),
    Match.exhaustive,
  );
  return Array.from(combatants.values()).flatMap((combatant) =>
    combatant.origin.kind === "character" ? [combatant.origin.characterId] : [],
  );
}

function sameUniqueCharacterIdSet(
  left: readonly CharacterId[],
  right: readonly CharacterId[],
): boolean {
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  return (
    leftIds.size === left.length &&
    rightIds.size === right.length &&
    leftIds.size === rightIds.size &&
    Array.from(leftIds).every((characterId) => rightIds.has(characterId))
  );
}
