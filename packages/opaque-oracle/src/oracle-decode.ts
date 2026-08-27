import { Either, Option, ParseResult, Schema } from "effect";
import * as AST from "effect/SchemaAST";

import { compareCodePoints } from "./oracle-canonical.ts";

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

export type OracleDecodeIssues = readonly [
  OracleDecodeIssue,
  ...OracleDecodeIssue[],
];

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
): Either.Either<A, OracleDecodeIssues> {
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
  return Either.left(toOracleDecodeIssues(sortIssues(uniqueIssues(issues))));
}

function collectParseIssues(
  issue: ParseResult.ParseIssue,
  path: string,
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  const pending: Array<{
    readonly issue: ParseResult.ParseIssue;
    readonly path: string;
    readonly depth: number;
  }> = [{ issue, path, depth: 0 }];
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    visited += 1;
    if (visited > MAX_RAW_JSON_ITEMS || current.depth > MAX_RAW_JSON_DEPTH) {
      output.push({ path: current.path, code: "wrongType" });
      continue;
    }
    const currentIssue = current.issue;
    switch (currentIssue._tag) {
      case "Pointer": {
        const pointerPath: readonly PropertyKey[] =
          typeof currentIssue.path === "string" ||
          typeof currentIssue.path === "number" ||
          typeof currentIssue.path === "symbol"
            ? [currentIssue.path]
            : currentIssue.path;
        pending.push({
          issue: currentIssue.issue,
          path: pointerPath.reduce<string>(
            (currentPath, segment) => appendPath(currentPath, segment),
            current.path,
          ),
          depth: current.depth + 1,
        });
        continue;
      }
      case "Composite": {
        const children = Array.isArray(currentIssue.issues)
          ? currentIssue.issues
          : [currentIssue.issues];
        for (let index = children.length - 1; index >= 0; index -= 1) {
          const child = children[index];
          if (child !== undefined) {
            pending.push({
              issue: child,
              path: current.path,
              depth: current.depth + 1,
            });
          }
        }
        continue;
      }
      case "Unexpected":
        output.push({ path: current.path, code: "unknownMember" });
        continue;
      case "Missing":
        output.push({ path: current.path, code: "missingMember" });
        continue;
      case "Refinement":
        if (
          currentIssue.issue._tag === "Composite" ||
          currentIssue.issue._tag === "Pointer"
        ) {
          pending.push({
            issue: currentIssue.issue,
            path: current.path,
            depth: current.depth + 1,
          });
          continue;
        }
        {
          const classified = options.classifyRefinement?.(
            currentIssue.actual,
            current.path,
          );
          output.push({
            path: current.path,
            code:
              classified ??
              refinementCode(currentIssue.actual, currentIssue.ast),
          });
        }
        continue;
      case "Transformation":
        pending.push({
          issue: currentIssue.issue,
          path: current.path,
          depth: current.depth + 1,
        });
        continue;
      case "Type":
        output.push({
          path: current.path,
          code:
            typeof currentIssue.actual === "string" &&
            literalStrings(currentIssue.ast).length > 0
              ? "unknownVariant"
              : "wrongType",
        });
        continue;
    }
  }
}

function refinementCode(
  actual: unknown,
  ast: AST.Refinement,
): Exclude<
  OracleDecodeIssueCode,
  | "invalidJson"
  | "wrongType"
  | "unknownMember"
  | "missingMember"
  | "unknownVariant"
  | "duplicateMember"
> {
  if (Array.isArray(actual) && actual.length === 0) return "emptyCollection";
  if (hasUniqueItemsAnnotation(ast)) return "duplicateCollectionMember";
  if (typeof actual === "string") {
    if (actual.length === 0) return "emptyValue";
    if (actual.trim() !== actual) return "nonCanonicalDomainValue";
  }
  if (
    typeof actual === "number" &&
    (!Number.isFinite(actual) || !Number.isInteger(actual) || actual < 0)
  ) {
    return "outOfRange";
  }
  return "nonCanonicalDomainValue";
}

