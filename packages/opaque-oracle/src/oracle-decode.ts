import { Result, Match, Schema, SchemaIssue } from "effect";
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
  readonly issue: SchemaIssue.Issue;
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

type SchemaDecodeDefect = {
  readonly tag: "schemaDecodeDefect";
};

function decodeUnknownResultTotal<A>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
): Result.Result<Result.Result<A, Schema.SchemaError>, SchemaDecodeDefect> {
  try {
    return Result.succeed(
      Schema.decodeUnknownResult(schema, {
        errors: "all",
        onExcessProperty: "error",
        reportInput: true,
      })(input),
    );
  } catch {
    return Result.fail({ tag: "schemaDecodeDefect" });
  }
}

export function decodeWithSchema<A>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
  options: DecodeOptions = {},
): Result.Result<A, OracleDecodeIssues> {
  const decoded = decodeUnknownResultTotal(schema, input);
  if (Result.isFailure(decoded)) {
    const structural = decodeUnknownResultTotal(
      Schema.toEncoded(schema),
      input,
    );
    if (Result.isSuccess(structural)) {
      if (Result.isFailure(structural.success)) {
        const issues: OracleDecodeIssue[] = [];
        collectParseIssues(
          structural.success.failure.issue,
          "",
          issues,
          options,
        );
        return Result.fail(
          toOracleDecodeIssues(sortIssues(uniqueIssues(issues))),
        );
      }
    }
    return Result.fail([{ path: "", code: "wrongType" }]);
  }
  if (Result.isSuccess(decoded.success))
    return Result.succeed(decoded.success.success);

  const issues: OracleDecodeIssue[] = [];
  try {
    collectParseIssues(decoded.success.failure.issue, "", issues, options);
  } catch {
    return Result.fail([{ path: "", code: "wrongType" }]);
  }
  return Result.fail(toOracleDecodeIssues(sortIssues(uniqueIssues(issues))));
}

