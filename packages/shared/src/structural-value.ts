/**
 * Compare strings by Unicode code point. JSON object member ordering and
 * canonical set ordering use the same comparator throughout the workspace.
 */
export function compareCodePoints(left: string, right: string): number {
  const leftPoints = [...left].map((value) => value.codePointAt(0) ?? 0);
  const rightPoints = [...right].map((value) => value.codePointAt(0) ?? 0);
  for (
    let index = 0;
    index < Math.min(leftPoints.length, rightPoints.length);
    index += 1
  ) {
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);
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
  | { readonly tag: "token"; readonly value: string }
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

type CanonicalStructuralScalar = {
  readonly tag: "scalar";
  readonly token: string;
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
    const frame = state.frames.pop();
    if (frame === undefined) continue;
    processCanonicalStructuralFrame(frame, state);
  }
  return state.output.join("");
}

function processCanonicalStructuralFrame(
  frame: CanonicalStructuralFrame,
  state: CanonicalStructuralState,
): void {
  if (frame.tag === "token") {
    state.output.push(frame.value);
    return;
  }
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
  const scalar = canonicalStructuralScalar(frame.value);
  if (scalar !== undefined) {
    state.output.push(scalar.token);
    return;
  }
  if (!isNonNullStructuralObject(frame.value)) {
    state.output.push("function;");
    return;
  }
  processCanonicalObjectValue(frame.value, frame.depth, state);
}

function canonicalStructuralScalar(
  value: unknown,
): CanonicalStructuralScalar | undefined {
  return value === null
    ? { tag: "scalar", token: "null;" }
    : canonicalNonNullStructuralScalar(value);
}

function canonicalNonNullStructuralScalar(
  value: unknown,
): CanonicalStructuralScalar | undefined {
  if (value === null) return { tag: "scalar", token: "null;" };
  return canonicalPrimitiveStructuralScalar(value);
}

function canonicalPrimitiveStructuralScalar(
  value: unknown,
): CanonicalStructuralScalar | undefined {
  if (typeof value === "undefined") {
    return { tag: "scalar", token: "undefined;" };
  }
  if (typeof value === "boolean") {
    return { tag: "scalar", token: canonicalBooleanToken(value) };
  }
  if (typeof value === "string") {
    return { tag: "scalar", token: `string:${encodeString(value)};` };
  }
  if (typeof value === "number") {
    return { tag: "scalar", token: `number:${canonicalNumber(value)};` };
  }
  if (typeof value === "bigint") {
    return {
      tag: "scalar",
      token: `bigint:${encodeString(String(value))};`,
    };
  }
  if (typeof value === "symbol") {
    return {
      tag: "scalar",
      token: `symbol:${encodeString(symbolDescription(value))};`,
    };
  }
  if (typeof value === "function") {
    return { tag: "scalar", token: "function;" };
  }
  return undefined;
}

function canonicalBooleanToken(value: boolean): string {
  return value ? "boolean:true;" : "boolean:false;";
}

function symbolDescription(value: symbol): string {
  return value.description ?? "";
}

function isNonNullStructuralObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
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
    if (key === undefined) {
      state.output.push("object:hostile;");
      continue;
    }
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
