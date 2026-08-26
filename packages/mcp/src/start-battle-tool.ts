import {
  battlePresentedSnapshot,
  battleAdmittedSpellPresentations,
  discoverBattleActs,
  startBattle,
  battleStateInitIssueMessage,
  type BattleRuntimeSession,
  type CombatantId,
} from "@dnd/battle-runtime";
import { admitCharacterSheetCompanionToBattle } from "@dnd/character-battle-runtime";
import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import {
  type BattleCombatantToolInput,
  type CharacterSessionCombatantToolInput,
  type CompanionAdmissionToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";
import { battleSnapshotPresentationIssueContent } from "./battle-tool-payloads.ts";
import { startInitialInitiativeSetup } from "./initial-initiative-setup-start.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import {
  startableBattleCombatants,
  type StartableCharacterSessionCombatant,
} from "./battle-combatant-projection.ts";

export { projectBattleCombatant } from "./battle-combatant-projection.ts";
export type {
  ProjectedBattleCombatant,
  StartableBattleCombatants,
  StartableCharacterSessionCombatant,
} from "./battle-combatant-projection.ts";

export function handleStartBattleToolCall(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
) {
  const battleState = root.sessionStore.battleState;
  const activeBattleError = Match.value(battleState).pipe(
    Match.when({ tag: "none" }, () => null),
    Match.when({ tag: "initialInitiativeSetup" }, (matched) =>
      errorContent("A battle session is already active.", {
        code: "BATTLE_SESSION_ALREADY_ACTIVE",
        battleId: matched.setup.state.battleId,
      }),
    ),
    Match.when({ tag: "activeBattle" }, (matched) =>
      errorContent("A battle session is already active.", {
        code: "BATTLE_SESSION_ALREADY_ACTIVE",
        battleId: matched.session.state.battleId,
      }),
    ),
    Match.exhaustive,
  );
  if (activeBattleError !== null) return activeBattleError;

  const duplicateInput = duplicateStartBattleInputContent(
    input.initialCombatants,
    input.companionAdmissions,
  );
  if (duplicateInput !== null) return duplicateInput;
  const initialCombatantOrder = initialCombatantOrderForStartInput(input);

  const combatants = startableBattleCombatants({
    root,
    initialCombatants: input.initialCombatants,
  });
  if (Either.isLeft(combatants)) return combatants.left;

  if (input.initiativeMode === "initialSetup") {
    return startInitialInitiativeSetup(root, input, combatants.right);
  }

  const session = startBattle({
    battleId: input.battleId,
    combatants: combatants.right.creatureInits,
  });
  if (Either.isLeft(session)) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: battleStateInitIssueMessage(session.left),
    });
  }
  const admittedState = admitCompanionAdmissions({
    root,
    session: session.right,
    admissions: input.companionAdmissions,
    characterSessions: combatants.right.characterSessions,
    initialCombatantOrder,
  });
  if (Either.isLeft(admittedState)) return admittedState.left;

  const admittedSession = admittedState.right;
  const snapshot = battlePresentedSnapshot(admittedSession);
  if (Either.isLeft(snapshot)) {
    return battleSnapshotPresentationIssueContent(snapshot.left);
  }

  return completeBattleStateTransition({
    root,
    transition: root.sessionStore.commitBattleStart({
      nextBattleState: { tag: "activeBattle", session: admittedSession },
      characterSessions: combatants.right.characterSessions.map(
        ({ session }) => session,
      ),
    }),
    output: () => {
      const session = root.sessionStore.snapshot();
      const battleState = battleStateSnapshot(root.sessionStore.battleState);
      if (battleState.tag !== "activeBattle") {
        throw new Error("Battle start payload requires owned active state.");
      }
      return schemaJsonContent(StartBattleOutputSchema, {
        battleState,
        snapshot: snapshot.right,
        availableActs: discoverBattleActs(admittedSession),
        admittedSpellPresentations:
          battleAdmittedSpellPresentations(admittedSession),
        presentedInterruptChoices: [],
        session: { ...mcpSessionSummary(session), battleState },
      });
    },
  });
}

