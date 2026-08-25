import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";

import {
  decodePortableSrdSurface,
  derivePortableSrdDependencyFieldRoles,
  type PortableSrdDependencyFieldRole,
  type PortableSrdSurfaceIssueCode,
} from "../packages/surface/src/surface/portable-surface.ts";
import { PublishedSrdSurfaceSchema } from "../packages/surface/src/surface/schema.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicationPath = resolve(
  root,
  "packages/surface/publication/srd-surface.json",
);
const outputPath = resolve(
  root,
  "packages/surface/portable-cases/srd-surface-cases.json",
);
const strictDecodeOptions = { onExcessProperty: "error" } as const;

type PortableOutcome =
  | { readonly tag: "accepted"; readonly issueCodes: readonly [] }
  | {
      readonly tag: "rejected";
      readonly issueCodes: readonly PortableSrdSurfaceIssueCode[];
    };

type PortableCase = {
  readonly name: string;
  readonly input?: unknown;
  readonly inputText?: string;
  readonly expected: {
    readonly production: PortableOutcome;
    readonly independent: PortableOutcome;
  };
};

type PortableCaseDocument = {
  readonly version: 1;
  readonly dependencyContract: readonly PortableSrdDependencyFieldRole[];
  readonly cases: readonly PortableCase[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsedPublication: unknown = JSON.parse(
  readFileSync(publicationPath, "utf8"),
);
const publication = Schema.decodeUnknownSync(
  PublishedSrdSurfaceSchema,
  strictDecodeOptions,
)(parsedPublication);

const accepted = (): PortableOutcome => ({
  tag: "accepted",
  issueCodes: [],
});

const rejected = (
  issueCodes: readonly PortableSrdSurfaceIssueCode[],
): PortableOutcome => ({ tag: "rejected", issueCodes });

const firstUnit = publication.units[0];
const firstStatBlock = publication.statBlocks[0];
const lastStatBlock = publication.statBlocks.at(-1);
if (
  firstUnit === undefined ||
  firstStatBlock === undefined ||
  lastStatBlock === undefined
) {
  throw new Error(
    "Published SRD Surface must contain both non-empty record families",
  );
}

const dependencyContract = derivePortableSrdDependencyFieldRoles(publication);

function valuesAtPath(root: unknown, path: string): readonly unknown[] {
  let values: readonly unknown[] = [root];
  for (const segment of path.match(/[^.\[\]]+|\[\]/g) ?? []) {
    if (segment === "[]") {
      values = values.flatMap((value) => (Array.isArray(value) ? value : []));
      continue;
    }
    values = values.flatMap((value) =>
      isRecord(value) && Object.hasOwn(value, segment) ? [value[segment]] : [],
    );
  }
  return values;
}

const missingTargetIds = {
  unit: new Set<string>(),
  statBlock: new Set<string>(),
};
for (const role of dependencyContract) {
  const records =
    role.sourceKind === "unit" ? publication.units : publication.statBlocks;
  const value = records
    .flatMap((record) => valuesAtPath(record, role.path))
    .find((candidate): candidate is string => typeof candidate === "string");
  if (value === undefined) {
    throw new Error(`Dependency contract path is absent: ${role.path}`);
  }
  missingTargetIds[role.targetKind].add(value);
}

const dependencyFailureInput = {
  ...publication,
  units: publication.units.filter(
    (record) => !missingTargetIds.unit.has(String(record.id)),
  ),
  statBlocks: publication.statBlocks.filter(
    (record) => !missingTargetIds.statBlock.has(String(record.id)),
  ),
};

function rejectedCodesFor(
  input: unknown,
): readonly PortableSrdSurfaceIssueCode[] {
  const result = decodePortableSrdSurface(input);
  if (result.tag === "accepted") {
    throw new Error(
      "Expected portable dependency coverage input to be rejected",
    );
  }
  return result.issues.map((issue) => issue.code);
}

const dependencyFailureCodes = rejectedCodesFor(dependencyFailureInput);

const cases: readonly PortableCase[] = [
  {
    name: "valid published aggregate",
    input: publication,
    expected: { production: accepted(), independent: accepted() },
  },
  {
    name: "unknown field",
    input: {
      ...publication,
      units: [
        { ...firstUnit, unknownField: true },
        ...publication.units.slice(1),
      ],
    },
    expected: {
      production: rejected(["schema"]),
      independent: rejected(["schema"]),
    },
  },
  {
    name: "non-SRD provenance",
    input: {
      ...publication,
      statBlocks: [
        ...publication.statBlocks.slice(0, -1),
        {
          ...lastStatBlock,
          provenance: { ...lastStatBlock.provenance, kind: "synthetic-test" },
        },
      ],
    },
    expected: {
      production: rejected(["schema"]),
      independent: rejected(["schema"]),
    },
  },
  {
    name: "refinement violation",
    input: {
      ...publication,
      statBlocks: [
        ...publication.statBlocks.slice(0, -1),
        { ...lastStatBlock, challengeRating: 99 },
      ],
    },
    expected: {
      production: rejected(["schema"]),
      independent: rejected(["schema"]),
    },
  },
  {
    name: "empty collections",
    input: { ...publication, units: [], statBlocks: [] },
    expected: {
      production: rejected(["shape", "shape"]),
      independent: rejected(["schema", "schema"]),
    },
  },
  {
    name: "duplicate JSON member",
    inputText:
      '{"kind":"srd-5.2.1-surface-catalog","units":[],"units":[],"statBlocks":[]}',
    expected: {
      production: rejected(["duplicate-json-member"]),
      independent: rejected(["duplicate-json-member"]),
    },
  },
  {
    name: "malformed JSON text",
    inputText: '{"kind":"srd-5.2.1-surface-catalog",',
    expected: {
      production: rejected(["json"]),
      independent: rejected(["json"]),
    },
  },
  {
    name: "duplicate identity within one family",
    input: {
      ...publication,
      units: [firstUnit, firstUnit, ...publication.units.slice(1)],
    },
    expected: {
      production: rejected(["duplicate-authored-identity"]),
      independent: rejected(["duplicate-authored-identity"]),
    },
  },
  {
    name: "duplicate identity across record families",
    input: {
      ...publication,
      statBlocks: publication.statBlocks.map((record, index) =>
        index === publication.statBlocks.length - 1
          ? { ...record, id: firstUnit.id }
          : record,
      ),
    },
    expected: {
      production: rejected(["duplicate-authored-identity"]),
      independent: rejected(["duplicate-authored-identity"]),
    },
  },
  {
    name: "dangling authored dependency",
    input: {
      ...publication,
      statBlocks: publication.statBlocks.slice(1),
    },
    expected: {
      production: rejected(["dangling-authored-dependency"]),
      independent: rejected(["dangling-authored-dependency"]),
    },
  },
  {
    name: "independent record failures accumulate",
    input: {
      ...publication,
      units: [
        { ...firstUnit, unknownUnitField: true },
        ...publication.units.slice(1),
      ],
      statBlocks: [
        { ...firstStatBlock, unknownStatBlockField: true },
        ...publication.statBlocks.slice(1),
      ],
    },
    expected: {
      production: rejected(["schema", "schema"]),
      independent: rejected(["schema", "schema"]),
    },
  },
  {
    name: "schema and dependency failures accumulate",
    input: {
      ...publication,
      units: [
        { ...firstUnit, unknownUnitField: true },
        ...publication.units.slice(1),
      ],
      statBlocks: publication.statBlocks.slice(1),
    },
    expected: {
      production: rejected(["schema", "dangling-authored-dependency"]),
      independent: rejected(["schema", "dangling-authored-dependency"]),
    },
  },
  {
    name: "all canonical dependency fields are checked",
    input: dependencyFailureInput,
    expected: {
      production: rejected(dependencyFailureCodes),
      independent: rejected(dependencyFailureCodes),
    },
  },
];

const document: PortableCaseDocument = {
  version: 1,
  dependencyContract,
  cases,
};

const verification = decodePortableSrdSurface(publication);
if (verification.tag !== "accepted") {
  throw new Error(
    "Generated portable cases require a valid published aggregate",
  );
}

writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
