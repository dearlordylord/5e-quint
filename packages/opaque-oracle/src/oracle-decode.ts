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

type PendingParseIssue = {
  readonly issue: ParseResult.ParseIssue;
  readonly path: string;
  readonly depth: number;
};

type RefinementCode = Exclude<
  OracleDecodeIssueCode,
  | "invalidJson"
  | "wrongType"
  | "unknownMember"
  | "missingMember"
  | "unknownVariant"
  | "duplicateMember"
>;

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
  const pending: PendingParseIssue[] = [{ issue, path, depth: 0 }];
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    visited += 1;
    if (visited > MAX_RAW_JSON_ITEMS || current.depth > MAX_RAW_JSON_DEPTH) {
      output.push({ path: current.path, code: "wrongType" });
      continue;
    }
    collectParseIssue(current, pending, output, options);
  }
}

type SimpleParseIssue = PendingParseIssue & {
  readonly issue: Extract<
    ParseResult.ParseIssue,
    { readonly _tag: "Unexpected" | "Missing" }
  >;
};

function collectParseIssue(
  current: PendingParseIssue,
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  if (isSimpleParseIssue(current)) {
    output.push({
      path: current.path,
      code:
        current.issue._tag === "Unexpected" ? "unknownMember" : "missingMember",
    });
    return;
  }
  collectNonSimpleParseIssue(current, pending, output, options);
}

function isSimpleParseIssue(
  current: PendingParseIssue,
): current is SimpleParseIssue {
  return (
    current.issue._tag === "Unexpected" || current.issue._tag === "Missing"
  );
}

function collectNonSimpleParseIssue(
  current: PendingParseIssue,
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  if (isPointerParseIssue(current)) {
    collectPointerParseIssue(current, pending);
    return;
  }
  if (isCompositeParseIssue(current)) {
    collectCompositeParseIssue(current, pending);
    return;
  }
  if (isRefinementParseIssue(current)) {
    collectRefinementParseIssue(current, pending, output, options);
    return;
  }
  if (current.issue._tag === "Transformation") {
    pending.push({
      issue: current.issue.issue,
      path: current.path,
      depth: current.depth + 1,
    });
    return;
  }
  if (current.issue._tag === "Type") {
    output.push({
      path: current.path,
      code: isUnknownVariant(current.issue) ? "unknownVariant" : "wrongType",
    });
    return;
  }
  output.push({ path: current.path, code: "wrongType" });
}

function isPointerParseIssue(
  current: PendingParseIssue,
): current is PendingParseIssue & { readonly issue: ParseResult.Pointer } {
  return current.issue._tag === "Pointer";
}

function isCompositeParseIssue(
  current: PendingParseIssue,
): current is PendingParseIssue & { readonly issue: ParseResult.Composite } {
  return current.issue._tag === "Composite";
}

function isRefinementParseIssue(
  current: PendingParseIssue,
): current is PendingParseIssue & { readonly issue: ParseResult.Refinement } {
  return current.issue._tag === "Refinement";
}

function collectPointerParseIssue(
  current: PendingParseIssue & { readonly issue: ParseResult.Pointer },
  pending: PendingParseIssue[],
): void {
  const pointerPath: readonly PropertyKey[] =
    typeof current.issue.path === "string" ||
    typeof current.issue.path === "number" ||
    typeof current.issue.path === "symbol"
      ? [current.issue.path]
      : current.issue.path;
  pending.push({
    issue: current.issue.issue,
    path: pointerPath.reduce<string>(
      (currentPath, segment) => appendPath(currentPath, segment),
      current.path,
    ),
    depth: current.depth + 1,
  });
}

function collectCompositeParseIssue(
  current: PendingParseIssue & { readonly issue: ParseResult.Composite },
  pending: PendingParseIssue[],
): void {
  const children = Array.isArray(current.issue.issues)
    ? current.issue.issues
    : [current.issue.issues];
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
}