function duplicateStartBattleInputContent(
  initialCombatants: readonly BattleCombatantToolInput[],
  companionAdmissions: readonly CompanionAdmissionToolInput[],
) {
  const characters = initialCombatants.filter(isCharacterSessionCombatant);
  const duplicateCharacterId = firstDuplicate(
    characters.map((character) => character.characterId),
  );
  if (duplicateCharacterId !== null) {
    return errorContent("Duplicate character id in battle start.", {
      code: "DUPLICATE_BATTLE_CHARACTER_ID",
      characterId: duplicateCharacterId,
    });
  }

  const duplicateCombatantId = firstDuplicate([
    ...initialCombatants.map((combatant) => combatant.combatantId),
    ...companionAdmissions.flatMap((admission) =>
      admission.companionCombatantId === undefined
        ? []
        : [admission.companionCombatantId],
    ),
  ]);
  if (duplicateCombatantId !== null) {
    return errorContent("Duplicate combatant id in battle start.", {
      code: "DUPLICATE_BATTLE_COMBATANT_ID",
      combatantId: duplicateCombatantId,
    });
  }

  const duplicateCompanionOwner = firstDuplicate(
    companionAdmissions.map((admission) => admission.ownerCharacterId),
  );
  if (duplicateCompanionOwner !== null) {
    return errorContent("Duplicate companion owner in battle start.", {
      code: "DUPLICATE_BATTLE_COMPANION_OWNER",
      characterId: duplicateCompanionOwner,
    });
  }

  return null;
}

function admitCompanionAdmissions(input: {
  readonly root: McpPlaySessionRoot;
  readonly session: BattleRuntimeSession;
  readonly admissions: readonly CompanionAdmissionToolInput[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
}): Either.Either<BattleRuntimeSession, ReturnType<typeof errorContent>> {
  let session = input.session;
  for (const admission of input.admissions) {
    const owner = input.characterSessions.find(
      ({ character }) => character.characterId === admission.ownerCharacterId,
    );
    if (owner === undefined) {
      return Either.left(
        errorContent("Companion admission owner is not in the battle roster.", {
          code: "COMPANION_OWNER_NOT_IN_ROSTER",
          characterId: admission.ownerCharacterId,
          ...(admission.companionCombatantId === undefined
            ? {}
            : { companionCombatantId: admission.companionCombatantId }),
        }),
      );
    }
    const admitted = admitCharacterSheetCompanionToBattle({
      session,
      sheet: owner.session,
      unitLibrary: input.root.unitLibrary,
      ownerCombatantId: owner.character.combatantId,
      ammunitionStocks: admission.ammunitionStocks,
      ...(admission.companionCombatantId === undefined
        ? {}
        : { companionCombatantId: admission.companionCombatantId }),
      ...(admission.initiative === undefined
        ? {}
        : { initiative: admission.initiative }),
      placement:
        admission.positionId === undefined
          ? { kind: "unoccupiedSpaceWithinSpellRange" }
          : {
              kind: "unoccupiedSpaceWithinSpellRange",
              positionId: admission.positionId,
            },
      initialCombatantOrder: input.initialCombatantOrder,
      statBlockCatalog: input.root.statBlockCatalog,
    });
    if (Either.isLeft(admitted)) {
      return Either.left(
        errorContent("Companion admission failed.", {
          code: "COMPANION_ADMISSION_FAILED",
          characterId: admission.ownerCharacterId,
          ...(admission.companionCombatantId === undefined
            ? {}
            : { combatantId: admission.companionCombatantId }),
          message: admitted.left.message,
        }),
      );
    }
    session = admitted.right;
  }
  return Either.right(session);
}

function initialCombatantOrderForStartInput(
  input: StartBattleToolInput,
): ReadonlyMap<CombatantId, number> {
  return new Map(
    [
      ...input.initialCombatants.map((combatant) => combatant.combatantId),
      ...input.companionAdmissions.flatMap((admission) =>
        admission.companionCombatantId === undefined
          ? []
          : [admission.companionCombatantId],
      ),
    ].map((combatantId, index) => [combatantId, index]),
  );
}

function isCharacterSessionCombatant(
  combatant: BattleCombatantToolInput,
): combatant is CharacterSessionCombatantToolInput {
  return combatant.kind === "characterSession";
}

function firstDuplicate<T>(values: readonly T[]): T | null {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}
