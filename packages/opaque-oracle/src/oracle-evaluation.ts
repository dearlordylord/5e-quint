import {
  characterCreationBatchFact,
  characterDraftId,
  createCharacterDraft,
  creationFrontierFact,
  discoverCreationHoles,
  fillCreationHoles,
  type CharacterDraftId,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  startBattleFromCharacterBattleRoster,
  type BattleCreatureInitIssue,
  type CharacterBattleSpellAccessProjectionIssue,
  type CharacterBattleEncounterParticipant,
  type CharacterBattleRuntimeEntryIssue,
} from "@dnd/character-battle-runtime";
import {
  battleId,
  battleMechanicalFrontier,
  discoverBattleActs,
  initiativeScore,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  snapshotBattle,
  type BattleFill,
  type BattleMechanicalFrontier,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleStateInitIssue,
} from "@dnd/battle-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  freshCharacterSheetProjection,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import { Hp, Index, resourceCount } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Either, Match, Option } from "effect";

import { canonicalizeStringSet } from "./oracle-canonical.ts";
import {
  OracleBattleCheckpointSchema,
  OracleTraceSchema,
  type FreshSheetInput,
  type OracleBattleActsFrontier,
  type OracleBattleAttempt,
  type OracleBattleCheckpoint,
  type OracleBattleCreatureInitIssue,
  type OracleBattleEntryRejection,
  type OracleBattleNonterminalFrontier,
  type OracleBattleProjectionIssue,
  type OracleBattleRosterEntry,
  type OracleBattleStateInitLeafIssue,
  type OracleBattleStateInitIssue,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleTrace,
  type OracleTraceStep,
} from "./oracle-case-trace-schema.ts";

export type OracleEvaluationServices = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type OracleCaseEvaluationInput = OracleEvaluationServices & {
  readonly case: OracleCase;
};

export const ORACLE_CHARACTER_DRAFT_ID: CharacterDraftId = characterDraftId(
  "oracle:character-draft",
);
export const ORACLE_CHARACTER_SHEET_ID: CharacterSheetId =
  characterSheetId("oracle:character");
export const ORACLE_BATTLE_ID = battleId("oracle:battle");

export function evaluateOracleCase(
  input: OracleCaseEvaluationInput,
): OracleTrace {
  const { case: oracleCase, unitLibrary, statBlockCatalog } = input;
  const draft = createCharacterDraft({ draftId: ORACLE_CHARACTER_DRAFT_ID });
  const initialFrontier = creationFrontierFact(
    discoverCreationHoles({ draft, unitLibrary }),
  );
  const steps: [OracleTraceStep, ...OracleTraceStep[]] = [
    { tag: "creationStarted", frontier: initialFrontier },
  ];
  let currentDraft = draft;

  for (const [
    batchIndex,
    fillBatch,
  ] of oracleCase.creation.fillBatches.entries()) {
    const result = fillCreationHoles({
      draft: currentDraft,
      unitLibrary,
      expectedRevision: currentDraft.revision,
      fills: fillBatch,
    });
    const projected = characterCreationBatchFactOrDefect(result);

    if (projected.tag === "rejected") {
      steps.push({
        tag: "creationFillRejected",
        issues: projected.issues,
      });
      return oracleTrace(steps);
    }

    currentDraft = result.draft;
    if (projected.finalization.tag === "incomplete") {
      steps.push({
        tag: "creationProgressed",
        frontier: projected.frontier,
      });
      continue;
    }
    if (projected.finalization.tag === "invalid") {
      steps.push({
        tag: "creationFinalizationRejected",
        issues: projected.finalization.issues,
      });
      return oracleTrace(steps);
    }

    steps.push({ tag: "characterBuilt", build: projected.finalization.build });
    if (batchIndex + 1 < oracleCase.creation.fillBatches.length) {
      steps.push({
        tag: "workflowRejected",
        reason: {
          code: "creationInputSurplus",
          firstUnusedBatchIndex: Index(batchIndex + 1),
        },
      });
      return oracleTrace(steps);
    }

    return appendFreshSheetAndBattleSteps(
      steps,
      result.finalization.tag === "ready"
        ? result.finalization.build
        : defect("ready finalization was narrowed inconsistently"),
      oracleCase.sheet,
      oracleCase.battle.roster,
      oracleCase.battle.attempts,
      unitLibrary,
      statBlockCatalog,
    );
  }

  steps.push({
    tag: "workflowRejected",
    reason: { code: "creationInputExhausted" },
  });
  return oracleTrace(steps);
}

