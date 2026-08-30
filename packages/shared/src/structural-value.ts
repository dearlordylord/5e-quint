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
      readonly value: unknown;
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
    frames: [{ tag: "visit", value, depth: 0 }],
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
    value: member,
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
    value: member,
    depth: frame.depth,
  });
}

function processCanonicalStructuralValue(
  frame: Extract<CanonicalStructuralFrame, { readonly tag: "visit" }>,
  state: CanonicalStructuralState,
): void {
  if (frame.value === null) {
    state.output.push("null;");
    return;
  }
  if (typeof frame.value === "object") {
    processCanonicalObjectValue(frame.value, frame.depth, state);
    return;
  }
  appendCanonicalPrimitiveStructuralValue(frame.value, state);
}

function appendCanonicalPrimitiveStructuralValue(
  value: unknown,
  state: CanonicalStructuralState,
): void {
  if (typeof value === "undefined") {
    state.output.push("undefined;");
    return;
  }
  if (typeof value === "boolean") {
    state.output.push(canonicalBooleanToken(value));
    return;
  }
  if (typeof value === "string") {
    state.output.push(`string:${encodeString(value)};`);
    return;
  }
  if (typeof value === "number") {
    state.output.push(`number:${canonicalNumber(value)};`);
    return;
  }
  if (typeof value === "bigint") {
    state.output.push(`bigint:${encodeString(String(value))};`);
    return;
  }
  if (typeof value === "symbol") {
    state.output.push(`symbol:${encodeString(symbolDescription(value))};`);
    return;
  }
  if (typeof value === "function") state.output.push("function;");
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
