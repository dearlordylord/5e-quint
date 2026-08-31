import { isDeepStrictEqual } from "node:util";

import { Match } from "effect";

import {
  isSrdStatBlockFidelityBlockingParityIssue,
  type SrdStatBlockFidelityBlockingParityIssue,
  type SrdStatBlockParityReport,
  type SrdStatBlockSourceOccurrence,
  type SrdStatBlockSourcePath,
} from "./stat-block-parity-observation.ts";
import {
  normalizeStatBlockIdentity,
  type NormalizedStatBlockIdentity,
} from "./stat-block-identity.ts";
import {
  projectAuthoredStatBlock,
  projectRawStatBlock,
  type StatBlockScopedFidelityProjection,
  type StatBlockScopedProjectionFailure as RawProjectionFailure,
} from "./stat-block-raw-projection.ts";
import type { SrdStatBlockRecord } from "./types.ts";

type FidelityProjectionProcedure =
  StatBlockScopedFidelityProjection["procedures"][number];
type StatBlockScopedProcedure =
  | Exclude<FidelityProjectionProcedure, { readonly kind: "textOnly" }>
  | Omit<
      Extract<FidelityProjectionProcedure, { readonly kind: "textOnly" }>,
      "reason"
    >;

export type StatBlockScopedMechanics = {
  readonly generalFacts: StatBlockScopedFidelityProjection["generalFacts"];
  readonly resources: StatBlockScopedFidelityProjection["resources"];
  readonly entryNames: StatBlockScopedFidelityProjection["entryNames"];
  readonly traits: StatBlockScopedFidelityProjection["traits"];
  readonly procedures: readonly StatBlockScopedProcedure[];
};

type StatBlockAuthoredAdmissionEvidence =
  StatBlockScopedFidelityProjection["textOnlyProcedures"];

type SrdStatBlockRawFidelityEvidence = {
  readonly name: string;
  readonly anchor: SrdStatBlockSourceOccurrence["anchor"];
};

type SrdStatBlockAuthoredFidelityEvidence = {
  readonly statBlockId: SrdStatBlockRecord["id"];
  readonly name: string;
};

export type StatBlockScopedProjectionFailure =
  | {
      readonly tag: "projection-threw";
      readonly errorName: string;
      readonly message: string;
    }
  | {
      readonly tag: "source-not-supplied";
      readonly sourcePath: SrdStatBlockSourcePath;
    }
  | {
      readonly tag: "source-path-mismatch";
      readonly suppliedSourcePath: SrdStatBlockSourcePath;
      readonly occurrenceSourcePath: SrdStatBlockSourcePath;
    }
  | { readonly tag: "projection-outcome-not-supplied" }
  | { readonly tag: "projection-outside-parity-denominator" }
  | {
      readonly tag: "projection-binding-not-unique";
      readonly cause: "repeated-denominator";
    }
  | {
      readonly tag: "projection-binding-not-unique";
      readonly cause: "repeated-candidates";
    };

function scopedProjectionFailure(
  failure: RawProjectionFailure,
): StatBlockScopedProjectionFailure {
  return Match.value(failure).pipe(
    Match.when({ tag: "projection-error" }, ({ errorName, message }) => ({
      tag: "projection-threw" as const,
      errorName,
      message,
    })),
    Match.when({ tag: "source-path-mismatch" }, (unchanged) => unchanged),
    Match.exhaustive,
  );
}

type StatBlockScopedProjectionOutcome =
  | { readonly tag: "projected"; readonly mechanics: StatBlockScopedMechanics }
  | {
      readonly tag: "failed";
      readonly failure: StatBlockScopedProjectionFailure;
    };

export type SrdStatBlockRawFidelityProjection = {
  readonly evidence: SrdStatBlockRawFidelityEvidence;
  readonly outcome: StatBlockScopedProjectionOutcome;
};

export type SrdStatBlockAuthoredFidelityProjection = {
  readonly evidence: SrdStatBlockAuthoredFidelityEvidence;
  readonly outcome:
    | {
        readonly tag: "projected";
        readonly mechanics: StatBlockScopedMechanics;
        readonly admission: StatBlockAuthoredAdmissionEvidence;
      }
    | {
        readonly tag: "failed";
        readonly failure: StatBlockScopedProjectionFailure;
      };
};