function defect(message: string): never {
  throw new Error(`Opaque Oracle defect: ${message}`);
}

export function evaluateOracleBatch(input: {
  readonly batch: OracleEvaluationBatch;
  readonly services: OracleEvaluationServices;
}): readonly OracleTrace[] {
  return input.batch.cases.map((oracleCase) =>
    evaluateOracleCase({ ...input.services, case: oracleCase }),
  );
}

function characterCreationBatchFactOrDefect(
  result: Parameters<typeof characterCreationBatchFact>[0],
) {
  const projected = characterCreationBatchFact(result);
  if (Either.isLeft(projected)) {
    throw new Error(
      `Character Creation fact projection defect: ${String(projected.left)}`,
    );
  }
  return projected.right;
}

function appendFreshSheetAndBattleSteps(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
  build: CharacterBuild,
  sheetInput: FreshSheetInput,
  rosterInput: readonly OracleBattleRosterEntry[],
  attemptsInput: readonly OracleBattleAttempt[],
  unitLibrary: UnitCatalog,
  statBlockCatalog: StatBlockCatalog,
): OracleTrace {
  const freshSheet = createFreshCharacterSheet({
    characterId: ORACLE_CHARACTER_SHEET_ID,
    build,
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary,
    ...(sheetInput.tag === "wildShapeKnownForms"
      ? {
          druidWildShapeKnownFormStatBlockIds: canonicalizeStringSet(
            sheetInput.statBlockIds,
          ),
          statBlockCatalog,
        }
      : {}),
  });
  if (Either.isLeft(freshSheet)) {
    steps.push({
      tag: "characterSheetConstructionRejected",
      issues: freshSheet.left,
    });
    return oracleTrace(steps);
  }

  steps.push({
    tag: "characterSheetConstructed",
    sheet: freshCharacterSheetProjection(freshSheet.right),
  });

  const roster = resolveBattleRoster({
    roster: rosterInput,
    sheet: freshSheet.right,
    statBlockCatalog,
  });
  if (Either.isLeft(roster)) {
    steps.push(roster.left);
    return oracleTrace(steps);
  }

  const entry = startBattleFromCharacterBattleRoster({
    battleId: ORACLE_BATTLE_ID,
    roster: roster.right,
    unitLibrary,
    statBlockCatalog,
  });
  if (Either.isLeft(entry)) {
    steps.push(battleEntryRejection(entry.left));
    return oracleTrace(steps);
  }

  const snapshot = snapshotBattle(entry.right.session.state);
  const initialFrontier = battleActsFrontier(entry.right.session);
  steps.push({
    tag: "battleEntered",
    checkpoint: strippedBattleCheckpoint(snapshot),
    frontier: initialFrontier,
  });
  return appendBattleAttempts(
    steps,
    {
      session: entry.right.session,
      checkpoint: strippedBattleCheckpoint(snapshot),
      frontier: initialFrontier,
    },
    attemptsInput,
    statBlockCatalog,
  );
}

type OracleBattleActiveContinuation = {
  readonly session: BattleRuntimeSession;
  readonly checkpoint: OracleBattleCheckpoint;
  readonly frontier: OracleBattleNonterminalFrontier;
};

type OracleBattleTerminalContinuation = {
  readonly session: BattleRuntimeSession;
  readonly frontier: { readonly kind: "terminal" };
};

type OracleBattleContinuation =
  | OracleBattleActiveContinuation
  | OracleBattleTerminalContinuation;

type OracleBattleResolutionFrontier =
  | OracleBattleActsFrontier
  | { readonly kind: "terminal" };

function isOracleBattleActiveContinuation(
  continuation: OracleBattleContinuation,
): continuation is OracleBattleActiveContinuation {
  return continuation.frontier.kind !== "terminal";
}