function hasUniqueItemsAnnotation(ast: AST.Refinement): boolean {
  const annotation = Option.getOrUndefined(AST.getJSONSchemaAnnotation(ast));
  return (
    typeof annotation === "object" &&
    annotation !== null &&
    "uniqueItems" in annotation &&
    annotation.uniqueItems === true
  );
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

function toOracleDecodeIssues(
  issues: readonly OracleDecodeIssue[],
): OracleDecodeIssues {
  const [first, ...rest] = issues;
  return first === undefined
    ? [{ path: "", code: "wrongType" }]
    : [first, ...rest];
}

function appendPath(path: string, segment: PropertyKey): string {
  return typeof segment === "number"
    ? `${path}/${segment}`
    : `${path}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

const MAX_RAW_JSON_DEPTH = 1_024;
const MAX_RAW_JSON_ITEMS = 100_000;

type ParsedJson = { readonly end: number };
type ParsedJsonString = { readonly value: string; readonly end: number };

type JsonScanFrame =
  | {
      readonly kind: "object";
      readonly path: string;
      readonly keys: Set<string>;
      state: "keyOrEnd" | "keyRequired" | "value" | "commaOrEnd";
      pendingPath: string | undefined;
    }
  | {
      readonly kind: "array";
      readonly path: string;
      length: number;
      state: "valueOrEnd" | "valueRequired" | "commaOrEnd";
    };

export function parseJsonWithDuplicateDetection(
  text: string,
): Either.Either<unknown, OracleDecodeIssues> {
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
      toOracleDecodeIssues(
        sortIssues(
          duplicates.map((path) => ({
            path,
            code: "duplicateMember" as const,
          })),
        ),
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
  let cursor = skipWhitespace(text, start);
  let nextValue: { readonly path: string } | undefined = { path };
  let rootComplete = false;
  let scannedItems = 0;
  const frames: JsonScanFrame[] = [];

  const completeValue = (): void => {
    const parent = frames[frames.length - 1];
    if (parent === undefined) {
      rootComplete = true;
      return;
    }
    if (parent.kind === "object") {
      parent.state = "commaOrEnd";
      parent.pendingPath = undefined;
      return;
    }
    parent.length += 1;
    parent.state = "commaOrEnd";
  };

  while (true) {
    if (rootComplete) return { end: skipWhitespace(text, cursor) };

    if (nextValue !== undefined) {
      scannedItems += 1;
      if (scannedItems > MAX_RAW_JSON_ITEMS) return undefined;
      const valuePath = nextValue.path;
      nextValue = undefined;
      const char = text[cursor];
      if (char === "{") {
        if (frames.length + 1 > MAX_RAW_JSON_DEPTH) return undefined;
        frames.push({
          kind: "object",
          path: valuePath,
          keys: new Set<string>(),
          state: "keyOrEnd",
          pendingPath: undefined,
        });
        cursor = skipWhitespace(text, cursor + 1);
        continue;
      }
      if (char === "[") {
        if (frames.length + 1 > MAX_RAW_JSON_DEPTH) return undefined;
        frames.push({
          kind: "array",
          path: valuePath,
          length: 0,
          state: "valueOrEnd",
        });
        cursor = skipWhitespace(text, cursor + 1);
        continue;
      }
      if (char === '"') {
        const string = scanJsonString(text, cursor);
        if (string === undefined) return undefined;
        cursor = skipWhitespace(text, string.end);
        completeValue();
        continue;
      }
      let end: number | undefined;
      if (text.startsWith("true", cursor)) end = cursor + 4;
      else if (text.startsWith("false", cursor)) end = cursor + 5;
      else if (text.startsWith("null", cursor)) end = cursor + 4;
      else {
        const number = text
          .slice(cursor)
          .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
        end = number === null ? undefined : cursor + number[0].length;
      }
      if (end === undefined) return undefined;
      cursor = skipWhitespace(text, end);
      completeValue();
      continue;
    }

    const frame = frames[frames.length - 1];
    if (frame === undefined) return undefined;
    if (frame.kind === "object") {
      if (frame.state === "commaOrEnd") {
        if (text[cursor] === "}") {
          frames.pop();
          cursor = skipWhitespace(text, cursor + 1);
          completeValue();
          continue;
        }
        if (text[cursor] !== ",") return undefined;
        frame.state = "keyRequired";
        cursor = skipWhitespace(text, cursor + 1);
      }
      if (frame.state === "keyOrEnd" && text[cursor] === "}") {
        frames.pop();
        cursor = skipWhitespace(text, cursor + 1);
        completeValue();
        continue;
      }
      if (frame.state !== "keyOrEnd" && frame.state !== "keyRequired") {
        return undefined;
      }
      const key = scanJsonString(text, cursor);
      if (key === undefined) return undefined;
      cursor = skipWhitespace(text, key.end);
      if (text[cursor] !== ":") return undefined;
      cursor = skipWhitespace(text, cursor + 1);
      const memberPath = appendPath(frame.path, key.value);
      if (frame.keys.has(key.value)) duplicates.push(memberPath);
      frame.keys.add(key.value);
      frame.pendingPath = memberPath;
      frame.state = "value";
      nextValue = { path: memberPath };
      continue;
    }

    if (frame.state === "commaOrEnd") {
      if (text[cursor] === "]") {
        frames.pop();
        cursor = skipWhitespace(text, cursor + 1);
        completeValue();
        continue;
      }
      if (text[cursor] !== ",") return undefined;
      frame.state = "valueRequired";
      cursor = skipWhitespace(text, cursor + 1);
    }
    if (frame.state === "valueOrEnd" && text[cursor] === "]") {
      frames.pop();
      cursor = skipWhitespace(text, cursor + 1);
      completeValue();
      continue;
    }
    if (frame.state !== "valueOrEnd" && frame.state !== "valueRequired") {
      return undefined;
    }
    const memberPath = appendPath(frame.path, frame.length);
    frame.state = "commaOrEnd";
    nextValue = { path: memberPath };
  }
}

function scanJsonString(
  text: string,
  start: number,
): ParsedJsonString | undefined {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === "\\") cursor += 2;
    else if (text[cursor] === '"') {
      const raw = text.slice(start, cursor + 1);
      try {
        const value = JSON.parse(raw);
        return typeof value === "string"
          ? { value, end: cursor + 1 }
          : undefined;
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