export type SrdStatBlockFidelityProjectionInput = {
  readonly parity: SrdStatBlockParityReport;
  readonly raw: readonly SrdStatBlockRawFidelityProjection[];
  readonly authored: readonly SrdStatBlockAuthoredFidelityProjection[];
};

export type SrdStatBlockScopedFidelityIssue =
  | {
      readonly kind: "raw-projection-failed";
      readonly source: SrdStatBlockRawFidelityEvidence;
      readonly failure: StatBlockScopedProjectionFailure;
    }
  | {
      readonly kind: "authored-projection-failed";
      readonly authoredRecord: SrdStatBlockAuthoredFidelityEvidence;
      readonly failure: StatBlockScopedProjectionFailure;
    }
  | {
      readonly kind: "mechanics-mismatch";
      readonly source: SrdStatBlockRawFidelityEvidence;
      readonly authoredRecord: SrdStatBlockAuthoredFidelityEvidence;
      readonly rawMechanics: StatBlockScopedMechanics;
      readonly authoredMechanics: StatBlockScopedMechanics;
    };

type ConsistentOccurrence = {
  readonly source: SrdStatBlockRawFidelityEvidence;
  readonly authoredRecord: SrdStatBlockAuthoredFidelityEvidence;
  readonly mechanics: StatBlockScopedMechanics;
};

type AuthoredAdmission = {
  readonly authoredRecord: SrdStatBlockAuthoredFidelityEvidence;
  readonly admission: StatBlockAuthoredAdmissionEvidence;
};

export type SrdStatBlockScopedFidelityResult =
  | {
      readonly tag: "consistent";
      readonly occurrences: readonly ConsistentOccurrence[];
      readonly authoredAdmissions: readonly AuthoredAdmission[];
    }
  | {
      readonly tag: "inconsistent";
      readonly issues: readonly [
        SrdStatBlockScopedFidelityIssue,
        ...SrdStatBlockScopedFidelityIssue[],
      ];
      readonly authoredAdmissions: readonly AuthoredAdmission[];
    };

export type SrdStatBlockScopedFidelityInput = {
  readonly parity: SrdStatBlockParityReport;
  readonly sourceByPath: ReadonlyMap<SrdStatBlockSourcePath, string>;
  readonly authoredRecords: readonly SrdStatBlockRecord[];
  readonly equipmentSource: string;
};

function scopedProcedure(
  procedure: FidelityProjectionProcedure,
): StatBlockScopedProcedure {
  return Match.value(procedure).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => {
      const { reason: _reason, ...mechanics } = textOnly;
      return mechanics;
    }),
    Match.when({ kind: "attack_roll" }, (attack) => attack),
    Match.when({ kind: "save" }, (save) => save),
    Match.when({ kind: "multiattack" }, (multiattack) => multiattack),
    Match.when({ kind: "action_option" }, (actionOption) => actionOption),
    Match.when({ kind: "spellcasting" }, (spellcasting) => spellcasting),
    Match.exhaustive,
  );
}

function projectStatBlockScopedMechanics(
  projection: StatBlockScopedFidelityProjection,
): StatBlockScopedMechanics {
  return {
    generalFacts: projection.generalFacts,
    resources: projection.resources,
    entryNames: projection.entryNames,
    traits: projection.traits,
    procedures: projection.procedures.map(scopedProcedure),
  };
}

export function projectStatBlockScopedMechanicsList(
  projections: readonly StatBlockScopedFidelityProjection[],
): readonly StatBlockScopedMechanics[] {
  return projections.map(projectStatBlockScopedMechanics);
}

