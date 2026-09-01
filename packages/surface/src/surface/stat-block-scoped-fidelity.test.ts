import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Match } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";
import { NonNegativeInteger, PositiveInteger } from "@dnd/shared/types";

import {
  deriveSrdStatBlockParity,
  SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type SrdStatBlockParityIssue,
} from "../../../../scripts/srd521-stat-block-parity.ts";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";
import {
  normalizeStatBlockIdentity,
  type NormalizedStatBlockIdentity,
} from "./stat-block-identity.ts";
import {
  projectAuthoredStatBlock,
  projectRawStatBlock,
} from "./stat-block-raw-projection.ts";
import {
  projectSrdStatBlockScopedFidelity,
  reconcileSrdStatBlockScopedFidelity,
  type SrdStatBlockAuthoredFidelityProjection,
  type SrdStatBlockFidelityProjectionInput,
  type SrdStatBlockRawFidelityProjection,
  type SrdStatBlockScopedFidelityIssue,
  type SrdStatBlockScopedFidelityResult,
  type StatBlockScopedProjectionFailure,
  type StatBlockScopedMechanics,
} from "./stat-block-scoped-fidelity.test-support.ts";
import { evaluateSrdStatBlockScopedFidelity } from "./stat-block-scoped-fidelity.ts";

const repositoryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../",
);
const sourceFiles = SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
  sourcePath,
  contents: readFileSync(join(repositoryRoot, sourcePath), "utf8"),
}));
const sourceByPath = new Map(
  sourceFiles.map(({ sourcePath, contents }) => [sourcePath, contents]),
);
const equipmentSource = readFileSync(
  join(repositoryRoot, ".references/srd-5.2.1/Equipment.md"),
  "utf8",
);
const corpusParity = deriveSrdStatBlockParity({
  sourceFiles,
  installedStatBlocks: srdStatBlockCollection.statBlocks,
  sourceReadIssues: [],
  peerObservations: [],
});
const corpusInput = {
  parity: corpusParity,
  sourceByPath,
  authoredRecords: srdStatBlockCollection.statBlocks,
  equipmentSource,
};

function assessableProjections() {
  return projectSrdStatBlockScopedFidelity(corpusInput);
}

const cachedCorpusProjections = assessableProjections();
const normalizedEvidenceIdentities = new Map<
  string,
  NormalizedStatBlockIdentity
>();

function normalizedEvidenceIdentity(evidence: {
  readonly name: string;
}): NormalizedStatBlockIdentity {
  const existing = normalizedEvidenceIdentities.get(evidence.name);
  if (existing !== undefined) return existing;
  const identity = normalizeStatBlockIdentity(evidence.name);
  normalizedEvidenceIdentities.set(evidence.name, identity);
  return identity;
}

function delimiterCollisionAssessment(
  idPrefix: string,
  sharedSegment: string,
  identitySuffix: string,
) {
  const template = cachedCorpusProjections.authored.find(({ outcome }) =>
    Match.value(outcome).pipe(
      Match.when({ tag: "projected" }, () => true),
      Match.when({ tag: "failed" }, () => false),
      Match.exhaustive,
    ),
  );
  if (template === undefined) {
    throw new Error("Expected a projected authored corpus record");
  }
  const duplicatedEvidence = {
    statBlockId: statBlockId(`${idPrefix}|${sharedSegment}`),
    name: identitySuffix,
  };
  const missingEvidence = {
    statBlockId: statBlockId(idPrefix),
    name: `${sharedSegment}|${identitySuffix}`,
  };
  const installedRecords = [duplicatedEvidence, missingEvidence].map(
    ({ statBlockId: id, name }) => ({
      id,
      name,
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "synthetic-key-collision",
      },
    }),
  );
  const duplicatedProjection = { ...template, evidence: duplicatedEvidence };
  const result = reconcileSrdStatBlockScopedFidelity({
    parity: {
      ...corpusParity,
      discovery: { occurrences: [], identities: [], issues: [] },
      installedRecords,
      issues: [],
    },
    raw: [],
    authored: [duplicatedProjection, duplicatedProjection],
  });
  return {
    issues: inconsistentIssues(result),
    duplicatedEvidence,
    missingEvidence,
  };
}

function expectDelimiterCollisionEvidence(
  assessment: ReturnType<typeof delimiterCollisionAssessment>,
): void {
  expect(assessment.issues).toHaveLength(2);
  expect(assessment.issues).toContainEqual({
    kind: "authored-projection-failed",
    authoredRecord: assessment.missingEvidence,
    failure: { tag: "projection-outcome-not-supplied" },
  });
  expect(assessment.issues).toContainEqual({
    kind: "authored-projection-failed",
    authoredRecord: assessment.duplicatedEvidence,
    failure: {
      tag: "projection-binding-not-unique",
      cause: "repeated-candidates",
    },
  });
}

const collisionKeySegmentArbitrary = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
    minLength: 1,
    maxLength: 8,
  })
  .map((characters) => characters.join(""));

function consistentResult(assessment: SrdStatBlockScopedFidelityResult) {
  return Match.value(assessment).pipe(
    Match.when({ tag: "consistent" }, (consistent) => consistent),
    Match.when({ tag: "inconsistent" }, ({ issues }) => {
      throw new Error(JSON.stringify(issues));
    }),
    Match.exhaustive,
  );
}

function inconsistentIssues(result: SrdStatBlockScopedFidelityResult) {
  return Match.value(result).pipe(
    Match.when({ tag: "consistent" }, () => {
      expect(result.tag).toBe("inconsistent");
      throw new Error("Expected mutated scoped fidelity to be inconsistent");
    }),
    Match.when({ tag: "inconsistent" }, ({ issues }) => issues),
    Match.exhaustive,
  );
}

function sourceKey(projection: SrdStatBlockRawFidelityProjection): string {
  const { anchor } = projection.evidence;
  return `${anchor.sourcePath}:${anchor.lineStart}-${anchor.lineEnd}`;
}

function issueEvidenceKey(issue: SrdStatBlockScopedFidelityIssue): string {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "raw-projection-failed" },
      ({ source }) =>
        `${issue.kind}|${source.anchor.sourcePath}:${source.anchor.lineStart}-${source.anchor.lineEnd}`,
    ),
    Match.when(
      { kind: "authored-projection-failed" },
      ({ authoredRecord }) => `${issue.kind}|${authoredRecord.statBlockId}`,
    ),
    Match.when(
      { kind: "mechanics-mismatch" },
      ({ source, authoredRecord }) =>
        `${issue.kind}|${source.anchor.sourcePath}:${source.anchor.lineStart}-${source.anchor.lineEnd}|${authoredRecord.statBlockId}`,
    ),
    Match.exhaustive,
  );
}

function issueFailureEvidenceKey(
  issue: SrdStatBlockScopedFidelityIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { kind: "raw-projection-failed" },
      ({ source, failure }) =>
        `${issueEvidenceKey(issue)}|${failure.tag}|${normalizedEvidenceIdentity(source)}`,
    ),
    Match.when(
      { kind: "authored-projection-failed" },
      ({ authoredRecord, failure }) =>
        `${issueEvidenceKey(issue)}|${failure.tag}|${normalizedEvidenceIdentity(authoredRecord)}`,
    ),
    Match.when({ kind: "mechanics-mismatch" }, () => issueEvidenceKey(issue)),
    Match.exhaustive,
  );
}

function isProjectionOutcomeNotSupplied(
  failure: StatBlockScopedProjectionFailure,
): boolean {
  return Match.value(failure).pipe(
    Match.when({ tag: "projection-outcome-not-supplied" }, () => true),
    Match.when({ tag: "projection-issues" }, () => false),
    Match.when({ tag: "source-not-supplied" }, () => false),
    Match.when({ tag: "source-path-mismatch" }, () => false),
    Match.when({ tag: "projection-outside-parity-denominator" }, () => false),
    Match.when({ tag: "projection-binding-not-unique" }, () => false),
    Match.exhaustive,
  );
}

const SYNTHETIC_PROJECTION_FAILURE = {
  tag: "projection-issues",
  issues: [
    {
      kind: "malformed-evidence",
      anchor: {
        kind: "raw",
        sourcePath: ".references/srd-5.2.1/Animals.md",
        heading: "Synthetic Projection",
        lineStart: 1,
        lineEnd: 1,
        field: "synthetic",
      },
      evidence: "synthetic-invalid",
      expected: "synthetic-valid",
    },
  ],
} as const satisfies StatBlockScopedProjectionFailure;

function nonemptyRawProjections(
  projections: readonly SrdStatBlockRawFidelityProjection[],
): SrdStatBlockFidelityProjectionInput["raw"] {
  const [first, ...rest] = projections;
  if (first === undefined) throw new Error("Expected a RAW projection");
  return [first, ...rest];
}

function nonemptyAuthoredProjections(
  projections: readonly SrdStatBlockAuthoredFidelityProjection[],
): SrdStatBlockFidelityProjectionInput["authored"] {
  const [first, ...rest] = projections;
  if (first === undefined) throw new Error("Expected an authored projection");
  return [first, ...rest];
}

function projectedMechanics(
  projection: SrdStatBlockAuthoredFidelityProjection,
): StatBlockScopedMechanics | undefined {
  return Match.value(projection.outcome).pipe(
    Match.when({ tag: "projected" }, ({ mechanics }) => mechanics),
    Match.when({ tag: "failed" }, () => undefined),
    Match.exhaustive,
  );
}

function changeMechanics(
  projection: SrdStatBlockAuthoredFidelityProjection,
  mutate: (mechanics: StatBlockScopedMechanics) => StatBlockScopedMechanics,
): SrdStatBlockAuthoredFidelityProjection {
  return Match.value(projection.outcome).pipe(
    Match.when({ tag: "failed" }, () => projection),
    Match.when({ tag: "projected" }, (outcome) => ({
      ...projection,
      outcome: {
        ...outcome,
        mechanics: mutate(outcome.mechanics),
      },
    })),
    Match.exhaustive,
  );
}

type MutationDescriptor<Key extends string = string> =
  | {
      readonly kind: "raw-projection-failure";
      readonly key: Key;
      readonly accepts: (mechanics: StatBlockScopedMechanics) => boolean;
      readonly mutate: (
        projection: SrdStatBlockRawFidelityProjection,
      ) => SrdStatBlockRawFidelityProjection;
    }
  | {
      readonly kind: "authored-projection-failure";
      readonly key: Key;
      readonly accepts: (mechanics: StatBlockScopedMechanics) => boolean;
      readonly mutate: (
        projection: SrdStatBlockAuthoredFidelityProjection,
      ) => SrdStatBlockAuthoredFidelityProjection;
    }
  | {
      readonly kind: "mechanics-mismatch";
      readonly key: Key;
      readonly accepts: (mechanics: StatBlockScopedMechanics) => boolean;
      readonly mutate: (
        mechanics: StatBlockScopedMechanics,
      ) => StatBlockScopedMechanics;
    };

function mechanicsMutationDescriptor<const Key extends string>(
  key: Key,
  accepts: MutationDescriptor["accepts"],
  mutate: (mechanics: StatBlockScopedMechanics) => StatBlockScopedMechanics,
): MutationDescriptor<Key> {
  return {
    kind: "mechanics-mismatch",
    key,
    accepts,
    mutate,
  };
}

const isAttackRollProcedure = (
  procedure: StatBlockScopedMechanics["procedures"][number],
): boolean =>
  Match.value(procedure).pipe(
    Match.when({ kind: "attack_roll" }, () => true),
    Match.when({ kind: "textOnly" }, () => false),
    Match.when({ kind: "save" }, () => false),
    Match.when({ kind: "multiattack" }, () => false),
    Match.when({ kind: "action_option" }, () => false),
    Match.when({ kind: "spellcasting" }, () => false),
    Match.exhaustive,
  );

const incrementAttackRollBonus = (
  procedure: StatBlockScopedMechanics["procedures"][number],
): StatBlockScopedMechanics["procedures"][number] =>
  Match.value(procedure).pipe(
    Match.when({ kind: "attack_roll" }, (attack) => ({
      ...attack,
      attackBonus: attack.attackBonus + 1,
    })),
    Match.when({ kind: "textOnly" }, (textOnly) => textOnly),
    Match.when({ kind: "save" }, (save) => save),
    Match.when({ kind: "multiattack" }, (multiattack) => multiattack),
    Match.when({ kind: "action_option" }, (actionOption) => actionOption),
    Match.when({ kind: "spellcasting" }, (spellcasting) => spellcasting),
    Match.exhaustive,
  );

const MUTATION_DESCRIPTORS = [
  {
    kind: "raw-projection-failure",
    key: "raw-projection-failure",
    accepts: () => true,
    mutate: (projection: SrdStatBlockRawFidelityProjection) => ({
      ...projection,
      outcome: {
        tag: "failed" as const,
        failure: SYNTHETIC_PROJECTION_FAILURE,
      },
    }),
  },
  {
    kind: "authored-projection-failure",
    key: "authored-projection-failure",
    accepts: () => true,
    mutate: (projection: SrdStatBlockAuthoredFidelityProjection) => ({
      ...projection,
      outcome: {
        tag: "failed" as const,
        failure: SYNTHETIC_PROJECTION_FAILURE,
      },
    }),
  },
  mechanicsMutationDescriptor(
    "general-fact",
    () => true,
    (mechanics) => ({
      ...mechanics,
      generalFacts: {
        ...mechanics.generalFacts,
        passivePerception: NonNegativeInteger(
          mechanics.generalFacts.passivePerception + 1,
        ),
      },
    }),
  ),
  mechanicsMutationDescriptor(
    "resource",
    ({ resources }) => resources.length > 0,
    (mechanics) => ({ ...mechanics, resources: mechanics.resources.slice(1) }),
  ),
  mechanicsMutationDescriptor(
    "procedure-order",
    ({ procedures }) => procedures.length > 1,
    (mechanics) => {
      const [first, second, ...rest] = mechanics.procedures;
      return first === undefined || second === undefined
        ? mechanics
        : { ...mechanics, procedures: [second, first, ...rest] };
    },
  ),
  mechanicsMutationDescriptor(
    "trait-description",
    ({ traits }) => traits.length > 0,
    (mechanics) => ({
      ...mechanics,
      traits: mechanics.traits.map((trait, index) =>
        index === 0
          ? { ...trait, description: `${trait.description} Synthetic drift.` }
          : trait,
      ),
    }),
  ),
  mechanicsMutationDescriptor(
    "trait-effect",
    ({ traits }) => traits.some(({ effect }) => effect !== undefined),
    (mechanics) => ({
      ...mechanics,
      traits: mechanics.traits.map((trait) => {
        if (trait.effect === undefined) return trait;
        const { effect: _effect, ...withoutEffect } = trait;
        return withoutEffect;
      }),
    }),
  ),
  mechanicsMutationDescriptor(
    "structural-procedure",
    ({ procedures }) => procedures.some(isAttackRollProcedure),
    (mechanics) => ({
      ...mechanics,
      procedures: mechanics.procedures.map(incrementAttackRollBonus),
    }),
  ),
] as const satisfies readonly MutationDescriptor[];

type MutationKey = (typeof MUTATION_DESCRIPTORS)[number]["key"];
const [firstMutationDescriptor, ...remainingMutationDescriptors] =
  MUTATION_DESCRIPTORS;
const MUTATION_KEYS: readonly [MutationKey, ...MutationKey[]] = [
  firstMutationDescriptor.key,
  ...remainingMutationDescriptors.map(({ key }) => key),
];

