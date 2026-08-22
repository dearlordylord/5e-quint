import type {
  BattleCreatureState,
  BattleRuntimeSession,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  addBattleRuntimeCombatant,
  battleStateInitIssueMessage,
  removeBattleRuntimeCombatants,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match } from "effect";

import type {
  CharacterSession,
  CharacterSessionRegistry,
  PendingBattleFillSession,
} from "./session-store.ts";
import {
  createActiveBattleRosterTransitionPlan,
  type ActiveBattleRosterTransitionPlan,
  type ActiveBattleRosterTransitionPlanData,
  type ActiveBattleRosterTransitionPreview,
  type McpBattleRosterOperation,
  type McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";

type CharacterId = CharacterSheetId;

const activeBattleRosterTransitionPlanData = new WeakMap<
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPlanData
>();

export type BattleRosterTransitionPlanner = {
  plan(
    operation: McpBattleRosterOperation,
    activeBattle: BattleRuntimeSession,
    pendingBattleFills: PendingBattleFillSession | null,
  ): Either.Either<
    ActiveBattleRosterTransitionPreview,
    McpBattleRosterTransitionIssue
  >;
  commit(
    plan: ActiveBattleRosterTransitionPlan,
    activeBattle: BattleRuntimeSession,
    pendingBattleFills: PendingBattleFillSession | null,
  ): Either.Either<BattleRuntimeSession, McpBattleRosterTransitionIssue>;
};

export function createBattleRosterTransitionPlanner(input: {
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): BattleRosterTransitionPlanner {
  return {
    plan(operation, activeBattle, pendingBattleFills) {
      if (pendingBattleFills !== null) {
        return Either.left({
          tag: "battleRosterPendingBattleFills",
          pendingSubject: pendingBattleFills.subject,
        });
      }
      return planActiveBattleRosterTransition({
        ...input,
        operation,
        activeBattle,
      });
    },
    commit(plan, activeBattle, pendingBattleFills) {
      const data = activeBattleRosterTransitionPlanData.get(plan);
      if (data === undefined || data.storeIdentity !== input.storeIdentity) {
        return Either.left({ tag: "battleRosterUnknownPlan" });
      }
      if (activeBattle !== data.activeBattle) {
        return Either.left({
          tag: "battleRosterPlanBattleChanged",
          battleId: data.activeBattle.state.battleId,
        });
      }
      if (pendingBattleFills !== data.pendingBattleFills) {
        return Either.left({ tag: "battleRosterPlanFillsChanged" });
      }
      const changedCharacterIds = data.affectedCharacterSessions
        .filter(
          ({ characterId, session }) =>
            input.characters.get(characterId) !== session,
        )
        .map(({ characterId }) => characterId);
      if (changedCharacterIds.length > 0) {
        return Either.left({
          tag: "battleRosterPlanCharacterChanged",
          characterIds: changedCharacterIds,
        });
      }
      const committed = input.characters.setAll(data.nextCharacterSessions);
      if (Either.isLeft(committed)) {
        return Either.left({
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: committed.left,
          affectedCharacterIds: data.affectedCharacterSessions.map(
            ({ characterId }) => characterId,
          ),
        });
      }
      activeBattleRosterTransitionPlanData.delete(plan);
      return Either.right(data.result.prospectiveBattle);
    },
  };
}

function planActiveBattleRosterTransition(input: {
  readonly operation: McpBattleRosterOperation;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "addCharacter" }, (operation) =>
      planAddCharacterBattleCombatant({ ...input, operation }),
    ),
    Match.when({ kind: "addStatBlock" }, (operation) =>
      planAddStatBlockBattleCombatant({ ...input, operation }),
    ),
    Match.when({ kind: "remove" }, (operation) =>
      planRemoveBattleCombatant({ ...input, operation }),
    ),
    Match.exhaustive,
  );
}

function planAddCharacterBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "addCharacter" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const { operation } = input;
  if (operation.combatant.creatureInit.kind !== "character") {
    return Either.left({
      tag: "battleRosterOperationInvalid",
      message: "Character admission requires a character Battle Creature Init.",
    });
  }
  const characterId = operation.combatant.creatureInit.characterId;
  const currentSession = input.characters.get(characterId);
  if (currentSession === undefined) {
    return Either.left({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: operation.combatant.combatantId,
      characterId,
    });
  }
  if (currentSession.tag === "inBattle") {
    return Either.left({
      tag: "battleRosterCharacterAlreadyInBattle",
      characterId: currentSession.sheet.characterId,
      battleId: currentSession.battleId,
    });
  }
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: operation.combatant,
  });
  if (Either.isLeft(admitted)) {
    return Either.left({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: operation.combatant.combatantId,
      message: battleStateInitIssueMessage(admitted.left),
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      nextCharacterSessions: [
        {
          tag: "inBattle",
          sheet: currentSession,
          battleId: input.activeBattle.state.battleId,
        },
      ],
      affectedCharacterSessions: [{ characterId, session: currentSession }],
      pendingBattleFills: null,
      result: { kind: "add", prospectiveBattle: admitted.right },
    }),
  );
}

function planAddStatBlockBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "addStatBlock" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  if (input.operation.combatant.creatureInit.kind !== "statBlock") {
    return Either.left({
      tag: "battleRosterOperationInvalid",
      message:
        "Stat Block admission requires a Stat Block Battle Creature Init.",
    });
  }
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: input.operation.combatant,
  });
  if (Either.isLeft(admitted)) {
    return Either.left({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: input.operation.combatant.combatantId,
      message: battleStateInitIssueMessage(admitted.left),
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      nextCharacterSessions: [],
      affectedCharacterSessions: [],
      pendingBattleFills: null,
      result: { kind: "add", prospectiveBattle: admitted.right },
    }),
  );
}

function planRemoveBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "remove" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const combatant = input.activeBattle.state.combatants.get(
    input.operation.combatantId,
  );
  if (combatant === undefined) {
    return Either.left({
      tag: "battleRosterCombatantNotFound",
      combatantId: input.operation.combatantId,
    });
  }
  const settled = settledCharacterSessionForBattleRemoval({
    ...input,
    combatant,
  });
  if (Either.isLeft(settled)) return Either.left(settled.left);
  const removed = removeBattleRuntimeCombatants({
    session: input.activeBattle,
    combatantIds: [input.operation.combatantId],
  });
  if (Either.isLeft(removed)) {
    return Either.left({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: input.operation.combatantId,
      message: battleStateInitIssueMessage(removed.left),
    });
  }
  const removedCombatantIds = nonEmptyCombatantIds(
    [...input.activeBattle.state.combatants.keys()].filter(
      (id) => !removed.right.state.combatants.has(id),
    ),
  );
  if (removedCombatantIds === undefined) {
    return Either.left({
      tag: "battleRosterRemovalEmpty",
      combatantId: input.operation.combatantId,
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      nextCharacterSessions: settled.right.nextCharacterSessions,
      affectedCharacterSessions: settled.right.affectedCharacterSessions,
      pendingBattleFills: null,
      result: {
        kind: "remove",
        prospectiveBattle: removed.right,
        removedCombatantIds,
      },
    }),
  );
}

function settledCharacterSessionForBattleRemoval(input: {
  readonly combatant: BattleCreatureState;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  {
    readonly nextCharacterSessions: readonly CharacterSession[];
    readonly affectedCharacterSessions: readonly {
      readonly characterId: CharacterId;
      readonly session: CharacterSession;
    }[];
  },
  McpBattleRosterTransitionIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right({
      nextCharacterSessions: [],
      affectedCharacterSessions: [],
    });
  }
  const characterId = input.combatant.origin.characterId;
  const session = input.characters.get(characterId);
  if (session === undefined) {
    return Either.left({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: input.combatant.combatantId,
      characterId,
    });
  }
  if (session.tag !== "inBattle") {
    return Either.left({
      tag: "battleRosterCharacterSessionNotInBattle",
      characterId,
    });
  }
  if (session.battleId !== input.activeBattle.state.battleId) {
    return Either.left({
      tag: "battleRosterCharacterBattleOwnershipConflict",
      characterId,
      expectedBattleId: input.activeBattle.state.battleId,
      actualBattleId: session.battleId,
    });
  }
  const settled = settleCharacterSheetFromBattle({
    combatant: input.combatant,
    state: input.activeBattle.state,
    context: input.activeBattle.context,
    sheet: session.sheet,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Either.isLeft(settled)) {
    return Either.left({
      tag: "battleRosterSettlementInvalid",
      characterId,
      message: settled.left.message,
    });
  }
  return Either.right({
    nextCharacterSessions: [settled.right],
    affectedCharacterSessions: [{ characterId, session }],
  });
}

function activeBattleRosterTransitionPlan(
  input: ActiveBattleRosterTransitionPlanData,
): ActiveBattleRosterTransitionPreview {
  const plan = createActiveBattleRosterTransitionPlan();
  activeBattleRosterTransitionPlanData.set(plan, input);
  return input.result.kind === "add"
    ? {
        kind: "add",
        plan,
        prospectiveBattle: input.result.prospectiveBattle,
      }
    : {
        kind: "remove",
        plan,
        prospectiveBattle: input.result.prospectiveBattle,
        removedCombatantIds: input.result.removedCombatantIds,
      };
}

function nonEmptyCombatantIds(
  ids: readonly CombatantId[],
): readonly [CombatantId, ...CombatantId[]] | undefined {
  const first = ids[0];
  return first === undefined ? undefined : [first, ...ids.slice(1)];
}