function collectParseIssues(
  issue: SchemaIssue.Issue,
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

function collectParseIssue(
  current: PendingParseIssue,
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  return Match.value(current.issue).pipe(
    Match.discriminatorsExhaustive("_tag")({
      Pointer: (issue) =>
        collectPointerParseIssue({ ...current, issue }, pending),
      Composite: (issue) =>
        collectCompositeParseIssue({ ...current, issue }, pending),
      UnexpectedKey: () => {
        output.push({ path: current.path, code: "unknownMember" });
      },
      MissingKey: () => {
        output.push({ path: current.path, code: "missingMember" });
      },
      Filter: (issue) =>
        collectFilterParseIssue(
          { ...current, issue },
          pending,
          output,
          options,
        ),
      Encoding: (issue) => {
        pending.push({
          issue: issue.issue,
          path: current.path,
          depth: current.depth + 1,
        });
      },
      InvalidType: (issue) => {
        output.push({
          path: current.path,
          code:
            SchemaIssue.hasInput(issue) &&
            typeof issue.input === "string" &&
            literalStrings(issue.ast).length > 0
              ? "unknownVariant"
              : "wrongType",
        });
      },
      InvalidValue: (issue) => {
        const actual = SchemaIssue.hasInput(issue) ? issue.input : undefined;
        output.push({
          path: current.path,
          code:
            options.classifyRefinement?.(actual, current.path) ??
            refinementCode(actual),
        });
      },
      AnyOf: (issue) =>
        collectAnyOfParseIssue({ ...current, issue }, pending, output),
      OneOf: () => {
        output.push({ path: current.path, code: "unknownVariant" });
      },
      Forbidden: () => {
        output.push({ path: current.path, code: "wrongType" });
      },
    }),
  );
}

function collectAnyOfParseIssue(
  current: PendingParseIssue & { readonly issue: SchemaIssue.AnyOf },
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
): void {
  if (current.issue.issues.length > 0) {
    collectChildParseIssues(current, current.issue.issues, pending);
    return;
  }
  const discriminant = unknownVariantDiscriminant(
    current.issue.ast,
    current.issue.input,
  );
  output.push({
    path:
      discriminant === undefined
        ? current.path
        : appendPath(current.path, discriminant),
    code: discriminant === undefined ? "wrongType" : "unknownVariant",
  });
}

function unknownVariantDiscriminant(
  ast: AST.AST,
  input: unknown,
): PropertyKey | undefined {
  const structural = AST.toType(ast);
  if (
    structural._tag !== "Union" ||
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return undefined;
  }
  const record = input as Record<PropertyKey, unknown>;
  const candidates = new Map<PropertyKey, Set<string>>();
  for (const member of structural.types) {
    const object = AST.toType(member);
    if (object._tag !== "Objects") return undefined;
    const memberCandidates = new Map<PropertyKey, readonly string[]>();
    for (const property of object.propertySignatures) {
      const values = literalStrings(property.type);
      if (values.length > 0) memberCandidates.set(property.name, values);
    }
    if (candidates.size === 0) {
      for (const [name, values] of memberCandidates) {
        candidates.set(name, new Set(values));
      }
      continue;
    }
    for (const [name, values] of candidates) {
      const memberValues = memberCandidates.get(name);
      if (memberValues === undefined) {
        candidates.delete(name);
      } else {
        for (const value of memberValues) values.add(value);
      }
    }
  }
  for (const [name, values] of candidates) {
    const actual = record[name];
    if (typeof actual === "string" && !values.has(actual)) return name;
  }
  return undefined;
}

function collectPointerParseIssue(
  current: PendingParseIssue & { readonly issue: SchemaIssue.Pointer },
  pending: PendingParseIssue[],
): void {
  pending.push({
    issue: current.issue.issue,
    path: current.issue.path.reduce<string>(
      (currentPath, segment) => appendPath(currentPath, segment),
      current.path,
    ),
    depth: current.depth + 1,
  });
}

function collectCompositeParseIssue(
  current: PendingParseIssue & { readonly issue: SchemaIssue.Composite },
  pending: PendingParseIssue[],
): void {
  collectChildParseIssues(current, current.issue.issues, pending);
}

function collectChildParseIssues(
  current: PendingParseIssue,
  children: readonly SchemaIssue.Issue[],
  pending: PendingParseIssue[],
): void {
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

function collectFilterParseIssue(
  current: PendingParseIssue & { readonly issue: SchemaIssue.Filter },
  pending: PendingParseIssue[],
  output: OracleDecodeIssue[],
  options: DecodeOptions,
): void {
  if (current.issue.issue._tag !== "InvalidValue") {
    pending.push({
      issue: current.issue.issue,
      path: current.path,
      depth: current.depth + 1,
    });
    return;
  }
  const actual = SchemaIssue.hasInput(current.issue)
    ? current.issue.input
    : SchemaIssue.hasInput(current.issue.issue)
      ? current.issue.issue.input
      : undefined;
  const classified = options.classifyRefinement?.(actual, current.path);
  output.push({
    path: current.path,
    code:
      classified ??
      refinementCode(actual, filterHasUniqueItems(current.issue.filter)),
  });
}

function refinementCode(
  actual: unknown,
  uniqueItems = false,
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
  if (uniqueItems) return "duplicateCollectionMember";
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

function filterHasUniqueItems(filter: AST.Filter<unknown>): boolean {
  const annotation = filter.annotations?.toJsonSchema?.({} as never);
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
    case "Suspend":
      return literalStrings(ast.thunk());
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
): Result.Result<unknown, OracleDecodeIssues> {
  const duplicates: string[] = [];
  const parsed = scanJsonValue(text, skipWhitespace(text, 0), "", duplicates);
  if (
    parsed === undefined ||
    text.slice(skipWhitespace(text, parsed.end)).length > 0
  ) {
    return Result.fail([{ path: "", code: "invalidJson" }]);
  }
  if (duplicates.length > 0) {
    return Result.fail(
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
    return Result.succeed(JSON.parse(text));
  } catch {
    return Result.fail([{ path: "", code: "invalidJson" }]);
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