type TargetedMutation = {
  readonly descriptor: (typeof MUTATION_DESCRIPTORS)[number];
  readonly projection: SrdStatBlockAuthoredFidelityProjection;
};

function mutationTargets(
  projections: SrdStatBlockFidelityProjectionInput,
): readonly TargetedMutation[] {
  const rawOccurrenceCounts = new Map<NormalizedStatBlockIdentity, number>();
  for (const { evidence } of projections.raw) {
    rawOccurrenceCounts.set(
      normalizedEvidenceIdentity(evidence),
      (rawOccurrenceCounts.get(normalizedEvidenceIdentity(evidence)) ?? 0) + 1,
    );
  }
  const used = new Set<NormalizedStatBlockIdentity>();
  return MUTATION_DESCRIPTORS.map((descriptor) => {
    const projection = projections.authored.find((candidate) => {
      const mechanics = projectedMechanics(candidate);
      return (
        mechanics !== undefined &&
        rawOccurrenceCounts.get(
          normalizedEvidenceIdentity(candidate.evidence),
        ) === 1 &&
        !used.has(normalizedEvidenceIdentity(candidate.evidence)) &&
        descriptor.accepts(mechanics)
      );
    });
    if (projection === undefined) {
      throw new Error("Unable to select an independent fidelity mutation");
    }
    used.add(normalizedEvidenceIdentity(projection.evidence));
    return { descriptor, projection };
  });
}

function mutateProjectionFixture(
  fixture: SrdStatBlockFidelityProjectionInput,
  mutations: readonly MutationKey[],
): {
  readonly projections: SrdStatBlockFidelityProjectionInput;
  readonly expectedIssueKeys: readonly string[];
} {
  const targets = mutationTargets(fixture);
  const mutationSet = new Set(mutations);
  const rawFor = (
    projection: SrdStatBlockAuthoredFidelityProjection,
  ): SrdStatBlockRawFidelityProjection => {
    const rawProjection = fixture.raw.find(
      ({ evidence }) =>
        normalizedEvidenceIdentity(evidence) ===
        normalizedEvidenceIdentity(projection.evidence),
    );
    if (rawProjection === undefined) {
      throw new Error("Mutation target has no RAW occurrence");
    }
    return rawProjection;
  };
  const rawReplacements = new Map<
    NormalizedStatBlockIdentity,
    SrdStatBlockRawFidelityProjection
  >();
  const authoredReplacements = new Map<
    NormalizedStatBlockIdentity,
    SrdStatBlockAuthoredFidelityProjection
  >();
  const expectedIssueKeys: string[] = [];
  for (const { descriptor, projection } of targets) {
    if (!mutationSet.has(descriptor.key)) continue;
    const raw = rawFor(projection);
    Match.value(descriptor).pipe(
      Match.when({ kind: "raw-projection-failure" }, ({ mutate }) => {
        rawReplacements.set(
          normalizedEvidenceIdentity(raw.evidence),
          mutate(raw),
        );
        expectedIssueKeys.push(`raw-projection-failed|${sourceKey(raw)}`);
      }),
      Match.when({ kind: "authored-projection-failure" }, ({ mutate }) => {
        authoredReplacements.set(
          normalizedEvidenceIdentity(projection.evidence),
          mutate(projection),
        );
        expectedIssueKeys.push(
          `authored-projection-failed|${projection.evidence.statBlockId}`,
        );
      }),
      Match.when({ kind: "mechanics-mismatch" }, ({ mutate }) => {
        authoredReplacements.set(
          normalizedEvidenceIdentity(projection.evidence),
          changeMechanics(projection, mutate),
        );
        expectedIssueKeys.push(
          `mechanics-mismatch|${sourceKey(raw)}|${projection.evidence.statBlockId}`,
        );
      }),
      Match.exhaustive,
    );
  }
  const raw = fixture.raw.map(
    (projection) =>
      rawReplacements.get(normalizedEvidenceIdentity(projection.evidence)) ??
      projection,
  );
  const authored = fixture.authored.map(
    (projection) =>
      authoredReplacements.get(
        normalizedEvidenceIdentity(projection.evidence),
      ) ?? projection,
  );
  const [firstRaw, ...remainingRaw] = raw;
  const [firstAuthored, ...remainingAuthored] = authored;
  if (firstRaw === undefined || firstAuthored === undefined) {
    throw new Error("Mutation fixture lost its nonempty projection sets");
  }
  return {
    projections: {
      ...fixture,
      raw: [firstRaw, ...remainingRaw],
      authored: [firstAuthored, ...remainingAuthored],
    },
    expectedIssueKeys: expectedIssueKeys.sort(),
  };
}

function permuteProjectionFixture(
  fixture: SrdStatBlockFidelityProjectionInput,
  rawOrder: readonly number[],
  authoredOrder: readonly number[],
): SrdStatBlockFidelityProjectionInput {
  const raw = rawOrder.flatMap((index) => {
    const projection = fixture.raw[index];
    return projection === undefined ? [] : [projection];
  });
  const authored = authoredOrder.flatMap((index) => {
    const projection = fixture.authored[index];
    return projection === undefined ? [] : [projection];
  });
  const [firstRaw, ...remainingRaw] = raw;
  const [firstAuthored, ...remainingAuthored] = authored;
  if (firstRaw === undefined || firstAuthored === undefined) {
    throw new Error("Permutation lost its nonempty projection sets");
  }
  return {
    ...fixture,
    raw: [firstRaw, ...remainingRaw],
    authored: [firstAuthored, ...remainingAuthored],
  };
}

const PARITY_AND_FIDELITY_SCENARIO_KEYS = [
  "missing-blocks-mismatch",
  "extra-blocks-mismatch",
  "duplicate-id-blocks-mismatch",
  "duplicate-identity-blocks-mismatch",
  "divergent-blocks-mismatch",
  "malformed-blocks-mismatch",
  "provenance-preserves-mismatch",
  "peer-preserves-mismatch",
  "raw-projection-failure",
  "authored-projection-failure",
  "mechanics-mismatch",
] as const;

type ParityAndFidelityScenarioKey =
  (typeof PARITY_AND_FIDELITY_SCENARIO_KEYS)[number];

type ScenarioTarget = {
  readonly raw: SrdStatBlockRawFidelityProjection;
  readonly authored: SrdStatBlockAuthoredFidelityProjection;
};

function parityAndFidelityScenarioTargets(
  fixture: SrdStatBlockFidelityProjectionInput,
): ReadonlyMap<ParityAndFidelityScenarioKey, ScenarioTarget> {
  const rawOccurrenceCounts = new Map<NormalizedStatBlockIdentity, number>();
  for (const { evidence } of fixture.raw) {
    rawOccurrenceCounts.set(
      normalizedEvidenceIdentity(evidence),
      (rawOccurrenceCounts.get(normalizedEvidenceIdentity(evidence)) ?? 0) + 1,
    );
  }
  const candidates = fixture.authored.flatMap((authored) => {
    const authoredProjected = Match.value(authored.outcome).pipe(
      Match.when({ tag: "projected" }, () => true),
      Match.when({ tag: "failed" }, () => false),
      Match.exhaustive,
    );
    if (
      !authoredProjected ||
      rawOccurrenceCounts.get(normalizedEvidenceIdentity(authored.evidence)) !==
        1
    ) {
      return [];
    }
    const raw = fixture.raw.find(
      ({ evidence }) =>
        normalizedEvidenceIdentity(evidence) ===
        normalizedEvidenceIdentity(authored.evidence),
    );
    return raw === undefined
      ? []
      : Match.value(raw.outcome).pipe(
          Match.when({ tag: "projected" }, () => [{ raw, authored }]),
          Match.when({ tag: "failed" }, () => []),
          Match.exhaustive,
        );
  });
  const targets = new Map<ParityAndFidelityScenarioKey, ScenarioTarget>();
  PARITY_AND_FIDELITY_SCENARIO_KEYS.forEach((key, index) => {
    const target = candidates[index];
    if (target === undefined) {
      throw new Error("The corpus does not contain enough scenario targets");
    }
    targets.set(key, target);
  });
  return targets;
}

function passivePerceptionMismatch(
  projection: SrdStatBlockAuthoredFidelityProjection,
): SrdStatBlockAuthoredFidelityProjection {
  return changeMechanics(projection, (mechanics) => ({
    ...mechanics,
    generalFacts: {
      ...mechanics.generalFacts,
      passivePerception: NonNegativeInteger(
        mechanics.generalFacts.passivePerception + 1,
      ),
    },
  }));
}

function scenarioMutationFixture(
  fixture: SrdStatBlockFidelityProjectionInput,
  selectedKeys: readonly ParityAndFidelityScenarioKey[],
): {
  readonly projections: SrdStatBlockFidelityProjectionInput;
  readonly expectedFidelityIssueKeys: readonly string[];
  readonly expectedParityIssues: readonly SrdStatBlockParityIssue[];
} {
  const targets = parityAndFidelityScenarioTargets(fixture);
  const selected = new Set(selectedKeys);
  const rawReplacements = new Map<
    NormalizedStatBlockIdentity,
    SrdStatBlockRawFidelityProjection
  >();
  const authoredReplacements = new Map<
    NormalizedStatBlockIdentity,
    SrdStatBlockAuthoredFidelityProjection
  >();
  const expectedFidelityIssueKeys: string[] = [];
  const expectedParityIssues: SrdStatBlockParityIssue[] = [];

  const targetFor = (key: ParityAndFidelityScenarioKey): ScenarioTarget => {
    const target = targets.get(key);
    if (target === undefined) throw new Error(`Missing scenario target ${key}`);
    return target;
  };
  const addMismatch = (target: ScenarioTarget): void => {
    authoredReplacements.set(
      normalizedEvidenceIdentity(target.authored.evidence),
      passivePerceptionMismatch(target.authored),
    );
  };

  for (const key of PARITY_AND_FIDELITY_SCENARIO_KEYS) {
    if (!selected.has(key)) continue;
    const target = targetFor(key);
    Match.value(key).pipe(
      Match.when("missing-blocks-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "missing",
          name: target.raw.evidence.name,
        });
      }),
      Match.when("extra-blocks-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "extra",
          name: target.authored.evidence.name,
          statBlockId: target.authored.evidence.statBlockId,
        });
      }),
      Match.when("duplicate-id-blocks-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "duplicate-id",
          statBlockId: target.authored.evidence.statBlockId,
        });
      }),
      Match.when("duplicate-identity-blocks-mismatch", () => {
        addMismatch(target);
        const secondRecord = targetFor("divergent-blocks-mismatch").authored;
        expectedParityIssues.push({
          kind: "duplicate-identity",
          name: target.authored.evidence.name,
          statBlockIds: [
            target.authored.evidence.statBlockId,
            secondRecord.evidence.statBlockId,
          ],
        });
      }),
      Match.when("divergent-blocks-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "divergent-source",
          name: target.raw.evidence.name,
          anchors: [target.raw.evidence.anchor],
          normalizedSources: ["synthetic-source-a", "synthetic-source-b"],
        });
      }),
      Match.when("malformed-blocks-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "malformed-source",
          sourcePath: target.raw.evidence.anchor.sourcePath,
          heading: target.raw.evidence.anchor.heading,
          message: "Synthetic malformed source evidence",
        });
      }),
      Match.when("provenance-preserves-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "provenance",
          reason: "source-anchor",
          name: target.authored.evidence.name,
          statBlockId: target.authored.evidence.statBlockId,
          actualKind: "srd-5.2.1",
          actualSection: "synthetic wrong anchor",
        });
        expectedFidelityIssueKeys.push(
          `mechanics-mismatch|${sourceKey(target.raw)}|${target.authored.evidence.statBlockId}`,
        );
      }),
      Match.when("peer-preserves-mismatch", () => {
        addMismatch(target);
        expectedParityIssues.push({
          kind: "publication-peer",
          evidence: {
            tag: "out-of-sync",
            recordKind: "statBlock",
            sourcePath: "synthetic/source.dhall",
            peerPath: "synthetic/peer.json",
          },
        });
        expectedFidelityIssueKeys.push(
          `mechanics-mismatch|${sourceKey(target.raw)}|${target.authored.evidence.statBlockId}`,
        );
      }),
      Match.when("raw-projection-failure", () => {
        rawReplacements.set(normalizedEvidenceIdentity(target.raw.evidence), {
          ...target.raw,
          outcome: {
            tag: "failed",
            failure: SYNTHETIC_PROJECTION_FAILURE,
          },
        });
        expectedFidelityIssueKeys.push(
          `raw-projection-failed|${sourceKey(target.raw)}`,
        );
      }),
      Match.when("authored-projection-failure", () => {
        authoredReplacements.set(
          normalizedEvidenceIdentity(target.authored.evidence),
          {
            ...target.authored,
            outcome: {
              tag: "failed",
              failure: SYNTHETIC_PROJECTION_FAILURE,
            },
          },
        );
        expectedFidelityIssueKeys.push(
          `authored-projection-failed|${target.authored.evidence.statBlockId}`,
        );
      }),
      Match.when("mechanics-mismatch", () => {
        addMismatch(target);
        expectedFidelityIssueKeys.push(
          `mechanics-mismatch|${sourceKey(target.raw)}|${target.authored.evidence.statBlockId}`,
        );
      }),
      Match.exhaustive,
    );
  }

  return {
    projections: {
      parity: { ...fixture.parity, issues: expectedParityIssues },
      raw: fixture.raw.map(
        (projection) =>
          rawReplacements.get(
            normalizedEvidenceIdentity(projection.evidence),
          ) ?? projection,
      ),
      authored: fixture.authored.map(
        (projection) =>
          authoredReplacements.get(
            normalizedEvidenceIdentity(projection.evidence),
          ) ?? projection,
      ),
    },
    expectedFidelityIssueKeys: expectedFidelityIssueKeys.sort(),
    expectedParityIssues,
  };
}

function fidelityIssueKeys(
  result: SrdStatBlockScopedFidelityResult,
): readonly string[] {
  return Match.value(result).pipe(
    Match.when({ tag: "consistent" }, () => []),
    Match.when({ tag: "inconsistent" }, ({ issues }) =>
      issues.map(issueEvidenceKey).sort(),
    ),
    Match.exhaustive,
  );
}

