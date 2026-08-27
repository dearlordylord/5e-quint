import { createRequire } from "node:module";

type ErrorObject = {
  readonly instancePath: string;
  readonly keyword: string;
  readonly params: Record<string, unknown>;
};

type ValidateFunction = ((value: unknown) => boolean) & {
  readonly errors: readonly ErrorObject[] | null;
};

type AjvConstructor = new (options: {
  readonly strict: boolean;
  readonly inlineRefs: boolean;
  readonly allErrors: boolean;
  readonly code: { readonly optimize: number };
}) => { compile(schema: unknown): ValidateFunction };

function isAjvModule(
  value: unknown,
): value is { readonly default: AjvConstructor } {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "default" in value &&
    typeof value.default === "function"
  );
}

const packageRequire = createRequire(
  new URL("../packages/surface/package.json", import.meta.url),
);
const loadedAjvModule: unknown = packageRequire("ajv/dist/2020.js");
if (!isAjvModule(loadedAjvModule)) {
  throw new Error("Ajv 2020 module did not expose a constructor");
}
const Ajv2020 = loadedAjvModule.default;

export const PORTABLE_CASE_ISSUE_CODES = [
  "json",
  "shape",
  "schema",
  "duplicate-json-member",
  "duplicate-authored-identity",
  "dangling-authored-dependency",
  "unsupported-schema-node",
] as const;
export type PortableCaseIssueCode = (typeof PORTABLE_CASE_ISSUE_CODES)[number];
export type PortableRecordKind = "unit" | "statBlock";

export type PortableDependencyRole = {
  readonly sourceKind: PortableRecordKind;
  readonly path: string;
  readonly fieldName: string;
  readonly targetKind: PortableRecordKind;
  readonly relation: string;
};

type PortableIssueBase = {
  readonly code: PortableCaseIssueCode;
  readonly path: string;
};

export type PortableCaseIssue =
  | (PortableIssueBase & { readonly code: "json" | "shape" | "schema" })
  | (PortableIssueBase & {
      readonly code: "duplicate-json-member";
      readonly memberName: string;
    })
  | (PortableIssueBase & {
      readonly code: "duplicate-authored-identity";
      readonly targetKind: PortableRecordKind;
      readonly targetId: string;
      readonly priorPath: string;
    })
  | (PortableIssueBase & {
      readonly code: "dangling-authored-dependency";
      readonly targetKind: PortableRecordKind;
      readonly targetId: string;
      readonly relation: string;
    })
  | (PortableIssueBase & {
      readonly code: "unsupported-schema-node";
      readonly astTag: string;
    });

export type PortableIssueList = readonly [
  PortableCaseIssue,
  ...PortableCaseIssue[],
];

export type PortableCaseOutcome =
  | { readonly tag: "accepted" }
  | { readonly tag: "rejected"; readonly issues: PortableIssueList };

export type PortableCaseInput =
  | { readonly input: unknown }
  | { readonly inputText: string };

export type PortableOracleResult =
  | {
      readonly tag: "accepted";
      readonly catalog: Record<string, unknown>;
    }
  | { readonly tag: "rejected"; readonly issues: PortableIssueList };

type JsonObject = Record<string, unknown>;

type JsonMemberScan = {
  readonly valid: boolean;
  readonly duplicateMembers: readonly {
    readonly path: string;
    readonly memberName: string;
  }[];
};

type Cursor = { readonly text: string; position: number };

type PathValue = { readonly value: unknown; readonly path: string };

type FamilyRecord = { readonly record: JsonObject; readonly index: number };

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function skipWhitespace(cursor: Cursor): void {
  while (/\s/.test(cursor.text[cursor.position] ?? "")) cursor.position += 1;
}

