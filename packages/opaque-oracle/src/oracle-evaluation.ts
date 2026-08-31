import {
  characterCreationBatchFact,
  characterBuildDisplayName,
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
  composeBattleRoster,
  type BattleRosterComposition,
  type BattleRosterEntry,
  type BattleRosterIssue,
} from "@dnd/character-battle-runtime";
import {
  battleId,
  discoverBattleActs,
  startBattle,
  initiativeScore,
  settleBattleRuntimeTransaction,
  snapshotBattle,
  type BattlePendingTransaction,
  type BattleRuntimeSession,
  type BattleInitializationIssue,
  type BattleInitializationLeafIssue,
} from "@dnd/battle-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  freshCharacterSheetProjection,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import { AMMUNITION_KINDS, type AmmunitionKind } from "@dnd/shared/game-facts";
import { hasDuplicateStructuralValues } from "@dnd/shared/structural-value";
import { Hp, Index, resourceCount } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Result, Match, Option } from "effect";

import {
  canonicalizeStringSet,
  compareCodePoints,
} from "./oracle-canonical.ts";
import {
  OracleBattleCheckpointSchema,
  OracleTraceSchema,
  type FreshSheetInput,
  type OracleBattleActsFrontier,
  type OracleBattleAttempt,
  type OracleBattleCheckpoint,
  type OracleBattleEnteredCheckpoint,
  type OracleBattleCreatureInitIssue,
  type OracleBattleEntryRejection,
  type OracleBattleAttemptSegment,
  type OracleBattleContinuation,
  type OracleBattleAttemptRejectionReason,
  type OracleBattleNonterminalFrontier,
  type OracleBattleProjectionIssue,
  type OracleBattleRoster,
  type OracleBattleStatBlockRosterEntry,
  type OracleBattleCharacterSheetRosterEntry,
  type OracleAmmunitionStocks,
  type OracleBattleStateInitLeafIssue,
  type OracleBattleStateInitIssue,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleSheetOutcome,
  type OracleTrace,
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

/**
 * Evaluate one reproducible calibration case through the production workflow.
 * The returned trace is a mechanics-relevant observation for Target-owned
 * conformance tests, not a conformance verdict or replacement for RAW and QNT.
 */
export function evaluateOracleCase(
  input: OracleCaseEvaluationInput,
): OracleTrace {
  const { case: oracleCase, unitLibrary, statBlockCatalog } = input;
  const draft = createCharacterDraft({ draftId: ORACLE_CHARACTER_DRAFT_ID });
  const initialFrontier = creationFrontierFact(
    discoverCreationHoles({ draft, unitLibrary }),
  );
  const progression: Array<ReturnType<typeof creationFrontierFact>> = [];
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
      return oracleTrace({
        started: initialFrontier,
        progression,
        outcome: { tag: "fillRejected", issues: projected.issues },
      });
    }

    currentDraft = result.draft;
    if (projected.finalization.tag === "incomplete") {
      progression.push(projected.frontier);
      continue;
    }
    if (projected.finalization.tag === "invalid") {
      return oracleTrace({
        started: initialFrontier,
        progression,
        outcome: {
          tag: "finalizationRejected",
          issues: projected.finalization.issues,
        },
      });
    }

    const build = projected.finalization.build;
    if (batchIndex + 1 < oracleCase.creation.fillBatches.length) {
      return oracleTrace({
        started: initialFrontier,
        progression,
        outcome: {
          tag: "inputSurplus",
          build,
          index: Index(batchIndex + 1),
        },
      });
    }

    return oracleTrace({
      started: initialFrontier,
      progression,
      outcome: {
        tag: "built",
        build,
        sheet: appendFreshSheetAndBattle(
          result.finalization.tag === "ready"
            ? result.finalization.build
            : defect("ready finalization was narrowed inconsistently"),
          oracleCase.sheet,
          oracleCase.battle.roster,
          oracleCase.battle.attempts,
          unitLibrary,
          statBlockCatalog,
        ),
      },
    });
  }

  return oracleTrace({
    started: initialFrontier,
    progression,
    outcome: { tag: "inputExhausted" },
  });
}

function defect(message: string): never {
  throw new Error(`Opaque Oracle defect: ${message}`);
}

