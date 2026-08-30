import * as Option from "effect/Option";

/**
 * Compare strings by Unicode code point. JSON object member ordering and
 * canonical set ordering use the same comparator throughout the workspace.
 */
export function compareCodePoints(left: string, right: string): number {
  const leftPoints = [...left].map((value) => Number(value.codePointAt(0)));
  const rightPoints = [...right].map((value) => Number(value.codePointAt(0)));
  for (
    let index = 0;
    index < Math.min(leftPoints.length, rightPoints.length);
    index += 1
  ) {
    const difference = leftPoints[index] - rightPoints[index];
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

const MAX_CANONICAL_STRUCTURAL_DEPTH = 1_024;
const MAX_CANONICAL_STRUCTURAL_ITEMS = 100_000;

type CanonicalStructuralFrame =
  | {
      readonly tag: "visit";
      readonly value: CanonicalStructuralValue;
      readonly depth: number;
    }
  | { readonly tag: "close"; readonly value: object; readonly token: string }
  | {
      readonly tag: "arrayMember";
      readonly value: object;
      readonly index: number;
      readonly depth: number;
    }
  | {
      readonly tag: "objectMember";
      readonly value: object;
      readonly key: string;
      readonly depth: number;
    };

type CanonicalStructuralState = {
  readonly output: string[];
  readonly active: Set<object>;
  readonly frames: CanonicalStructuralFrame[];
};

type CanonicalPrimitiveStructuralFunction = CallableFunction;
type CanonicalPrimitiveStructuralValue =
  | undefined
  | boolean
  | string
  | number
  | bigint
  | symbol
  | CanonicalPrimitiveStructuralFunction;
type CanonicalStructuralValue =
  | { readonly kind: "null" }
  | { readonly kind: "object"; readonly value: object }
  | {
      readonly kind: "primitive";
      readonly value: CanonicalPrimitiveStructuralValue;
    };

/**
 * Produce a deterministic key for JSON-like structural equality. Object keys
 * are sorted, arrays retain order and multiplicity, and scalar type tags
 * prevent coercion collisions. Hostile objects and cycles are represented by
 * typed markers so boundary predicates remain total.
 */
export function canonicalStructuralKey(value: unknown): string {
  const state: CanonicalStructuralState = {
    output: [],
    active: new Set<object>(),
    frames: [
      { tag: "visit", value: canonicalStructuralValue(value), depth: 0 },
    ],
  };

  while (state.frames.length > 0) {
    const frame = state.frames[state.frames.length - 1];
    state.frames.length -= 1;
    processCanonicalStructuralFrame(frame, state);
  }
  return state.output.join("");
}

function processCanonicalStructuralFrame(
  frame: CanonicalStructuralFrame,
  state: CanonicalStructuralState,
): void {
  if (frame.tag === "close") {
    state.active.delete(frame.value);
    state.output.push(frame.token);
    return;
  }
  if (frame.tag === "arrayMember") {
    processCanonicalArrayMember(frame, state);
    return;
  }
  if (frame.tag === "objectMember") {
    processCanonicalObjectMember(frame, state);
    return;
  }
  processCanonicalStructuralValue(frame, state);
}

function processCanonicalArrayMember(
  frame: Extract<CanonicalStructuralFrame, { readonly tag: "arrayMember" }>,
  state: CanonicalStructuralState,
): void {
  let present: boolean;
  try {
    present = frame.index in frame.value;
  } catch {
    state.output.push("h:array-member");
    return;
  }
  if (!present) {
    state.output.push("h:hole");
    return;
  }
  let member: unknown;
  try {
    member = Reflect.get(frame.value, String(frame.index));
  } catch {
    state.output.push("h:array-member");
    return;
  }
  state.frames.push({
    tag: "visit",
    value: canonicalStructuralValue(member),
    depth: frame.depth,
  });
}

function processCanonicalObjectMember(
  frame: Extract<CanonicalStructuralFrame, { readonly tag: "objectMember" }>,
  state: CanonicalStructuralState,
): void {
  let member: unknown;
  try {
    member = Reflect.get(frame.value, frame.key);
  } catch {
    state.output.push(`k:${encodeString(frame.key)}=h:getter;`);
    return;
  }
  state.output.push(`k:${encodeString(frame.key)}=`);
  state.frames.push({
    tag: "visit",
    value: canonicalStructuralValue(member),
    depth: frame.depth,
  });
}

function processCanonicalStructuralValue(
  frame: Extract<CanonicalStructuralFrame, { readonly tag: "visit" }>,
  state: CanonicalStructuralState,
): void {
  switch (frame.value.kind) {
    case "null":
      state.output.push("null;");
      return;
    case "object":
      processCanonicalObjectValue(frame.value.value, frame.depth, state);
      return;
    case "primitive":
      state.output.push(canonicalPrimitiveStructuralToken(frame.value.value));
      return;
  }
}

function canonicalStructuralValue(value: unknown): CanonicalStructuralValue {
  const primitive = parseCanonicalPrimitiveStructuralValue(value);
  if (Option.isSome(primitive)) {
    return { kind: "primitive", value: primitive.value };
  }
  if (value === null) return { kind: "null" };
  if (typeof value === "object") return { kind: "object", value };
  return {
    kind: "primitive",
    value: Option.getOrThrow(primitive),
  };
}

function parseCanonicalPrimitiveStructuralValue(
  value: unknown,
): Option.Option<CanonicalPrimitiveStructuralValue> {
  return isCanonicalPrimitiveStructuralValue(value)
    ? Option.some(value)
    : Option.none();
}

function isCanonicalPrimitiveStructuralValue(
  value: unknown,
): value is CanonicalPrimitiveStructuralValue {
  return typeof value !== "object";
}

function canonicalPrimitiveStructuralToken(
  value: CanonicalPrimitiveStructuralValue,
): string {
  switch (typeof value) {
    case "undefined":
      return "undefined;";
    case "boolean":
      return canonicalBooleanToken(value);
    case "string":
      return `string:${encodeString(value)};`;
    case "number":
      return `number:${canonicalNumber(value)};`;
    case "bigint":
      return `bigint:${encodeString(String(value))};`;
    case "symbol":
      return `symbol:${encodeString(symbolDescription(value))};`;
    case "function":
      return "function;";
  }
}

function canonicalBooleanToken(value: boolean): string {
  return value ? "boolean:true;" : "boolean:false;";
}

function symbolDescription(value: symbol): string {
  return value.description ?? "";
}

function processCanonicalObjectValue(
  current: object,
  depth: number,
  state: CanonicalStructuralState,
): void {
  if (depth > MAX_CANONICAL_STRUCTURAL_DEPTH) {
    state.output.push("object:depth-limit;");
    return;
  }
  if (state.active.has(current)) {
    state.output.push("object:cycle;");
    return;
  }
  const arrayValue = readCanonicalArrayValue(current);
  if (arrayValue !== undefined) {
    processCanonicalArrayValue(arrayValue, current, depth, state);
    return;
  }
  processCanonicalRecordValue(current, depth, state);
}

function readCanonicalArrayValue(
  value: object,
): readonly unknown[] | undefined {
  try {
    return isArrayObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function processCanonicalArrayValue(
  arrayValue: readonly unknown[],
  current: object,
  depth: number,
  state: CanonicalStructuralState,
): void {
  let length: number;
  try {
    length = arrayValue.length;
  } catch {
    state.output.push("array:hostile;");
    return;
  }
  if (
    !Number.isSafeInteger(length) ||
    length > MAX_CANONICAL_STRUCTURAL_ITEMS
  ) {
    state.output.push("array:length-limit;");
    return;
  }
  state.active.add(current);
  state.output.push(`array:${length}:[`);
  state.frames.push({ tag: "close", value: current, token: "];" });
  for (let index = length - 1; index >= 0; index -= 1) {
    state.frames.push({
      tag: "arrayMember",
      value: current,
      index,
      depth: depth + 1,
    });
  }
}

function processCanonicalRecordValue(
  current: object,
  depth: number,
  state: CanonicalStructuralState,
): void {
  let keys: string[];
  try {
    keys = Object.keys(current).sort(compareCodePoints);
  } catch {
    state.output.push("object:hostile;");
    return;
  }
  if (keys.length > MAX_CANONICAL_STRUCTURAL_ITEMS) {
    state.output.push("object:key-limit;");
    return;
  }
  state.active.add(current);
  state.output.push(`object:${keys.length}:{`);
  state.frames.push({ tag: "close", value: current, token: "};" });
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const key = keys[index];
    state.frames.push({
      tag: "objectMember",
      value: current,
      key,
      depth: depth + 1,
    });
  }
}

function isArrayObject(value: object): value is readonly unknown[] {
  return Array.isArray(value);
}

export function hasDuplicateStructuralValues(
  values: readonly unknown[],
): boolean {
  const keys = new Set<string>();
  for (const value of values) {
    const key = canonicalStructuralKey(value);
    if (keys.has(key)) return true;
    keys.add(key);
  }
  return false;
}

function encodeString(value: string): string {
  return `${value.length}:${value}`;
}

function canonicalNumber(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (value === Number.POSITIVE_INFINITY) return "+Infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (Object.is(value, -0)) return "-0";
  return String(value);
}