function projectRawOccurrence(
  source: string,
  occurrence: SrdStatBlockSourceOccurrence,
  equipmentSource: string,
): SrdStatBlockRawFidelityProjection {
  const evidence = rawEvidence(occurrence);
  return Match.value(
    projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: source },
      occurrence,
      equipmentSource,
    ),
  ).pipe(
    Match.when({ tag: "failed" }, ({ failure }) => ({
      evidence,
      outcome: {
        tag: "failed" as const,
        failure: scopedProjectionFailure(failure),
      },
    })),
    Match.when({ tag: "projected" }, ({ projection }) => ({
      evidence,
      outcome: {
        tag: "projected" as const,
        mechanics: projectStatBlockScopedMechanics(projection),
      },
    })),
    Match.exhaustive,
  );
}

function projectAuthoredRecord(
  record: SrdStatBlockRecord,
  equipmentSource: string,
): SrdStatBlockAuthoredFidelityProjection {
  const evidence = authoredEvidence(record);
  return Match.value(projectAuthoredStatBlock(record, equipmentSource)).pipe(
    Match.when({ tag: "failed" }, ({ failure }) => ({
      evidence,
      outcome: {
        tag: "failed" as const,
        failure: scopedProjectionFailure(failure),
      },
    })),
    Match.when({ tag: "projected" }, ({ projection }) => ({
      evidence,
      outcome: {
        tag: "projected" as const,
        mechanics: projectStatBlockScopedMechanics(projection),
        admission: projection.textOnlyProcedures,
      },
    })),
    Match.exhaustive,
  );
}

function sourceForOccurrence(
  sourceByPath: ReadonlyMap<SrdStatBlockSourcePath, string>,
  occurrence: SrdStatBlockSourceOccurrence,
): string | undefined {
  return sourceByPath.get(occurrence.anchor.sourcePath);
}

function rawEvidence(
  occurrence: SrdStatBlockSourceOccurrence,
): SrdStatBlockRawFidelityEvidence {
  return {
    name: occurrence.name,
    anchor: occurrence.anchor,
  };
}

function authoredEvidence(
  record: Pick<SrdStatBlockRecord, "id" | "name">,
): SrdStatBlockAuthoredFidelityEvidence {
  return {
    statBlockId: record.id,
    name: record.name,
  };
}

function authoredRecordKey(
  record: Pick<SrdStatBlockRecord, "id" | "name">,
): string {
  return authoredProjectionKey(authoredEvidence(record));
}

export function projectSrdStatBlockScopedFidelity(
  input: SrdStatBlockScopedFidelityInput,
): SrdStatBlockFidelityProjectionInput {
  const raw = input.parity.discovery.occurrences.flatMap((occurrence) => {
    const source = sourceForOccurrence(input.sourceByPath, occurrence);
    return [
      source === undefined
        ? {
            evidence: rawEvidence(occurrence),
            outcome: {
              tag: "failed" as const,
              failure: {
                tag: "source-not-supplied" as const,
                sourcePath: occurrence.anchor.sourcePath,
              },
            },
          }
        : projectRawOccurrence(source, occurrence, input.equipmentSource),
    ];
  });
  const authoredBindings = bindCandidatesToDenominator(
    input.parity.installedRecords,
    input.authoredRecords,
    authoredRecordKey,
    authoredRecordKey,
    {
      missing: (installedRecord) => ({
        evidence: authoredEvidence(installedRecord),
        outcome: {
          tag: "failed" as const,
          failure: { tag: "projection-outcome-not-supplied" as const },
        },
      }),
      repeatedDenominator: (installedRecord) => ({
        evidence: authoredEvidence(installedRecord),
        outcome: {
          tag: "failed" as const,
          failure: {
            tag: "projection-binding-not-unique" as const,
            cause: "repeated-denominator" as const,
          },
        },
      }),
      repeatedCandidates: (installedRecord) => ({
        evidence: authoredEvidence(installedRecord),
        outcome: {
          tag: "failed" as const,
          failure: {
            tag: "projection-binding-not-unique" as const,
            cause: "repeated-candidates" as const,
          },
        },
      }),
      matched: (record) => projectAuthoredRecord(record, input.equipmentSource),
    },
  );
  const outsideParityDenominator = authoredBindings.remainingCandidates.map(
    (record): SrdStatBlockAuthoredFidelityProjection => ({
      evidence: authoredEvidence(record),
      outcome: {
        tag: "failed",
        failure: { tag: "projection-outside-parity-denominator" },
      },
    }),
  );
  return {
    parity: input.parity,
    raw,
    authored: [...authoredBindings.expected, ...outsideParityDenominator],
  };
}