export function evaluateOracleBatch(input: {
  readonly batch: OracleEvaluationBatch;
  readonly services: OracleEvaluationServices;
}): readonly [OracleTrace, ...OracleTrace[]] {
  const traces = input.batch.cases.map((oracleCase) =>
    evaluateOracleCase({ ...input.services, case: oracleCase }),
  );
  const [firstTrace, ...remainingTraces] = traces;
  if (firstTrace === undefined) {
    throw new Error("Opaque Oracle defect: nonempty batch produced no traces.");
  }
  return [firstTrace, ...remainingTraces];
}

function characterCreationBatchFactOrDefect(
  result: Parameters<typeof characterCreationBatchFact>[0],
) {
  const projected = characterCreationBatchFact(result);
  if (Result.isFailure(projected)) {
    throw new Error(
      `Character Creation fact projection defect: ${String(projected.failure)}`,
    );
  }
  return projected.success;
}

function appendFreshSheetAndBattle(
  build: CharacterBuild,
  sheetInput: FreshSheetInput,
  rosterInput: OracleBattleRoster,
  attemptsInput: readonly OracleBattleAttempt[],
  unitLibrary: UnitCatalog,
  statBlockCatalog: StatBlockCatalog,
): OracleSheetOutcome {
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
  if (Result.isFailure(freshSheet)) {
    return { tag: "rejected", issues: freshSheet.failure };
  }

  const sheet = freshCharacterSheetProjection(freshSheet.success);
  const rosterEntries = resolveBattleRoster({
    roster: rosterInput,
    sheet: freshSheet.success,
    unitLibrary,
    statBlockCatalog,
  });
  if (Result.isFailure(rosterEntries)) {
    return { tag: "constructed", sheet, battle: rosterEntries.failure };
  }
  const [firstRosterEntry, ...remainingRosterEntries] = rosterEntries.success;
  if (firstRosterEntry === undefined) {
    return {
      tag: "constructed",
      sheet,
      battle: {
        tag: "rejected",
        issues: [{ tag: "characterBattleEncounterEmptyRoster" }],
      },
    };
  }

  const composition = composeBattleRoster([
    firstRosterEntry,
    ...remainingRosterEntries,
  ]);
  if (composition.tag === "rejected") {
    return {
      tag: "constructed",
      sheet,
      battle: battleRosterCompositionRejection(
        composition,
        rosterEntries.success,
      ),
    };
  }

  const entry = startBattle({
    battleId: ORACLE_BATTLE_ID,
    combatants: composition.admissions.map(({ combatant }) => combatant),
  });
  if (Result.isFailure(entry)) {
    return {
      tag: "constructed",
      sheet,
      battle: battleEntryRejection(entry.failure),
    };
  }

  const snapshot = snapshotBattle(entry.success.state);
  const checkpoint = strippedBattleEnteredCheckpoint(snapshot);
  const frontier = battleActsFrontier(entry.success);
  return {
    tag: "constructed",
    sheet,
    battle: {
      tag: "entered",
      checkpoint,
      frontier,
      segment: appendBattleAttempts(
        {
          session: entry.success,
          checkpoint,
          frontier,
          rejections: [],
          transaction: null,
        },
        attemptsInput,
      ),
    },
  };
}

type OracleBattleFrame = {
  readonly session: BattleRuntimeSession;
  readonly checkpoint: OracleBattleCheckpoint;
  readonly frontier: OracleBattleNonterminalFrontier;
  readonly rejections: OracleBattleAttemptRejectionReason[];
  readonly transaction: BattlePendingTransaction | null;
};

