import {
  battlePresentedSnapshot,
  battleAdmittedSpellPresentations,
  discoverBattleActs,
  startBattle,
  type BattleCreatureInit,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  composeBattleRoster,
  composeBattleCompanionRoster,
  type BattleRosterAdmission,
  type BattleRosterEntries,
  type BattleRosterEntry,
  type BattleRosterIssue,
} from "@dnd/character-battle-runtime";
import { Either, Match, Option } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import {
  type BattleCombatantToolInput,
  type CharacterSessionCombatantToolInput,
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
  battleCompanionRosterIssuePayload,
  battleRosterIssuePayload,
} from "./battle-start-failure.ts";

export type StartableCharacterSessionCombatant = {
  readonly index: number;
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
  readonly issues: readonly BattleRosterIssue[];
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

  const session =
    combatants.creatureInits.length === 0
      ? undefined
      : startBattle({
          battleId: input.battleId,
          combatants: combatants.creatureInits,
          ownerPathForCombatant: (combatant) => {
            const ownerPath = combatants.ownerPaths.get(combatant.combatantId);
            return ownerPath ?? ["battleInitialization"];
          },
        });
  const companionRoster = composeBattleCompanionRoster({
    session:
      session !== undefined && Either.isRight(session)
        ? session.right
        : undefined,
    owners: combatants.characterSessions.map(
      ({ character, session: characterSession }) => ({
        characterId: character.characterId,
        combatantId: character.combatantId,
        sheet: characterSession,
      }),
    ),
    requests: input.companionAdmissions,
    unitLibrary: root.unitLibrary,
    initialCombatantOrder,
    statBlockCatalog: root.statBlockCatalog,
  });
  const issues = [
    ...combatants.issues.flatMap((issue) => battleRosterIssuePayload(issue)),
    ...(session !== undefined && Either.isLeft(session)
      ? battleRuntimeIssuePayload(session.left)
      : []),
    ...companionRoster.issues.flatMap(battleCompanionRosterIssuePayload),
  ];
  if (issues.length > 0) return battleStartIssuesContent(issues);
  const admittedSession = companionRoster.session;
  if (admittedSession === undefined) {
    return battleStartIssuesContent([
      {
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: ["battleInitialization"],
        issueTag: "battleStateInitIssue",
        message: "Battle start did not produce a runtime session.",
      },
    ]);
  }
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
  readonly initialCombatants: StartBattleToolInput["initialCombatants"];
}): StartableBattleCombatants {
  const characterSessionsByIndex = new Map<
    number,
    StartableCharacterSessionCombatant
  >();
  const [firstCombatant, ...restCombatants] = input.initialCombatants;
  const firstEntry = rosterEntryForToolCombatant({
    root: input.root,
    combatant: firstCombatant,
    index: 0,
  });
  if (firstEntry.session !== undefined) {
    characterSessionsByIndex.set(0, {
      ...firstEntry.session,
      index: 0,
    });
  }
  const restEntries = restCombatants.map((combatant, offset) => {
    const index = offset + 1;
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
  const entries: BattleRosterEntries = [firstEntry.rosterEntry, ...restEntries];
  const composition = composeBattleRoster(entries);
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
  readonly ownerPath?: readonly (string | number)[];
}): Either.Either<BattleRosterAdmission, ToolError> {
  const rosterEntry = rosterEntryForToolCombatant({
    root: input.root,
    combatant: input.combatant,
    index: 0,
  });
  const composition = composeBattleRoster([rosterEntry.rosterEntry]);
  if (composition.issues.length > 0) {
    return Either.left(
      battleStartIssuesContent(
        composition.issues.flatMap((issue) =>
          battleRosterIssuePayload(
            issue,
            () => input.ownerPath ?? ["initialCombatants", 0],
          ),
        ),
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
  readonly rosterEntry: BattleRosterEntry;
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