function authoredProjectionKey(
  authored: SrdStatBlockAuthoredFidelityEvidence,
): string {
  return JSON.stringify([
    authored.statBlockId,
    normalizeStatBlockIdentity(authored.name),
  ]);
}

function numberOrderKey(value: number): string {
  if (Number.isNaN(value)) return JSON.stringify(["not-a-number"]);
  if (value === Number.POSITIVE_INFINITY) {
    return JSON.stringify(["positive-infinity"]);
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return JSON.stringify(["negative-infinity"]);
  }
  if (Object.is(value, -0)) return JSON.stringify(["negative-zero"]);
  return JSON.stringify(["finite", value.toString()]);
}

function occurrenceKey(
  source: SrdStatBlockRawFidelityEvidence,
  normalizeIdentity: (
    name: string,
  ) => NormalizedStatBlockIdentity = normalizeStatBlockIdentity,
): string {
  return JSON.stringify([
    source.anchor.sourcePath,
    numberOrderKey(source.anchor.lineStart),
    numberOrderKey(source.anchor.lineEnd),
    normalizeIdentity(source.name),
  ]);
}

function rawEvidenceOrderKey(source: SrdStatBlockRawFidelityEvidence): string {
  return JSON.stringify([
    source.anchor.sourcePath,
    source.anchor.heading,
    numberOrderKey(source.anchor.lineStart),
    numberOrderKey(source.anchor.lineEnd),
    numberOrderKey(source.anchor.spanEnd),
    source.anchor.section,
    source.name,
  ]);
}

function authoredEvidenceOrderKey(
  authored: SrdStatBlockAuthoredFidelityEvidence,
): string {
  return JSON.stringify([authored.statBlockId, authored.name]);
}

function compareOrderKeys(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

type NonEmptyCandidates<Candidate> = [Candidate, ...Candidate[]];

function projectionGroups<Projection extends object>(
  projections: readonly Projection[],
  keyFor: (projection: Projection) => string,
): Map<string, NonEmptyCandidates<Projection>> {
  const groups = new Map<string, NonEmptyCandidates<Projection>>();
  for (const projection of projections) {
    const key = keyFor(projection);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [projection]);
    } else {
      group.push(projection);
    }
  }
  return groups;
}

function bindCandidatesToDenominator<
  Denominator extends object,
  Candidate extends object,
  Result,
>(
  denominator: readonly Denominator[],
  candidates: readonly Candidate[],
  denominatorKey: (entry: Denominator) => string,
  candidateKey: (candidate: Candidate) => string,
  handlers: {
    readonly missing: (entry: Denominator) => Result;
    readonly repeatedDenominator: (entry: Denominator) => Result;
    readonly repeatedCandidates: (entry: Denominator) => Result;
    readonly matched: (candidate: Candidate) => Result;
  },
): {
  readonly expected: readonly Result[];
  readonly remainingCandidates: readonly Candidate[];
} {
  const denominatorGroups = projectionGroups(denominator, denominatorKey);
  const candidateGroups = projectionGroups(candidates, candidateKey);
  const expected: Result[] = [];

  for (const denominatorGroup of denominatorGroups.values()) {
    const [entry, ...additionalDenominatorEntries] = denominatorGroup;
    const key = denominatorKey(entry);
    const candidateGroup = candidateGroups.get(key);
    candidateGroups.delete(key);

    if (additionalDenominatorEntries.length > 0) {
      expected.push(
        ...denominatorGroup.map((denominatorEntry) =>
          handlers.repeatedDenominator(denominatorEntry),
        ),
      );
    } else if (candidateGroup === undefined) {
      expected.push(handlers.missing(entry));
    } else {
      const [candidate, ...additionalCandidates] = candidateGroup;
      expected.push(
        additionalCandidates.length === 0
          ? handlers.matched(candidate)
          : handlers.repeatedCandidates(entry),
      );
    }
  }

  return {
    expected,
    remainingCandidates: Array.from(candidateGroups.values()).flat(),
  };
}