function appendBattleAttempts(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
  initial: OracleBattleContinuation,
  attempts: readonly OracleBattleAttempt[],
  statBlockCatalog: StatBlockCatalog,
): OracleTrace {
  let current = initial;
  for (const [attemptIndex, attempt] of attempts.entries()) {
    if (!isOracleBattleActiveContinuation(current)) {
      steps.push({
        tag: "workflowRejected",
        reason: {
          code: "battleInputSurplus",
          firstUnusedAttemptIndex: Index(attemptIndex),
        },
      });
      return oracleTrace(steps);
    }

    const result = resolveBattleAttempt({
      attempt,
      session: current.session,
      statBlockCatalog,
    });
    current = appendBattleAttemptResult({
      current,
      attempt,
      result,
      steps,
    });
  }
  return oracleTrace(steps);
}

function appendBattleAttemptResult(input: {
  readonly current: OracleBattleActiveContinuation;
  readonly attempt: OracleBattleAttempt;
  readonly result: BattleRuntimeResolutionResult;
  readonly steps: [OracleTraceStep, ...OracleTraceStep[]];
}): OracleBattleContinuation {
  return Match.value(input.result).pipe(
    Match.discriminatorsExhaustive("tag")({
      invalid: (result) => {
        input.steps.push({
          tag: "battleAttemptRejected",
          checkpoint: input.current.checkpoint,
          frontier: input.current.frontier,
          reason: result.reason,
        });
        return input.current;
      },
      needsHoles: (result) => {
        const projected = battleMechanicalFrontier({
          result,
          acceptedFills: acceptedFillsForAttempt(input.attempt),
        });
        if (Either.isLeft(projected)) {
          return defect(
            `Battle mechanical frontier projection defect: ${projected.left.tag}`,
          );
        }
        const nextCheckpoint = strippedBattleCheckpoint(result.snapshot);
        const nextSession = battleSessionAfterNeedsHoles({
          attempt: input.attempt,
          current: input.current,
          frontier: projected.right,
          result,
        });
        const next = {
          session: nextSession,
          checkpoint: nextCheckpoint,
          frontier: projected.right,
        } satisfies OracleBattleActiveContinuation;
        input.steps.push({
          tag: "battleProgressed",
          checkpoint: nextCheckpoint,
          frontier: projected.right,
        });
        return next;
      },
      resolved: (result) => {
        const nextCheckpoint = strippedBattleCheckpoint(result.snapshot);
        const nextFrontier = battleFrontierAfterResolution(result.session);
        return Match.value(nextFrontier).pipe(
          Match.discriminatorsExhaustive("kind")({
            acts: (frontier) => {
              const next = {
                session: result.session,
                checkpoint: nextCheckpoint,
                frontier,
              } satisfies OracleBattleActiveContinuation;
              input.steps.push({
                tag: "battleProgressed",
                checkpoint: nextCheckpoint,
                frontier,
              });
              return next;
            },
            terminal: () => {
              const next = {
                session: result.session,
                frontier: { kind: "terminal" as const },
              } satisfies OracleBattleTerminalContinuation;
              input.steps.push({
                tag: "battleResolved",
                checkpoint: nextCheckpoint,
              });
              return next;
            },
          }),
        );
      },
    }),
  );
}

function battleSessionAfterNeedsHoles(input: {
  readonly attempt: OracleBattleAttempt;
  readonly current: OracleBattleActiveContinuation;
  readonly frontier: BattleMechanicalFrontier;
  readonly result: Extract<
    BattleRuntimeResolutionResult,
    { readonly tag: "needsHoles" }
  >;
}): BattleRuntimeSession {
  return Match.value(input.attempt).pipe(
    Match.discriminatorsExhaustive("kind")({
      ordinarySubject: () =>
        Match.value(input.frontier).pipe(
          Match.discriminatorsExhaustive("kind")({
            ordinaryHoles: () => input.current.session,
            interruptDecision: () => input.result.session,
          }),
        ),
      interruptDecision: () => input.result.session,
    }),
  );
}

