import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  buildOracleEvaluationCorpus,
  buildOracleCorpus,
  decodeOracleCorpus,
  decodeOracleCorpusDocument,
  decodeOracleCorpusJson,
  serializeOracleCorpus,
  type OracleCorpus,
} from "./oracle-corpus.ts";
import type { OracleCase, OracleTrace } from "./oracle-case-trace.ts";
import type {
  OracleBattleAttemptSegment,
  OracleBattleContinuation,
  OracleBattleNonterminalFrontier,
} from "./oracle-case-trace-schema.ts";

const unitLibraryResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitLibraryResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}
const unitLibrary = unitLibraryResult.catalog;

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "SRD Stat Block catalog test fixture must build successfully.",
  );
}
const statBlockCatalog = statBlockCatalogResult.catalog;

const services = { unitLibrary, statBlockCatalog };
const sourceCorpusResult = buildOracleEvaluationCorpus(services);
if (Either.isLeft(sourceCorpusResult)) {
  throw new Error(
    `Oracle source fixture failed: ${JSON.stringify(sourceCorpusResult.left)}`,
  );
}
const sourceCorpus = sourceCorpusResult.right;
const sourceCases = sourceCorpus.batch.cases;
const enteredCase = sourceCases[0];
const exhaustedCase = sourceCases[1];
const mixedOriginCase = sourceCases[3];
const wildShapeCase = sourceCases[4];
const moveHolesCase = sourceCases[5];
const retryCase = sourceCases[6];
const resolvedMovementCase = sourceCases[7];
const interruptDecisionCase = sourceCases[8];
const inputSurplusCase = sourceCases[9];
const fillRejectedCase = sourceCases[10];
const emptyRosterCase = sourceCases[11];

if (
  enteredCase === undefined ||
  exhaustedCase === undefined ||
  mixedOriginCase === undefined ||
  wildShapeCase === undefined ||
  moveHolesCase === undefined ||
  retryCase === undefined ||
  resolvedMovementCase === undefined ||
  interruptDecisionCase === undefined ||
  inputSurplusCase === undefined ||
  fillRejectedCase === undefined ||
  emptyRosterCase === undefined
) {
  throw new Error("Oracle source fixture must contain its ordered Cases.");
}

describe("Opaque Oracle corpus", () => {
  test("builds one deterministic ordered A/B/A corpus with production outcomes", () => {
    const first = buildPublishedCorpus();
    const second = buildPublishedCorpus();

    expect(first).toEqual(second);
    expect(first.batch.cases).toEqual(sourceCases);
    expect(first.traces).toHaveLength(first.batch.cases.length);
    expect(first.traces[0]).toEqual(first.traces[2]);
    expect(first.traces[0]?.creation.outcome.tag).toBe("built");
    expect(first.traces[1]?.creation.outcome.tag).toBe("inputExhausted");

    const entered = first.traces[0]?.creation.outcome;
    expect(entered?.tag).toBe("built");
    if (entered?.tag === "built") {
      expect(entered.sheet.tag).toBe("constructed");
      if (entered.sheet.tag === "constructed") {
        expect(entered.sheet.battle.tag).toBe("entered");
        if (entered.sheet.battle.tag === "entered") {
          expect(entered.sheet.battle.segment.outcome).toEqual({
            tag: "awaitingInput",
          });
        }
      }
    }

    const reversed = buildCorpus([exhaustedCase, enteredCase, exhaustedCase]);
    expect(reversed.traces).toEqual([
      first.traces[1],
      first.traces[0],
      first.traces[1],
    ]);
  });

  test("publishes every production-derived lifecycle and frontier witness", () => {
    expect(sourceCases).toHaveLength(12);
    expect(sourceCases.map(({ sheet }) => sheet.tag)).toEqual([
      "ordinary",
      "ordinary",
      "ordinary",
      "ordinary",
      "wildShapeKnownForms",
      "ordinary",
      "ordinary",
      "ordinary",
      "ordinary",
      "ordinary",
      "ordinary",
      "ordinary",
    ]);
    expect(mixedOriginCase.battle.roster.tag).toBe("characterSheet");
    expect(wildShapeCase.sheet.tag).toBe("wildShapeKnownForms");
    expect(inputSurplusCase.creation.fillBatches.length).toBeGreaterThan(
      enteredCase.creation.fillBatches.length,
    );
    expect(fillRejectedCase.creation.fillBatches).toHaveLength(1);
    expect(moveHolesCase.battle.attempts).toHaveLength(1);
    expect(retryCase.battle.attempts).toHaveLength(2);
    expect(resolvedMovementCase.battle.attempts).toHaveLength(1);
    expect(interruptDecisionCase.battle.attempts).toHaveLength(2);
    expect(interruptDecisionCase.battle.attempts[1]?.kind).toBe(
      "interruptDecision",
    );

    const outcomeTags = sourceCorpus.traces.map(
      (trace) => trace.creation.outcome.tag,
    );
    expect(outcomeTags).toContain("inputExhausted");
    expect(outcomeTags).toContain("inputSurplus");
    expect(outcomeTags).toContain("fillRejected");

    const moveHolesContinuations = battleContinuationsOf(
      sourceCorpus.traces[5],
    );
    expect(
      moveHolesContinuations.some(
        ({ frontier }) => frontier.kind === "ordinaryHoles",
      ),
    ).toBe(true);
    const interruptContinuations = battleContinuationsOf(
      sourceCorpus.traces[8],
    );
    expect(
      interruptContinuations.some(
        ({ frontier }) => frontier.kind === "interruptDecision",
      ),
    ).toBe(true);
    expect(
      battleSegmentsOf(sourceCorpus.traces[6]).some(
        ({ rejections }) => rejections.length > 0,
      ),
    ).toBe(true);
    expect(
      battleFrontiersOf(sourceCorpus.traces[0]).some(
        (frontier) => frontier.kind === "acts",
      ),
    ).toBe(true);
  });

  test("retains the production sheet and Battle-entry terminal rejection", () => {
    const corpus = buildCorpus([emptyRosterCase]);
    const outcome = corpus.traces[0]?.creation.outcome;
    expect(outcome?.tag).toBe("built");
    if (outcome?.tag !== "built") return;
    expect(outcome.sheet.tag).toBe("constructed");
    if (outcome.sheet.tag !== "constructed") return;
    expect(outcome.sheet.battle).toEqual({
      tag: "rejected",
      issues: [{ tag: "characterBattleEncounterEmptyRoster" }],
    });
  });

  test("round-trips through strict Document projection and duplicate-aware JSON", () => {
    const corpus = buildCorpus([enteredCase, exhaustedCase]);
    const serialized = serializeOracleCorpus(corpus);
    const serializedAgain = serializeOracleCorpus(corpus);
    expect(serialized).toEqual(serializedAgain);
    expect(serialized.toString("utf8").endsWith("\n")).toBe(true);
    expect(serialized.toString("utf8")).toContain('"batch":{');

    const document = decodeOracleCorpusDocument(corpus);
    expect(Either.isRight(document)).toBe(true);
    const decoded = decodeOracleCorpusJson(serialized.toString("utf8"));
    expect(decoded).toEqual(Either.right(corpus));

    const duplicateMember = `{"batch":${JSON.stringify(
      corpus.batch,
    )},"batch":${JSON.stringify(corpus.batch)},"traces":${JSON.stringify(
      corpus.traces,
    )}}`;
    expect(decodeOracleCorpusJson(duplicateMember)).toEqual(
      Either.left([{ path: "/batch", code: "duplicateMember" }]),
    );
  });

  test("keeps positional trace length semantic and rejects strict unknown members", () => {
    const corpus = buildCorpus([enteredCase, exhaustedCase]);
    const tooFewTraces = {
      ...corpus,
      traces: [corpus.traces[0]],
    };
    expect(Either.isRight(decodeOracleCorpusDocument(tooFewTraces))).toBe(true);
    expect(decodeOracleCorpus(tooFewTraces)).toEqual(
      Either.left([{ path: "/traces", code: "nonCanonicalDomainValue" }]),
    );

    const unknownMember = decodeOracleCorpus({ ...corpus, extra: true });
    expect(Either.isLeft(unknownMember)).toBe(true);
    if (Either.isLeft(unknownMember)) {
      expect(unknownMember.left).toContainEqual({
        path: "/extra",
        code: "unknownMember",
      });
    }
  });
});

