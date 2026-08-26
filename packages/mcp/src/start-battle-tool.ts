import {
  battlePresentedSnapshot,
  battleAdmittedSpellPresentations,
  discoverBattleActs,
  startBattle,
  type BattleCreatureInit,
  type BattleRuntimeSession,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  admitCharacterSheetCompanionToBattle,
  composeCharacterBattleRoster,
  type CharacterBattleRosterAdmission,
  type CharacterBattleRosterEntry,
  type CharacterBattleRosterIssue,
} from "@dnd/character-battle-runtime";
import { Either, Match, Option } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
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
import { errorContent } from "./tool-content.ts";
import { battleSnapshotPresentationIssueContent } from "./battle-tool-payloads.ts";
import { startInitialInitiativeSetup } from "./initial-initiative-setup-start.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import {
  battleRuntimeIssuePayload,
  battleStartIssuesContent,
  characterBattleRosterIssuePayload,
} from "./battle-start-failure.ts";

export type StartableCharacterSessionCombatant = {
  readonly index: number;
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
  readonly issues: readonly CharacterBattleRosterIssue[];
  readonly ownerPaths: ReadonlyMap<CombatantId, readonly (string | number)[]>;
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

  const initialCombatantOrder = initialCombatantOrderForStartInput(input);

  const combatants = startableBattleCombatants({
    root,
    initialCombatants: input.initialCombatants,
  });

  if (input.initiativeMode === "initialSetup") {
    return startInitialInitiativeSetup(root, input, combatants);
  }

  if (combatants.creatureInits.length === 0) {
    return battleStartIssuesContent(
      combatants.issues.flatMap(characterBattleRosterIssuePayload),
    );
  }

  const session = startBattle({
    battleId: input.battleId,
    combatants: combatants.creatureInits,
    ownerPathForCombatant: (combatant) =>
      combatants.ownerPaths.get(combatant.combatantId) ?? ["initialCombatants"],
  });
  if (Either.isLeft(session)) {
    return battleStartIssuesContent([
      ...combatants.issues.flatMap(characterBattleRosterIssuePayload),
      ...battleRuntimeIssuePayload(session.left),
    ]);
  }
  if (combatants.issues.length > 0) {
    return battleStartIssuesContent(
      combatants.issues.flatMap(characterBattleRosterIssuePayload),
    );
  }
  const admittedState = admitCompanionAdmissions({
    root,
    session: session.right,
    admissions: input.companionAdmissions,
    characterSessions: combatants.characterSessions,
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
      characterSessions: combatants.characterSessions.map(
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

function startableBattleCombatants(input: {
  readonly root: McpPlaySessionRoot;
  readonly initialCombatants: readonly BattleCombatantToolInput[];
}): StartableBattleCombatants {
  const characterSessionsByIndex = new Map<
    number,
    StartableCharacterSessionCombatant
  >();
  const entries = input.initialCombatants.map((combatant, index) => {
    const entry = rosterEntryForToolCombatant({
      root: input.root,
      combatant,
      index,
    });
    if (entry.session !== undefined) {
      characterSessionsByIndex.set(index, {
        ...entry.session,
        index,
      });
    }
    return entry.rosterEntry;
  });
  const composition = composeCharacterBattleRoster(entries);
  const ownerPaths = new Map<CombatantId, readonly (string | number)[]>();
  for (const admission of composition.admissions) {
    ownerPaths.set(admission.combatant.combatantId, [
      "initialCombatants",
      admission.index,
    ]);
  }
  return {
    issues: composition.issues,
    creatureInits: composition.admissions.map(
      (admission) => admission.combatant,
    ),
    characterSessions: composition.admissions.flatMap((admission) => {
      if (admission.kind !== "characterSheet") return [];
      const session = characterSessionsByIndex.get(admission.index);
      return session === undefined ? [] : [session];
    }),
    ownerPaths,
  };
}

export function projectBattleCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
}): Either.Either<CharacterBattleRosterAdmission, ToolError> {
  const rosterEntry = rosterEntryForToolCombatant({
    root: input.root,
    combatant: input.combatant,
    index: 0,
  });
  const composition = composeCharacterBattleRoster([rosterEntry.rosterEntry]);
  if (composition.issues.length > 0) {
    return Either.left(
      battleStartIssuesContent(
        composition.issues.flatMap(characterBattleRosterIssuePayload),
      ),
    );
  }
  const admission = composition.admissions[0];
  return admission === undefined
    ? Either.left(errorContent("Battle combatant admission failed."))
    : Either.right(admission);
}

function rosterEntryForToolCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
  readonly index: number;
}): {
  readonly rosterEntry: CharacterBattleRosterEntry;
  readonly session?: StartableCharacterSessionCombatant;
} {
  return Match.value(input.combatant).pipe(
    Match.when({ kind: "characterSession" }, (character) => {
      const session = input.root.sessionStore.characters.get(
        character.characterId,
      );
      const source =
        session === undefined
          ? {
              kind: "missing" as const,
              characterId: character.characterId,
              combatantId: character.combatantId,
            }
          : session.tag === "inBattle"
            ? {
                kind: "inBattle" as const,
                characterId: character.characterId,
                combatantId: character.combatantId,
                battleId: session.battleId,
              }
            : {
                kind: "available" as const,
                input: {
                  combatantId: character.combatantId,
                  displayName: characterBuildDisplayName(
                    input.root.unitLibrary,
                    session.build,
                  ),
                  sheet: session,
                  initiative: character.initiative,
                  ammunitionStocks: character.ammunitionStocks,
                  unitLibrary: input.root.unitLibrary,
                  statBlockCatalog: input.root.statBlockCatalog,
                },
              };
      return {
        rosterEntry: {
          kind: "characterSheet" as const,
          source,
        },
        ...(session?.tag === "available"
          ? {
              session: {
                index: input.index,
                character,
                session,
              },
            }
          : {}),
      };
    }),
    Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
      const statBlock = input.root.statBlockCatalog.getStatBlock(
        statBlockCombatant.statBlockId,
      );
      return {
        rosterEntry: {
          kind: "statBlock" as const,
          source: Option.isNone(statBlock)
            ? {
                kind: "missing" as const,
                statBlockId: statBlockCombatant.statBlockId,
                combatantId: statBlockCombatant.combatantId,
              }
            : {
                kind: "available" as const,
                input: {
                  combatantId: statBlockCombatant.combatantId,
                  statBlock: statBlock.value,
                  initiative: statBlockCombatant.initiative,
                  ammunitionStocks: statBlockCombatant.ammunitionStocks,
                  conditions: [],
                  ...(statBlockCombatant.currentHp === undefined
                    ? {}
                    : { currentHp: statBlockCombatant.currentHp }),
                  ...(statBlockCombatant.tempHp === undefined
                    ? {}
                    : { tempHp: statBlockCombatant.tempHp }),
                },
              },
        },
      };
    }),
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
  const duplicateOwner = input.admissions.find((admission, index) =>
    input.admissions
      .slice(0, index)
      .some(
        (previous) => previous.ownerCharacterId === admission.ownerCharacterId,
      ),
  );
  if (duplicateOwner !== undefined) {
    return Either.left(
      errorContent("Duplicate companion owner in battle start.", {
        code: "DUPLICATE_BATTLE_COMPANION_OWNER",
        characterId: duplicateOwner.ownerCharacterId,
      }),
    );
  }
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
