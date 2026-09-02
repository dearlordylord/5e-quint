import { Match } from "effect";

import type { StatBlockRecord } from "./stat-block-types.ts";
import type { SrdProvenance } from "./srd-provenance.ts";
import type { SrdStatBlockPeerObservation } from "./surface-publication-peer-observation.ts";

export const SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH =
  ".references/srd-5.2.1/Animals.md" as const;

export const SRD_STAT_BLOCK_SOURCE_PATHS = [
  SRD_ANIMALS_STAT_BLOCK_SOURCE_PATH,
  ".references/srd-5.2.1/Monsters/Monsters-A-B.md",
  ".references/srd-5.2.1/Monsters/Monsters-C-D.md",
  ".references/srd-5.2.1/Monsters/Monsters-E-G.md",
  ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
  ".references/srd-5.2.1/Monsters/Monsters-M-O.md",
  ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
  ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
] as const;

export const SRD_STAT_BLOCK_SCOPE = {
  kind: "standalone-srd-stat-blocks",
  includes: SRD_STAT_BLOCK_SOURCE_PATHS,
  excludes: [
    "inline-spell-stat-blocks",
    "inline-magic-item-stat-blocks",
  ] as const,
} as const;

export const SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY = 334 as const;
export const SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY = 330 as const;

export type SrdStatBlockSourcePath =
  (typeof SRD_STAT_BLOCK_SOURCE_PATHS)[number];

export type SrdStatBlockSourceFile = {
  readonly sourcePath: string;
  readonly contents: string;
};

export type SrdStatBlockSourceReadIssue = {
  readonly sourcePath: SrdStatBlockSourcePath;
  readonly message: string;
};

export type SrdStatBlockSourceAnchor = {
  readonly sourcePath: SrdStatBlockSourcePath;
  readonly heading: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly spanEnd: number;
  readonly section: string;
};

export type SrdStatBlockSourceNormalization =
  | { readonly tag: "ok"; readonly value: string }
  | { readonly tag: "malformed"; readonly message: string };

export type SrdStatBlockSourceOccurrence = {
  readonly name: string;
  readonly anchor: SrdStatBlockSourceAnchor;
  readonly normalization: SrdStatBlockSourceNormalization;
};

export type SrdStatBlockSourceIssue =
  | {
      readonly kind: "malformed-source";
      readonly sourcePath: SrdStatBlockSourcePath;
      readonly heading: string;
      readonly message: string;
    }
  | {
      readonly kind: "incomplete-source";
      readonly sourcePath: SrdStatBlockSourcePath;
      readonly message: string;
    }
  | {
      readonly kind: "duplicate-source";
      readonly sourcePath: SrdStatBlockSourcePath;
      readonly reason: "identical" | "conflicting";
    };

export type SrdStatBlockSourceIdentity = {
  readonly name: string;
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
};

export type SrdStatBlockSourceDiscovery = {
  readonly occurrences: readonly SrdStatBlockSourceOccurrence[];
  readonly identities: readonly SrdStatBlockSourceIdentity[];
  readonly issues: readonly SrdStatBlockSourceIssue[];
};

export type SrdStatBlockParityIssue =
  | { readonly kind: "missing"; readonly name: string }
  | {
      readonly kind: "extra";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
    }
  | {
      readonly kind: "duplicate-id";
      readonly statBlockId: StatBlockRecord["id"];
    }
  | {
      readonly kind: "duplicate-identity";
      readonly name: string;
      readonly statBlockIds: readonly StatBlockRecord["id"][];
    }
  | {
      readonly kind: "cardinality";
      readonly expectedIdentityCount: number;
      readonly actualInstalledCount: number;
    }
  | {
      readonly kind: "divergent-source";
      readonly name: string;
      readonly anchors: readonly SrdStatBlockSourceAnchor[];
      readonly normalizedSources: readonly string[];
    }
  | SrdStatBlockSourceIssue
  | {
      readonly kind: "provenance";
      readonly reason: "kind";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
      readonly actualKind: Exclude<
        StatBlockRecord["provenance"]["kind"],
        SrdProvenance["kind"]
      >;
    }
  | {
      readonly kind: "provenance";
      readonly reason: "source-anchor";
      readonly name: string;
      readonly statBlockId: StatBlockRecord["id"];
      readonly actualKind: SrdProvenance["kind"];
      readonly actualSection: string;
    }
  | {
      readonly kind: "unreadable-source";
      readonly sourcePath: SrdStatBlockSourcePath;
      readonly message: string;
    }
  | {
      readonly kind: "missing-source";
      readonly sourcePath: SrdStatBlockSourcePath;
      readonly message: string;
    }
  | {
      readonly kind: "publication-peer";
      readonly evidence: Exclude<
        SrdStatBlockPeerObservation,
        { readonly tag: "present" }
      >;
    };