function parseJsonString(cursor: Cursor): string | undefined {
  if (cursor.text[cursor.position] !== '"') return undefined;
  const start = cursor.position;
  cursor.position += 1;
  let escaped = false;
  while (cursor.position < cursor.text.length) {
    const character = cursor.text[cursor.position];
    cursor.position += 1;
    if (escaped) {
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === '"') {
      try {
        const decoded: unknown = JSON.parse(
          cursor.text.slice(start, cursor.position),
        );
        return typeof decoded === "string" ? decoded : undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function parseJsonObject(
  cursor: Cursor,
  path: string,
  duplicates: { path: string; memberName: string }[],
): boolean {
  cursor.position += 1;
  skipWhitespace(cursor);
  const members = new Set<string>();
  if (cursor.text[cursor.position] === "}") {
    cursor.position += 1;
    return true;
  }
  while (cursor.position < cursor.text.length) {
    skipWhitespace(cursor);
    const memberName = parseJsonString(cursor);
    if (memberName === undefined) return false;
    if (members.has(memberName)) {
      duplicates.push({ path: `${path}.${memberName}`, memberName });
    }
    members.add(memberName);
    skipWhitespace(cursor);
    if (cursor.text[cursor.position] !== ":") return false;
    cursor.position += 1;
    if (!parseJsonValue(cursor, `${path}.${memberName}`, duplicates)) {
      return false;
    }
    skipWhitespace(cursor);
    if (cursor.text[cursor.position] === "}") {
      cursor.position += 1;
      return true;
    }
    if (cursor.text[cursor.position] !== ",") return false;
    cursor.position += 1;
  }
  return false;
}

function parseJsonArray(
  cursor: Cursor,
  path: string,
  duplicates: { path: string; memberName: string }[],
): boolean {
  cursor.position += 1;
  skipWhitespace(cursor);
  if (cursor.text[cursor.position] === "]") {
    cursor.position += 1;
    return true;
  }
  let index = 0;
  while (cursor.position < cursor.text.length) {
    if (!parseJsonValue(cursor, `${path}[${index}]`, duplicates)) return false;
    index += 1;
    skipWhitespace(cursor);
    if (cursor.text[cursor.position] === "]") {
      cursor.position += 1;
      return true;
    }
    if (cursor.text[cursor.position] !== ",") return false;
    cursor.position += 1;
  }
  return false;
}

function parseJsonPrimitive(cursor: Cursor): boolean {
  const start = cursor.position;
  while (
    cursor.position < cursor.text.length &&
    !/[\s,\]}]/.test(cursor.text[cursor.position] ?? "")
  ) {
    cursor.position += 1;
  }
  return cursor.position > start;
}

function parseJsonValue(
  cursor: Cursor,
  path: string,
  duplicates: { path: string; memberName: string }[],
): boolean {
  skipWhitespace(cursor);
  const character = cursor.text[cursor.position];
  if (character === '"') return parseJsonString(cursor) !== undefined;
  if (character === "{") return parseJsonObject(cursor, path, duplicates);
  if (character === "[") return parseJsonArray(cursor, path, duplicates);
  return parseJsonPrimitive(cursor);
}

function scanJsonMembers(text: string): JsonMemberScan {
  const cursor: Cursor = { text, position: 0 };
  const duplicateMembers: { path: string; memberName: string }[] = [];
  const valid = parseJsonValue(cursor, "$", duplicateMembers);
  skipWhitespace(cursor);
  return {
    valid: valid && cursor.position === text.length,
    duplicateMembers,
  };
}

function jsonPointerPath(pointer: string): string {
  if (pointer === "") return "$";
  let path = "$";
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    path += /^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`;
  }
  return path;
}

function appendPath(path: string, segment: string): string {
  return path.endsWith("]") ? `${path}.${segment}` : `${path}.${segment}`;
}

function pathSegments(path: string): readonly string[] {
  return path.match(/[^.\[\]]+|\[\]/g) ?? [];
}

function descendPath(value: PathValue, segment: string): readonly PathValue[] {
  if (segment === "[]") {
    return Array.isArray(value.value)
      ? value.value.map((item, index) => ({
          value: item,
          path: `${value.path}[${index}]`,
        }))
      : [];
  }
  return isObject(value.value) && Object.hasOwn(value.value, segment)
    ? [{ value: value.value[segment], path: appendPath(value.path, segment) }]
    : [];
}

function valuesAtPath(
  root: unknown,
  rootPath: string,
  path: string,
): readonly PathValue[] {
  let values: readonly PathValue[] = [{ value: root, path: rootPath }];
  for (const segment of pathSegments(path)) {
    values = values.flatMap((value) => descendPath(value, segment));
  }
  return values;
}

function recordPath(instancePath: string): string {
  const match = /^\/(units|statBlocks)\/\d+/.exec(instancePath);
  return jsonPointerPath(match?.[0] ?? instancePath);
}

function issueSortKey(issue: PortableCaseIssue): string {
  return JSON.stringify(issue);
}

function sortedIssues(
  issues: readonly PortableCaseIssue[],
): PortableCaseIssue[] {
  return [...issues].sort((left, right) =>
    issueSortKey(left).localeCompare(issueSortKey(right)),
  );
}

function familyRecords(
  value: unknown,
  family: "units" | "statBlocks",
): readonly FamilyRecord[] {
  if (!isObject(value) || !Array.isArray(value[family])) return [];
  return value[family].flatMap((entry, index) =>
    isObject(entry) ? [{ record: entry, index }] : [],
  );
}

function validFamilyRecords(
  value: unknown,
  family: "units" | "statBlocks",
  invalidPaths: ReadonlySet<string>,
): readonly FamilyRecord[] {
  return familyRecords(value, family).filter(
    ({ index }) => !invalidPaths.has(`$.${family}[${index}]`),
  );
}

function shapeIssues(value: unknown): readonly PortableCaseIssue[] {
  if (!isObject(value)) return [{ code: "shape", path: "$" }];
  const issues: PortableCaseIssue[] = [];
  if (value.kind !== "srd-5.2.1-surface-catalog") {
    issues.push({ code: "shape", path: "$.kind" });
  }
  for (const family of ["units", "statBlocks"] as const) {
    if (!Array.isArray(value[family]) || value[family].length === 0) {
      issues.push({ code: "shape", path: `$.${family}` });
    }
  }
  return issues;
}

function isRootShapeError(error: ErrorObject): boolean {
  if (error.keyword === "additionalProperties") return false;
  const path = jsonPointerPath(error.instancePath);
  return (
    path === "$" ||
    path === "$.kind" ||
    path === "$.units" ||
    path === "$.statBlocks"
  );
}

function schemaIssuePath(error: ErrorObject): string {
  if (error.keyword === "additionalProperties" && error.instancePath === "") {
    const additionalProperty = error.params.additionalProperty;
    if (typeof additionalProperty === "string") {
      return `$.${additionalProperty}`;
    }
  }
  return recordPath(error.instancePath);
}

function schemaIssues(
  value: unknown,
  validate: ValidateFunction,
): {
  readonly issues: readonly PortableCaseIssue[];
  readonly invalidRecordPaths: ReadonlySet<string>;
} {
  validate(value);
  const paths = new Set<string>();
  for (const error of validate.errors ?? []) {
    if (isRootShapeError(error)) continue;
    paths.add(schemaIssuePath(error));
  }
  const issues = [...paths].map((path) => ({ code: "schema" as const, path }));
  const invalidRecordPaths = new Set(
    [...paths].filter((path) => /^\$\.(units|statBlocks)\[\d+\]$/.test(path)),
  );
  return { issues, invalidRecordPaths };
}

function identityIssues(
  value: unknown,
  invalidRecordPaths: ReadonlySet<string>,
): readonly PortableCaseIssue[] {
  const seen = new Map<
    string,
    { readonly targetKind: PortableRecordKind; readonly path: string }
  >();
  const seenStatBlockIdentities = new Map<
    string,
    { readonly targetId: string; readonly path: string }
  >();
  const issues: PortableCaseIssue[] = [];
  for (const [family, targetKind] of [
    ["units", "unit"],
    ["statBlocks", "statBlock"],
  ] as const) {
    for (const { record, index } of validFamilyRecords(
      value,
      family,
      invalidRecordPaths,
    )) {
      const targetId = record.id;
      if (typeof targetId !== "string") continue;
      const path = `$.${family}[${index}].id`;
      const prior = seen.get(targetId);
      if (prior === undefined) {
        seen.set(targetId, { targetKind, path });
      } else {
        issues.push({
          code: "duplicate-authored-identity",
          path,
          targetKind,
          targetId,
          priorPath: prior.path,
        });
      }

      if (targetKind !== "statBlock" || typeof record.name !== "string") {
        continue;
      }
      const normalizedIdentity = record.name
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      const priorStatBlock = seenStatBlockIdentities.get(normalizedIdentity);
      if (priorStatBlock === undefined) {
        seenStatBlockIdentities.set(normalizedIdentity, { targetId, path });
      } else if (priorStatBlock.targetId !== targetId) {
        issues.push({
          code: "duplicate-authored-identity",
          path,
          targetKind,
          targetId,
          priorPath: priorStatBlock.path,
        });
      }
    }
  }
  return issues;
}

function dependencyIssues(
  value: unknown,
  contract: readonly PortableDependencyRole[],
  invalidRecordPaths: ReadonlySet<string>,
): readonly PortableCaseIssue[] {
  const unitIds = new Set(
    validFamilyRecords(value, "units", invalidRecordPaths)
      .map(({ record }) => record.id)
      .filter((id): id is string => typeof id === "string"),
  );
  const statBlockIds = new Set(
    validFamilyRecords(value, "statBlocks", invalidRecordPaths)
      .map(({ record }) => record.id)
      .filter((id): id is string => typeof id === "string"),
  );
  const issues: PortableCaseIssue[] = [];
  for (const role of contract) {
    const family = role.sourceKind === "unit" ? "units" : "statBlocks";
    const targetIds = role.targetKind === "unit" ? unitIds : statBlockIds;
    for (const { record, index } of validFamilyRecords(
      value,
      family,
      invalidRecordPaths,
    )) {
      const rootPath = `$.${family}[${index}]`;
      for (const candidate of valuesAtPath(record, rootPath, role.path)) {
        if (typeof candidate.value !== "string") continue;
        if (targetIds.has(candidate.value)) continue;
        issues.push({
          code: "dangling-authored-dependency",
          path: candidate.path,
          targetKind: role.targetKind,
          targetId: candidate.value,
          relation: role.relation,
        });
      }
    }
  }
  return issues;
}

function rejected(issues: readonly PortableCaseIssue[]): PortableOracleResult {
  const sorted = sortedIssues(issues);
  const [first, ...rest] = sorted;
  if (first === undefined) {
    throw new Error("Independent oracle rejection requires an issue");
  }
  return { tag: "rejected", issues: [first, ...rest] };
}

export class PortableSurfaceOracle {
  readonly #validate: ValidateFunction;

  constructor(schema: unknown) {
    this.#validate = new Ajv2020({
      strict: false,
      inlineRefs: false,
      allErrors: true,
      code: { optimize: 1 },
    }).compile(isObject(schema) ? schema : false);
  }

  evaluateValue(
    value: unknown,
    contract: readonly PortableDependencyRole[],
  ): PortableOracleResult {
    const structural = schemaIssues(value, this.#validate);
    const issues = [
      ...shapeIssues(value),
      ...structural.issues,
      ...identityIssues(value, structural.invalidRecordPaths),
      ...dependencyIssues(value, contract, structural.invalidRecordPaths),
    ];
    if (issues.length > 0) return rejected(issues);
    return isObject(value)
      ? { tag: "accepted", catalog: value }
      : rejected([{ code: "shape", path: "$" }]);
  }

  evaluateInput(
    input: PortableCaseInput,
    contract: readonly PortableDependencyRole[],
  ): PortableOracleResult {
    if ("input" in input) return this.evaluateValue(input.input, contract);
    const scan = scanJsonMembers(input.inputText);
    if (scan.valid && scan.duplicateMembers.length > 0) {
      return rejected(
        scan.duplicateMembers.map(({ path, memberName }) => ({
          code: "duplicate-json-member" as const,
          path,
          memberName,
        })),
      );
    }
    try {
      return this.evaluateValue(JSON.parse(input.inputText), contract);
    } catch {
      return rejected([{ code: "json", path: "$" }]);
    }
  }
}