describe("whole-lane SRD Stat Block scoped fidelity", () => {
  test("keeps normalized identity derived from canonical evidence at the join", () => {
    const [raw] = cachedCorpusProjections.raw;
    const [authored] = cachedCorpusProjections.authored;
    if (raw === undefined || authored === undefined) {
      throw new Error("The corpus has no scoped-fidelity evidence");
    }
    const mechanics = projectedMechanics(authored);
    if (mechanics === undefined) {
      throw new Error("The corpus has no projected scoped mechanics");
    }

    const shapeProof: readonly [
      "normalizedIdentity" extends keyof typeof raw.evidence ? false : true,
      "normalizedIdentity" extends keyof typeof authored.evidence
        ? false
        : true,
      "id" extends keyof typeof mechanics ? false : true,
      "name" extends keyof typeof mechanics ? false : true,
      "sourceSection" extends keyof typeof mechanics ? false : true,
      "normalizedIdentity" extends keyof Extract<
        SrdStatBlockParityIssue,
        { readonly kind: "duplicate-identity" }
      >
        ? false
        : true,
    ] = [true, true, true, true, true, true];

    expect(shapeProof).toEqual([true, true, true, true, true, true]);
    expect(raw.evidence).not.toHaveProperty("normalizedIdentity");
    expect(authored.evidence).not.toHaveProperty("normalizedIdentity");
    expect(mechanics).not.toHaveProperty("id");
    expect(mechanics).not.toHaveProperty("name");
    expect(mechanics).not.toHaveProperty("sourceSection");
  });

  test("derives structurally varied authored names once at the denominator join", () => {
    const target = cachedCorpusProjections.authored.find(({ outcome }) =>
      Match.value(outcome).pipe(
        Match.when({ tag: "projected" }, () => true),
        Match.when({ tag: "failed" }, () => false),
        Match.exhaustive,
      ),
    );
    if (target === undefined) {
      throw new Error("The corpus has no projected authored evidence");
    }
    const installedRecord = corpusParity.installedRecords.find(
      ({ id }) => id === target.evidence.statBlockId,
    );
    if (installedRecord === undefined) {
      throw new Error("The projected evidence is outside the denominator");
    }
    const whitespace = fc
      .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 3 })
      .map((characters) => characters.join(""));

    fc.assert(
      fc.property(whitespace, whitespace, (leading, trailing) => {
        const variantName = `${leading}${installedRecord.name.toUpperCase()}${trailing}`;
        expect(normalizeStatBlockIdentity(variantName)).toBe(
          normalizeStatBlockIdentity(installedRecord.name),
        );
        const result = consistentResult(
          reconcileSrdStatBlockScopedFidelity({
            parity: {
              ...corpusParity,
              discovery: { occurrences: [], identities: [], issues: [] },
              installedRecords: [installedRecord],
              issues: [],
            },
            raw: [],
            authored: [
              {
                ...target,
                evidence: { ...target.evidence, name: variantName },
              },
            ],
          }),
        );
        expect(result.authoredAdmissions).toHaveLength(1);
        expect(result.authoredAdmissions[0]?.authoredRecord.name).toBe(
          variantName,
        );
      }),
      { numRuns: 50 },
    );
  });

  test("keeps delimiter-bearing authored identities collision free", () => {
    expectDelimiterCollisionEvidence(
      delimiterCollisionAssessment("x", "y", "z"),
    );
  });

  test("preserves missing and duplicate evidence for every delimiter collision family", () => {
    fc.assert(
      fc.property(
        collisionKeySegmentArbitrary,
        collisionKeySegmentArbitrary,
        collisionKeySegmentArbitrary,
        (idPrefix, sharedSegment, identitySuffix) => {
          expectDelimiterCollisionEvidence(
            delimiterCollisionAssessment(
              idPrefix,
              sharedSegment,
              identitySuffix,
            ),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("makes conflicting duplicate RAW outcomes ambiguous in every permutation", () => {
    const target = cachedCorpusProjections.raw.find(({ outcome }) =>
      Match.value(outcome).pipe(
        Match.when({ tag: "projected" }, () => true),
        Match.when({ tag: "failed" }, () => false),
        Match.exhaustive,
      ),
    );
    if (target === undefined) {
      throw new Error("Expected a projected RAW corpus occurrence");
    }
    const conflicting = {
      ...target,
      outcome: {
        tag: "failed" as const,
        failure: SYNTHETIC_PROJECTION_FAILURE,
      },
    };
    const otherRaw = cachedCorpusProjections.raw.filter(
      (projection) => projection !== target,
    );
    const expectAmbiguous = (
      duplicateOutcomes: typeof cachedCorpusProjections.raw,
    ) => {
      expect(
        inconsistentIssues(
          reconcileSrdStatBlockScopedFidelity({
            ...cachedCorpusProjections,
            raw: [...otherRaw, ...duplicateOutcomes],
          }),
        ),
      ).toEqual([
        {
          kind: "raw-projection-failed",
          source: target.evidence,
          failure: {
            tag: "projection-binding-not-unique",
            cause: "repeated-candidates",
          },
        },
      ]);
    };

    expectAmbiguous([target, conflicting]);
    expectAmbiguous([conflicting, target]);

    const duplicateOutcomesArbitrary = fc
      .array(fc.boolean(), { minLength: 0, maxLength: 3 })
      .chain((additionalOutcomeKinds) => {
        const outcomes = [
          target,
          conflicting,
          ...additionalOutcomeKinds.map((isProjected) =>
            isProjected ? target : conflicting,
          ),
        ];
        return fc.shuffledSubarray(outcomes, {
          minLength: outcomes.length,
          maxLength: outcomes.length,
        });
      });

    fc.assert(fc.property(duplicateOutcomesArbitrary, expectAmbiguous), {
      numRuns: 100,
    });
  });

  test("makes conflicting duplicate authored outcomes ambiguous in every permutation", () => {
    const target = cachedCorpusProjections.authored.find(({ outcome }) =>
      Match.value(outcome).pipe(
        Match.when({ tag: "projected" }, () => true),
        Match.when({ tag: "failed" }, () => false),
        Match.exhaustive,
      ),
    );
    if (target === undefined) {
      throw new Error("Expected a projected authored corpus record");
    }
    const conflicting = {
      ...target,
      outcome: {
        tag: "failed" as const,
        failure: SYNTHETIC_PROJECTION_FAILURE,
      },
    };
    const otherAuthored = cachedCorpusProjections.authored.filter(
      (projection) => projection !== target,
    );
    const expectAmbiguous = (
      duplicateOutcomes: typeof cachedCorpusProjections.authored,
    ) => {
      expect(
        inconsistentIssues(
          reconcileSrdStatBlockScopedFidelity({
            ...cachedCorpusProjections,
            authored: [...otherAuthored, ...duplicateOutcomes],
          }),
        ),
      ).toEqual([
        {
          kind: "authored-projection-failed",
          authoredRecord: target.evidence,
          failure: {
            tag: "projection-binding-not-unique",
            cause: "repeated-candidates",
          },
        },
      ]);
    };

    expectAmbiguous([target, conflicting]);
    expectAmbiguous([conflicting, target]);

    const duplicateOutcomesArbitrary = fc
      .array(fc.boolean(), { minLength: 0, maxLength: 3 })
      .chain((additionalOutcomeKinds) => {
        const outcomes = [
          target,
          conflicting,
          ...additionalOutcomeKinds.map((isProjected) =>
            isProjected ? target : conflicting,
          ),
        ];
        return fc.shuffledSubarray(outcomes, {
          minLength: outcomes.length,
          maxLength: outcomes.length,
        });
      });

    fc.assert(fc.property(duplicateOutcomesArbitrary, expectAmbiguous), {
      numRuns: 100,
    });
  });

  test("classifies repeated authored denominator groups atomically in every order", () => {
    const target = cachedCorpusProjections.authored.find(({ outcome }) =>
      Match.value(outcome).pipe(
        Match.when({ tag: "projected" }, () => true),
        Match.when({ tag: "failed" }, () => false),
        Match.exhaustive,
      ),
    );
    if (target === undefined) {
      throw new Error("Expected a projected authored corpus record");
    }
    const installedRecord = corpusParity.installedRecords.find(
      ({ id }) => id === target.evidence.statBlockId,
    );
    if (installedRecord === undefined) {
      throw new Error("Expected the authored record in the parity denominator");
    }
    const variantName = installedRecord.name.toUpperCase();
    expect(variantName).not.toBe(installedRecord.name);
    expect(normalizeStatBlockIdentity(variantName)).toBe(
      normalizedEvidenceIdentity(target.evidence),
    );
    const denominatorVariant = { ...installedRecord, name: variantName };
    const projectionVariant = {
      ...target,
      evidence: { ...target.evidence, name: variantName },
    };
    const installedRecords = corpusParity.installedRecords.filter(
      ({ id }) => id !== target.evidence.statBlockId,
    );
    const authored = cachedCorpusProjections.authored.filter(
      ({ evidence }) => evidence.statBlockId !== target.evidence.statBlockId,
    );
    const denominatorGroups = [
      [installedRecord, denominatorVariant],
      [denominatorVariant, installedRecord],
    ] as const;
    const candidateGroupsByCardinality = [
      [[]],
      [[target], [projectionVariant]],
      [
        [target, projectionVariant],
        [projectionVariant, target],
      ],
    ] as const;
    const reconcile = (
      denominatorGroup: (typeof denominatorGroups)[number],
      candidateGroup: (typeof candidateGroupsByCardinality)[number][number],
    ) =>
      reconcileSrdStatBlockScopedFidelity({
        ...cachedCorpusProjections,
        parity: {
          ...corpusParity,
          installedRecords: [...installedRecords, ...denominatorGroup],
        },
        authored: [...authored, ...candidateGroup],
      });
    const repeatedDenominatorFailure = {
      tag: "projection-binding-not-unique" as const,
      cause: "repeated-denominator" as const,
    };

    const results = candidateGroupsByCardinality.flatMap((candidateGroups) =>
      candidateGroups.flatMap((candidateGroup) =>
        denominatorGroups.map((denominatorGroup) =>
          reconcile(denominatorGroup, candidateGroup),
        ),
      ),
    );
    const [referenceResult, ...permutedResults] = results;
    if (referenceResult === undefined) {
      throw new Error("Expected repeated-denominator reconciliation results");
    }
    for (const permutedResult of permutedResults) {
      expect(permutedResult).toEqual(referenceResult);
    }
    expect(inconsistentIssues(referenceResult)).toEqual([
      {
        kind: "authored-projection-failed",
        authoredRecord: projectionVariant.evidence,
        failure: repeatedDenominatorFailure,
      },
      {
        kind: "authored-projection-failed",
        authoredRecord: target.evidence,
        failure: repeatedDenominatorFailure,
      },
    ]);
  });

  test("orders repeated RAW evidence injectively across JSON number collisions", () => {
    const target = cachedCorpusProjections.raw[0];
    if (target === undefined) {
      throw new Error("Expected a RAW corpus projection");
    }
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ anchor }) =>
        anchor.sourcePath === target.evidence.anchor.sourcePath &&
        anchor.lineStart === target.evidence.anchor.lineStart &&
        anchor.lineEnd === target.evidence.anchor.lineEnd,
    );
    if (occurrence === undefined) {
      throw new Error("Expected the RAW occurrence in the parity denominator");
    }
    const remainingOccurrences = corpusParity.discovery.occurrences.filter(
      (candidate) => candidate !== occurrence,
    );
    const remainingRaw = cachedCorpusProjections.raw.filter(
      (projection) => projection !== target,
    );
    const reconcile = (spanEnds: readonly [number, number]) => {
      const repeatedOccurrences = spanEnds.map((spanEnd) => ({
        ...occurrence,
        anchor: { ...occurrence.anchor, spanEnd },
      }));
      return reconcileSrdStatBlockScopedFidelity({
        ...cachedCorpusProjections,
        parity: {
          ...corpusParity,
          discovery: {
            ...corpusParity.discovery,
            occurrences: [...remainingOccurrences, ...repeatedOccurrences],
          },
        },
        raw: remainingRaw,
      });
    };
    const jsonNumberCollisionPairs = [
      [Number.NaN, Number.POSITIVE_INFINITY],
      [Number.NaN, Number.NEGATIVE_INFINITY],
      [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      [-0, 0],
    ] as const;

    for (const [left, right] of jsonNumberCollisionPairs) {
      const leftFirst = reconcile([left, right]);
      const rightFirst = reconcile([right, left]);
      expect(rightFirst).toEqual(leftFirst);

      const issues = inconsistentIssues(leftFirst);
      expect(issues).toHaveLength(2);
      const actualSpanEnds = issues.flatMap((issue) =>
        issue.kind === "raw-projection-failed"
          ? [issue.source.anchor.spanEnd]
          : [],
      );
      expect(actualSpanEnds).toHaveLength(2);
      expect(actualSpanEnds.some((actual) => Object.is(actual, left))).toBe(
        true,
      );
      expect(actualSpanEnds.some((actual) => Object.is(actual, right))).toBe(
        true,
      );
    }
  });

  test("rejects a RAW occurrence paired with a different canonical source path", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ anchor }) => anchor.sourcePath === SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const suppliedSourcePath = SRD_STAT_BLOCK_SOURCE_PATHS[1];

    expect(
      projectRawStatBlock(
        {
          sourcePath: suppliedSourcePath,
          contents: sourceByPath.get(suppliedSourcePath) ?? "",
        },
        occurrence,
        equipmentSource,
      ),
    ).toEqual({
      tag: "failed",
      failure: {
        tag: "source-path-mismatch",
        suppliedSourcePath,
        occurrenceSourcePath: SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
      },
    });
  });

  test("orders source-path and outside-denominator projection failures deterministically", () => {
    const [rawProjection] = cachedCorpusProjections.raw;
    const [authoredProjection] = cachedCorpusProjections.authored;
    if (rawProjection === undefined || authoredProjection === undefined) {
      throw new Error("The corpus does not contain projection order probes");
    }
    const suppliedSourcePath = SRD_STAT_BLOCK_SOURCE_PATHS.find(
      (sourcePath) => sourcePath !== rawProjection.evidence.anchor.sourcePath,
    );
    if (suppliedSourcePath === undefined) {
      throw new Error("The corpus does not contain a distinct source path");
    }
    const outsideEvidence = {
      statBlockId: statBlockId("synthetic-outside-parity-denominator"),
      name: "Synthetic Outside Parity Denominator",
    };

    const issues = inconsistentIssues(
      reconcileSrdStatBlockScopedFidelity({
        parity: corpusParity,
        raw: nonemptyRawProjections(
          cachedCorpusProjections.raw.map((projection) =>
            projection === rawProjection
              ? {
                  ...projection,
                  outcome: {
                    tag: "failed" as const,
                    failure: {
                      tag: "source-path-mismatch" as const,
                      suppliedSourcePath,
                      occurrenceSourcePath:
                        rawProjection.evidence.anchor.sourcePath,
                    },
                  },
                }
              : projection,
          ),
        ),
        authored: nonemptyAuthoredProjections([
          ...cachedCorpusProjections.authored,
          { ...authoredProjection, evidence: outsideEvidence },
        ]),
      }),
    );

    expect(
      issues.map((issue) =>
        issue.kind === "mechanics-mismatch" ? issue.kind : issue.failure.tag,
      ),
    ).toEqual([
      "source-path-mismatch",
      "projection-outside-parity-denominator",
    ]);
    expect(issues).toContainEqual({
      kind: "raw-projection-failed",
      source: rawProjection.evidence,
      failure: {
        tag: "source-path-mismatch",
        suppliedSourcePath,
        occurrenceSourcePath: rawProjection.evidence.anchor.sourcePath,
      },
    });
    expect(issues).toContainEqual({
      kind: "authored-projection-failed",
      authoredRecord: outsideEvidence,
      failure: { tag: "projection-outside-parity-denominator" },
    });
  });

  test("accumulates exact typed RAW field issues for every nonempty subset and mutation order", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ anchor }) => anchor.sourcePath === SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;

    const mutations = {
      ac: {
        linePrefix: "**AC**",
        replace: (line: string) =>
          line.replace(/^\*\*AC\*\* \d+/, "**AC** malformed"),
        kind: "malformed-evidence",
        evidence: (selected: readonly string[]) =>
          selected.includes("initiative")
            ? "**AC** malformed **Initiative** malformed"
            : "**AC** malformed **Initiative** +1 (11)",
      },
      hp: {
        linePrefix: "**HP**",
        replace: () => "",
        kind: "missing-required-evidence",
        evidence: () => undefined,
      },
      initiative: {
        linePrefix: "**AC**",
        replace: (line: string) =>
          line.replace(
            /\*\*Initiative\*\* [^ ]+ \(\d+\)/,
            "**Initiative** malformed",
          ),
        kind: "malformed-evidence",
        evidence: (selected: readonly string[]) =>
          selected.includes("ac")
            ? "**AC** malformed **Initiative** malformed"
            : "**AC** 13 **Initiative** malformed",
      },
      challengeRating: {
        linePrefix: "**CR**",
        replace: () => "**CR** 99",
        kind: "unsupported-evidence",
        evidence: () => "99",
      },
    } as const;
    type MutationKey = keyof typeof mutations;
    const orderedKeys = [
      "ac",
      "hp",
      "initiative",
      "challengeRating",
    ] as const satisfies readonly MutationKey[];
    const mutate = (
      source: string,
      selected: readonly MutationKey[],
    ): string => {
      const selectedSet = new Set(selected);
      return source
        .split(/\r?\n/)
        .map((line, index) => {
          const lineNumber = index + 1;
          if (
            lineNumber < occurrence.anchor.lineStart ||
            lineNumber > occurrence.anchor.lineEnd
          ) {
            return line;
          }
          return orderedKeys.reduce(
            (current, key) =>
              selectedSet.has(key) && line.startsWith(mutations[key].linePrefix)
                ? mutations[key].replace(current)
                : current,
            line,
          );
        })
        .join("\n");
    };
    const projectIssues = (selected: readonly MutationKey[]) => {
      const result = projectRawStatBlock(
        {
          sourcePath: occurrence.anchor.sourcePath,
          contents: mutate(canonicalSource, selected),
        },
        occurrence,
        equipmentSource,
      );
      expect(result.tag).toBe("failed");
      if (result.tag !== "failed") return [];
      expect(result.failure.tag).toBe("projection-issues");
      return result.failure.tag === "projection-issues"
        ? result.failure.issues
        : [];
    };

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...orderedKeys), {
          minLength: 1,
          maxLength: orderedKeys.length,
        }),
        (selected) => {
          const issues = projectIssues(selected);
          const canonicalSelection = orderedKeys.filter((key) =>
            selected.includes(key),
          );
          expect(projectIssues(canonicalSelection)).toEqual(issues);
          expect(
            issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
            JSON.stringify(issues),
          ).toEqual(
            canonicalSelection.map((key) => ({
              kind: mutations[key].kind,
              field: key,
              evidence: mutations[key].evidence(selected),
            })),
          );
          expect(
            issues.every(
              ({ anchor }) =>
                anchor.kind === "raw" &&
                anchor.sourcePath === occurrence.anchor.sourcePath &&
                anchor.lineStart === occurrence.anchor.lineStart &&
                anchor.lineEnd === occurrence.anchor.lineEnd,
            ),
          ).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("reports a malformed telepathy clause once without a dependent communication-schema cascade", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Aboleth",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("**Languages**")
          ? "**Languages** Deep Speech; telepathy malformed"
          : line,
      )
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result).toMatchObject({
      tag: "failed",
      failure: {
        tag: "projection-issues",
        issues: [
          {
            kind: "malformed-evidence",
            anchor: {
              kind: "raw",
              sourcePath: occurrence.anchor.sourcePath,
              heading: occurrence.anchor.heading,
              lineStart: occurrence.anchor.lineStart,
              lineEnd: occurrence.anchor.lineEnd,
              field: "communication.telepathy",
            },
            evidence: "telepathy malformed",
          },
        ],
      },
    });
    if (result.tag === "failed" && result.failure.tag === "projection-issues") {
      expect(result.failure.issues).toHaveLength(1);
    }
  });

  test.each([
    {
      label: "missing",
      replacement: "",
      kind: "missing-required-evidence",
      evidence: undefined,
    },
    {
      label: "malformed",
      replacement: "**CR** malformed",
      kind: "malformed-evidence",
      evidence: "**CR** malformed",
    },
  ] as const)(
    "reports a $label Challenge Rating clause once without a canonical-value cascade",
    ({ replacement, kind, evidence }) => {
      const occurrence = corpusParity.discovery.occurrences.find(
        ({ name }) => name === "Ape",
      );
      expect(occurrence).toBeDefined();
      if (occurrence === undefined) return;
      const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
      expect(canonicalSource).toBeDefined();
      if (canonicalSource === undefined) return;
      const mutatedSource = canonicalSource
        .split(/\r?\n/)
        .map((line, index) =>
          index + 1 >= occurrence.anchor.lineStart &&
          index + 1 <= occurrence.anchor.lineEnd &&
          line.startsWith("**CR**")
            ? replacement
            : line,
        )
        .join("\n");

      const result = projectRawStatBlock(
        { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
        occurrence,
        equipmentSource,
      );
      expect(result.tag).toBe("failed");
      if (
        result.tag !== "failed" ||
        result.failure.tag !== "projection-issues"
      ) {
        return;
      }
      expect(
        result.failure.issues.map(({ kind: issueKind, anchor, ...issue }) => ({
          kind: issueKind,
          field: anchor.field,
          evidence: "evidence" in issue ? issue.evidence : undefined,
        })),
      ).toEqual([{ kind, field: "challengeRating", evidence }]);
    },
  );

  test("reports a malformed Passive Perception clause once without treating it as a sense", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Ape",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("**Senses**")
          ? "**Senses** Passive Perception malformed"
          : line,
      )
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result).toMatchObject({
      tag: "failed",
      failure: {
        tag: "projection-issues",
        issues: [
          {
            kind: "malformed-evidence",
            anchor: {
              kind: "raw",
              sourcePath: occurrence.anchor.sourcePath,
              heading: occurrence.anchor.heading,
              lineStart: occurrence.anchor.lineStart,
              lineEnd: occurrence.anchor.lineEnd,
              field: "passivePerception",
            },
            evidence: "Passive Perception malformed",
          },
        ],
      },
    });
    if (result.tag === "failed" && result.failure.tag === "projection-issues") {
      expect(result.failure.issues).toHaveLength(1);
    }
  });

  test("accumulates independent label and score failures within one ability-matrix fact", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name, anchor }) =>
        name === "Stone Giant" && anchor.sourcePath.endsWith("Monsters-T-Z.md"),
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd
          ? line.replace("| STR | 23 |", "| POWER | nope |")
          : line,
      )
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "unsupported-evidence",
        field: "abilityScores.matrix.0.label",
        evidence: "POWER",
      },
      {
        kind: "malformed-evidence",
        field: "abilityScores.matrix.0.score",
        evidence: "nope",
      },
    ]);
  });

  test("accumulates every nonempty subset of separate Score and Save cell failures in domain order", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name, anchor }) =>
        name === "Aboleth" && anchor.sourcePath.endsWith("Monsters-A-B.md"),
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutations = {
      score0: {
        prefix: "| **Score**",
        cellIndex: 0,
        field: "abilityScores.0",
        evidence: "bad-score-str",
      },
      score1: {
        prefix: "| **Score**",
        cellIndex: 1,
        field: "abilityScores.1",
        evidence: "bad-score-dex",
      },
      save0: {
        prefix: "| **Save**",
        cellIndex: 0,
        field: "savingThrowModifiers.0",
        evidence: "bad-save-str",
      },
      save1: {
        prefix: "| **Save**",
        cellIndex: 1,
        field: "savingThrowModifiers.1",
        evidence: "bad-save-dex",
      },
    } as const;
    type MutationKey = keyof typeof mutations;
    const domainOrder = [
      "score0",
      "score1",
      "save0",
      "save1",
    ] as const satisfies readonly MutationKey[];

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...domainOrder), {
          minLength: 1,
          maxLength: domainOrder.length,
        }),
        (selected) => {
          const selectedSet = new Set(selected);
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, lineIndex) => {
              if (
                lineIndex + 1 < occurrence.anchor.lineStart ||
                lineIndex + 1 > occurrence.anchor.lineEnd
              ) {
                return line;
              }
              const mutationsForLine = domainOrder.filter(
                (key) =>
                  selectedSet.has(key) &&
                  line.startsWith(mutations[key].prefix),
              );
              if (mutationsForLine.length === 0) return line;
              const cells = line.split("|");
              for (const key of mutationsForLine) {
                cells[mutations[key].cellIndex + 2] =
                  ` ${mutations[key].evidence} `;
              }
              return cells.join("|");
            })
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
          ).toEqual(
            domainOrder
              .filter((key) => selectedSet.has(key))
              .map((key) => ({
                kind: "malformed-evidence",
                field: mutations[key].field,
                evidence: mutations[key].evidence,
              })),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  test("accumulates every malformed combined ability cell with its original evidence", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Earth Elemental",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const evidence = ["bad", "worse"] as const;

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(0, 1), {
          minLength: 1,
          maxLength: 2,
        }),
        (selected) => {
          const selectedSet = new Set(selected);
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, lineIndex) => {
              if (
                lineIndex + 1 < occurrence.anchor.lineStart ||
                lineIndex + 1 > occurrence.anchor.lineEnd ||
                !line.startsWith("| 20 (+5)")
              ) {
                return line;
              }
              const cells = line.split("|");
              for (const index of selectedSet) {
                cells[index + 1] = ` ${evidence[index]} `;
              }
              return cells.join("|");
            })
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
          ).toEqual(
            [0, 1]
              .filter((index) => selectedSet.has(index))
              .map((index) => ({
                kind: "malformed-evidence",
                field: `abilityScores.${index}`,
                evidence: evidence[index],
              })),
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  test("accumulates independent combined-row Score and Save suffix failures", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Hydra",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const keys = ["score0", "score1", "save0", "save1"] as const;

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...keys), {
          minLength: 1,
          maxLength: keys.length,
        }),
        (selected) => {
          const selectedSet = new Set(selected);
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, lineIndex) => {
              if (
                lineIndex + 1 < occurrence.anchor.lineStart ||
                lineIndex + 1 > occurrence.anchor.lineEnd ||
                !line.startsWith("| 20 (+5) Save +5")
              ) {
                return line;
              }
              const cells = line.split("|");
              for (const index of [0, 1] as const) {
                let cell = cells[index + 1] ?? "";
                if (selectedSet.has(`score${index}`)) {
                  cell = cell.replace(/^ \d+/, ` bad-score-${index}`);
                }
                if (selectedSet.has(`save${index}`)) {
                  cell = cell.replace(/Save [^ ]+ /, `Save bad-save-${index} `);
                }
                cells[index + 1] = cell;
              }
              return cells.join("|");
            })
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
          ).toEqual(
            keys
              .filter((key) => selectedSet.has(key))
              .map((key) => {
                const index = key.endsWith("0") ? 0 : 1;
                const isScore = key.startsWith("score");
                const score = selectedSet.has(`score${index}`)
                  ? `bad-score-${index}`
                  : index === 0
                    ? "20"
                    : "12";
                const modifier = index === 0 ? "+5" : "+1";
                const save = selectedSet.has(`save${index}`)
                  ? `bad-save-${index}`
                  : modifier;
                return {
                  kind: "malformed-evidence",
                  field: isScore
                    ? `abilityScores.${index}`
                    : `savingThrowModifiers.${index}`,
                  evidence: `${score} (${modifier}) Save ${save}`,
                };
              }),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  test("keeps condition-only Immunities classified while accumulating malformed items", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Hydra",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const conditionCount = 6;

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: conditionCount - 1 }), {
          minLength: 1,
          maxLength: conditionCount - 1,
        }),
        (selected) => {
          const selectedSet = new Set(selected);
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, lineIndex) => {
              if (
                lineIndex + 1 < occurrence.anchor.lineStart ||
                lineIndex + 1 > occurrence.anchor.lineEnd ||
                !line.startsWith("**Immunities**")
              ) {
                return line;
              }
              const values = line
                .replace("**Immunities**", "")
                .trim()
                .split(", ")
                .map((value, index) =>
                  selectedSet.has(index) ? `Bogus${index}` : value,
                );
              return `**Immunities** ${values.join(", ")}`;
            })
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
          ).toEqual(
            [...selectedSet]
              .sort((left, right) => left - right)
              .map((index) => ({
                kind: "unsupported-evidence",
                field: `immunities.conditions.${index}`,
                evidence: `bogus${index}`,
              })),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  test("keeps damage-only Immunities classified when one item is malformed", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Remorhaz",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;

    fc.assert(
      fc.property(fc.constantFrom(0, 1), (selectedIndex) => {
        const mutatedSource = canonicalSource
          .split(/\r?\n/)
          .map((line, lineIndex) => {
            if (
              lineIndex + 1 < occurrence.anchor.lineStart ||
              lineIndex + 1 > occurrence.anchor.lineEnd ||
              !line.startsWith("**Immunities**")
            ) {
              return line;
            }
            const values = line
              .replace("**Immunities**", "")
              .trim()
              .split(", ");
            values[selectedIndex] = `Bogus${selectedIndex}`;
            return `**Immunities** ${values.join(", ")}`;
          })
          .join("\n");
        const result = projectRawStatBlock(
          {
            sourcePath: occurrence.anchor.sourcePath,
            contents: mutatedSource,
          },
          occurrence,
          equipmentSource,
        );
        expect(result.tag).toBe("failed");
        if (
          result.tag !== "failed" ||
          result.failure.tag !== "projection-issues"
        ) {
          return;
        }
        expect(result.failure.issues).toMatchObject([
          {
            kind: "unsupported-evidence",
            anchor: { field: `immunities.damageTypes.${selectedIndex}` },
            evidence: `bogus${selectedIndex}`,
          },
        ]);
      }),
      { numRuns: 20 },
    );
  });

  test("reports a missing resistance option list once without an empty-options cascade", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Half-Dragon",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.includes("one of the following damage types")
          ? line.replace(
              /one of the following damage types[^.]*\./,
              "unknown damage type list.",
            )
          : line,
      )
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toHaveLength(1);
    expect(result.failure.issues[0]).toMatchObject({
      kind: "missing-required-evidence",
      anchor: { field: "resistances.options" },
    });
  });

  test("distinguishes independent unsupported authored save branches", () => {
    const ankheg = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Ankheg",
    );
    expect(ankheg).toBeDefined();
    if (ankheg === undefined) return;
    const actions = ankheg.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const mutateAction = (
      action: (typeof actions)[number],
    ): (typeof actions)[number] => {
      if (action.kind !== "executable") return action;
      const procedure = action.procedure;
      if (procedure.kind !== "save" || procedure.name !== "Acid Spray") {
        return action;
      }
      const mutatedProcedure: typeof procedure = {
        ...procedure,
        area: { kind: "sphere", radiusFeet: PositiveInteger(20) },
        onFail: {
          kind: "conditional_bonus_damage",
          when: { kind: "attack_roll_had_advantage" },
          damageType: "acid",
          amount: { kind: "fixed", static: PositiveInteger(1) },
        },
        onSuccess: {
          kind: "damage",
          damageType: "acid",
          amount: { kind: "fixed", static: PositiveInteger(1) },
        },
      };
      return {
        ...action,
        procedure: mutatedProcedure,
      };
    };
    const mutated = {
      ...ankheg,
      statBlock: {
        ...ankheg.statBlock,
        actions: [
          mutateAction(firstAction),
          ...remainingActions.map(mutateAction),
        ] as const,
      },
    };

    const result = projectAuthoredStatBlock(mutated, equipmentSource);
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "unsupported-evidence",
        field: "procedures.Acid Spray.onFail",
        evidence: "conditional_bonus_damage",
      },
      {
        kind: "unsupported-evidence",
        field: "procedures.Acid Spray.onSuccess",
        evidence: "damage",
      },
      {
        kind: "unsupported-evidence",
        field: "procedures.Acid Spray.area",
        evidence: "sphere",
      },
    ]);
  });

  test("continues independent procedure validation after a malformed general fact", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Allosaurus",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) => {
        if (
          index + 1 < occurrence.anchor.lineStart ||
          index + 1 > occurrence.anchor.lineEnd
        ) {
          return line;
        }
        if (line.startsWith("**Speed**")) return "**Speed** malformed";
        return line.startsWith("**Bite.") ? line.replace("2d10", "2d7") : line;
      })
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor }) => ({
        kind,
        field: anchor.field,
      })),
    ).toEqual([
      { kind: "malformed-evidence", field: "speeds.0" },
      {
        kind: "malformed-evidence",
        field: "procedures.Bite.onHit.0.dieSize",
      },
    ]);
  });

  test("anchors an empty procedure description before text-only fallback projection", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Allosaurus",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("**Bite.")
          ? "**Bite.**"
          : line,
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({
          field: "procedures.actions.0.description",
        }),
        evidence: "",
      }),
    ]);
  });

  test("anchors domain-invalid HP and damage dice at their numeric leaves", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Allosaurus",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) => {
        if (
          index + 1 < occurrence.anchor.lineStart ||
          index + 1 > occurrence.anchor.lineEnd
        ) {
          return line;
        }
        if (line.startsWith("**HP**")) return line.replace("51", "0");
        return line.startsWith("**Bite.") ? line.replace("2d10", "0d10") : line;
      })
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      { kind: "malformed-evidence", field: "hp", evidence: "0" },
      {
        kind: "malformed-evidence",
        field: "procedures.Bite.onHit.0.dice",
        evidence: "0",
      },
    ]);
  });

  test("accumulates independent positive-bound failures in senses and spell limits", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Giant Owl",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) => {
        if (
          index + 1 < occurrence.anchor.lineStart ||
          index + 1 > occurrence.anchor.lineEnd
        ) {
          return line;
        }
        if (line.startsWith("**Senses**")) {
          return line.replace("Darkvision 120 ft.", "Darkvision 0 ft.");
        }
        return line.startsWith("1/Day:")
          ? line.replace("1/Day:", "0/Day:")
          : line;
      })
      .join("\n");

    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "malformed-evidence",
        field: "senses.0.rangeFeet",
        evidence: "0",
      },
      {
        kind: "malformed-evidence",
        field: "procedures.Spellcasting.groups.1.uses",
        evidence: "0",
      },
    ]);
  });

  test("accepts zero Passive Perception through its canonical nonnegative owner", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Giant Owl",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("**Senses**")
          ? line.replace("Passive Perception 16", "Passive Perception 0")
          : line,
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("projected");
    if (result.tag !== "projected") return;
    expect(result.projection.generalFacts.passivePerception).toBe(0);
  });

  test("anchors a direct-spell save DC failure at the procedure leaf", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Dust Mephit",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.includes("spell save DC 10")
          ? line.replace("spell save DC 10", "spell save DC 0")
          : line,
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({
          field: "procedures.Sleep (1/Day).spellSaveDc",
        }),
        evidence: "0",
      }),
    ]);
  });

  test("anchors an empty present Gear item at its item leaf", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Mage",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace("**Gear** Wand", "**Gear** ");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({ field: "gear.0.item" }),
        evidence: "",
      }),
    ]);
  });

  test("anchors duplicate saving throw abilities at the later source item", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Earth Elemental",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace(
      "**Saves** STR +5, CON +5",
      "**Saves** STR +5, STR +5",
    );
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({
          field: "savingThrowModifiers.1.ability",
        }),
        evidence: "STR",
      }),
    ]);
  });

  test("accumulates duplicate Size alternatives and a swarm-status creature tag", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Mage",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace(
      "Medium or Small Humanoid (Wizard), Neutral",
      "Medium or Medium Humanoid (swarm), Neutral",
    );
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "malformed-evidence",
        field: "size.options.1",
        evidence: "Medium",
      },
      {
        kind: "malformed-evidence",
        field: "creatureTypeTags.0",
        evidence: "swarm",
      },
    ]);
  });

  test("finds invalid compact-matrix scores independently of neighboring valid cells", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Centaur Trooper",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(0, 1), {
          minLength: 1,
          maxLength: 2,
        }),
        (selected) => {
          const selectedSet = new Set(selected);
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, index) => {
              if (
                index + 1 < occurrence.anchor.lineStart ||
                index + 1 > occurrence.anchor.lineEnd
              ) {
                return line;
              }
              return line
                .replace("DEX 14", selectedSet.has(0) ? "DEX 0" : "DEX 14")
                .replace("CON 14", selectedSet.has(1) ? "CON 31" : "CON 14");
            })
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor }) => ({
              kind,
              field: anchor.field,
            })),
          ).toEqual(
            [...selectedSet]
              .sort((left, right) => left - right)
              .map((selectedIndex) => ({
                kind: "malformed-evidence",
                field: `abilityScores.matrix.${selectedIndex + 1}.score`,
              })),
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  test("splits a structurally compact matrix cell before validating its label and score", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Centaur Trooper",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const result = projectRawStatBlock(
      {
        sourcePath: occurrence.anchor.sourcePath,
        contents: canonicalSource.replace("DEX 14", "power nope"),
      },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "unsupported-evidence",
        field: "abilityScores.matrix.1.label",
        evidence: "power",
      },
      {
        kind: "malformed-evidence",
        field: "abilityScores.matrix.1.score",
        evidence: "nope",
      },
    ]);
  });

  test("rejects a reserved language and reversed ranged-attack distance at their owners", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Centaur Trooper",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .map((line, index) => {
        if (
          index + 1 < occurrence.anchor.lineStart ||
          index + 1 > occurrence.anchor.lineEnd
        ) {
          return line;
        }
        if (line.startsWith("**Languages**")) {
          return line.replace("Elvish", "All");
        }
        return line.startsWith("**Longbow.")
          ? line.replace("range 150/600 ft.", "range 600/150 ft.")
          : line;
      })
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor }) => ({
        kind,
        field: anchor.field,
      })),
    ).toEqual([
      { kind: "malformed-evidence", field: "communication.languages.0" },
      { kind: "malformed-evidence", field: "procedures.Longbow.rangeFeet" },
    ]);
  });

  test("validates each additionally understood language at its distinct owner", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Blink Dog",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace(
      "understands Elvish and Sylvan but can't speak them",
      "understands All and Sylvan but can't speak them",
    );
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({
          field:
            "communication.additionallyUnderstoodButCannotSpeak.languages.0",
        }),
        evidence: "All",
      }),
    ]);
  });

  test("accumulates excess-group and independent leading-item immunity issues", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Hydra",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace(
      "**Immunities** Blinded, Charmed, Deafened, Frightened, Stunned, Unconscious",
      "**Immunities** Bogus; Exhaustion, Poisoned; Extra",
    );
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor }) => ({
        kind,
        field: anchor.field,
      })),
    ).toEqual([
      { kind: "malformed-evidence", field: "immunities.groups" },
      { kind: "unsupported-evidence", field: "immunities.damageTypes.0" },
    ]);
  });

  test("accumulates excess-group and independent spoken-language issues", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Blink Dog",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource.replace(
      "**Languages** Blink Dog; understands Elvish and Sylvan but can't speak them",
      "**Languages** None; understands Elvish but can't speak them; Extra",
    );
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor }) => ({
        kind,
        field: anchor.field,
      })),
    ).toEqual([
      { kind: "malformed-evidence", field: "communication.groups" },
      { kind: "malformed-evidence", field: "communication.languages.0" },
    ]);
  });

  test("reports missing Legendary Action Uses at the correlated domain field", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Adult Red Dragon",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const mutatedSource = canonicalSource
      .split(/\r?\n/)
      .filter(
        (line, index) =>
          index + 1 < occurrence.anchor.lineStart ||
          index + 1 > occurrence.anchor.lineEnd ||
          !/^[*_]Legendary Action Uses:/.test(line),
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents: mutatedSource },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "missing-required-evidence",
        anchor: expect.objectContaining({ field: "legendaryActionUses" }),
      }),
    ]);
  });

  test("covers the exhaustive exact-cause review matrix with table-driven RAW mutations", () => {
    const cases = [
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Speed**") ? line.replace("60 ft.", "0 ft.") : line,
        expected: [
          { kind: "malformed-evidence", field: "speeds.0.feet", evidence: "0" },
        ],
      },
      {
        name: "Swarm of Insects",
        mutate: (line: string) =>
          line.startsWith("**Speed**")
            ? line.replace("Climb or Fly", "Climb or Climb")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "speeds.1.gmChoice.1.kind",
            evidence: "Climb",
          },
        ],
      },
      {
        name: "Hydra",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? "**Immunities** Blinded, Blinded (while sleeping)"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "immunities.qualifiedConditions.1.condition",
            evidence: "Blinded (while sleeping)",
          },
        ],
      },
      {
        name: "Hydra",
        mutate: (line: string) =>
          line.startsWith("***Hold Breath.")
            ? line.replace("***Hold Breath.", "***.")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "traits.0.name",
            evidence: "",
          },
        ],
      },
      {
        name: "Hydra",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? "**Immunities** Blinded, Bogus (while sleeping)"
            : line,
        expected: [
          {
            kind: "unsupported-evidence",
            field: "immunities.qualifiedConditions.1.condition",
            evidence: "bogus",
          },
        ],
      },
      {
        name: "Hydra",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? "**Immunities** Poisoned, Blinded, Poisoned (first), Blinded (second)"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "immunities.qualifiedConditions.2.condition",
            evidence: "Poisoned (first)",
          },
          {
            kind: "malformed-evidence",
            field: "immunities.qualifiedConditions.3.condition",
            evidence: "Blinded (second)",
          },
        ],
      },
      {
        name: "Hydra",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? "**Immunities** Blinded, Blinded (first), Blinded (second)"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "immunities.qualifiedConditions.1.condition",
            evidence: "Blinded (first)",
          },
          {
            kind: "malformed-evidence",
            field: "immunities.qualifiedConditions.2.condition",
            evidence: "Blinded (second)",
          },
        ],
      },
      {
        name: "Dretch",
        mutate: (line: string) =>
          line.startsWith("**Languages**")
            ? "**Languages** None; telepathy malformed"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "communication.languages.0",
            evidence: "None",
          },
          {
            kind: "malformed-evidence",
            field: "communication.telepathy",
            evidence: "telepathy malformed",
          },
        ],
      },
      {
        name: "Dretch",
        mutate: (line: string) =>
          line.startsWith("**Languages**")
            ? line.replace("understand Abyssal", "understand None")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field:
              "communication.telepathy.requiresLanguageUnderstanding.languages.0",
            evidence: "None",
          },
        ],
      },
      {
        name: "Blink Dog",
        mutate: (line: string) =>
          line.startsWith("**Languages**")
            ? "**Languages** Blink Dog; understands malformed"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "communication.understoodLanguages",
            evidence: "understands malformed",
          },
        ],
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**CR**")
            ? line.replace(/\*\*CR\*\* [^ ]+/, "**CR** 1/0")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "challengeRating.denominator",
            evidence: "0",
          },
        ],
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Bite.") ? line.replace("**Bite.", "**.") : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "procedures.actions.0.name",
            evidence: "",
          },
        ],
      },
      {
        name: "Ettercap",
        mutate: (line: string) =>
          line.startsWith("***Multiattack.") || line.startsWith("***Reel.")
            ? "***Shared.***"
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "procedures.actions.0.description",
            evidence: "",
          },
          {
            kind: "malformed-evidence",
            field: "procedures.bonus_actions.0.description",
            evidence: "",
          },
        ],
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("**Bite.", "** Bite.")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "procedures.actions.0.name",
            evidence: " Bite",
          },
        ],
      },
      {
        name: "Adult Red Dragon",
        mutate: (line: string) =>
          /^[*_]Legendary Action Uses:/.test(line)
            ? line.replace("3 (4 in Lair)", "3 (2 in Lair)")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "legendaryActionUses.usesInLair",
            evidence: "2",
          },
        ],
      },
      {
        name: "Adult Red Dragon",
        mutate: (line: string) =>
          /^[*_]Legendary Action Uses:/.test(line)
            ? line.replace("3 (4 in Lair)", "0 (0 in Lair)")
            : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "legendaryActionUses.usesOutsideLair",
            evidence: "0",
          },
          {
            kind: "malformed-evidence",
            field: "legendaryActionUses.usesInLair",
            evidence: "0",
          },
        ],
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**AC**") ? line.replace("13 ", "13 ( ) ") : line,
        expected: [
          {
            kind: "malformed-evidence",
            field: "ac.annotations.0",
            evidence: " ",
          },
        ],
      },
    ] as const;

    for (const scenario of cases) {
      const occurrence = corpusParity.discovery.occurrences.find(
        ({ name }) => name === scenario.name,
      );
      expect(occurrence, scenario.name).toBeDefined();
      if (occurrence === undefined) continue;
      const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
      expect(canonicalSource, scenario.name).toBeDefined();
      if (canonicalSource === undefined) continue;
      const contents = canonicalSource
        .split(/\r?\n/)
        .map((line, index) =>
          index + 1 >= occurrence.anchor.lineStart &&
          index + 1 <= occurrence.anchor.lineEnd
            ? scenario.mutate(line)
            : line,
        )
        .join("\n");
      const result = projectRawStatBlock(
        { sourcePath: occurrence.anchor.sourcePath, contents },
        occurrence,
        equipmentSource,
      );
      expect(result.tag, scenario.name).toBe("failed");
      if (
        result.tag !== "failed" ||
        result.failure.tag !== "projection-issues"
      ) {
        continue;
      }
      expect(
        result.failure.issues.map(({ kind, anchor, ...issue }) => ({
          kind,
          field: anchor.field,
          evidence: "evidence" in issue ? issue.evidence : undefined,
        })),
        scenario.name,
      ).toEqual(scenario.expected);
    }
  });

  test("keeps malformed RAW evidence owned by the same field in every mutation order", () => {
    const cases = [
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("*Large Beast") ? "" : line),
        expectedField: "metadata",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast") ? "*Large Beast*" : line,
        expectedField: "metadata",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast")
            ? line.replace("Unaligned", "Chaotic")
            : line,
        expectedField: "alignment",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast")
            ? line.replace("Large", "Large or Bogus")
            : line,
        expectedField: "size.options.1",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast")
            ? line.replace("Large", "Large or Large")
            : line,
        expectedField: "size.options.1",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast")
            ? line.replace("Large", "Bogus")
            : line,
        expectedField: "size",
      },
      {
        name: "Swarm of Insects",
        mutate: (line: string) =>
          line.startsWith("*Medium Swarm")
            ? line.replace("Medium Swarm", "Small Swarm")
            : line,
        expectedField: "swarm",
      },
      {
        name: "Swarm of Insects",
        mutate: (line: string) =>
          line.startsWith("*Medium Swarm")
            ? line.replace("Beasts", "Fiends")
            : line,
        expectedField: "creatureType",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("*Large Beast")
            ? line.replace("(Dinosaur)", "( )")
            : line,
        expectedField: "creatureTypeTags.0",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("**Speed**") ? "" : line),
        expectedField: "speeds",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Speed**") ? "**Speed** malformed" : line,
        expectedField: "speeds.0",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("| STR 19") ? "" : line),
        expectedField: "abilityScores.matrix",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("| STR 19") ? line.replace("STR 19", "DEX 19") : line,
        expectedField: "abilityScores.matrix.labels",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("| STR 19") ? line.replace("STR 19", "STR") : line,
        expectedField: "abilityScores.matrix.0",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("|") ? "" : line),
        expectedField: "abilityScores",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Saves**")
            ? `${line}, INT +0, WIS +0, CHA +0, DEX +0, STR +5`
            : line,
        expectedField: "savingThrowModifiers",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Saves**") ? "**Saves** STR" : line,
        expectedField: "savingThrowModifiers.0",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Vulnerabilities**") ? "**Vulnerabilities**" : line,
        expectedField: "vulnerabilities.damageTypes.0",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? "**Immunities** Poison, Poisoned"
            : line,
        expectedField: "immunities.group",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Immunities**")
            ? `${line}; Blinded; Charmed`
            : line,
        expectedField: "immunities.groups",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("**Senses**") ? "" : line),
        expectedField: "senses",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Senses**")
            ? line.replace("Darkvision", "Echovision")
            : line,
        expectedField: "senses.0",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Senses**")
            ? line.replace(
                "Darkvision 60 ft.",
                "Darkvision 60 ft. (underwater)",
              )
            : line,
        expectedField: "senses.0.qualifier",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Senses**")
            ? line.replace("Passive Perception 15", "")
            : line,
        expectedField: "passivePerception",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Languages**") ? "" : line,
        expectedField: "communication",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Languages**")
            ? "**Languages** Common; understands Elvish; malformed"
            : line,
        expectedField: "communication.groups",
      },
      {
        name: "Earth Elemental",
        mutate: (line: string) =>
          line.startsWith("**Languages**")
            ? "**Languages** Common; malformed"
            : line,
        expectedField: "communication",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("**AC**") ? "" : line),
        expectedField: "ac",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("**HP**") ? "" : line),
        expectedField: "hp",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) => (line.startsWith("**CR**") ? "" : line),
        expectedField: "challengeRating",
      },
      {
        name: "Aboleth",
        mutate: (line: string) => (line.startsWith("| **Score**") ? "" : line),
        expectedField: "abilityScores",
      },
      {
        name: "Aboleth",
        mutate: (line: string) =>
          line.startsWith("| **Score**") ? line.replace("| 18 |", "|") : line,
        expectedField: "abilityScores.5",
      },
      {
        name: "Aboleth",
        mutate: (line: string) =>
          line.startsWith("| **Score**") ? "| **Score** | 18 |" : line,
        expectedField: "abilityScores",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Skills**") ? "**Skills** Perception" : line,
        expectedField: "skillModifiers.0",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**Skills**") ? "**Skills** Bogus +5" : line,
        expectedField: "skillModifiers.0.skill",
      },
      {
        name: "Half-Dragon",
        mutate: (line: string) =>
          line.startsWith("***Draconic Origin.")
            ? line.replace("choice):", "choice) -")
            : line,
        expectedField: "resistances.options",
      },
      {
        name: "Hobgoblin Warrior",
        mutate: (line: string) =>
          line.startsWith("**Gear**") ? "**Gear**" : line,
        expectedField: "gear.0.item",
      },
      {
        name: "Kobold Warrior",
        mutate: (line: string) =>
          line.startsWith("**Gear**") ? line.replace("(3)", "(0)") : line,
        expectedField: "gear.0.quantity",
      },
      {
        name: "Goblin Warrior",
        mutate: (line: string) =>
          line.startsWith("***Shortbow.")
            ? line.replace("range 80/320 ft.", "range 320/80 ft.")
            : line,
        expectedField: "procedures.Shortbow.rangeFeet",
      },
      {
        name: "Goblin Warrior",
        mutate: (line: string) =>
          line.startsWith("***Shortbow.")
            ? line.replace("range 80/320 ft.", "range 0/320 ft.")
            : line,
        expectedField: "procedures.Shortbow.rangeFeet.normal",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Ram.") ? line.replace("Prone", "Bogus") : line,
        expectedField: "procedures.Ram.condition",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Fire Breath")
            ? line.replace("Recharge 5–6", "Recharge 1–6")
            : line,
        expectedField: "resources.Fire Breath.minimumRoll",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Fire Breath")
            ? line.replace("DC 15", "DC 0")
            : line,
        expectedField: "procedures.Fire Breath (Recharge 5–6).dc",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Fire Breath")
            ? line.replace("15-foot Cone", "0-foot Cone")
            : line,
        expectedField: "procedures.Fire Breath (Recharge 5–6).area.lengthFeet",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Fire Breath")
            ? line.replace("31 (7d8)", "0 (7d8)")
            : line,
        expectedField: "procedures.Fire Breath (Recharge 5–6).onFail.static",
      },
      {
        name: "Chimera",
        mutate: (line: string) =>
          line.startsWith("**Fire Breath") ? line.replace("7d8", "7d7") : line,
        expectedField: "procedures.Fire Breath (Recharge 5–6).onFail.dieSize",
      },
      {
        name: "Adult Gold Dragon",
        mutate: (line: string) =>
          /^[*_]Legendary Action Uses:/.test(line)
            ? line.replace("Uses: 3", "Uses: 0")
            : line,
        expectedField: "legendaryActionUses.usesOutsideLair",
      },
      {
        name: "Adult Gold Dragon",
        mutate: (line: string) =>
          /^[*_]Legendary Action Uses:/.test(line)
            ? "*Legendary Action Uses: malformed."
            : line,
        expectedField: "legendaryActionUses",
      },
      {
        name: "Giant Owl",
        mutate: (line: string) =>
          line.includes("At Will:")
            ? line.replace("At Will:", "At Will")
            : line,
        expectedField: "procedures.Spellcasting.groups.0",
      },
      {
        name: "Allosaurus",
        mutate: (line: string) =>
          line.startsWith("**CR**")
            ? `${line}\n*Legendary Action Uses: 3.`
            : line,
        expectedField: "legendaryActionUses",
      },
    ] as const;

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...cases], {
          minLength: cases.length,
          maxLength: cases.length,
        }),
        (orderedCases) => {
          for (const scenario of orderedCases) {
            const occurrence = corpusParity.discovery.occurrences.find(
              ({ name }) => name === scenario.name,
            );
            expect(occurrence, scenario.name).toBeDefined();
            if (occurrence === undefined) continue;
            const canonicalSource = sourceByPath.get(
              occurrence.anchor.sourcePath,
            );
            expect(canonicalSource, scenario.name).toBeDefined();
            if (canonicalSource === undefined) continue;
            const contents = canonicalSource
              .split(/\r?\n/)
              .map((line, index) =>
                index + 1 >= occurrence.anchor.lineStart &&
                index + 1 <= occurrence.anchor.lineEnd
                  ? scenario.mutate(line)
                  : line,
              )
              .join("\n");
            const result = projectRawStatBlock(
              { sourcePath: occurrence.anchor.sourcePath, contents },
              occurrence,
              equipmentSource,
            );
            expect(result.tag, scenario.name).toBe("failed");
            if (
              result.tag !== "failed" ||
              result.failure.tag !== "projection-issues"
            ) {
              continue;
            }
            const issueFields = result.failure.issues.map(
              ({ anchor }) => anchor.field,
            );
            expect(
              issueFields,
              `${scenario.name}: ${JSON.stringify(issueFields)}`,
            ).toContain(scenario.expectedField);
          }
        },
      ),
      { numRuns: 5, seed: 352481 },
    );
  });

  test("demotes unsupported attack shapes to text-only in every mutation order", () => {
    const cases = [
      {
        evidence: "alternative damage type",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace(
                "18 (4d6 + 4) Piercing damage",
                "18 (4d6 + 4) Fire damage",
              )
            : line,
      },
      {
        evidence: "missing base dice",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("11 (2d6 + 4)", "11")
            : line,
      },
      {
        evidence: "missing alternative damage",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("18 (4d6 + 4) Piercing damage", "18 points")
            : line,
      },
      {
        evidence: "mismatched die size",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("18 (4d6 + 4)", "18 (4d8 + 4)")
            : line,
      },
      {
        evidence: "nonincreasing alternative dice",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("18 (4d6 + 4)", "18 (2d6 + 4)")
            : line,
      },
      {
        evidence: "nonincreasing alternative static damage",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("18 (4d6 + 4)", "10 (4d6 + 4)")
            : line,
      },
      {
        evidence: "impossible attack bonus",
        name: "Chimera",
        procedureName: "Bite",
        mutate: (line: string) =>
          line.startsWith("**Bite.")
            ? line.replace("+7, reach", "+99, reach")
            : line,
      },
      {
        evidence: "unsupported residual text",
        name: "Chimera",
        procedureName: "Ram",
        mutate: (line: string) =>
          line.startsWith("**Ram.")
            ? line.replace(" condition.", " condition and sings.")
            : line,
      },
      {
        evidence: "unresolved multiattack dispatch",
        name: "Ankylosaurus",
        procedureName: "Multiattack",
        mutate: (line: string) =>
          line.startsWith("**Multiattack.")
            ? line.replace("Tail attacks", "Missing attacks")
            : line,
      },
    ] as const;

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...cases], {
          minLength: cases.length,
          maxLength: cases.length,
        }),
        (orderedCases) => {
          for (const scenario of orderedCases) {
            const occurrence = corpusParity.discovery.occurrences.find(
              ({ name }) => name === scenario.name,
            );
            expect(occurrence, scenario.name).toBeDefined();
            if (occurrence === undefined) continue;
            const canonicalSource = sourceByPath.get(
              occurrence.anchor.sourcePath,
            );
            expect(canonicalSource, scenario.name).toBeDefined();
            if (canonicalSource === undefined) continue;
            const contents = canonicalSource
              .split(/\r?\n/)
              .map((line, index) =>
                index + 1 >= occurrence.anchor.lineStart &&
                index + 1 <= occurrence.anchor.lineEnd
                  ? scenario.mutate(line)
                  : line,
              )
              .join("\n");
            const result = projectRawStatBlock(
              { sourcePath: occurrence.anchor.sourcePath, contents },
              occurrence,
              equipmentSource,
            );
            const context = `${scenario.name}: ${scenario.evidence}`;
            expect(result.tag, context).toBe("projected");
            if (result.tag !== "projected") continue;
            expect(result.projection.procedures, context).toContainEqual(
              expect.objectContaining({
                name: scenario.procedureName,
                kind: "textOnly",
              }),
            );
          }
        },
      ),
      { numRuns: 5, seed: 352482 },
    );
  });

  test("sorts multiple qualified RAW condition immunities", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Archmage",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const contents = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("**Immunities** Psychic; Charmed")
          ? `${line.replace("Psychic;", ";")}, Frightened (from a synthetic ward)`
          : line,
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("projected");
    if (result.tag !== "projected") return;
    const immunities = result.projection.generalFacts.immunities;
    expect(immunities.kind).toBe("some");
    if (immunities.kind !== "some") return;
    expect(
      "qualifiedConditions" in immunities.value
        ? immunities.value.qualifiedConditions.map(({ condition }) => condition)
        : [],
    ).toEqual(["charmed", "frightened"]);
  });

  test("uses the trait description owner rather than the procedure description owner", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Hydra",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const contents = canonicalSource
      .split(/\r?\n/)
      .map((line, index) =>
        index + 1 >= occurrence.anchor.lineStart &&
        index + 1 <= occurrence.anchor.lineEnd &&
        line.startsWith("***Hold Breath.")
          ? "***Hold Breath.***"
          : line,
      )
      .join("\n");
    const result = projectRawStatBlock(
      { sourcePath: occurrence.anchor.sourcePath, contents },
      occurrence,
      equipmentSource,
    );
    expect(result.tag).toBe("projected");
    if (result.tag !== "projected") return;
    expect(
      result.projection.traits.find(({ name }) => name === "Hold Breath")
        ?.description,
    ).toBe("");
  });

  test("normalizes and validates an authored text-only description once for both consumers", () => {
    const giantOwl = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Giant Owl",
    );
    expect(giantOwl).toBeDefined();
    if (giantOwl === undefined) return;
    const actions = giantOwl.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const mutateAction = (entry: (typeof actions)[number]) =>
      entry.kind === "textOnly" && entry.name === "Spellcasting"
        ? { ...entry, description: "***" }
        : entry;
    const mutated = {
      ...giantOwl,
      statBlock: {
        ...giantOwl.statBlock,
        actions: [
          mutateAction(firstAction),
          ...remainingActions.map(mutateAction),
        ] as const,
      },
    };
    const result = projectAuthoredStatBlock(mutated, equipmentSource);
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toEqual([
      expect.objectContaining({
        kind: "malformed-evidence",
        anchor: expect.objectContaining({
          field: "procedures.actions.2.description",
        }),
        evidence: "",
      }),
    ]);
  });

  test("distinguishes same-named authored description issues by section and ordinal", () => {
    const giantOwl = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Giant Owl",
    );
    expect(giantOwl).toBeDefined();
    if (giantOwl === undefined) return;
    const actions = giantOwl.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const spellcasting = actions.find(
      (entry) => entry.kind === "textOnly" && entry.name === "Spellcasting",
    );
    expect(spellcasting).toBeDefined();
    if (spellcasting === undefined || spellcasting.kind !== "textOnly") return;
    const [firstAction, ...remainingActions] = actions;
    const invalidDescription = { ...spellcasting, description: "***" };
    const mutated: typeof giantOwl = {
      ...giantOwl,
      statBlock: {
        ...giantOwl.statBlock,
        actions: [
          firstAction === spellcasting ? invalidDescription : firstAction,
          ...remainingActions.map((entry) =>
            entry === spellcasting ? invalidDescription : entry,
          ),
        ] as const,
        bonusActions: [{ ...invalidDescription }] as const,
      },
    };
    const result = projectAuthoredStatBlock(mutated, equipmentSource);
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor }) => ({
        kind,
        field: anchor.field,
      })),
    ).toEqual([
      {
        kind: "malformed-evidence",
        field: "procedures.actions.2.description",
      },
      {
        kind: "malformed-evidence",
        field: "procedures.bonus_actions.2.description",
      },
    ]);
  });

  test("reports each malformed Spellcasting group on RAW and authored parse-once paths", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Incubus",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const replaceGroups = (value: string): string =>
      value
        .replace("At Will:", "Unsupported:")
        .replace("1/Day Each:", "Also Unsupported:")
        .replace("1/Day:", "Also Unsupported:");
    const rawResult = projectRawStatBlock(
      {
        sourcePath: occurrence.anchor.sourcePath,
        contents: replaceGroups(canonicalSource),
      },
      occurrence,
      equipmentSource,
    );

    const giantOwl = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Giant Owl",
    );
    expect(giantOwl).toBeDefined();
    if (giantOwl === undefined) return;
    const actions = giantOwl.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const mutateAction = (
      action: (typeof actions)[number],
    ): (typeof actions)[number] =>
      action.kind === "textOnly" && action.name === "Spellcasting"
        ? { ...action, description: replaceGroups(action.description) }
        : action;
    const authoredResult = projectAuthoredStatBlock(
      {
        ...giantOwl,
        statBlock: {
          ...giantOwl.statBlock,
          actions: [
            mutateAction(firstAction),
            ...remainingActions.map(mutateAction),
          ] as const,
        },
      },
      equipmentSource,
    );

    for (const result of [rawResult, authoredResult]) {
      expect(result.tag).toBe("failed");
      if (
        result.tag !== "failed" ||
        result.failure.tag !== "projection-issues"
      ) {
        continue;
      }
      expect(
        result.failure.issues.map(({ kind, anchor, ...issue }) => ({
          kind,
          field: anchor.field,
          evidence: "evidence" in issue ? issue.evidence : undefined,
        })),
      ).toEqual([
        {
          kind: "unsupported-evidence",
          field: "procedures.Spellcasting.groups.0.label",
          evidence: "Unsupported",
        },
        {
          kind: "unsupported-evidence",
          field: "procedures.Spellcasting.groups.1.label",
          evidence: "Also Unsupported",
        },
      ]);
    }
  });

  test("continues authored on-hit validation after unsupported attack ability evidence", () => {
    const allosaurus = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Allosaurus",
    );
    expect(allosaurus).toBeDefined();
    if (allosaurus === undefined) return;
    const actions = allosaurus.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const mutateAction = (
      action: (typeof actions)[number],
    ): (typeof actions)[number] => {
      if (action.kind !== "executable") return action;
      const procedure = action.procedure;
      if (procedure.kind !== "attack_roll" || procedure.name !== "Bite") {
        return action;
      }
      const mutatedProcedure: typeof procedure = {
        ...procedure,
        attackAbility: "int",
        onHit: [
          {
            kind: "conditional_bonus_damage",
            damageType: "piercing",
            amount: { kind: "fixed", static: PositiveInteger(1) },
            when: { kind: "target_creature_type", types: ["beast"] },
          },
        ],
      };
      return { ...action, procedure: mutatedProcedure };
    };
    const mutated = {
      ...allosaurus,
      statBlock: {
        ...allosaurus.statBlock,
        actions: [
          mutateAction(firstAction),
          ...remainingActions.map(mutateAction),
        ] as const,
      },
    };

    const result = projectAuthoredStatBlock(mutated, equipmentSource);
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(
      result.failure.issues.map(({ kind, anchor, ...issue }) => ({
        kind,
        field: anchor.field,
        evidence: "evidence" in issue ? issue.evidence : undefined,
      })),
    ).toEqual([
      {
        kind: "unsupported-evidence",
        field: "procedures.Bite.attackAbility",
        evidence: "int",
      },
      {
        kind: "unsupported-evidence",
        field: "procedures.Bite.onHit.0.when",
        evidence: "target_creature_type",
      },
    ]);
  });

  test("rejects authored procedure shapes outside scoped fidelity", () => {
    const allosaurus = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Allosaurus",
    );
    expect(allosaurus).toBeDefined();
    if (allosaurus === undefined) return;
    const actions = allosaurus.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    type Action = (typeof actions)[number];

    const cases: readonly {
      readonly expectedField: string;
      readonly mutate: (action: Action) => Action;
    }[] = [
      {
        expectedField: "procedures.Bite.onHit.0.static",
        mutate: (action) => {
          if (
            action.kind !== "executable" ||
            action.procedure.kind !== "attack_roll" ||
            action.procedure.name !== "Bite"
          ) {
            return action;
          }
          const [effect, ...remainingEffects] = action.procedure.onHit;
          if (
            effect.kind !== "damage" ||
            effect.amount.kind !== "fixed" ||
            !("expr" in effect.amount)
          ) {
            return action;
          }
          const { static: _static, ...amountWithoutStatic } = effect.amount;
          return {
            ...action,
            procedure: {
              ...action.procedure,
              onHit: [
                { ...effect, amount: amountWithoutStatic },
                ...remainingEffects,
              ],
            },
          };
        },
      },
      {
        expectedField: "procedures.Bite.onHit.0",
        mutate: (action) =>
          action.kind === "executable" &&
          action.procedure.kind === "attack_roll" &&
          action.procedure.name === "Bite"
            ? {
                ...action,
                procedure: {
                  ...action.procedure,
                  onHit: [{ kind: "apply_condition", condition: "prone" }],
                },
              }
            : action,
      },
      {
        expectedField: "procedures.Synthetic Support",
        mutate: (action) =>
          action.kind === "executable" &&
          action.procedure.kind === "attack_roll" &&
          action.procedure.name === "Bite"
            ? {
                ...action,
                procedure: {
                  kind: "support",
                  name: "Synthetic Support",
                  target: "self",
                  effect: action.procedure.onHit[0],
                },
              }
            : action,
      },
      {
        expectedField: "procedures.Synthetic Save.onFail",
        mutate: (action) =>
          action.kind === "executable" &&
          action.procedure.kind === "attack_roll" &&
          action.procedure.name === "Bite"
            ? {
                ...action,
                procedure: {
                  kind: "save",
                  name: "Synthetic Save",
                  ability: "dex",
                  dc: { kind: "fixed", dc: PositiveInteger(10) },
                  area: {
                    kind: "sphere",
                    radiusFeet: PositiveInteger(10),
                  },
                  onFail: { kind: "apply_condition", condition: "prone" },
                  onSuccess: action.procedure.onHit[0],
                },
              }
            : action,
      },
    ];

    for (const scenario of cases) {
      const [firstAction, ...remainingActions] = actions;
      const result = projectAuthoredStatBlock(
        {
          ...allosaurus,
          statBlock: {
            ...allosaurus.statBlock,
            actions: [
              scenario.mutate(firstAction),
              ...remainingActions.map(scenario.mutate),
            ],
          },
        },
        equipmentSource,
      );
      expect(result.tag, scenario.expectedField).toBe("failed");
      if (
        result.tag !== "failed" ||
        result.failure.tag !== "projection-issues"
      ) {
        continue;
      }
      expect(
        result.failure.issues.map(({ anchor }) => anchor.field),
        scenario.expectedField,
      ).toContain(scenario.expectedField);
    }
  });

  test("reports an authored multiattack dispatch whose target was removed", () => {
    const ankylosaurus = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Ankylosaurus",
    );
    expect(ankylosaurus).toBeDefined();
    if (ankylosaurus === undefined) return;
    const actions = ankylosaurus.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const multiattackOrdinal = actions.find(
      (action) =>
        action.kind === "executable" && action.procedure.kind === "multiattack",
    )?.procedureOrdinal;
    expect(multiattackOrdinal).toBeDefined();
    if (multiattackOrdinal === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const removeTailOrdinal = (action: (typeof actions)[number]) =>
      action.kind === "executable" &&
      action.procedure.kind === "attack_roll" &&
      action.procedure.name === "Tail"
        ? { ...action, procedureOrdinal: multiattackOrdinal }
        : action;

    const result = projectAuthoredStatBlock(
      {
        ...ankylosaurus,
        statBlock: {
          ...ankylosaurus.statBlock,
          actions: [
            removeTailOrdinal(firstAction),
            ...remainingActions.map(removeTailOrdinal),
          ],
        },
      },
      equipmentSource,
    );
    expect(result.tag).toBe("failed");
    if (result.tag !== "failed" || result.failure.tag !== "projection-issues") {
      return;
    }
    expect(result.failure.issues).toContainEqual(
      expect.objectContaining({
        kind: "unresolved-reference",
        anchor: expect.objectContaining({
          field: "procedures.Multiattack.dispatches",
        }),
      }),
    );
  });

  test("binds an authored text-only resource to its parsed attack shape", () => {
    const minotaur = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Minotaur of Baphomet",
    );
    expect(minotaur).toBeDefined();
    if (minotaur === undefined) return;
    const actions = minotaur.statBlock.actions;
    expect(actions).toBeDefined();
    if (actions === undefined) return;
    const [firstAction, ...remainingActions] = actions;
    const simplifyGore = (action: (typeof actions)[number]) =>
      action.kind === "textOnly" && action.name === "Gore (Recharge 5–6)"
        ? {
            ...action,
            description:
              "Melee Attack Roll: +6, reach 5 ft. Hit: 9 (1d10 + 4) Piercing damage.",
          }
        : action;
    const result = projectAuthoredStatBlock(
      {
        ...minotaur,
        statBlock: {
          ...minotaur.statBlock,
          actions: [
            simplifyGore(firstAction),
            ...remainingActions.map(simplifyGore),
          ],
        },
      },
      equipmentSource,
    );
    expect(result.tag).toBe("projected");
    if (result.tag !== "projected") return;
    expect(result.projection.procedures).toContainEqual(
      expect.objectContaining({
        name: "Gore",
        kind: "attack_roll",
        resourceLimits: [
          { kind: "recharge", minimumRoll: 5, ownership: "shared" },
        ],
      }),
    );
  });

  test("accumulates every malformed skill item in source order without dependent skill-name issues", () => {
    const occurrence = corpusParity.discovery.occurrences.find(
      ({ name }) => name === "Ape",
    );
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const canonicalSource = sourceByPath.get(occurrence.anchor.sourcePath);
    expect(canonicalSource).toBeDefined();
    if (canonicalSource === undefined) return;
    const malformedItems = ["Athletics broken", "Perception malformed"];

    fc.assert(
      fc.property(
        fc.shuffledSubarray(malformedItems, {
          minLength: malformedItems.length,
          maxLength: malformedItems.length,
        }),
        (items) => {
          const mutatedSource = canonicalSource
            .split(/\r?\n/)
            .map((line, index) =>
              index + 1 >= occurrence.anchor.lineStart &&
              index + 1 <= occurrence.anchor.lineEnd &&
              line.startsWith("**Skills**")
                ? `**Skills** ${items.join(", ")}`
                : line,
            )
            .join("\n");
          const result = projectRawStatBlock(
            {
              sourcePath: occurrence.anchor.sourcePath,
              contents: mutatedSource,
            },
            occurrence,
            equipmentSource,
          );
          expect(result.tag).toBe("failed");
          if (
            result.tag !== "failed" ||
            result.failure.tag !== "projection-issues"
          ) {
            return;
          }
          expect(
            result.failure.issues.map(({ kind, anchor, ...issue }) => ({
              kind,
              field: anchor.field,
              evidence: "evidence" in issue ? issue.evidence : undefined,
            })),
          ).toEqual(
            items.map((evidence, index) => ({
              kind: "malformed-evidence",
              field: `skillModifiers.${index}`,
              evidence,
            })),
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  test("matches 334 unique source anchors to 330 records and preserves four repeated identities", () => {
    const result = consistentResult(
      evaluateSrdStatBlockScopedFidelity(corpusInput),
    );
    const anchors = result.occurrences.map(
      ({ source }) =>
        `${source.anchor.sourcePath}:${source.anchor.lineStart}-${source.anchor.lineEnd}`,
    );
    const records = new Set(
      result.occurrences.map(
        ({ authoredRecord }) => authoredRecord.statBlockId,
      ),
    );
    const occurrencesByIdentity = new Map<
      NormalizedStatBlockIdentity,
      typeof result.occurrences
    >();
    for (const occurrence of result.occurrences) {
      const prior = occurrencesByIdentity.get(
        normalizedEvidenceIdentity(occurrence.source),
      );
      occurrencesByIdentity.set(
        normalizedEvidenceIdentity(occurrence.source),
        prior === undefined ? [occurrence] : [...prior, occurrence],
      );
    }
    const repeated = Array.from(occurrencesByIdentity.entries()).filter(
      ([, occurrences]) => occurrences.length > 1,
    );
    const sourceCounts = Object.fromEntries(
      SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => [
        sourcePath,
        result.occurrences.filter(
          ({ source }) => source.anchor.sourcePath === sourcePath,
        ).length,
      ]),
    );

    expect(result.occurrences).toHaveLength(334);
    expect(corpusParity.installedRecords).toHaveLength(330);
    expect(new Set(anchors).size).toBe(334);
    expect(records.size).toBe(330);
    expect(occurrencesByIdentity.size).toBe(330);
    expect(sourceCounts).toEqual({
      ".references/srd-5.2.1/Animals.md": 95,
      ".references/srd-5.2.1/Monsters/Monsters-A-B.md": 41,
      ".references/srd-5.2.1/Monsters/Monsters-C-D.md": 27,
      ".references/srd-5.2.1/Monsters/Monsters-E-G.md": 40,
      ".references/srd-5.2.1/Monsters/Monsters-H-L.md": 22,
      ".references/srd-5.2.1/Monsters/Monsters-M-O.md": 25,
      ".references/srd-5.2.1/Monsters/Monsters-P-S.md": 48,
      ".references/srd-5.2.1/Monsters/Monsters-T-Z.md": 36,
    });
    expect(
      Object.fromEntries(
        repeated.map(([identity, occurrences]) => [
          identity,
          occurrences
            .map(
              ({ source }) =>
                `${source.anchor.sourcePath}:${source.anchor.lineStart}-${source.anchor.lineEnd}`,
            )
            .sort((left, right) => left.localeCompare(right)),
        ]),
      ),
    ).toEqual({
      "stone giant": [
        ".references/srd-5.2.1/Monsters/Monsters-P-S.md:1567-1594",
        ".references/srd-5.2.1/Monsters/Monsters-T-Z.md:3-32",
      ],
      "stone golem": [
        ".references/srd-5.2.1/Monsters/Monsters-P-S.md:1598-1631",
        ".references/srd-5.2.1/Monsters/Monsters-T-Z.md:36-71",
      ],
      "storm giant": [
        ".references/srd-5.2.1/Monsters/Monsters-P-S.md:1635-1671",
        ".references/srd-5.2.1/Monsters/Monsters-T-Z.md:75-113",
      ],
      succubus: [
        ".references/srd-5.2.1/Monsters/Monsters-P-S.md:1675-1709",
        ".references/srd-5.2.1/Monsters/Monsters-T-Z.md:117-153",
      ],
    });
    expect(result.authoredAdmissions).toHaveLength(330);
  });

  test("projects every denominator-binding failure before reconciliation", () => {
    const [firstRecord, ...remainingRecords] =
      srdStatBlockCollection.statBlocks;
    expect(firstRecord).toBeDefined();
    if (firstRecord === undefined) return;
    const resourceRecord = srdStatBlockCollection.statBlocks.find(
      ({ name }) => name === "Young White Dragon",
    );
    expect(resourceRecord).toBeDefined();
    if (resourceRecord === undefined) return;
    const { resources: _resources, ...statBlockWithoutResources } =
      resourceRecord.statBlock;
    const invalidResourceRecord: typeof resourceRecord = {
      ...resourceRecord,
      statBlock: statBlockWithoutResources,
    };

    const inputs = [
      { ...corpusInput, authoredRecords: remainingRecords },
      {
        ...corpusInput,
        authoredRecords: [...srdStatBlockCollection.statBlocks, firstRecord],
      },
      {
        ...corpusInput,
        parity: { ...corpusParity, installedRecords: remainingRecords },
      },
      {
        ...corpusInput,
        parity: {
          ...corpusParity,
          installedRecords: [firstRecord, firstRecord, ...remainingRecords],
        },
      },
      {
        ...corpusInput,
        authoredRecords: srdStatBlockCollection.statBlocks.map((record) =>
          record === resourceRecord ? invalidResourceRecord : record,
        ),
      },
    ] as const;

    const observedFailureTags = new Set<string>();
    for (const input of inputs) {
      const projection = projectSrdStatBlockScopedFidelity(input);
      for (const authored of projection.authored) {
        if (authored.outcome.tag === "failed") {
          observedFailureTags.add(authored.outcome.failure.tag);
        }
      }
      expect(reconcileSrdStatBlockScopedFidelity(projection).tag).toBe(
        "inconsistent",
      );
    }

    expect(observedFailureTags).toEqual(
      new Set([
        "projection-outcome-not-supplied",
        "projection-binding-not-unique",
        "projection-outside-parity-denominator",
        "projection-issues",
      ]),
    );

    const occurrence = corpusParity.discovery.occurrences[0];
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const malformedSourceByPath = new Map(sourceByPath);
    malformedSourceByPath.set(occurrence.anchor.sourcePath, "");
    const malformedRaw = projectSrdStatBlockScopedFidelity({
      ...corpusInput,
      sourceByPath: malformedSourceByPath,
    });
    expect(
      malformedRaw.raw.some(
        ({ outcome }) =>
          outcome.tag === "failed" &&
          outcome.failure.tag === "projection-issues",
      ),
    ).toBe(true);
    expect(reconcileSrdStatBlockScopedFidelity(malformedRaw).tag).toBe(
      "inconsistent",
    );
  });

  test("rejects empty projection outcomes against the clean parity denominators", () => {
    const issues = inconsistentIssues(
      reconcileSrdStatBlockScopedFidelity({
        parity: corpusParity,
        raw: [],
        authored: [],
      }),
    );
    const issueCounts = issues.reduce<Record<string, number>>(
      (counts, issue) => ({
        ...counts,
        [issue.kind]: (counts[issue.kind] ?? 0) + 1,
      }),
      {},
    );

    expect(issueCounts).toEqual({
      "raw-projection-failed": 334,
      "authored-projection-failed": 330,
    });
    expect(
      issues.every((issue) =>
        Match.value(issue).pipe(
          Match.when({ kind: "raw-projection-failed" }, ({ failure }) =>
            isProjectionOutcomeNotSupplied(failure),
          ),
          Match.when({ kind: "authored-projection-failed" }, ({ failure }) =>
            isProjectionOutcomeNotSupplied(failure),
          ),
          Match.when({ kind: "mechanics-mismatch" }, () => false),
          Match.exhaustive,
        ),
      ),
    ).toBe(true);
  });

  test("turns every missing source row into typed per-anchor projection evidence", () => {
    const incompleteSourceMap = new Map(sourceByPath);
    incompleteSourceMap.delete(SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH);
    const issues = inconsistentIssues(
      evaluateSrdStatBlockScopedFidelity({
        ...corpusInput,
        sourceByPath: incompleteSourceMap,
      }),
    );

    expect(issues).toHaveLength(95);
    expect(issues.map(issueFailureEvidenceKey)).toEqual(
      expect.arrayContaining(
        cachedCorpusProjections.raw
          .filter(
            ({ evidence }) =>
              evidence.anchor.sourcePath === SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
          )
          .map(
            (projection) =>
              `raw-projection-failed|${sourceKey(projection)}|source-not-supplied|${normalizedEvidenceIdentity(projection.evidence)}`,
          ),
      ),
    );
  });

  test("reports exact missing and duplicate outcomes instead of shrinking the parity join", () => {
    const [missingRaw, duplicateRaw] = cachedCorpusProjections.raw;
    const [missingAuthored, duplicateAuthored] =
      cachedCorpusProjections.authored;
    if (
      missingRaw === undefined ||
      duplicateRaw === undefined ||
      missingAuthored === undefined ||
      duplicateAuthored === undefined
    ) {
      throw new Error("The corpus does not contain denominator probes");
    }
    const issues = inconsistentIssues(
      reconcileSrdStatBlockScopedFidelity({
        parity: corpusParity,
        raw: [...cachedCorpusProjections.raw.slice(1), duplicateRaw],
        authored: [
          ...cachedCorpusProjections.authored.slice(1),
          duplicateAuthored,
        ],
      }),
    );

    expect(issues.map(issueFailureEvidenceKey).sort()).toEqual(
      [
        `raw-projection-failed|${sourceKey(missingRaw)}|projection-outcome-not-supplied|${normalizedEvidenceIdentity(missingRaw.evidence)}`,
        `raw-projection-failed|${sourceKey(duplicateRaw)}|projection-binding-not-unique|${normalizedEvidenceIdentity(duplicateRaw.evidence)}`,
        `authored-projection-failed|${missingAuthored.evidence.statBlockId}|projection-outcome-not-supplied|${normalizedEvidenceIdentity(missingAuthored.evidence)}`,
        `authored-projection-failed|${duplicateAuthored.evidence.statBlockId}|projection-binding-not-unique|${normalizedEvidenceIdentity(duplicateAuthored.evidence)}`,
      ].sort(),
    );
  });

  test("keeps parity evidence distinct while provenance and peer issues leave mechanics assessable", () => {
    const [parityEvidenceRecord] = cachedCorpusProjections.authored;
    if (parityEvidenceRecord === undefined) {
      throw new Error("The corpus has no authored parity evidence record");
    }
    const parityIssues: readonly SrdStatBlockParityIssue[] = [
      {
        kind: "provenance",
        reason: "source-anchor",
        name: "Aarakocra Aeromancer",
        statBlockId: parityEvidenceRecord.evidence.statBlockId,
        actualKind: "srd-5.2.1",
        actualSection: "synthetic wrong anchor",
      },
      {
        kind: "publication-peer",
        evidence: {
          tag: "missing",
          recordKind: "statBlock",
          sourcePath: "synthetic/source.dhall",
          peerPath: "synthetic/peer.json",
        },
      },
    ];
    const parity = { ...corpusParity, issues: parityIssues };
    const result = consistentResult(
      reconcileSrdStatBlockScopedFidelity({
        ...cachedCorpusProjections,
        parity,
      }),
    );

    expect(parity.issues).toEqual(parityIssues);
    expect(result.occurrences).toHaveLength(334);
  });

  test("reconciles actual corpus discovery independently of source-file order", () => {
    const expected = evaluateSrdStatBlockScopedFidelity(corpusInput);
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...sourceFiles], {
          minLength: sourceFiles.length,
          maxLength: sourceFiles.length,
        }),
        (permutation) => {
          const parity = deriveSrdStatBlockParity({
            sourceFiles: permutation,
            installedStatBlocks: srdStatBlockCollection.statBlocks,
            sourceReadIssues: [],
            peerObservations: [],
          });
          expect(
            evaluateSrdStatBlockScopedFidelity({
              ...corpusInput,
              parity,
              sourceByPath: new Map(
                permutation.map(({ sourcePath, contents }) => [
                  sourcePath,
                  contents,
                ]),
              ),
            }),
          ).toEqual(expected);
        },
      ),
      { numRuns: 12 },
    );
  }, 15_000);

  test("gives repeated anchors independent raw evidence and one authored failure", () => {
    const fixture = cachedCorpusProjections;
    const occurrenceCounts = new Map<NormalizedStatBlockIdentity, number>();
    for (const { evidence } of fixture.raw) {
      occurrenceCounts.set(
        normalizedEvidenceIdentity(evidence),
        (occurrenceCounts.get(normalizedEvidenceIdentity(evidence)) ?? 0) + 1,
      );
    }
    const repeatedAuthored = fixture.authored.find(
      ({ evidence }) =>
        occurrenceCounts.get(normalizedEvidenceIdentity(evidence)) === 2,
    );
    if (repeatedAuthored === undefined) {
      throw new Error("Repeated-anchor test requires a repeated identity");
    }
    const repeatedRaw = fixture.raw.filter(
      ({ evidence }) =>
        normalizedEvidenceIdentity(evidence) ===
        normalizedEvidenceIdentity(repeatedAuthored.evidence),
    );
    const [firstRepeatedRaw] = repeatedRaw;
    if (firstRepeatedRaw === undefined) {
      throw new Error("Repeated-anchor test lost its RAW occurrence");
    }
    const rawFailureFixture = {
      ...fixture,
      raw: nonemptyRawProjections(
        fixture.raw.map((projection) =>
          sourceKey(projection) === sourceKey(firstRepeatedRaw)
            ? {
                ...projection,
                outcome: {
                  tag: "failed" as const,
                  failure: SYNTHETIC_PROJECTION_FAILURE,
                },
              }
            : projection,
        ),
      ),
    };
    const authoredFailureFixture = {
      ...fixture,
      authored: nonemptyAuthoredProjections(
        fixture.authored.map((projection) =>
          projection === repeatedAuthored
            ? {
                ...projection,
                outcome: {
                  tag: "failed" as const,
                  failure: SYNTHETIC_PROJECTION_FAILURE,
                },
              }
            : projection,
        ),
      ),
    };
    const authoredMismatchFixture = {
      ...fixture,
      authored: nonemptyAuthoredProjections(
        fixture.authored.map((projection) =>
          projection === repeatedAuthored
            ? changeMechanics(projection, (mechanics) => ({
                ...mechanics,
                generalFacts: {
                  ...mechanics.generalFacts,
                  passivePerception: NonNegativeInteger(
                    mechanics.generalFacts.passivePerception + 1,
                  ),
                },
              }))
            : projection,
        ),
      ),
    };

    expect(
      inconsistentIssues(
        reconcileSrdStatBlockScopedFidelity(rawFailureFixture),
      ).map(({ kind }) => kind),
    ).toEqual(["raw-projection-failed"]);
    expect(
      inconsistentIssues(
        reconcileSrdStatBlockScopedFidelity(authoredFailureFixture),
      ).map(({ kind }) => kind),
    ).toEqual(["authored-projection-failed"]);
    expect(
      inconsistentIssues(
        reconcileSrdStatBlockScopedFidelity(authoredMismatchFixture),
      ).map(({ kind }) => kind),
    ).toEqual(["mechanics-mismatch", "mechanics-mismatch"]);
  });

  test("accumulates simultaneous independent failures without suppressing evidence", () => {
    const fixture = cachedCorpusProjections;
    const mutated = mutateProjectionFixture(fixture, MUTATION_KEYS);
    const result = reconcileSrdStatBlockScopedFidelity(mutated.projections);
    const issues = inconsistentIssues(result);

    expect(issues).toHaveLength(MUTATION_KEYS.length);
    expect(issues.map(issueEvidenceKey).sort()).toEqual(
      mutated.expectedIssueKeys,
    );
    expect(result.authoredAdmissions).toHaveLength(fixture.authored.length - 1);
  });

  test("preserves authored admission evidence without treating it as RAW mechanics", () => {
    const fixture = cachedCorpusProjections;
    const admissionTarget = fixture.authored.find(({ outcome }) =>
      Match.value(outcome).pipe(
        Match.when({ tag: "failed" }, () => false),
        Match.when(
          { tag: "projected" },
          ({ admission }) => admission.length > 0,
        ),
        Match.exhaustive,
      ),
    );
    if (admissionTarget === undefined) {
      throw new Error("Admission-evidence probe requires a text-only entry");
    }
    const expectedAdmission = Match.value(admissionTarget.outcome).pipe(
      Match.when({ tag: "failed" }, () => {
        throw new Error("Admission target was proven to be projected");
      }),
      Match.when({ tag: "projected" }, ({ admission }) => admission.slice(1)),
      Match.exhaustive,
    );
    const authored = fixture.authored.map((projection) => {
      if (projection !== admissionTarget) return projection;
      return Match.value(projection.outcome).pipe(
        Match.when({ tag: "failed" }, () => projection),
        Match.when({ tag: "projected" }, (outcome) => ({
          ...projection,
          outcome: {
            ...outcome,
            admission: expectedAdmission,
          },
        })),
        Match.exhaustive,
      );
    });
    const result = consistentResult(
      reconcileSrdStatBlockScopedFidelity({
        ...fixture,
        authored: nonemptyAuthoredProjections(authored),
      }),
    );
    const evidence = result.authoredAdmissions.find(
      ({ authoredRecord }) =>
        authoredRecord.statBlockId === admissionTarget.evidence.statBlockId,
    );

    expect(evidence?.admission).toEqual(expectedAdmission);
  });

  test("accumulates exact independent issue evidence for every mutation subset and permutation", () => {
    const fixture = cachedCorpusProjections;
    const rawIndices = fixture.raw.map((_, index) => index);
    const authoredIndices = fixture.authored.map((_, index) => index);

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...MUTATION_KEYS), {
          minLength: 1,
          maxLength: MUTATION_KEYS.length,
        }),
        fc.shuffledSubarray(rawIndices, {
          minLength: rawIndices.length,
          maxLength: rawIndices.length,
        }),
        fc.shuffledSubarray(authoredIndices, {
          minLength: authoredIndices.length,
          maxLength: authoredIndices.length,
        }),
        (mutations, rawOrder, authoredOrder) => {
          const mutated = mutateProjectionFixture(fixture, mutations);
          const canonicalResult = reconcileSrdStatBlockScopedFidelity(
            mutated.projections,
          );
          const canonicalIssues = inconsistentIssues(canonicalResult);
          const permutedResult = reconcileSrdStatBlockScopedFidelity(
            permuteProjectionFixture(
              mutated.projections,
              rawOrder,
              authoredOrder,
            ),
          );

          expect(canonicalIssues.map(issueEvidenceKey).sort()).toEqual(
            mutated.expectedIssueKeys,
          );
          expect(permutedResult).toEqual(canonicalResult);
          expect(canonicalIssues).toHaveLength(mutations.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("accumulates simultaneous parity and fidelity mutations without cascading blocked comparisons", () => {
    const mutated = scenarioMutationFixture(cachedCorpusProjections, [
      "missing-blocks-mismatch",
      "provenance-preserves-mismatch",
      "raw-projection-failure",
      "authored-projection-failure",
      "mechanics-mismatch",
    ]);
    const result = reconcileSrdStatBlockScopedFidelity(mutated.projections);

    expect(mutated.projections.parity.issues).toEqual(
      mutated.expectedParityIssues,
    );
    expect(fidelityIssueKeys(result)).toEqual(
      mutated.expectedFidelityIssueKeys,
    );
    expect(fidelityIssueKeys(result)).toHaveLength(4);
  });

  test("preserves exact parity and fidelity evidence for every nonempty scenario subset and permutation", () => {
    const fixture = cachedCorpusProjections;
    const rawIndices = fixture.raw.map((_, index) => index);
    const authoredIndices = fixture.authored.map((_, index) => index);

    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...PARITY_AND_FIDELITY_SCENARIO_KEYS), {
          minLength: 1,
          maxLength: PARITY_AND_FIDELITY_SCENARIO_KEYS.length,
        }),
        fc.shuffledSubarray(rawIndices, {
          minLength: rawIndices.length,
          maxLength: rawIndices.length,
        }),
        fc.shuffledSubarray(authoredIndices, {
          minLength: authoredIndices.length,
          maxLength: authoredIndices.length,
        }),
        (selectedKeys, rawOrder, authoredOrder) => {
          const mutated = scenarioMutationFixture(fixture, selectedKeys);
          const canonicalResult = reconcileSrdStatBlockScopedFidelity(
            mutated.projections,
          );
          const permutedResult = reconcileSrdStatBlockScopedFidelity(
            permuteProjectionFixture(
              mutated.projections,
              rawOrder,
              authoredOrder,
            ),
          );

          expect(mutated.projections.parity.issues).toEqual(
            mutated.expectedParityIssues,
          );
          expect(fidelityIssueKeys(canonicalResult)).toEqual(
            mutated.expectedFidelityIssueKeys,
          );
          expect(permutedResult).toEqual(canonicalResult);
        },
      ),
      { numRuns: 100 },
    );
  });
});