function parityBoundProjections<
  Denominator extends object,
  Evidence,
  Projection extends object,
>(
  denominator: readonly Denominator[],
  projections: readonly Projection[],
  evidenceFor: (denominatorEntry: Denominator) => Evidence,
  evidenceOf: (projection: Projection) => Evidence,
  keyFor: (evidence: Evidence) => string,
  failedProjection: (
    evidence: Evidence,
    failure: StatBlockScopedProjectionFailure,
  ) => Projection,
): readonly Projection[] {
  const bindings = bindCandidatesToDenominator(
    denominator,
    projections,
    (entry) => keyFor(evidenceFor(entry)),
    (projection) => keyFor(evidenceOf(projection)),
    {
      missing: (entry) =>
        failedProjection(evidenceFor(entry), {
          tag: "projection-outcome-not-supplied",
        }),
      repeatedDenominator: (entry) =>
        failedProjection(evidenceFor(entry), {
          tag: "projection-binding-not-unique",
          cause: "repeated-denominator",
        }),
      repeatedCandidates: (entry) =>
        failedProjection(evidenceFor(entry), {
          tag: "projection-binding-not-unique",
          cause: "repeated-candidates",
        }),
      matched: (candidate) => candidate,
    },
  );
  const remaining = bindings.remainingCandidates.map((projection) =>
    failedProjection(evidenceOf(projection), {
      tag: "projection-outside-parity-denominator",
    }),
  );
  return [...bindings.expected, ...remaining];
}

function failedRawProjection(
  evidence: SrdStatBlockRawFidelityEvidence,
  failure: StatBlockScopedProjectionFailure,
): SrdStatBlockRawFidelityProjection {
  return { evidence, outcome: { tag: "failed", failure } };
}

function failedAuthoredProjection(
  evidence: SrdStatBlockAuthoredFidelityEvidence,
  failure: StatBlockScopedProjectionFailure,
): SrdStatBlockAuthoredFidelityProjection {
  return { evidence, outcome: { tag: "failed", failure } };
}

function parityBoundRawProjections(
  input: SrdStatBlockFidelityProjectionInput,
  normalizeIdentity: (name: string) => NormalizedStatBlockIdentity,
): readonly SrdStatBlockRawFidelityProjection[] {
  return parityBoundProjections(
    input.parity.discovery.occurrences,
    input.raw,
    rawEvidence,
    ({ evidence }) => evidence,
    (evidence) => occurrenceKey(evidence, normalizeIdentity),
    failedRawProjection,
  );
}

function parityBoundAuthoredProjections(
  input: SrdStatBlockFidelityProjectionInput,
  normalizeIdentity: (name: string) => NormalizedStatBlockIdentity,
): readonly SrdStatBlockAuthoredFidelityProjection[] {
  return parityBoundProjections(
    input.parity.installedRecords,
    input.authored,
    authoredEvidence,
    ({ evidence }) => evidence,
    (evidence) =>
      JSON.stringify([evidence.statBlockId, normalizeIdentity(evidence.name)]),
    failedAuthoredProjection,
  );
}

function projectionFailureOrderKey(
  failure: StatBlockScopedProjectionFailure,
): string {
  return Match.value(failure).pipe(
    Match.discriminatorsExhaustive("tag")({
      "projection-threw": ({ errorName, message }) =>
        JSON.stringify(["projection-threw", errorName, message]),
      "source-not-supplied": ({ sourcePath }) =>
        JSON.stringify(["source-not-supplied", sourcePath]),
      "source-path-mismatch": ({ suppliedSourcePath, occurrenceSourcePath }) =>
        JSON.stringify([
          "source-path-mismatch",
          suppliedSourcePath,
          occurrenceSourcePath,
        ]),
      "projection-outcome-not-supplied": () =>
        JSON.stringify(["projection-outcome-not-supplied"]),
      "projection-outside-parity-denominator": () =>
        JSON.stringify(["projection-outside-parity-denominator"]),
      "projection-binding-not-unique": ({ cause }) =>
        JSON.stringify(["projection-binding-not-unique", cause]),
    }),
  );
}