function appendBattleAttempts(
  initial: OracleBattleFrame,
  attempts: readonly OracleBattleAttempt[],
): OracleBattleAttemptSegment {
  let current = initial;
  const priorFrames: OracleBattleFrame[] = [];
  for (const attempt of attempts) {
    const operation = Match.value(attempt).pipe(
      Match.discriminatorsExhaustive("kind")({
        ordinarySubject: ({ subject, fills }) => ({
          kind: "ordinarySubject" as const,
          subject,
          fills,
        }),
        interruptDecision: ({ fill }) => ({
          kind: "interruptDecision" as const,
          fill,
        }),
      }),
    );
    const result = settleBattleRuntimeTransaction({
      session: current.session,
      transaction: current.transaction,
      operation,
    });
    const next = Match.value(result).pipe(
      Match.when({ tag: "invalid" }, ({ resolution }) => {
        current.rejections.push(resolution.reason);
        return undefined;
      }),
      Match.when(
        { tag: "needsHoles" },
        ({ resolution, transaction, frontier }) => {
          priorFrames.push(current);
          return {
            session: resolution.session,
            checkpoint: strippedBattleCheckpoint(
              resolution.envelope.checkpoint,
            ),
            frontier,
            rejections: [],
            transaction,
          } satisfies OracleBattleFrame;
        },
      ),
      Match.when({ tag: "settled" }, ({ resolution, session, acts }) => {
        priorFrames.push(current);
        return {
          session,
          checkpoint: strippedBattleCheckpoint(resolution.envelope.checkpoint),
          frontier: battleActsFrontierFromActs(acts),
          rejections: [],
          transaction: null,
        } satisfies OracleBattleFrame;
      }),
      Match.when({ tag: "defect" }, ({ issue }) =>
        defect(`Battle transaction settlement defect: ${issue.tag}`),
      ),
      Match.exhaustive,
    );
    if (next !== undefined) current = next;
  }

  let continuation: OracleBattleContinuation = {
    checkpoint: current.checkpoint,
    frontier: current.frontier,
    segment: {
      rejections: current.rejections,
      outcome: { tag: "awaitingInput" },
    },
  };

  const firstPriorFrame = priorFrames[0];
  if (firstPriorFrame === undefined) {
    return continuation.segment;
  }

  for (
    let frameIndex = priorFrames.length - 1;
    frameIndex >= 1;
    frameIndex -= 1
  ) {
    const frame = priorFrames[frameIndex];
    if (frame === undefined) return defect("Battle prior frame was missing");
    continuation = {
      checkpoint: frame.checkpoint,
      frontier: frame.frontier,
      segment: {
        rejections: frame.rejections,
        outcome: { tag: "next", continuation },
      },
    };
  }

  return {
    rejections: firstPriorFrame.rejections,
    outcome: { tag: "next", continuation },
  };
}

function battleActsFrontier(
  session: BattleRuntimeSession,
): OracleBattleActsFrontier {
  return battleActsFrontierFromActs(discoverBattleActs(session));
}

function battleActsFrontierFromActs(
  acts: ReturnType<typeof discoverBattleActs>,
): OracleBattleActsFrontier {
  const [firstAct, ...remainingActs] = acts;
  if (firstAct === undefined) {
    return defect("Battle act discovery produced an empty frontier");
  }
  return {
    kind: "acts",
    acts: [firstAct.subject, ...remainingActs.map(({ subject }) => subject)],
  };
}

type ResolvedOracleBattleRosterEntry =
  | (OracleBattleCharacterSheetRosterEntry & {
      readonly origin: "characterSheet";
    })
  | (OracleBattleStatBlockRosterEntry & { readonly origin: "statBlock" });

function flattenOracleBattleRoster(
  roster: OracleBattleRoster,
): readonly ResolvedOracleBattleRosterEntry[] {
  return Match.value(roster).pipe(
    Match.discriminatorsExhaustive("tag")({
      statBlocks: ({ entries }) =>
        entries.map((entry) => ({ ...entry, origin: "statBlock" as const })),
      characterSheet: ({
        precedingStatBlocks,
        characterSheet,
        followingStatBlocks,
      }) => [
        ...precedingStatBlocks.map((entry) => ({
          ...entry,
          origin: "statBlock" as const,
        })),
        { ...characterSheet, origin: "characterSheet" as const },
        ...followingStatBlocks.map((entry) => ({
          ...entry,
          origin: "statBlock" as const,
        })),
      ],
    }),
  );
}

