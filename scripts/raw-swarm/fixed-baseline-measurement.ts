import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

import { canonicalJson, isJsonRecord, repoRoot } from "./transcript.ts";
import {
  projectPlayerSubject,
  reprojectSdkTranscriptTurns,
  type PlayerCurrentTurnProjection,
} from "./sdk-player/player-turn-projection.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import {
  parseSdkTranscript,
  type SdkCallRecord,
} from "./sdk-player/sdk-transcript.ts";

const FIXED_TRANSCRIPT_BYTES = 38_232_957;
const FIXED_TRANSCRIPT_SHA256 =
  "69f30fb4f34155aa95845c141f303e65c78743a4814a5623700950cc2d1a9bad";
const FIXED_OBSERVATION_BYTES = 3_137_666;
const FIXED_STEP_PAYLOAD_BYTES = 38_107_978;
const FIXED_DIRECT_FRONTIER_CHECKS = 20;

function fail(message: string): never {
  throw new Error(message);
}

type RetainedProgramSessionAudit = {
  readonly subjectResolutionPhaseReferences: number;
  readonly discardedFullObservationCopies: number;
  readonly unsupportedSessionReferences: readonly string[];
};

type FixedBaselineRetainedProgram = {
  readonly sha256: string;
  readonly subjectResolutionPhaseReferences: number;
  readonly discardedFullObservationCopies: 2;
  readonly unsupportedSessionReferences: readonly [];
};