export type SrdStatBlockSourceCoverage =
  | {
      readonly tag: "complete";
      readonly paths: typeof SRD_STAT_BLOCK_SOURCE_PATHS;
    }
  | {
      readonly tag: "incomplete";
      readonly availablePaths: readonly SrdStatBlockSourcePath[];
      readonly missingPaths: readonly SrdStatBlockSourcePath[];
      readonly unreadablePaths: readonly SrdStatBlockSourcePath[];
      readonly incompletePaths: readonly SrdStatBlockSourcePath[];
    };

export type SrdStatBlockParityReport = {
  readonly scope: typeof SRD_STAT_BLOCK_SCOPE;
  readonly sourceCoverage: SrdStatBlockSourceCoverage;
  readonly discovery: SrdStatBlockSourceDiscovery;
  readonly installedRecords: readonly SrdStatBlockParityInstalledRecord[];
  readonly issues: readonly SrdStatBlockParityIssue[];
};

export type SrdStatBlockParityInstalledRecord = Pick<
  StatBlockRecord,
  "id" | "name" | "provenance"
>;

export type SrdStatBlockParityInput = {
  readonly sourceFiles: readonly SrdStatBlockSourceFile[];
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly sourceReadIssues: readonly SrdStatBlockSourceReadIssue[];
  readonly peerObservations: readonly SrdStatBlockPeerObservation[];
};

export type ReadSrdStatBlockParityOptions = {
  readonly repoRoot: string;
  readonly installedStatBlocks: readonly SrdStatBlockParityInstalledRecord[];
  readonly readSource?: (absolutePath: string) => string;
  readonly peerObservations: readonly SrdStatBlockPeerObservation[];
};

const SRD_STAT_BLOCK_FIDELITY_BLOCKING_PARITY_KINDS = {
  missing: true,
  extra: true,
  "duplicate-id": true,
  "duplicate-identity": true,
  cardinality: false,
  "divergent-source": true,
  "malformed-source": true,
  "incomplete-source": false,
  "duplicate-source": false,
  provenance: false,
  "unreadable-source": false,
  "missing-source": false,
  "publication-peer": false,
} as const satisfies Readonly<Record<SrdStatBlockParityIssue["kind"], boolean>>;

type SrdStatBlockFidelityBlockingParityKind = {
  readonly [Kind in SrdStatBlockParityIssue["kind"]]: (typeof SRD_STAT_BLOCK_FIDELITY_BLOCKING_PARITY_KINDS)[Kind] extends true
    ? Kind
    : never;
}[SrdStatBlockParityIssue["kind"]];

export type SrdStatBlockFidelityBlockingParityIssue = Extract<
  SrdStatBlockParityIssue,
  { readonly kind: SrdStatBlockFidelityBlockingParityKind }
>;

export function isSrdStatBlockFidelityBlockingParityIssue(
  issue: SrdStatBlockParityIssue,
): issue is SrdStatBlockFidelityBlockingParityIssue {
  return Match.value(
    SRD_STAT_BLOCK_FIDELITY_BLOCKING_PARITY_KINDS[issue.kind],
  ).pipe(
    Match.when(true, () => true),
    Match.when(false, () => false),
    Match.exhaustive,
  );
}