function resolveBattleRoster(input: {
  readonly roster: OracleBattleRoster;
  readonly sheet: Parameters<typeof freshCharacterSheetProjection>[0];
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
}): Result.Result<readonly BattleRosterEntry[], OracleBattleEntryRejection> {
  const entries: BattleRosterEntry[] = [];

  for (const entry of flattenOracleBattleRoster(input.roster)) {
    const ammunitionStocks = projectAmmunitionStocks(entry.ammunitionStocks);
    if (entry.origin === "characterSheet") {
      const displayName = characterBuildDisplayName(
        input.unitLibrary,
        input.sheet.build,
      );
      if (Result.isFailure(displayName)) {
        return Result.fail({
          tag: "rejected",
          issues: [
            {
              tag: "characterDisplayUnavailable",
              issues: displayName.failure,
            },
          ],
        });
      }
      entries.push({
        kind: "characterSheet",
        source: {
          kind: "available",
          input: {
            sheet: input.sheet,
            combatantId: entry.combatantId,
            displayName: displayName.success,
            initiative: initiativeScore(entry.initiative),
            ammunitionStocks,
            unitLibrary: input.unitLibrary,
            statBlockCatalog: input.statBlockCatalog,
          },
        },
      });
      continue;
    }

    const statBlock = input.statBlockCatalog.getStatBlock(entry.statBlockId);
    if (Option.isNone(statBlock)) {
      entries.push({
        kind: "statBlock",
        source: {
          kind: "missing",
          statBlockId: entry.statBlockId,
          combatantId: entry.combatantId,
        },
      });
      continue;
    }
    entries.push({
      kind: "statBlock",
      source: {
        kind: "available",
        input: {
          combatantId: entry.combatantId,
          statBlock: statBlock.value,
          initiative: initiativeScore(entry.initiative),
          ammunitionStocks,
          conditions: entry.conditions,
          ...(entry.currentHp === undefined
            ? {}
            : { currentHp: Hp(entry.currentHp) }),
          tempHp: Hp(entry.tempHp),
        },
      },
    });
  }

  return Result.succeed(entries);
}

function projectAmmunitionStocks(stocks: OracleAmmunitionStocks): readonly {
  readonly ammunition: AmmunitionKind;
  readonly remaining: ReturnType<typeof resourceCount>;
}[] {
  const projected: Array<{
    readonly ammunition: AmmunitionKind;
    readonly remaining: ReturnType<typeof resourceCount>;
  }> = [];
  for (const key of Object.keys(stocks).sort(compareCodePoints)) {
    const ammunition = AMMUNITION_KINDS.find((candidate) => candidate === key);
    if (ammunition === undefined) {
      return defect(`Unknown ammunition stock key ${key}`);
    }
    const remaining = stocks[ammunition];
    if (remaining !== undefined) {
      projected.push({ ammunition, remaining: resourceCount(remaining) });
    }
  }
  return projected;
}

type OracleBattleEntryIssue = OracleBattleEntryRejection["issues"][number];

type OracleBattleRosterIssueProjection =
  | {
      readonly kind: "entry";
      readonly issue: OracleBattleEntryIssue;
    }
  | {
      readonly kind: "projection";
      readonly issue: OracleBattleProjectionIssue;
    };

