import { Either, ParseResult, Schema } from "effect";
import * as AST from "effect/SchemaAST";

import {
  canonicalStructuralKey,
  compareCodePoints,
} from "./oracle-canonical.ts";

export const ORACLE_DECODE_ISSUE_CODES = [
  "invalidJson",
  "duplicateMember",
  "wrongType",
  "missingMember",
  "unknownMember",
  "unknownVariant",
  "outOfRange",
  "emptyValue",
  "emptyCollection",
  "duplicateCollectionMember",
  "nonCanonicalDomainValue",
] as const;

export type OracleDecodeIssueCode = (typeof ORACLE_DECODE_ISSUE_CODES)[number];

export type OracleDecodeIssue = {
  readonly path: string;
  readonly code: OracleDecodeIssueCode;
};

type DecodeOptions = {
  readonly classifyRefinement?: (
    actual: unknown,
    path: string,
  ) => OracleDecodeIssueCode | undefined;
};

export function decodeWithSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
  input: unknown,
  options: DecodeOptions = {},
): Either.Either<A, readonly OracleDecodeIssue[]> {
  let decoded: Either.Either<A, ParseResult.ParseError>;
  try {
    decoded = Schema.decodeUnknownEither(schema, {
      errors: "all",
      onExcessProperty: "error",
    })(input);
  } catch {
    return Either.left([{ path: "", code: "wrongType" }]);
  }
  if (Either.isRight(decoded)) return Either.right(decoded.right);

  const issues: OracleDecodeIssue[] = [];
  try {
    collectParseIssues(decoded.left.issue, "", issues, options);
  } catch {
    return Either.left([{ path: "", code: "wrongType" }]);
  }
  return Either.left(
    sortIssues(
      uniqueIssues(
        issues.length === 0 ? [{ path: "", code: "wrongType" }] : issues,
      ),
    ),
  );
}

function collectParseIssues(
  issue: ParseResult.ParseIssue,
  path: string,
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  switch (issue._tag) {
    case "Pointer": {
      const pointerPath: readonly PropertyKey[] =
        typeof issue.path === "string" ||
        typeof issue.path === "number" ||
        typeof issue.path === "symbol"
          ? [issue.path]
          : issue.path;
      collectParseIssues(
        issue.issue,
        pointerPath.reduce<string>(
          (currentPath, segment) => appendPath(currentPath, segment),
          path,
        ),
        output,
        options,
      );
      return;
    }
    case "Composite": {
      const children = Array.isArray(issue.issues)
        ? issue.issues
        : [issue.issues];
      for (const child of children) {
        collectParseIssues(child, path, output, options);
      }
      return;
    }
    case "Unexpected":
      output.push({ path, code: "unknownMember" });
      return;
    case "Missing":
      output.push({ path, code: "missingMember" });
      return;
    case "Refinement":
      if (issue.issue._tag === "Composite" || issue.issue._tag === "Pointer") {
        collectParseIssues(issue.issue, path, output, options);
        return;
      }
      const classified = options.classifyRefinement?.(issue.actual, path);
      output.push({
        path,
        code: classified ?? refinementCode(issue.actual),
      });
      return;
    case "Transformation":
      collectParseIssues(issue.issue, path, output, options);
      return;
    case "Type":
      output.push({
        path,
        code:
          typeof issue.actual === "string" &&
          literalStrings(issue.ast).length > 0
            ? "unknownVariant"
            : "wrongType",
      });
      return;
  }
}

function refinementCode(
  actual: unknown,
): Exclude<
  OracleDecodeIssueCode,
  | "invalidJson"
  | "wrongType"
  | "unknownMember"
  | "missingMember"
  | "unknownVariant"
  | "duplicateMember"
> {
  if (containsDuplicateCollectionMember(actual)) {
    return "duplicateCollectionMember";
  }
  if (typeof actual === "string") {
    if (actual.length === 0) return "emptyValue";
    if (actual.trim() !== actual) return "nonCanonicalDomainValue";
  }
  if (Array.isArray(actual) && actual.length === 0) return "emptyCollection";
  if (
    typeof actual === "number" &&
    (!Number.isFinite(actual) || !Number.isInteger(actual) || actual < 0)
  ) {
    return "outOfRange";
  }
  return "nonCanonicalDomainValue";
}

function literalStrings(ast: AST.AST): readonly string[] {
  switch (ast._tag) {
    case "Literal":
      return typeof ast.literal === "string" ? [ast.literal] : [];
    case "Union":
      return ast.types.flatMap(literalStrings);
    case "Refinement":
      return literalStrings(ast.from);
    case "Transformation":
      return literalStrings(ast.from);
    default:
      return [];
  }
}

