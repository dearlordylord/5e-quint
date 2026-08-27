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
  type CharacterBattleEncounterParticipant,
  type CharacterBattleRuntimeEntryIssue,
} from "@dnd/character-battle-runtime";
import {
  battleId,
  initiativeScore,
  snapshotBattle,
} from "@dnd/battle-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  freshCharacterSheetProjection,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import {
  Hp,
  Index,
  resourceCount,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Either, Option } from "effect";

import { canonicalizeStringSet } from "./oracle-canonical.ts";
import {
  type FreshSheetInput,
  type OracleBattleCheckpoint,
  type OracleBattleEntryRejection,
  type OracleBattleRosterEntry,
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

  for (const [batchIndex, fillBatch] of oracleCase.creation.fillBatches.entries()) {
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
  rosterInput: ReadonlyNonEmptyArray<OracleBattleRosterEntry>,
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
  steps.push({
    tag: "battleEntered",
    checkpoint: strippedBattleCheckpoint(snapshot),
    frontier: { acts: snapshot.acts },
  });
  return oracleTrace(steps);
}

function resolveBattleRoster(input: {
  readonly roster: ReadonlyNonEmptyArray<OracleBattleRosterEntry>;
  readonly sheet: Parameters<typeof freshCharacterSheetProjection>[0];
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  ReadonlyNonEmptyArray<CharacterBattleEncounterParticipant>,
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
      ...(entry.tempHp === undefined ? {} : { tempHp: Hp(entry.tempHp) }),
    });
  }

  if (missingStatBlocks.length > 0) {
    const [firstMissing, ...remainingMissing] = missingStatBlocks;
    if (firstMissing === undefined) {
      return Either.left({
        tag: "battleEntryRejected",
        issues: [
          {
            tag: "battleStateInitRejected",
            issue: {
              tag: "battleStateInitIssue",
              message: "Missing Stat Block issue accumulation was empty.",
            },
          },
        ],
      });
    }
    return Either.left({
      tag: "battleEntryRejected",
      issues: [firstMissing, ...remainingMissing],
    });
  }
  const [first, ...rest] = participants;
  if (first === undefined) {
    return Either.left({
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "battleStateInitRejected",
          issue: {
            tag: "battleStateInitIssue",
            message: "Battle roster resolution produced no participants.",
          },
        },
      ],
    });
  }
  return Either.right([first, ...rest]);
}

function battleEntryRejection(
  entry: CharacterBattleRuntimeEntryIssue,
): OracleBattleEntryRejection {
  const issue = entry.issue;
  if (issue.tag === "characterBattleEncounterProjectionIssues") {
    return { tag: "battleEntryRejected", issues: [issue] };
  }
  if (issue.tag === "characterBattleEncounterEmptyRoster") {
    return {
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "battleStateInitRejected",
          issue: {
            tag: "battleStateInitIssue",
            message: "Character battle encounter requires at least one participant.",
          },
        },
      ],
    };
  }
  if (issue.tag === "battleCreatureInitIssue") {
    return {
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "battleCreatureInitRejected",
          issue,
        },
      ],
    };
  }
  return {
    tag: "battleEntryRejected",
    issues: [{ tag: "battleStateInitRejected", issue }],
  };
}

function strippedBattleCheckpoint(
  snapshot: ReturnType<typeof snapshotBattle>,
): OracleBattleCheckpoint {
  return {
    round: snapshot.round,
    currentActorId: snapshot.currentActorId,
    turnOrder: snapshot.turnOrder,
    combatants: snapshot.combatants.map((combatant) =>
      isCharacterBattleCreatureSnapshot(combatant)
        ? stripCharacterBattleCreatureSnapshot(combatant)
        : stripStatBlockBattleCreatureSnapshot(combatant),
    ),
    companions: snapshot.companions,
    lightEmitters: snapshot.lightEmitters,
    obscurementZones: snapshot.obscurementZones,
    turn: snapshot.turn,
    readiedResponses: snapshot.readiedResponses,
    helpAttackMarkers: snapshot.helpAttackMarkers,
  };
}

function isCharacterBattleCreatureSnapshot(
  combatant: ReturnType<typeof snapshotBattle>["combatants"][number],
): combatant is Extract<
  ReturnType<typeof snapshotBattle>["combatants"][number],
  { readonly origin: { readonly kind: "character" } }
> {
  return combatant.origin.kind === "character";
}

function stripCharacterBattleCreatureSnapshot(
  combatant: Extract<
    ReturnType<typeof snapshotBattle>["combatants"][number],
    { readonly origin: { readonly kind: "character" } }
  >,
): OracleBattleCheckpoint["combatants"][number] {
  const { displayName: ignoredDisplayName, origin, ...withoutDisplayName } =
    combatant;
  void ignoredDisplayName;
  return { ...withoutDisplayName, origin };
}

function stripStatBlockBattleCreatureSnapshot(
  combatant: Extract<
    ReturnType<typeof snapshotBattle>["combatants"][number],
    { readonly origin: { readonly kind: "statBlock" } }
  >,
): OracleBattleCheckpoint["combatants"][number] {
  const { origin, ...withoutOrigin } = combatant;
  return { ...withoutOrigin, origin };
}

function oracleTrace(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
): OracleTrace {
  return { steps };
}