function issueKey(issue: SrdStatBlockScopedFidelityIssue): string {
  return Match.value(issue).pipe(
    Match.discriminatorsExhaustive("kind")({
      "raw-projection-failed": ({ source, failure }) =>
        JSON.stringify([
          0,
          rawEvidenceOrderKey(source),
          projectionFailureOrderKey(failure),
        ]),
      "authored-projection-failed": ({ authoredRecord, failure }) =>
        JSON.stringify([
          1,
          authoredEvidenceOrderKey(authoredRecord),
          projectionFailureOrderKey(failure),
        ]),
      "mechanics-mismatch": ({ source, authoredRecord }) =>
        JSON.stringify([
          2,
          rawEvidenceOrderKey(source),
          authoredEvidenceOrderKey(authoredRecord),
        ]),
    }),
  );
}

function blocksRawAuthoredComparison(
  issue: SrdStatBlockFidelityBlockingParityIssue,
  raw: SrdStatBlockRawFidelityEvidence,
  rawIdentity: NormalizedStatBlockIdentity,
  authored: SrdStatBlockAuthoredFidelityEvidence,
  normalizeIdentity: (name: string) => NormalizedStatBlockIdentity,
): boolean {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "missing" },
      ({ name }) => normalizeIdentity(name) === rawIdentity,
    ),
    Match.when(
      { kind: "extra" },
      ({ statBlockId }) => statBlockId === authored.statBlockId,
    ),
    Match.when(
      { kind: "duplicate-id" },
      ({ statBlockId }) => statBlockId === authored.statBlockId,
    ),
    Match.when(
      { kind: "duplicate-identity" },
      ({ name }) => normalizeIdentity(name) === rawIdentity,
    ),
    Match.when(
      { kind: "divergent-source" },
      ({ name }) => normalizeIdentity(name) === rawIdentity,
    ),
    Match.when(
      { kind: "malformed-source" },
      ({ sourcePath, heading }) =>
        sourcePath === raw.anchor.sourcePath && heading === raw.anchor.heading,
    ),
    Match.exhaustive,
  );
}

function hasBlockedComparison(
  parity: SrdStatBlockParityReport,
  raw: SrdStatBlockRawFidelityEvidence,
  rawIdentity: NormalizedStatBlockIdentity,
  authored: SrdStatBlockAuthoredFidelityEvidence,
  normalizeIdentity: (name: string) => NormalizedStatBlockIdentity,
): boolean {
  return parity.issues
    .filter(isSrdStatBlockFidelityBlockingParityIssue)
    .some((issue) =>
      blocksRawAuthoredComparison(
        issue,
        raw,
        rawIdentity,
        authored,
        normalizeIdentity,
      ),
    );
}

function authoredProjectionGroups(
  authored: readonly SrdStatBlockAuthoredFidelityProjection[],
  normalizeIdentity: (name: string) => NormalizedStatBlockIdentity,
): ReadonlyMap<
  NormalizedStatBlockIdentity,
  readonly SrdStatBlockAuthoredFidelityProjection[]
> {
  const groups = new Map<
    NormalizedStatBlockIdentity,
    SrdStatBlockAuthoredFidelityProjection[]
  >();
  for (const projection of authored) {
    const normalizedIdentity = normalizeIdentity(projection.evidence.name);
    const group = groups.get(normalizedIdentity);
    if (group === undefined) {
      groups.set(normalizedIdentity, [projection]);
    } else {
      group.push(projection);
    }
  }
  return groups;
}