function containsDuplicateCollectionMember(value: unknown): boolean {
  const visited = new Set<object>();
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;

    let isArray: boolean;
    try {
      isArray = Array.isArray(current);
    } catch {
      continue;
    }
    if (isArray) {
      if (visited.has(current as object)) continue;
      visited.add(current as object);
      const keys = new Set<string>();
      try {
        for (const member of current as readonly unknown[]) {
          const key = canonicalStructuralKey(member);
          if (keys.has(key)) return true;
          keys.add(key);
          pending.push(member);
        }
      } catch {
        continue;
      }
      continue;
    }

    if (typeof current !== "object" || current === null) continue;
    if (visited.has(current)) continue;
    visited.add(current);
    try {
      pending.push(...Object.values(current));
    } catch {
      continue;
    }
  }
  return false;
}

function uniqueIssues(
  issues: readonly OracleDecodeIssue[],
): readonly OracleDecodeIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.path}|${issue.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortIssues(
  issues: readonly OracleDecodeIssue[],
): readonly OracleDecodeIssue[] {
  return [...issues].sort((left, right) =>
    left.path === right.path
      ? ORACLE_DECODE_ISSUE_CODES.indexOf(left.code) -
        ORACLE_DECODE_ISSUE_CODES.indexOf(right.code)
      : compareCodePoints(left.path, right.path),
  );
}

function appendPath(path: string, segment: PropertyKey): string {
  return typeof segment === "number"
    ? `${path}/${segment}`
    : `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

type ParsedJson = { readonly value: unknown; readonly end: number };

export function parseJsonWithDuplicateDetection(
  text: string,
): Either.Either<unknown, readonly OracleDecodeIssue[]> {
  const duplicates: string[] = [];
  const parsed = scanJsonValue(text, skipWhitespace(text, 0), "", duplicates);
  if (
    parsed === undefined ||
    text.slice(skipWhitespace(text, parsed.end)).length > 0
  ) {
    return Either.left([{ path: "", code: "invalidJson" }]);
  }
  if (duplicates.length > 0) {
    return Either.left(
      sortIssues(
        duplicates.map((path) => ({ path, code: "duplicateMember" as const })),
      ),
    );
  }
  try {
    return Either.right(JSON.parse(text));
  } catch {
    return Either.left([{ path: "", code: "invalidJson" }]);
  }
}

function scanJsonValue(
  text: string,
  start: number,
  path: string,
  duplicates: string[],
): ParsedJson | undefined {
  const char = text[start];
  if (char === "{") return scanJsonObject(text, start, path, duplicates);
  if (char === "[") return scanJsonArray(text, start, path, duplicates);
  if (char === '"') return scanJsonString(text, start);
  if (text.startsWith("true", start)) return { value: true, end: start + 4 };
  if (text.startsWith("false", start)) return { value: false, end: start + 5 };
  if (text.startsWith("null", start)) return { value: null, end: start + 4 };
  const number = text
    .slice(start)
    .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
  return number === null
    ? undefined
    : { value: Number(number[0]), end: start + number[0].length };
}

function scanJsonObject(
  text: string,
  start: number,
  path: string,
  duplicates: string[],
): ParsedJson | undefined {
  let cursor = skipWhitespace(text, start + 1);
  const keys = new Set<string>();
  const output: Record<string, unknown> = {};
  if (text[cursor] === "}") return { value: output, end: cursor + 1 };
  while (cursor < text.length) {
    const key = scanJsonString(text, cursor);
    if (key === undefined || typeof key.value !== "string") return undefined;
    cursor = skipWhitespace(text, key.end);
    if (text[cursor] !== ":") return undefined;
    cursor = skipWhitespace(text, cursor + 1);
    const memberPath = appendPath(path, key.value);
    const member = scanJsonValue(text, cursor, memberPath, duplicates);
    if (member === undefined) return undefined;
    if (keys.has(key.value)) duplicates.push(memberPath);
    keys.add(key.value);
    output[key.value] = member.value;
    cursor = skipWhitespace(text, member.end);
    if (text[cursor] === "}") return { value: output, end: cursor + 1 };
    if (text[cursor] !== ",") return undefined;
    cursor = skipWhitespace(text, cursor + 1);
  }
  return undefined;
}

function scanJsonArray(
  text: string,
  start: number,
  path: string,
  duplicates: string[],
): ParsedJson | undefined {
  let cursor = skipWhitespace(text, start + 1);
  const output: unknown[] = [];
  if (text[cursor] === "]") return { value: output, end: cursor + 1 };
  while (cursor < text.length) {
    const item = scanJsonValue(
      text,
      cursor,
      appendPath(path, output.length),
      duplicates,
    );
    if (item === undefined) return undefined;
    output.push(item.value);
    cursor = skipWhitespace(text, item.end);
    if (text[cursor] === "]") return { value: output, end: cursor + 1 };
    if (text[cursor] !== ",") return undefined;
    cursor = skipWhitespace(text, cursor + 1);
  }
  return undefined;
}

function scanJsonString(text: string, start: number): ParsedJson | undefined {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === "\\") cursor += 2;
    else if (text[cursor] === '"') {
      const raw = text.slice(start, cursor + 1);
      try {
        return { value: JSON.parse(raw), end: cursor + 1 };
      } catch {
        return undefined;
      }
    } else cursor += 1;
  }
  return undefined;
}

function skipWhitespace(text: string, start: number): number {
  let cursor = start;
  while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
  return cursor;
}
