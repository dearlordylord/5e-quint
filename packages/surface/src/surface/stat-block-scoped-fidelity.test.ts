import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Match } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

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
import { projectRawStatBlock } from "./stat-block-raw-projection.ts";
import {
  evaluateSrdStatBlockScopedFidelity,
  projectSrdStatBlockScopedFidelity,
  reconcileSrdStatBlockScopedFidelity,
  type SrdStatBlockAuthoredFidelityProjection,
  type SrdStatBlockFidelityProjectionInput,
  type SrdStatBlockRawFidelityProjection,
  type SrdStatBlockScopedFidelityIssue,
  type SrdStatBlockScopedFidelityResult,
  type StatBlockScopedProjectionFailure,
  type StatBlockScopedMechanics,
} from "./stat-block-scoped-fidelity.ts";

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
    normalizedIdentity: normalizeStatBlockIdentity(identitySuffix),
  };
  const missingEvidence = {
    statBlockId: statBlockId(idPrefix),
    name: `${sharedSegment}|${identitySuffix}`,
    normalizedIdentity: normalizeStatBlockIdentity(
      `${sharedSegment}|${identitySuffix}`,
    ),
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
        `${issueEvidenceKey(issue)}|${failure.tag}|${source.normalizedIdentity}`,
    ),
    Match.when(
      { kind: "authored-projection-failed" },
      ({ authoredRecord, failure }) =>
        `${issueEvidenceKey(issue)}|${failure.tag}|${authoredRecord.normalizedIdentity}`,
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
    Match.when({ tag: "projection-threw" }, () => false),
    Match.when({ tag: "source-not-supplied" }, () => false),
    Match.when({ tag: "source-path-mismatch" }, () => false),
    Match.when({ tag: "projection-outside-parity-denominator" }, () => false),
    Match.when({ tag: "projection-binding-not-unique" }, () => false),
    Match.exhaustive,
  );
}

const SYNTHETIC_PROJECTION_FAILURE = {
  tag: "projection-threw",
  errorName: "SyntheticProjectionFailure",
  message: "Synthetic projection failure.",
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
        passivePerception: mechanics.generalFacts.passivePerception + 1,
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
    ({ traits }) => traits.some(({ effect }) => effect !== null),
    (mechanics) => ({
      ...mechanics,
      traits: mechanics.traits.map((trait) =>
        Match.value(trait.effect).pipe(
          Match.when(null, () => trait),
          Match.when(
            {
              kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
            },
            () => ({ ...trait, effect: null }),
          ),
          Match.when({ kind: "caster_shared_resistance" }, () => ({
            ...trait,
            effect: null,
          })),
          Match.when({ kind: "caster_heal_link" }, () => ({
            ...trait,
            effect: null,
          })),
          Match.exhaustive,
        ),
      ),
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
      evidence.normalizedIdentity,
      (rawOccurrenceCounts.get(evidence.normalizedIdentity) ?? 0) + 1,
    );
  }
  const used = new Set<NormalizedStatBlockIdentity>();
  return MUTATION_DESCRIPTORS.map((descriptor) => {
    const projection = projections.authored.find((candidate) => {
      const mechanics = projectedMechanics(candidate);
      return (
        mechanics !== undefined &&
        rawOccurrenceCounts.get(candidate.evidence.normalizedIdentity) === 1 &&
        !used.has(candidate.evidence.normalizedIdentity) &&
        descriptor.accepts(mechanics)
      );
    });
    if (projection === undefined) {
      throw new Error("Unable to select an independent fidelity mutation");
    }
    used.add(projection.evidence.normalizedIdentity);
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
        evidence.normalizedIdentity === projection.evidence.normalizedIdentity,
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
        rawReplacements.set(raw.evidence.normalizedIdentity, mutate(raw));
        expectedIssueKeys.push(`raw-projection-failed|${sourceKey(raw)}`);
      }),
      Match.when({ kind: "authored-projection-failure" }, ({ mutate }) => {
        authoredReplacements.set(
          projection.evidence.normalizedIdentity,
          mutate(projection),
        );
        expectedIssueKeys.push(
          `authored-projection-failed|${projection.evidence.statBlockId}`,
        );
      }),
      Match.when({ kind: "mechanics-mismatch" }, ({ mutate }) => {
        authoredReplacements.set(
          projection.evidence.normalizedIdentity,
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
      rawReplacements.get(projection.evidence.normalizedIdentity) ?? projection,
  );
  const authored = fixture.authored.map(
    (projection) =>
      authoredReplacements.get(projection.evidence.normalizedIdentity) ??
      projection,
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
      evidence.normalizedIdentity,
      (rawOccurrenceCounts.get(evidence.normalizedIdentity) ?? 0) + 1,
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
      rawOccurrenceCounts.get(authored.evidence.normalizedIdentity) !== 1
    ) {
      return [];
    }
    const raw = fixture.raw.find(
      ({ evidence }) =>
        evidence.normalizedIdentity === authored.evidence.normalizedIdentity,
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
      passivePerception: mechanics.generalFacts.passivePerception + 1,
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
      target.authored.evidence.normalizedIdentity,
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
          normalizedIdentity: target.authored.evidence.normalizedIdentity,
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
        rawReplacements.set(target.raw.evidence.normalizedIdentity, {
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
        authoredReplacements.set(target.authored.evidence.normalizedIdentity, {
          ...target.authored,
          outcome: {
            tag: "failed",
            failure: SYNTHETIC_PROJECTION_FAILURE,
          },
        });
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
          rawReplacements.get(projection.evidence.normalizedIdentity) ??
          projection,
      ),
      authored: fixture.authored.map(
        (projection) =>
          authoredReplacements.get(projection.evidence.normalizedIdentity) ??
          projection,
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
      target.evidence.normalizedIdentity,
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
        occurrence.source.normalizedIdentity,
      );
      occurrencesByIdentity.set(
        occurrence.source.normalizedIdentity,
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
              `raw-projection-failed|${sourceKey(projection)}|source-not-supplied|${projection.evidence.normalizedIdentity}`,
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
        `raw-projection-failed|${sourceKey(missingRaw)}|projection-outcome-not-supplied|${missingRaw.evidence.normalizedIdentity}`,
        `raw-projection-failed|${sourceKey(duplicateRaw)}|projection-binding-not-unique|${duplicateRaw.evidence.normalizedIdentity}`,
        `authored-projection-failed|${missingAuthored.evidence.statBlockId}|projection-outcome-not-supplied|${missingAuthored.evidence.normalizedIdentity}`,
        `authored-projection-failed|${duplicateAuthored.evidence.statBlockId}|projection-binding-not-unique|${duplicateAuthored.evidence.normalizedIdentity}`,
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
        evidence.normalizedIdentity,
        (occurrenceCounts.get(evidence.normalizedIdentity) ?? 0) + 1,
      );
    }
    const repeatedAuthored = fixture.authored.find(
      ({ evidence }) => occurrenceCounts.get(evidence.normalizedIdentity) === 2,
    );
    if (repeatedAuthored === undefined) {
      throw new Error("Repeated-anchor test requires a repeated identity");
    }
    const repeatedRaw = fixture.raw.filter(
      ({ evidence }) =>
        evidence.normalizedIdentity ===
        repeatedAuthored.evidence.normalizedIdentity,
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
                  passivePerception:
                    mechanics.generalFacts.passivePerception + 1,
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