export function reconcileSrdStatBlockScopedFidelity(
  input: SrdStatBlockFidelityProjectionInput,
): SrdStatBlockScopedFidelityResult {
  const identitiesByName = new Map<string, NormalizedStatBlockIdentity>();
  const normalizeIdentity = (name: string): NormalizedStatBlockIdentity => {
    const existing = identitiesByName.get(name);
    if (existing !== undefined) return existing;
    const identity = normalizeStatBlockIdentity(name);
    identitiesByName.set(name, identity);
    return identity;
  };
  const rawProjections = parityBoundRawProjections(input, normalizeIdentity);
  const authoredProjections = parityBoundAuthoredProjections(
    input,
    normalizeIdentity,
  );
  const authoredByIdentity = authoredProjectionGroups(
    authoredProjections,
    normalizeIdentity,
  );
  const issues: SrdStatBlockScopedFidelityIssue[] = authoredProjections.flatMap(
    ({ evidence, outcome }) =>
      Match.value(outcome).pipe(
        Match.discriminatorsExhaustive("tag")({
          projected: () => [],
          failed: ({ failure }) => [
            {
              kind: "authored-projection-failed" as const,
              authoredRecord: evidence,
              failure,
            },
          ],
        }),
      ),
  );
  const consistentOccurrences: ConsistentOccurrence[] = [];

  for (const raw of rawProjections) {
    Match.value(raw.outcome).pipe(
      Match.discriminatorsExhaustive("tag")({
        failed: ({ failure }) => {
          issues.push({
            kind: "raw-projection-failed",
            source: raw.evidence,
            failure,
          });
        },
        projected: ({ mechanics: rawMechanics }) => {
          const rawIdentity = normalizeIdentity(raw.evidence.name);
          const authoredGroup = authoredByIdentity.get(rawIdentity);
          const authored =
            authoredGroup?.length === 1 ? authoredGroup[0] : undefined;
          if (
            authored === undefined ||
            hasBlockedComparison(
              input.parity,
              raw.evidence,
              rawIdentity,
              authored.evidence,
              normalizeIdentity,
            )
          ) {
            return;
          }
          Match.value(authored.outcome).pipe(
            Match.discriminatorsExhaustive("tag")({
              failed: () => undefined,
              projected: ({ mechanics: authoredMechanics }) => {
                if (!isDeepStrictEqual(rawMechanics, authoredMechanics)) {
                  issues.push({
                    kind: "mechanics-mismatch",
                    source: raw.evidence,
                    authoredRecord: authored.evidence,
                    rawMechanics,
                    authoredMechanics,
                  });
                } else {
                  consistentOccurrences.push({
                    source: raw.evidence,
                    authoredRecord: authored.evidence,
                    mechanics: rawMechanics,
                  });
                }
              },
            }),
          );
        },
      }),
    );
  }

  const authoredAdmissions = authoredProjections
    .flatMap(({ evidence, outcome }) =>
      Match.value(outcome).pipe(
        Match.discriminatorsExhaustive("tag")({
          failed: () => [],
          projected: ({ admission }) => [
            { authoredRecord: evidence, admission },
          ],
        }),
      ),
    )
    .sort((left, right) =>
      compareOrderKeys(
        authoredEvidenceOrderKey(left.authoredRecord),
        authoredEvidenceOrderKey(right.authoredRecord),
      ),
    );
  const orderedIssues = [...issues].sort((left, right) =>
    compareOrderKeys(issueKey(left), issueKey(right)),
  );
  const [firstIssue, ...remainingIssues] = orderedIssues;
  if (firstIssue !== undefined) {
    return {
      tag: "inconsistent",
      issues: [firstIssue, ...remainingIssues],
      authoredAdmissions,
    };
  }

  return {
    tag: "consistent",
    occurrences: [...consistentOccurrences].sort((left, right) =>
      compareOrderKeys(
        JSON.stringify([
          rawEvidenceOrderKey(left.source),
          authoredEvidenceOrderKey(left.authoredRecord),
        ]),
        JSON.stringify([
          rawEvidenceOrderKey(right.source),
          authoredEvidenceOrderKey(right.authoredRecord),
        ]),
      ),
    ),
    authoredAdmissions,
  };
}

export function evaluateSrdStatBlockScopedFidelity(
  input: SrdStatBlockScopedFidelityInput,
): SrdStatBlockScopedFidelityResult {
  return reconcileSrdStatBlockScopedFidelity(
    projectSrdStatBlockScopedFidelity(input),
  );
}