function resolveBattleAttempt(input: {
  readonly attempt: OracleBattleAttempt;
  readonly session: BattleRuntimeSession;
  readonly statBlockCatalog: StatBlockCatalog;
}): BattleRuntimeResolutionResult {
  return Match.value(input.attempt).pipe(
    Match.discriminatorsExhaustive("kind")({
      ordinarySubject: (attempt) =>
        resolveBattleRuntimeSubject({
          session: input.session,
          subject: attempt.subject,
          fills: attempt.fills,
          statBlockCatalog: input.statBlockCatalog,
        }),
      interruptDecision: (attempt) =>
        resolveBattleRuntimeInterrupt({
          session: input.session,
          fill: attempt.fill,
        }),
    }),
  );
}

function acceptedFillsForAttempt(
  attempt: OracleBattleAttempt,
): readonly BattleFill[] {
  return Match.value(attempt).pipe(
    Match.discriminatorsExhaustive("kind")({
      ordinarySubject: ({ fills }) => fills,
      interruptDecision: ({ fill }) =>
        Match.value(fill.value).pipe(
          Match.discriminatorsExhaustive("kind")({
            decline: () => [],
            resolve: ({ choice }) => choice.fills,
          }),
        ),
    }),
  );
}

function battleActsFrontier(
  session: BattleRuntimeSession,
): OracleBattleActsFrontier {
  const acts = discoverBattleActs(session).map(({ subject }) => subject);
  const [firstAct, ...remainingActs] = acts;
  if (firstAct === undefined) {
    return defect("Battle act discovery produced an empty frontier");
  }
  return { kind: "acts", acts: [firstAct, ...remainingActs] };
}

function battleFrontierAfterResolution(
  session: BattleRuntimeSession,
): OracleBattleResolutionFrontier {
  const acts = discoverBattleActs(session).map(({ subject }) => subject);
  const [firstAct, ...remainingActs] = acts;
  return firstAct === undefined
    ? { kind: "terminal" }
    : { kind: "acts", acts: [firstAct, ...remainingActs] };
}

function resolveBattleRoster(input: {
  readonly roster: readonly OracleBattleRosterEntry[];
  readonly sheet: Parameters<typeof freshCharacterSheetProjection>[0];
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  readonly CharacterBattleEncounterParticipant[],
  OracleBattleEntryRejection
> {
  type OracleBattleEntryIssue = OracleBattleEntryRejection["issues"][number];
  const missingStatBlocks: OracleBattleEntryIssue[] = [];
  const participants: CharacterBattleEncounterParticipant[] = [];

  for (const entry of input.roster) {
    const ammunitionStocks = entry.ammunitionStocks.map((stock) => ({
      ammunition: stock.ammunition,
      remaining: resourceCount(stock.remaining),
    }));
    if (entry.origin === "characterSheet") {
      participants.push({
        origin: "characterSheet",
        sheet: input.sheet,
        combatantId: entry.combatantId,
        displayName: entry.displayName,
        initiative: initiativeScore(entry.initiative),
        ammunitionStocks,
      });
      continue;
    }

    const statBlock = input.statBlockCatalog.getStatBlock(entry.statBlockId);
    if (Option.isNone(statBlock)) {
      missingStatBlocks.push({
        tag: "statBlockUnavailable",
        statBlockId: entry.statBlockId,
      });
      continue;
    }
    participants.push({
      origin: "statBlock",
      combatantId: entry.combatantId,
      statBlock: statBlock.value,
      initiative: initiativeScore(entry.initiative),
      ammunitionStocks,
      conditions: entry.conditions,
      ...(entry.currentHp === undefined
        ? {}
        : { currentHp: Hp(entry.currentHp) }),
      tempHp: Hp(entry.tempHp),
    });
  }

  if (missingStatBlocks.length > 0) {
    const [firstMissing, ...remainingMissing] = missingStatBlocks;
    if (firstMissing === undefined)
      return defect("missing Stat Block issue accumulation was empty");
    return Either.left({
      tag: "battleEntryRejected",
      issues: [firstMissing, ...remainingMissing],
    });
  }
  return Either.right(participants);
}

function battleEntryRejection(
  entry: CharacterBattleRuntimeEntryIssue,
): OracleBattleEntryRejection {
  const issue = entry.issue;
  if (issue.tag === "characterBattleEncounterProjectionIssues") {
    const projectionIssues = issue.issues.map(stripBattleProjectionIssue);
    const [firstProjectionIssue, ...remainingProjectionIssues] =
      projectionIssues;
    if (firstProjectionIssue === undefined)
      return defect("Battle projection issue accumulation was empty");
    return {
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "characterBattleEncounterProjectionIssues",
          issues: [firstProjectionIssue, ...remainingProjectionIssues],
        },
      ],
    };
  }
  if (issue.tag === "characterBattleEncounterEmptyRoster") {
    return { tag: "battleEntryRejected", issues: [issue] };
  }
  if (issue.tag === "battleCreatureInitIssue") {
    return {
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "battleCreatureInitRejected",
          issue: stripBattleCreatureInitIssue(issue),
        },
      ],
    };
  }
  return {
    tag: "battleEntryRejected",
    issues: [
      {
        tag: "battleStateInitRejected",
        issue: stripBattleStateInitIssue(issue),
      },
    ],
  };
}