function battleRosterCompositionRejection(
  composition: Extract<BattleRosterComposition, { readonly tag: "rejected" }>,
  rosterEntries: readonly BattleRosterEntry[],
): OracleBattleEntryRejection {
  const entryIssues: OracleBattleEntryIssue[] = [];
  const projectionIssues: OracleBattleProjectionIssue[] = [];
  let firstProjectionEntryIndex: number | undefined;

  for (const issue of composition.issues) {
    const mapped = battleRosterIssueToOracleIssue(issue, rosterEntries);
    if (mapped.kind === "projection") {
      firstProjectionEntryIndex ??= entryIssues.length;
      projectionIssues.push(mapped.issue);
    } else {
      entryIssues.push(mapped.issue);
    }
  }

  if (firstProjectionEntryIndex !== undefined) {
    const [firstProjectionIssue, ...remainingProjectionIssues] =
      projectionIssues;
    if (firstProjectionIssue === undefined) {
      return defect("Battle roster projection issue accumulation was empty");
    }
    entryIssues.splice(firstProjectionEntryIndex, 0, {
      tag: "characterBattleEncounterProjectionIssues",
      issues: [firstProjectionIssue, ...remainingProjectionIssues],
    });
  }
  const [firstIssue, ...remainingIssues] = entryIssues;
  if (firstIssue === undefined) {
    return defect("Battle roster rejection issue accumulation was empty");
  }
  return { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
}

function battleRosterIssueToOracleIssue(
  issue: BattleRosterIssue,
  rosterEntries: readonly BattleRosterEntry[],
): OracleBattleRosterIssueProjection {
  return Match.value(issue).pipe(
    Match.when({ kind: "statBlockSourceUnavailable" }, ({ statBlockId }) => ({
      kind: "entry" as const,
      issue: { tag: "statBlockUnavailable" as const, statBlockId },
    })),
    Match.when({ kind: "characterSheetProjection" }, (projection) => ({
      kind: "projection" as const,
      issue: battleRosterCharacterProjectionIssue(projection, rosterEntries),
    })),
    Match.when({ kind: "duplicateCombatantId" }, () =>
      genericBattleStateEntryIssue(),
    ),
    Match.when({ kind: "duplicateCharacterId" }, () =>
      genericBattleStateEntryIssue(),
    ),
    Match.when({ kind: "characterSheetSourceUnavailable" }, () =>
      genericBattleStateEntryIssue(),
    ),
    Match.exhaustive,
  );
}

function genericBattleStateEntryIssue(): OracleBattleRosterIssueProjection {
  return {
    kind: "entry",
    issue: {
      tag: "battleStateInitRejected",
      issue: { tag: "battleStateInitIssue" },
    },
  };
}

function battleRosterCharacterProjectionIssue(
  projection: Extract<
    BattleRosterIssue,
    { readonly kind: "characterSheetProjection" }
  >,
  rosterEntries: readonly BattleRosterEntry[],
): OracleBattleProjectionIssue {
  const rosterEntry = rosterEntries[projection.index];
  if (rosterEntry === undefined) {
    return defect(
      `Battle roster projection referenced missing entry ${projection.index}`,
    );
  }
  const combatantId = battleRosterEntryCombatantId(rosterEntry);
  return Match.value(projection).pipe(
    Match.when({ issueTag: "battleCreatureInitIssue" }, () => ({
      tag: "characterBattleEncounterProjectionIssue" as const,
      origin: "characterSheet" as const,
      combatantId,
      issue: { tag: "battleCreatureInitIssue" as const },
    })),
    Match.when(
      { issueTag: "characterBattleSpellAccessProjectionIssue" },
      (spellAccessIssue) => ({
        tag: "characterBattleEncounterProjectionIssue" as const,
        origin: "characterSheet" as const,
        combatantId,
        issue: {
          tag: "battleCreatureInitIssue" as const,
          spellAccessIssues: [
            oracleSpellAccessProjectionIssue(spellAccessIssue),
          ] as const,
        },
      }),
    ),
    Match.exhaustive,
  );
}

type OracleSpellAccessProjectionIssue = NonNullable<
  OracleBattleCreatureInitIssue["spellAccessIssues"]
>[number];

function oracleSpellAccessProjectionIssue(
  issue: Extract<
    BattleRosterIssue,
    {
      readonly kind: "characterSheetProjection";
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
    }
  >,
): OracleSpellAccessProjectionIssue {
  return Match.value(issue).pipe(
    Match.when(
      { cause: "invalidBuildSpellAccess" },
      ({ issueIndex, cause }) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        issueIndex,
        cause,
      }),
    ),
    Match.when(
      { cause: "invalidSpellSelection" },
      ({ accessIndex, featUnitId, cause }) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
      }),
    ),
    Match.when(
      { cause: "missingSourceUnit" },
      ({ accessIndex, featUnitId, cause }) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
      }),
    ),
    Match.when(
      { cause: "unsupportedSourceUnit" },
      ({ accessIndex, featUnitId, cause }) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
      }),
    ),
    Match.when(
      { cause: "missingSpellListSource" },
      ({ accessIndex, featUnitId, cause }) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
      }),
    ),
    Match.exhaustive,
  );
}

