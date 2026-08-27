import {
  battlePresentedSnapshot,
  battleAdmittedSpellPresentations,
  battleStateInitIssueMessage,
  wildShapeKnownFormsIssueMessage,
  discoverBattleActs,
  startBattle,
  type BattleCreatureInit,
  type BattleRuntimeSession,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  admitCharacterSheetCompanionToBattle,
  characterSheetBattleInit,
} from "@dnd/character-battle-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { Either, Match } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
import type {
  CharacterBattleRosterCombatant,
  StatBlockBattleRosterCombatant,
} from "./battle-roster-session-types.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import {
  type BattleCombatantToolInput,
  type CharacterSessionCombatantToolInput,
  type CompanionAdmissionToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import { battleSnapshotPresentationIssueContent } from "./battle-tool-payloads.ts";
import { startInitialInitiativeSetup } from "./initial-initiative-setup-start.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import { projectStatBlockBattleCombatant } from "./stat-block-battle-combatant-projection.ts";

export type StartableCharacterSessionCombatant = {
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
};

export type ProjectedBattleCombatant =
  | {
      readonly tag: "characterSession";
      readonly creatureInit: CharacterBattleRosterCombatant;
      readonly characterSession: StartableCharacterSessionCombatant;
    }
  | {
      readonly tag: "encounterCombatant";
      readonly creatureInit: StatBlockBattleRosterCombatant;
    };

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

function startableBattleCombatants(input: {
  readonly root: McpPlaySessionRoot;
  readonly initialCombatants: readonly BattleCombatantToolInput[];
}): Either.Either<StartableBattleCombatants, ReturnType<typeof errorContent>> {
  const combatants = traverseValidation(input.initialCombatants, (combatant) =>
    projectBattleCombatant({
      root: input.root,
      combatant,
    }),
  );
  if (Either.isLeft(combatants)) {
    return Either.left(invalidBattleCombatantsContent(combatants.left));
  }

  return Either.right({
    creatureInits: combatants.right.map((combatant) => combatant.creatureInit),
    characterSessions: combatants.right.flatMap((combatant) =>
      combatant.tag === "characterSession" ? [combatant.characterSession] : [],
    ),
  });
}

export function projectBattleCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
}): Either.Either<ProjectedBattleCombatant, ToolError> {
  const { root, combatant } = input;
  return Match.value(combatant).pipe(
    Match.when({ kind: "characterSession" }, (character) => {
      const session = root.sessionStore.characters.get(character.characterId);
      if (session === undefined) {
        return Either.left(
          errorContent(
            `Unknown finalized character session: ${character.characterId}`,
            {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: character.characterId,
            },
          ),
        );
      }
      if (session.tag === "inBattle") {
        return Either.left(
          errorContent("Character is already assigned to a battle.", {
            code: "CHARACTER_ALREADY_IN_BATTLE",
            characterId: character.characterId,
            battleId: session.battleId,
          }),
        );
      }
      const characterInit = characterSheetBattleInit({
        combatantId: character.combatantId,
        displayName: characterBuildDisplayName(root.unitLibrary, session.build),
        sheet: session,
        initiative: character.initiative,
        ammunitionStocks: character.ammunitionStocks,
        unitLibrary: root.unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      });
      if (Either.isLeft(characterInit)) {
        return Either.left(
          errorContent(
            characterInit.left.tag === "battleDruidWildShapeKnownFormsIssue"
              ? wildShapeKnownFormsIssueMessage(characterInit.left.issues)
              : characterInit.left.message,
            {
              code: "CHARACTER_BATTLE_INIT_INVALID",
              ...(characterInit.left.tag ===
              "battleDruidWildShapeKnownFormsIssue"
                ? {
                    wildShapeIssues: characterInit.left.issues,
                  }
                : {}),
            },
          ),
        );
      }
      return Either.right({
        tag: "characterSession" as const,
        creatureInit: characterInit.right,
        characterSession: { character, session },
      });
    }),
    Match.when({ kind: "statBlock" }, (combatant) =>
      projectStatBlockBattleCombatant({ root, combatant }),
    ),
    Match.exhaustive,
  );
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

function invalidBattleCombatantsContent(issues: readonly ToolError[]) {
  return errorContent("Invalid battle start combatants.", {
    code: "INVALID_BATTLE_COMBATANTS",
    issues: issues.map(jsonContentPayload),
  });
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