function stripBattleProjectionIssue(
  projection: Extract<
    CharacterBattleRuntimeEntryIssue["issue"],
    { readonly tag: "characterBattleEncounterProjectionIssues" }
  >["issues"][number],
): OracleBattleProjectionIssue {
  if (projection.origin === "characterSheet") {
    return {
      tag: "characterBattleEncounterProjectionIssue",
      origin: "characterSheet",
      combatantId: projection.combatantId,
      issue: stripBattleCreatureInitIssue(projection.issue),
    };
  }
  return {
    tag: "characterBattleEncounterProjectionIssue",
    origin: "statBlock",
    combatantId: projection.combatantId,
    issue: stripBattleStateInitIssue(projection.issue),
  };
}

function stripBattleCreatureInitIssue(
  issue: BattleCreatureInitIssue,
): OracleBattleCreatureInitIssue {
  return {
    tag: "battleCreatureInitIssue" as const,
    ...(issue.spellAccessIssues === undefined
      ? {}
      : {
          spellAccessIssues: issue.spellAccessIssues.map(
            stripSpellAccessProjectionIssue,
          ),
        }),
  };
}

function stripSpellAccessProjectionIssue(
  issue: CharacterBattleSpellAccessProjectionIssue,
) {
  const { message: _message, ...stableIssue } = issue;
  void _message;
  return stableIssue;
}

function stripBattleStateInitIssue(
  issue: BattleStateInitIssue,
): OracleBattleStateInitIssue {
  if (issue.tag === "battleStateInitIssues") {
    return {
      tag: "battleStateInitIssues" as const,
      issues: issue.issues.map(stripBattleStateInitLeafIssue),
    };
  }
  if (issue.tag === "weaponLoadoutMismatch") return issue;
  return { tag: "battleStateInitIssue" as const };
}

function stripBattleStateInitLeafIssue(
  issue: Extract<
    BattleStateInitIssue,
    | { readonly tag: "battleStateInitIssue" }
    | { readonly tag: "weaponLoadoutMismatch" }
  >,
): OracleBattleStateInitLeafIssue {
  if (issue.tag === "weaponLoadoutMismatch") return issue;
  return { tag: "battleStateInitIssue" };
}

function strippedBattleCheckpoint(
  snapshot: ReturnType<typeof snapshotBattle>,
): OracleBattleCheckpoint {
  const combatants = snapshot.combatants.map((combatant) => ({
    combatantId: combatant.combatantId,
    origin: { kind: combatant.origin.kind },
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: combatant.armorClass,
    size: combatant.size,
    conditions: combatant.conditions,
  }));
  const [firstCombatant, ...remainingCombatants] = combatants;
  if (firstCombatant === undefined)
    return defect("Battle snapshot combatant projection was empty");
  return OracleBattleCheckpointSchema.make({
    round: snapshot.round,
    currentActorId: snapshot.currentActorId,
    turnOrder: snapshot.turnOrder,
    combatants: [firstCombatant, ...remainingCombatants],
  });
}

function oracleTrace(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
): OracleTrace {
  return OracleTraceSchema.make({ steps });
}
