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
import { Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { type StartBattleToolInput } from "./start-battle-tool-input.ts";
import type { ToolError } from "./schema-codec.ts";
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
import {
  rosterEntryForToolCombatant,
  type CharacterDisplayRosterIssue,
  type StartableCharacterSessionCombatant,
} from "./start-battle-roster-entry.ts";

export type { StartableCharacterSessionCombatant } from "./start-battle-roster-entry.ts";

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
      input.session !== undefined && Result.isSuccess(input.session)
        ? input.session.success
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
    ...(session !== undefined && Result.isFailure(session)
      ? battleRuntimeIssuePayload(session.failure)
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
  if (Result.isFailure(combatants)) return combatants.failure;

  if (input.initiativeMode === "initialSetup") {
    return startInitialInitiativeSetup(root, input, combatants.success);
  }
  return completeStartBattle(root, input, combatants.success);
}

function startableBattleCombatants(input: {
  readonly root: McpPlaySessionRoot;
  readonly initialCombatants: StartBattleToolInput["initialCombatants"];
  readonly companionAdmissions: StartBattleToolInput["companionAdmissions"];
}): Result.Result<StartableBattleCombatants, ToolError> {
  const projectedCharacterSessions: StartableCharacterSessionCombatant[] = [];
  const [firstCombatant, ...restCombatants] = input.initialCombatants;
  const firstEntry = rosterEntryForToolCombatant({
    root: input.root,
    combatant: firstCombatant,
    index: 0,
  });
  appendAvailableCharacterSession(projectedCharacterSessions, firstEntry, 0);
  const restEntries: BattleRosterEntry[] = [];
  const restProjectionIssues: CharacterDisplayRosterIssue[] = [];
  for (const [offset, combatant] of restCombatants.entries()) {
    const index = offset + 1;
    const entry = rosterEntryForToolCombatant({
      root: input.root,
      combatant,
      index,
    });
    if (Result.isFailure(entry)) {
      restProjectionIssues.push(entry.failure);
      continue;
    }
    appendAvailableCharacterSession(projectedCharacterSessions, entry, index);
    restEntries.push(entry.success.rosterEntry);
  }
  if (Result.isFailure(firstEntry)) {
    return Result.fail(
      battleStartIssuesContent([firstEntry.failure, ...restProjectionIssues]),
    );
  }
  if (restProjectionIssues.length > 0) {
    return Result.fail(battleStartIssuesContent(restProjectionIssues));
  }
  const entries: BattleRosterEntries = [
    firstEntry.success.rosterEntry,
    ...restEntries,
  ];
  const composition = composeBattleRoster(entries);
  const admissions = battleRosterAdmissions(composition);
  const ownerPaths = new Map<CombatantId, readonly (string | number)[]>();
  for (const admission of admissions) {
    ownerPaths.set(admission.combatant.combatantId, [
      "initialCombatants",
      admission.index,
    ]);
  }
  return Result.succeed({
    composition,
    characterSessions: projectedCharacterSessions.filter((session) =>
      admissions.some(
        (admission) =>
          admission.kind === "characterSheet" &&
          admission.index === session.index,
      ),
    ),
    ownerPaths,
    initialCombatantOrder: initialCombatantOrderForStartInput({
      initialCombatants: input.initialCombatants,
      companionAdmissions: input.companionAdmissions,
    }),
  });
}

function appendAvailableCharacterSession(
  sessions: StartableCharacterSessionCombatant[],
  entry: ReturnType<typeof rosterEntryForToolCombatant>,
  index: number,
): void {
  if (Result.isFailure(entry) || entry.success.tag !== "availableCharacter") {
    return;
  }
  sessions.push({ ...entry.success.session, index });
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
