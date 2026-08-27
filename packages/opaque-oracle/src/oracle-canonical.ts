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

export function canonicalizeStringSet<T extends string>(
  values: readonly T[],
): readonly T[] {
  return [...values].sort(compareCodePoints);
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

/**
 * Produce a deterministic key for structural equality. This deliberately
 * follows JSON-like own enumerable structure: object keys are sorted, arrays
 * retain order and multiplicity, and scalar type tags prevent coercion
 * collisions. Hostile objects and cycles are represented by typed markers so
 * callers performing validation can remain total.
 */
export function canonicalStructuralKey(value: unknown): string {
  const output: string[] = [];
  const active = new Set<object>();
  const frames: CanonicalStructuralFrame[] = [
    { tag: "visit", value, depth: 0 },
  ];

  while (frames.length > 0) {
    const frame = frames.pop();
    if (frame === undefined) continue;
    if (frame.tag === "token") {
      output.push(frame.value);
      continue;
    }
    if (frame.tag === "close") {
      active.delete(frame.value);
      output.push(frame.token);
      continue;
    }
    if (frame.tag === "arrayMember") {
      let present: boolean;
      try {
        present = frame.index in frame.value;
      } catch {
        output.push("h:array-member");
        continue;
      }
      if (!present) {
        output.push("h:hole");
        continue;
      }
      let member: unknown;
      try {
        member = Reflect.get(frame.value, String(frame.index));
      } catch {
        output.push("h:array-member");
        continue;
      }
      frames.push({
        tag: "visit",
        value: member,
        depth: frame.depth,
      });
      continue;
    }
    if (frame.tag === "objectMember") {
      let member: unknown;
      try {
        member = Reflect.get(frame.value, frame.key);
      } catch {
        output.push(`k:${encodeString(frame.key)}=h:getter;`);
        continue;
      }
      output.push(`k:${encodeString(frame.key)}=`);
      frames.push({
        tag: "visit",
        value: member,
        depth: frame.depth,
      });
      continue;
    }

    const { value: current, depth } = frame;
    if (current === null) {
      output.push("null;");
      continue;
    }
    switch (typeof current) {
      case "undefined":
        output.push("undefined;");
        continue;
      case "boolean":
        output.push(current ? "boolean:true;" : "boolean:false;");
        continue;
      case "string":
        output.push(`string:${encodeString(current)};`);
        continue;
      case "number":
        output.push(`number:${canonicalNumber(current)};`);
        continue;
      case "bigint":
        output.push(`bigint:${encodeString(String(current))};`);
        continue;
      case "symbol":
        output.push(`symbol:${encodeString(current.description ?? "")};`);
        continue;
      case "function":
        output.push("function;");
        continue;
      case "object":
        break;
    }

    if (depth > MAX_CANONICAL_STRUCTURAL_DEPTH) {
      output.push("object:depth-limit;");
      continue;
    }
    if (active.has(current)) {
      output.push("object:cycle;");
      continue;
    }

    let isArray: boolean;
    try {
      isArray = Array.isArray(current);
    } catch {
      output.push("object:hostile;");
      continue;
    }
    if (isArray) {
      let length: number;
      try {
        length = (current as readonly unknown[]).length;
      } catch {
        output.push("array:hostile;");
        continue;
      }
      if (
        !Number.isSafeInteger(length) ||
        length > MAX_CANONICAL_STRUCTURAL_ITEMS
      ) {
        output.push("array:length-limit;");
        continue;
      }
      active.add(current);
      output.push(`array:${length}:[`);
      frames.push({ tag: "close", value: current, token: "];" });
      for (let index = length - 1; index >= 0; index -= 1) {
        frames.push({
          tag: "arrayMember",
          value: current,
          index,
          depth: depth + 1,
        });
      }
      continue;
    }

    let keys: string[];
    try {
      keys = Object.keys(current).sort(compareCodePoints);
    } catch {
      output.push("object:hostile;");
      continue;
    }
    if (keys.length > MAX_CANONICAL_STRUCTURAL_ITEMS) {
      output.push("object:key-limit;");
      continue;
    }
    active.add(current);
    output.push(`object:${keys.length}:{`);
    frames.push({ tag: "close", value: current, token: "};" });
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      if (key === undefined) {
        output.push("object:hostile;");
        continue;
      }
      frames.push({
        tag: "objectMember",
        value: current,
        key,
        depth: depth + 1,
      });
    }
  }
  return output.join("");
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
