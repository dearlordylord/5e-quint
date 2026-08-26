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
  characterSheetId,
  createFreshCharacterSheet,
  freshCharacterSheetProjection,
  type CharacterSheetId,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Either } from "effect";

import { canonicalizeStringSet } from "./oracle-canonical.ts";
import {
  type FreshSheetInput,
  type OracleCase,
  type OracleEvaluationBatch,
  type OracleTrace,
  type OracleTraceStep,
} from "./oracle-case-trace-schema.ts";

export type OracleEvaluationServices = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
};

export type OracleCaseEvaluationInput = OracleEvaluationServices & {
  readonly case: OracleCase;
};

export const ORACLE_CHARACTER_DRAFT_ID: CharacterDraftId = characterDraftId(
  "oracle:character-draft",
);
export const ORACLE_CHARACTER_SHEET_ID: CharacterSheetId =
  characterSheetId("oracle:character");

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

  for (
    let batchIndex = 0;
    batchIndex < oracleCase.creation.fillBatches.length;
    batchIndex += 1
  ) {
    const result = fillCreationHoles({
      draft: currentDraft,
      unitLibrary,
      expectedRevision: currentDraft.revision,
      fills: oracleCase.creation.fillBatches[batchIndex]!,
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
          firstUnusedBatchIndex: batchIndex + 1,
        },
      });
      return oracleTrace(steps);
    }

    return appendFreshSheetStep(
      steps,
      result.finalization.tag === "ready"
        ? result.finalization.build
        : defect("ready finalization was narrowed inconsistently"),
      oracleCase.sheet,
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

function appendFreshSheetStep(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
  build: CharacterBuild,
  input: FreshSheetInput,
  unitLibrary: UnitCatalog,
  statBlockCatalog: StatBlockCatalog | undefined,
): OracleTrace {
  const freshSheet = createFreshCharacterSheet({
    characterId: ORACLE_CHARACTER_SHEET_ID,
    build,
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary,
    ...(input.tag === "wildShapeKnownForms"
      ? {
          druidWildShapeKnownFormStatBlockIds: canonicalizeStringSet(
            input.statBlockIds,
          ),
          ...(statBlockCatalog === undefined ? {} : { statBlockCatalog }),
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
  return oracleTrace(steps);
}

function oracleTrace(
  steps: [OracleTraceStep, ...OracleTraceStep[]],
): OracleTrace {
  return { steps };
}