export function retainedProgramSessionAudit(
  program: string,
): RetainedProgramSessionAudit {
  const source = ts.createSourceFile(
    "retained-program.ts",
    program,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let phaseReferences = 0;
  let discardedCopies = 0;
  const unsupported: string[] = [];
  const propertyName = (node: ts.PropertyAssignment): string | undefined =>
    ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
      ? node.name.text
      : undefined;
  const insideObservation = (node: ts.Node): boolean => {
    let cursor: ts.Node | undefined = node.parent;
    while (cursor !== undefined) {
      if (
        ts.isPropertyAssignment(cursor) &&
        propertyName(cursor) === "observation"
      )
        return true;
      cursor = cursor.parent;
    }
    return false;
  };
  const isContextSession = (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "session" &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "context";
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      !(
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.expression === node
      )
    ) {
      const text = node.getText(source);
      const containsContextSession = (() => {
        let cursor: ts.Expression = node;
        while (ts.isPropertyAccessExpression(cursor)) {
          if (isContextSession(cursor)) return true;
          cursor = cursor.expression;
        }
        return false;
      })();
      if (containsContextSession) {
        if (text === "context.session") {
          // The continuation protocol supplies the canonical session to SDK calls;
          // this is transport, not a model-visible tactical fact.
        } else if (
          text === "context.session.battle.state.subjectResolutionPhase"
        )
          phaseReferences += 1;
        else if (
          insideObservation(node) &&
          (text === "context.session.battle" ||
            text === "context.session.battlefield")
        )
          discardedCopies += 1;
        else unsupported.push(text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return {
    subjectResolutionPhaseReferences: phaseReferences,
    discardedFullObservationCopies: discardedCopies,
    unsupportedSessionReferences: [...new Set(unsupported)].sort(),
  };
}

function callsByContinuation(
  calls: readonly SdkCallRecord[],
): ReadonlyMap<number, readonly SdkCallRecord[]> {
  return calls.reduce((groups, call) => {
    groups.set(call.continuation, [
      ...(groups.get(call.continuation) ?? []),
      call,
    ]);
    return groups;
  }, new Map<number, readonly SdkCallRecord[]>());
}

export function directFrontierUseChecks(input: {
  readonly calls: readonly SdkCallRecord[];
  readonly projections: readonly PlayerCurrentTurnProjection[];
}): number {
  const groups = callsByContinuation(input.calls);
  let checked = 0;
  for (const projection of input.projections) {
    const nextCalls = groups.get(projection.continuation + 1);
    const next = nextCalls?.find(
      (call) => isJsonRecord(call.input) && call.input.subject !== undefined,
    );
    if (next === undefined) continue;
    const nextInput = isJsonRecord(next.input) ? next.input : undefined;
    if (nextInput?.subject === undefined) continue;
    const projectedNextSubject = projectPlayerSubject(nextInput.subject);
    if (projectedNextSubject === undefined)
      fail(
        `Continuation ${projection.continuation + 1} has malformed subject input.`,
      );
    if (projection.frontier.kind === "holes") {
      if (
        canonicalJson(projection.frontier.subject) !==
        canonicalJson(projectedNextSubject)
      ) {
        fail(
          `Continuation ${projection.continuation} omitted the subject used by the next continuation.`,
        );
      }
      const fills = Array.isArray(nextInput.fills) ? nextInput.fills : [];
      const occurrences = (values: readonly string[]) =>
        values.reduce((counts, kind) => {
          counts.set(kind, (counts.get(kind) ?? 0) + 1);
          return counts;
        }, new Map<string, number>());
      const projectedKinds = occurrences(
        projection.frontier.holes.map(
          ({ hole }) => `${hole.kind}\u0000${hole.holeId}`,
        ),
      );
      const suppliedKinds = occurrences(
        fills.flatMap((fill) => {
          const candidate = isJsonRecord(fill) ? fill : undefined;
          return typeof candidate?.kind === "string" &&
            typeof candidate.holeId === "string"
            ? [`${candidate.kind}\u0000${candidate.holeId}`]
            : [];
        }),
      );
      if (
        new Set(
          projection.frontier.holes.map(({ hole }) => hole.holeInstanceKey),
        ).size !== projection.frontier.holes.length
      )
        fail(
          `Continuation ${projection.continuation} contains duplicate projected hole occurrences.`,
        );
      if (
        [...projectedKinds].some(
          ([kind, count]) => suppliedKinds.get(kind) !== count,
        )
      ) {
        fail(
          `Continuation ${projection.continuation} omitted a required hole family used by the next continuation.`,
        );
      }
      checked += 1;
      continue;
    }
    if (projection.frontier.kind === "acts") {
      if (
        !projection.frontier.acts.some(
          ({ subject }) =>
            canonicalJson(subject) === canonicalJson(projectedNextSubject),
        )
      ) {
        fail(
          `Continuation ${projection.continuation} omitted the act used by the next continuation.`,
        );
      }
      checked += 1;
    }
  }
  if (checked === 0)
    fail("Fixed baseline projection did not prove any direct frontier reuse.");
  return checked;
}

export type FixedBaselineMeasurement = {
  readonly schemaVersion: 1;
  readonly transcript: {
    readonly bytes: number;
    readonly sha256: string;
    readonly calls: number;
    readonly continuations: number;
  };
  readonly reviewerAudit: {
    readonly bytes: number;
    readonly ratioOfTranscript: number;
    readonly maximumRatio: 0.1;
  };
  readonly playerProjection: {
    readonly bytes: number;
    readonly baselineObservationBytes: number;
    readonly reductionFactor: number;
    readonly requiredReductionFactor: 5;
    readonly largestTurnBytes: number;
    readonly directlyReusedFrontiersChecked: number;
    readonly retainedProgram: FixedBaselineRetainedProgram;
  };
  readonly sqlite: {
    readonly baselineStepPayloadBytes: number;
    readonly indexedCallPayloadBytes: number;
    readonly ratioOfBaseline: number;
    readonly maximumRatio: 0.1;
  };
  readonly replayCache: {
    readonly cumulativeReplayMilliseconds: number;
    readonly prefixCount: number;
    readonly cumulativeThresholdMilliseconds: 60_000;
    readonly reachesCumulativeThreshold: boolean;
    readonly nonModelSupervisorShare: {
      readonly tag: "unavailable";
      readonly reason: string;
    };
    readonly decision: "awaiting-controlled-supervisor-share";
  };
};

function fixedBaselineRetainedProgramAudit(
  audit: RetainedProgramSessionAudit,
): Omit<FixedBaselineRetainedProgram, "sha256"> {
  if (
    audit.subjectResolutionPhaseReferences === 0 ||
    audit.discardedFullObservationCopies !== 2 ||
    audit.unsupportedSessionReferences.length > 0
  ) {
    fail(
      "Fixed baseline program cites a session fact outside the bounded projection audit.",
    );
  }
  return {
    subjectResolutionPhaseReferences: audit.subjectResolutionPhaseReferences,
    discardedFullObservationCopies: 2,
    unsupportedSessionReferences: [],
  };
}

type FixedReplayCacheEvidence = {
  readonly schemaVersion: 1;
  readonly transcriptSha256: string;
  readonly prefixCount: 88;
  readonly cumulativeReplayMilliseconds: number;
  readonly reachesCumulativeThreshold: boolean;
};

function isFixedReplayCacheEvidence(
  value: unknown,
): value is FixedReplayCacheEvidence {
  return (
    isJsonRecord(value) &&
    value.schemaVersion === 1 &&
    value.transcriptSha256 === FIXED_TRANSCRIPT_SHA256 &&
    value.prefixCount === 88 &&
    typeof value.cumulativeReplayMilliseconds === "number" &&
    typeof value.reachesCumulativeThreshold === "boolean"
  );
}

export function measureFixedBaseline(input: {
  readonly transcriptPath: string;
  readonly auditPath: string;
  readonly programPath: string;
  readonly indexPath: string;
  readonly replayCacheMeasurementPath: string;
}): FixedBaselineMeasurement {
  const transcriptPath = resolve(repoRoot, input.transcriptPath);
  const auditPath = resolve(repoRoot, input.auditPath);
  const programPath = resolve(repoRoot, input.programPath);
  const index = new DatabaseSync(resolve(repoRoot, input.indexPath), {
    readOnly: true,
  });
  const indexedCallPayloadBytes = (() => {
    try {
      const row = index
        .prepare(
          `SELECT SUM(
             length(operation) + length(outcome) +
             length(COALESCE(inputSessionSha256, '')) +
             length(COALESCE(outputSessionSha256, '')) +
             length(COALESCE(resultSha256, '')) +
             length(COALESCE(rejection, '')) +
             length(COALESCE(reviewFacts, ''))
           ) AS byteLength
           FROM calls
           JOIN runs ON runs.id = calls.runId
           WHERE runs.transcriptSha256 = ?`,
        )
        .get(FIXED_TRANSCRIPT_SHA256);
      if (
        typeof row !== "object" ||
        row === null ||
        typeof row.byteLength !== "number"
      ) {
        return fail("Fixed baseline run is absent from the artifact index.");
      }
      return row.byteLength;
    } finally {
      index.close();
    }
  })();
  const indexedPayloadRatio =
    indexedCallPayloadBytes / FIXED_STEP_PAYLOAD_BYTES;
  if (indexedPayloadRatio > 0.1) fail("Fixed baseline call index exceeds 10%.");
  const replayCacheEvidence: unknown = JSON.parse(
    readFileSync(resolve(repoRoot, input.replayCacheMeasurementPath), "utf8"),
  );
  if (!isFixedReplayCacheEvidence(replayCacheEvidence))
    fail("Fixed baseline replay-cache measurement is invalid.");
  if (
    replayCacheEvidence.cumulativeReplayMilliseconds < 0 ||
    replayCacheEvidence.reachesCumulativeThreshold !==
      replayCacheEvidence.cumulativeReplayMilliseconds >= 60_000
  )
    fail("Fixed baseline replay-cache measurement is invalid.");
  const program = readFileSync(programPath, "utf8");
  const programAudit = retainedProgramSessionAudit(program);
  const retainedProgramAudit = fixedBaselineRetainedProgramAudit(programAudit);
  const parsed = parseSdkTranscript(
    readFileSync(transcriptPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line): unknown => JSON.parse(line)),
  );
  if (parsed.tag === "invalid") fail(parsed.message);
  if (
    parsed.value.header.gitSha !== "7dd52785b947159092ed2cdd7895e5b428000ee4" ||
    statSync(transcriptPath).size !== FIXED_TRANSCRIPT_BYTES ||
    createHash("sha256").update(readFileSync(transcriptPath)).digest("hex") !==
      FIXED_TRANSCRIPT_SHA256
  ) {
    fail("Fixed baseline transcript identity changed.");
  }
  const audit = readSdkAudit(auditPath);
  if (audit.tag === "invalid") fail(audit.message);
  if (audit.audit.header.transcriptSha256 !== FIXED_TRANSCRIPT_SHA256) {
    fail("Fixed baseline transcript SHA-256 changed.");
  }
  const projected = reprojectSdkTranscriptTurns(parsed.value.calls);
  if (projected.tag === "invalid") fail(projected.message);
  const auditBytes = statSync(auditPath).size;
  const auditRatio = auditBytes / FIXED_TRANSCRIPT_BYTES;
  if (auditRatio > 0.1) fail("Fixed baseline reviewer audit exceeds 10%.");
  const reductionFactor = FIXED_OBSERVATION_BYTES / projected.encodedByteLength;
  if (reductionFactor < 5)
    fail("Fixed baseline player projection is less than 5x smaller.");
  const directlyReusedFrontiersChecked = directFrontierUseChecks({
    calls: parsed.value.calls,
    projections: projected.projections,
  });
  if (directlyReusedFrontiersChecked !== FIXED_DIRECT_FRONTIER_CHECKS)
    fail(
      `Fixed baseline direct frontier coverage changed from ${FIXED_DIRECT_FRONTIER_CHECKS} to ${directlyReusedFrontiersChecked}.`,
    );
  return {
    schemaVersion: 1,
    transcript: {
      bytes: FIXED_TRANSCRIPT_BYTES,
      sha256: FIXED_TRANSCRIPT_SHA256,
      calls: parsed.value.calls.length,
      continuations: new Set(
        parsed.value.calls.map(({ continuation }) => continuation),
      ).size,
    },
    reviewerAudit: {
      bytes: auditBytes,
      ratioOfTranscript: auditRatio,
      maximumRatio: 0.1,
    },
    playerProjection: {
      bytes: projected.encodedByteLength,
      baselineObservationBytes: FIXED_OBSERVATION_BYTES,
      reductionFactor,
      requiredReductionFactor: 5,
      largestTurnBytes: Math.max(
        ...projected.projections.map((projection) =>
          Buffer.byteLength(JSON.stringify(projection)),
        ),
      ),
      directlyReusedFrontiersChecked,
      retainedProgram: {
        sha256: createHash("sha256").update(program).digest("hex"),
        ...retainedProgramAudit,
      },
    },
    sqlite: {
      baselineStepPayloadBytes: FIXED_STEP_PAYLOAD_BYTES,
      indexedCallPayloadBytes,
      ratioOfBaseline: indexedPayloadRatio,
      maximumRatio: 0.1,
    },
    replayCache: {
      cumulativeReplayMilliseconds:
        replayCacheEvidence.cumulativeReplayMilliseconds,
      prefixCount: replayCacheEvidence.prefixCount,
      cumulativeThresholdMilliseconds: 60_000,
      reachesCumulativeThreshold:
        replayCacheEvidence.reachesCumulativeThreshold,
      nonModelSupervisorShare: {
        tag: "unavailable",
        reason:
          "The retained baseline predates supervisor phase timings; the controlled run supplies the required non-model share.",
      },
      decision: "awaiting-controlled-supervisor-share",
    },
  };
}

function main(args: readonly string[]): void {
  const [
    transcriptPath,
    auditPath,
    programPath,
    indexPath,
    replayCacheMeasurementPath,
    outputPath,
    ...unexpected
  ] = args;
  if (
    transcriptPath === undefined ||
    auditPath === undefined ||
    programPath === undefined ||
    indexPath === undefined ||
    replayCacheMeasurementPath === undefined ||
    outputPath === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: fixed-baseline-measurement.ts <transcript.jsonl> <audit.jsonl> <program.ts> <index.sqlite> <replay-cache-measurement.json> <measurement.json>",
    );
  }
  const measurement = measureFixedBaseline({
    transcriptPath,
    auditPath,
    programPath,
    indexPath,
    replayCacheMeasurementPath,
  });
  writeFileSync(
    resolve(repoRoot, outputPath),
    `${JSON.stringify(measurement, null, 2)}\n`,
    {
      flag: "wx",
    },
  );
  console.log(JSON.stringify(measurement));
}

if (process.argv[1]?.endsWith("fixed-baseline-measurement.ts")) {
  main(process.argv.slice(2));
}