function collectRefinementParseIssue(
  current: PendingParseIssue & { readonly issue: ParseResult.Refinement },
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  if (
    current.issue.issue._tag === "Composite" ||
    current.issue.issue._tag === "Pointer"
  ) {
    pending.push({
      issue: current.issue.issue,
      path: current.path,
      depth: current.depth + 1,
    });
    return;
  }
  const classified = options.classifyRefinement?.(
    current.issue.actual,
    current.path,
  );
  output.push({
    path: current.path,
    code: classified ?? refinementCode(current.issue.actual, current.issue.ast),
  });
}

function isUnknownVariant(issue: ParseResult.Type): boolean {
  return (
    typeof issue.actual === "string" && literalStrings(issue.ast).length > 0
  );
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
  return (
    refinementStringCode(actual) ??
    refinementNumberCode(actual) ??
    "nonCanonicalDomainValue"
  );
}

function refinementStringCode(actual: unknown): RefinementCode | undefined {
  if (typeof actual !== "string") return undefined;
  if (actual.length === 0) return "emptyValue";
  return actual.trim() !== actual ? "nonCanonicalDomainValue" : undefined;
}

function refinementNumberCode(actual: unknown): RefinementCode | undefined {
  if (typeof actual !== "number") return undefined;
  return !Number.isFinite(actual) || !Number.isInteger(actual) || actual < 0
    ? "outOfRange"
    : undefined;
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

type JsonScanState = {
  cursor: number;
  nextValue: { readonly path: string } | undefined;
  rootComplete: boolean;
  scannedItems: number;
  readonly frames: JsonScanFrame[];
};

type JsonFramePreparation = "closed" | "ready" | "invalid";

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
  const state: JsonScanState = {
    cursor: skipWhitespace(text, start),
    nextValue: { path },
    rootComplete: false,
    scannedItems: 0,
    frames: [],
  };

  while (!state.rootComplete) {
    if (state.nextValue !== undefined) {
      state.scannedItems += 1;
      if (state.scannedItems > MAX_RAW_JSON_ITEMS) return undefined;
      const valuePath = state.nextValue.path;
      state.nextValue = undefined;
      if (!scanNextJsonValue(text, state, valuePath)) return undefined;
      continue;
    }
    const frame = state.frames[state.frames.length - 1];
    if (frame === undefined) return undefined;
    const scanned =
      frame.kind === "object"
        ? scanJsonObjectFrame(text, state, frame, duplicates)
        : scanJsonArrayFrame(text, state, frame);
    if (!scanned) return undefined;
  }
  return { end: skipWhitespace(text, state.cursor) };
}

function completeJsonValue(state: JsonScanState): void {
  const parent = state.frames[state.frames.length - 1];
  if (parent === undefined) {
    state.rootComplete = true;
    return;
  }
  if (parent.kind === "object") {
    parent.state = "commaOrEnd";
    parent.pendingPath = undefined;
    return;
  }
  parent.length += 1;
  parent.state = "commaOrEnd";
}

function scanNextJsonValue(
  text: string,
  state: JsonScanState,
  valuePath: string,
): boolean {
  const opened = openJsonContainer(text, state, valuePath);
  if (opened !== undefined) return opened;
  if (text[state.cursor] === '"') {
    const string = scanJsonString(text, state.cursor);
    if (string === undefined) return false;
    state.cursor = skipWhitespace(text, string.end);
    completeJsonValue(state);
    return true;
  }
  const end = scanJsonPrimitiveEnd(text, state.cursor);
  if (end === undefined) return false;
  state.cursor = skipWhitespace(text, end);
  completeJsonValue(state);
  return true;
}

function openJsonContainer(
  text: string,
  state: JsonScanState,
  valuePath: string,
): boolean | undefined {
  const char = text[state.cursor];
  if (char === "{") {
    if (state.frames.length + 1 > MAX_RAW_JSON_DEPTH) return false;
    state.frames.push({
      kind: "object",
      path: valuePath,
      keys: new Set<string>(),
      state: "keyOrEnd",
      pendingPath: undefined,
    });
    state.cursor = skipWhitespace(text, state.cursor + 1);
    return true;
  }
  if (char !== "[") return undefined;
  if (state.frames.length + 1 > MAX_RAW_JSON_DEPTH) return false;
  state.frames.push({
    kind: "array",
    path: valuePath,
    length: 0,
    state: "valueOrEnd",
  });
  state.cursor = skipWhitespace(text, state.cursor + 1);
  return true;
}