function buildPublishedCorpus(): OracleCorpus {
  const result = buildOracleEvaluationCorpus(services);
  if (Either.isLeft(result)) {
    throw new Error(`Corpus fixture failed: ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function buildCorpus(
  cases: readonly [OracleCase, ...OracleCase[]],
): OracleCorpus {
  const result = buildOracleCorpus({ cases, services });
  if (Either.isLeft(result)) {
    throw new Error(`Corpus fixture failed: ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function battleContinuationsOf(
  trace: OracleTrace | undefined,
): readonly OracleBattleContinuation[] {
  if (trace === undefined || trace.creation.outcome.tag !== "built") {
    return [];
  }
  const sheet = trace.creation.outcome.sheet;
  if (sheet.tag !== "constructed" || sheet.battle.tag !== "entered") {
    return [];
  }
  const continuations: OracleBattleContinuation[] = [];
  let segment = sheet.battle.segment;
  while (segment.outcome.tag === "next") {
    const continuation = segment.outcome.continuation;
    continuations.push(continuation);
    segment = continuation.segment;
  }
  return continuations;
}

function battleSegmentsOf(
  trace: OracleTrace | undefined,
): readonly OracleBattleAttemptSegment[] {
  if (trace === undefined || trace.creation.outcome.tag !== "built") {
    return [];
  }
  const sheet = trace.creation.outcome.sheet;
  if (sheet.tag !== "constructed" || sheet.battle.tag !== "entered") {
    return [];
  }
  const segments: OracleBattleAttemptSegment[] = [sheet.battle.segment];
  let segment = sheet.battle.segment;
  while (segment.outcome.tag === "next") {
    const continuation = segment.outcome.continuation;
    segments.push(continuation.segment);
    segment = continuation.segment;
  }
  return segments;
}

function battleFrontiersOf(
  trace: OracleTrace | undefined,
): readonly OracleBattleNonterminalFrontier[] {
  if (trace === undefined || trace.creation.outcome.tag !== "built") {
    return [];
  }
  const sheet = trace.creation.outcome.sheet;
  if (sheet.tag !== "constructed" || sheet.battle.tag !== "entered") {
    return [];
  }
  const frontiers: OracleBattleNonterminalFrontier[] = [sheet.battle.frontier];
  let segment = sheet.battle.segment;
  while (segment.outcome.tag === "next") {
    const continuation = segment.outcome.continuation;
    frontiers.push(continuation.frontier);
    segment = continuation.segment;
  }
  return frontiers;
}