function battleRosterEntryCombatantId(
  entry: BattleRosterEntry,
): Parameters<typeof startBattle>[0]["combatants"][number]["combatantId"] {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, ({ source }) =>
      Match.value(source).pipe(
        Match.when({ kind: "available" }, ({ input }) => input.combatantId),
        Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
        Match.when({ kind: "inBattle" }, ({ combatantId }) => combatantId),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "statBlock" }, ({ source }) =>
      Match.value(source).pipe(
        Match.when({ kind: "available" }, ({ input }) => input.combatantId),
        Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function battleEntryRejection(
  issue: BattleInitializationIssue,
): OracleBattleEntryRejection {
  return {
    tag: "rejected",
    issues: [
      {
        tag: "battleStateInitRejected",
        issue: stripBattleStateInitIssue(issue),
      },
    ],
  };
}

function stripBattleStateInitIssue(
  issue: BattleInitializationIssue,
): OracleBattleStateInitIssue {
  return Match.value(issue).pipe(
    Match.discriminatorsExhaustive("tag")({
      battleStateInitIssues: ({ issues }) => ({
        tag: "battleStateInitIssues" as const,
        issues: issues.map(stripBattleStateInitLeafIssue),
      }),
      battleStateInitIssue: () => ({ tag: "battleStateInitIssue" as const }),
      statBlockProjectionFailure: () => ({
        tag: "battleStateInitIssue" as const,
      }),
      statBlockResourceGraphIssue: () => ({
        tag: "battleStateInitIssue" as const,
      }),
      weaponLoadoutMismatch: (matched) => matched,
    }),
  );
}

function stripBattleStateInitLeafIssue(
  issue: BattleInitializationLeafIssue,
): OracleBattleStateInitLeafIssue {
  return Match.value(issue).pipe(
    Match.discriminatorsExhaustive("tag")({
      battleStateInitIssue: () => ({ tag: "battleStateInitIssue" as const }),
      statBlockProjectionFailure: () => ({
        tag: "battleStateInitIssue" as const,
      }),
      statBlockResourceGraphIssue: () => ({
        tag: "battleStateInitIssue" as const,
      }),
      weaponLoadoutMismatch: (matched) => matched,
    }),
  );
}

function strippedBattleCheckpoint(
  snapshot: ReturnType<typeof snapshotBattle>,
): OracleBattleCheckpoint {
  const combatantsById = new Map(
    snapshot.combatants.map((combatant) => [combatant.combatantId, combatant]),
  );
  if (combatantsById.size !== snapshot.combatants.length) {
    return defect("Battle snapshot contained duplicate combatant identities");
  }
  const orderedEntries = snapshot.turnOrder.map((combatantId) => {
    const combatant = combatantsById.get(combatantId);
    if (combatant === undefined) {
      return defect(
        `Battle turn order referenced missing combatant ${combatantId}`,
      );
    }
    return {
      creature: {
        combatantId: combatant.combatantId,
        origin: { kind: combatant.origin.kind },
        hp: combatant.hp,
        maxHp: combatant.maxHp,
        tempHp: combatant.tempHp,
        armorClass: combatant.armorClass,
        size: combatant.size,
        conditions: combatant.conditions,
      },
      initiative: combatant.initiative,
    };
  });
  if (orderedEntries.length === 0) {
    return defect("Battle snapshot initiative order was empty");
  }
  if (hasDuplicateStructuralValues(snapshot.turnOrder)) {
    return defect("Battle snapshot contained duplicate turn-order identities");
  }
  if (snapshot.combatants.length !== snapshot.turnOrder.length) {
    return defect("Battle snapshot combatants and turn order diverged");
  }
  const currentActorIndex = snapshot.turnOrder.indexOf(snapshot.currentActorId);
  if (currentActorIndex < 0) {
    return defect("Battle snapshot current actor was not in turn order");
  }
  const stillToAct = orderedEntries.slice(currentActorIndex);
  const [firstStillToAct, ...remainingStillToAct] = stillToAct;
  if (firstStillToAct === undefined) {
    return defect("Battle snapshot still-to-act initiative stack was empty");
  }
  return OracleBattleCheckpointSchema.make({
    round: snapshot.round,
    alreadyActed: orderedEntries.slice(0, currentActorIndex),
    stillToAct: [firstStillToAct, ...remainingStillToAct],
  });
}

function strippedBattleEnteredCheckpoint(
  snapshot: ReturnType<typeof snapshotBattle>,
): OracleBattleEnteredCheckpoint {
  const checkpoint = strippedBattleCheckpoint(snapshot);
  if (checkpoint.alreadyActed.length !== 0) {
    return defect(
      "Battle entry snapshot current actor was not the first initiative entry",
    );
  }
  return { ...checkpoint, alreadyActed: [] };
}

function oracleTrace(creation: OracleTrace["creation"]): OracleTrace {
  return OracleTraceSchema.make({ creation });
}
