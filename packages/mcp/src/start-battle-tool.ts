import { startBattle, type CombatantId } from "@dnd/battle-runtime";
import {
  composeBattleRoster,
  composeBattleCompanionRoster,
  type BattleRosterAdmission,
  type BattleRosterComposition,
  type BattleRosterEntries,
  type BattleRosterEntry,
  type BattleRosterIssue,
} from "@dnd/character-battle-runtime";
import { Either, Match, Option } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
import {
  type BattleCombatantToolInput,
  type CharacterSessionCombatantToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { type ToolError } from "./schema-codec.ts";
import { startInitialInitiativeSetup } from "./initial-initiative-setup-start.ts";
import {
  battleRuntimeIssuePayload,
  battleStartIssuesContent,
  battleCompanionRosterIssuePayload,
  battleRosterIssuePayload,
} from "./battle-start-failure.ts";
import {
  activeBattleStartError,
  commitActiveBattleStart,
} from "./start-battle-lifecycle.ts";

export type StartableCharacterSessionCombatant = {
  readonly index: number;
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type StartableBattleCombatants = {
  readonly composition: BattleRosterComposition;
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
  readonly ownerPaths: ReadonlyMap<CombatantId, readonly (string | number)[]>;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
};

function battleRuntimeSessionForStart(
  input: StartBattleToolInput,
  combatants: StartableBattleCombatants,
): ReturnType<typeof startBattle> | undefined {
  const admissions = battleRosterAdmissions(combatants.composition);
  if (admissions.length === 0) return undefined;
  return startBattle({
    battleId: input.battleId,
    combatants: admissions.map(({ combatant }) => combatant),
    ownerPathForCombatant: (combatant) => {
      const ownerPath = combatants.ownerPaths.get(combatant.combatantId);
      return ownerPath ?? ["battleInitialization", "global"];
    },
  });
}

function composeStartBattleCompanions(input: {
  readonly root: McpPlaySessionRoot;
  readonly startInput: StartBattleToolInput;
  readonly combatants: StartableBattleCombatants;
  readonly session: ReturnType<typeof startBattle> | undefined;
}) {
  return composeBattleCompanionRoster({
    session:
      input.session !== undefined && Either.isRight(input.session)
        ? input.session.right
        : undefined,
    owners: input.combatants.characterSessions.map(
      ({ index, character, session: characterSession }) => ({
        index,
        characterId: character.characterId,
        combatantId: character.combatantId,
        sheet: characterSession,
      }),
    ),
    requests: input.startInput.companionAdmissions,
    unitLibrary: input.root.unitLibrary,
    initialCombatantOrder: input.combatants.initialCombatantOrder,
    statBlockCatalog: input.root.statBlockCatalog,
  });
}

function completeStartBattle(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
  combatants: StartableBattleCombatants,
) {
  const session = battleRuntimeSessionForStart(input, combatants);
  const companionRoster = composeStartBattleCompanions({
    root,
    startInput: input,
    combatants,
    session,
  });
  const issues = [
    ...battleRosterIssues(combatants.composition).flatMap((issue) =>
      battleRosterIssuePayload(issue),
    ),
    ...(session !== undefined && Either.isLeft(session)
      ? battleRuntimeIssuePayload(session.left)
      : []),
    ...battleCompanionIssues(companionRoster).flatMap(
      battleCompanionRosterIssuePayload,
    ),
  ];
  if (issues.length > 0) return battleStartIssuesContent(issues);
  return completeAdmittedCompanionStart({
    root,
    combatants,
    companionRoster,
  });
}

function completeAdmittedCompanionStart(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatants: StartableBattleCombatants;
  readonly companionRoster: ReturnType<typeof composeBattleCompanionRoster>;
}) {
  return Match.value(input.companionRoster).pipe(
    Match.when({ tag: "admitted" }, ({ session: admittedSession }) =>
      commitActiveBattleStart({
        root: input.root,
        session: admittedSession,
        characterSessions: input.combatants.characterSessions,
      }),
    ),
    Match.when({ tag: "rejected" }, ({ issues: companionIssues }) =>
      battleStartIssuesContent(
        companionIssues.flatMap(battleCompanionRosterIssuePayload),
      ),
    ),
    Match.when({ tag: "dependentUnavailable" }, ({ issues: companionIssues }) =>
      battleStartIssuesContent(
        companionIssues.flatMap(battleCompanionRosterIssuePayload),
      ),
    ),
    Match.exhaustive,
  );
}

export function handleStartBattleToolCall(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
) {
  const activeBattleError = activeBattleStartError(
    root.sessionStore.battleState,
  );
  if (activeBattleError !== null) return activeBattleError;

  const combatants = startableBattleCombatants({
    root,
    initialCombatants: input.initialCombatants,
    companionAdmissions: input.companionAdmissions,
  });

  if (input.initiativeMode === "initialSetup") {
    return startInitialInitiativeSetup(root, input, combatants);
  }
  return completeStartBattle(root, input, combatants);
}

function startableBattleCombatants(input: {
  readonly root: McpPlaySessionRoot;
  readonly initialCombatants: StartBattleToolInput["initialCombatants"];
  readonly companionAdmissions: StartBattleToolInput["companionAdmissions"];
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
  for (const admission of battleRosterAdmissions(composition)) {
    ownerPaths.set(admission.combatant.combatantId, [
      "initialCombatants",
      admission.index,
    ]);
  }
  return {
    composition,
    characterSessions: battleRosterAdmissions(composition).flatMap(
      (admission) => {
        if (admission.kind !== "characterSheet") return [];
        const session = characterSessionsByIndex.get(admission.index);
        return session === undefined ? [] : [session];
      },
    ),
    ownerPaths,
    initialCombatantOrder: initialCombatantOrderForStartInput({
      initialCombatants: input.initialCombatants,
      companionAdmissions: input.companionAdmissions,
    }),
  };
}

function battleRosterAdmissions(
  composition: BattleRosterComposition,
): readonly BattleRosterAdmission[] {
  return Match.value(composition).pipe(
    Match.when({ tag: "admitted" }, ({ admissions }) => admissions),
    Match.when({ tag: "rejected" }, ({ admissions }) => admissions),
    Match.exhaustive,
  );
}

function battleRosterIssues(
  composition: BattleRosterComposition,
): readonly BattleRosterIssue[] {
  return Match.value(composition).pipe(
    Match.when({ tag: "admitted" }, () => []),
    Match.when({ tag: "rejected" }, ({ issues }) => issues),
    Match.exhaustive,
  );
}

function battleCompanionIssues(
  composition: ReturnType<typeof composeBattleCompanionRoster>,
): readonly Parameters<typeof battleCompanionRosterIssuePayload>[0][] {
  return Match.value(composition).pipe(
    Match.when({ tag: "admitted" }, () => []),
    Match.when({ tag: "rejected" }, ({ issues }) => issues),
    Match.when({ tag: "dependentUnavailable" }, ({ issues }) => issues),
    Match.exhaustive,
  );
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
  if (composition.tag === "rejected") {
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
  return Either.right(composition.admissions[0]);
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
  input: Pick<
    StartBattleToolInput,
    "initialCombatants" | "companionAdmissions"
  >,
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