function scanJsonPrimitiveEnd(
  text: string,
  cursor: number,
): number | undefined {
  if (text.startsWith("true", cursor)) return cursor + 4;
  if (text.startsWith("false", cursor)) return cursor + 5;
  if (text.startsWith("null", cursor)) return cursor + 4;
  const number = text
    .slice(cursor)
    .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u);
  return number === null ? undefined : cursor + number[0].length;
}

function scanJsonObjectFrame(
  text: string,
  state: JsonScanState,
  frame: Extract<JsonScanFrame, { readonly kind: "object" }>,
  duplicates: string[],
): boolean {
  const preparation = prepareJsonObjectFrame(text, state, frame);
  if (preparation === "closed") return true;
  if (preparation === "invalid") return false;
  return scanJsonObjectMember(text, state, frame, duplicates);
}

function prepareJsonObjectFrame(
  text: string,
  state: JsonScanState,
  frame: Extract<JsonScanFrame, { readonly kind: "object" }>,
): JsonFramePreparation {
  if (frame.state === "commaOrEnd") {
    if (text[state.cursor] === "}") {
      state.frames.pop();
      state.cursor = skipWhitespace(text, state.cursor + 1);
      completeJsonValue(state);
      return "closed";
    }
    if (text[state.cursor] !== ",") return "invalid";
    frame.state = "keyRequired";
    state.cursor = skipWhitespace(text, state.cursor + 1);
  }
  if (frame.state === "keyOrEnd" && text[state.cursor] === "}") {
    state.frames.pop();
    state.cursor = skipWhitespace(text, state.cursor + 1);
    completeJsonValue(state);
    return "closed";
  }
  return frame.state === "keyOrEnd" || frame.state === "keyRequired"
    ? "ready"
    : "invalid";
}

function scanJsonObjectMember(
  text: string,
  state: JsonScanState,
  frame: Extract<JsonScanFrame, { readonly kind: "object" }>,
  duplicates: string[],
): boolean {
  const key = scanJsonString(text, state.cursor);
  if (key === undefined) return false;
  state.cursor = skipWhitespace(text, key.end);
  if (text[state.cursor] !== ":") return false;
  state.cursor = skipWhitespace(text, state.cursor + 1);
  const memberPath = appendPath(frame.path, key.value);
  if (frame.keys.has(key.value)) duplicates.push(memberPath);
  frame.keys.add(key.value);
  frame.pendingPath = memberPath;
  frame.state = "value";
  state.nextValue = { path: memberPath };
  return true;
}

function scanJsonArrayFrame(
  text: string,
  state: JsonScanState,
  frame: Extract<JsonScanFrame, { readonly kind: "array" }>,
): boolean {
  const preparation = prepareJsonArrayFrame(text, state, frame);
  if (preparation === "closed") return true;
  if (preparation === "invalid") return false;
  const memberPath = appendPath(frame.path, frame.length);
  frame.state = "commaOrEnd";
  state.nextValue = { path: memberPath };
  return true;
}

function prepareJsonArrayFrame(
  text: string,
  state: JsonScanState,
  frame: Extract<JsonScanFrame, { readonly kind: "array" }>,
): JsonFramePreparation {
  if (frame.state === "commaOrEnd") {
    if (text[state.cursor] === "]") {
      state.frames.pop();
      state.cursor = skipWhitespace(text, state.cursor + 1);
      completeJsonValue(state);
      return "closed";
    }
    if (text[state.cursor] !== ",") return "invalid";
    frame.state = "valueRequired";
    state.cursor = skipWhitespace(text, state.cursor + 1);
  }
  if (frame.state === "valueOrEnd" && text[state.cursor] === "]") {
    state.frames.pop();
    state.cursor = skipWhitespace(text, state.cursor + 1);
    completeJsonValue(state);
    return "closed";
  }
  return frame.state === "valueOrEnd" || frame.state === "valueRequired"
    ? "ready"
    : "invalid";
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
