import { Match, Option, Result } from "effect";
import type { PlaySessionContinuation } from "./play-session-continuation.ts";
import {
  continuationDescriptor,
  continuationRefinements,
  continuationRoot,
} from "./play-session-continuation-descriptor.gen.ts";

import type { ContinuationTypeDescriptor } from "./continuation-type-descriptor.ts";

export function parseCanonicalContinuation(
  value: unknown,
): Result.Result<PlaySessionContinuation, string> {
  let failurePath = "continuation";
  let depth = 0;
  const path: string[] = ["continuation"];
  const accepted = new WeakMap<object, Set<number>>();
  function check(index: number, value: unknown): boolean {
    const descriptor: ContinuationTypeDescriptor | undefined =
      continuationDescriptor[index];
    if (descriptor === undefined) return false;
    if (
      typeof value === "object" &&
      value !== null &&
      accepted.get(value)?.has(index)
    )
      return true;
    const previousPath = failurePath;
    const previousDepth = depth;
    const result = match(descriptor, value);
    if (result) {
      failurePath = previousPath;
      depth = previousDepth;
    }
    if (result && typeof value === "object" && value !== null) {
      const indices = accepted.get(value) ?? new Set<number>();
      indices.add(index);
      accepted.set(value, indices);
    }
    if (!result && path.length >= depth) {
      depth = path.length;
      failurePath = path.join(".");
    }
    return result;
  }
  function at(index: number, value: unknown, key: string): boolean {
    path.push(key);
    const result = check(index, value);
    path.pop();
    return result;
  }
  function pattern(index: number): string {
    const descriptor: ContinuationTypeDescriptor | undefined =
      continuationDescriptor[index];
    if (descriptor === undefined) return "(?!)";
    return Match.value(descriptor).pipe(
      Match.when({ kind: "literal" }, ({ value }) => escape(String(value))),
      Match.when({ kind: "string" }, () => "[\\s\\S]*"),
      Match.when(
        { kind: "number" },
        () => "[-+]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][-+]?[0-9]+)?",
      ),
      Match.when({ kind: "bigint" }, () => "-?[0-9]+"),
      Match.when(
        { kind: "union" },
        ({ types }) => `(?:${types.map(pattern).join("|")})`,
      ),
      Match.when({ kind: "refined" }, ({ type }) =>
        type.kind === "number" ? "[-+]?[0-9]+" : "[\\s\\S]*",
      ),
      Match.orElse(() => "(?!)"),
    );
  }
  function matchesDiscriminator(index: number, value: unknown): boolean {
    if (!isRecord(value)) return true;
    const descriptor: ContinuationTypeDescriptor | undefined =
      continuationDescriptor[index];
    if (descriptor?.kind !== "object") return true;
    return ["kind", "tag"].every((key) => {
      const field = descriptor.fields[key];
      const literal =
        field === undefined ? undefined : continuationDescriptor[field.type];
      return literal?.kind !== "literal" || value[key] === literal.value;
    });
  }
  function missing(key: string): false {
    if (path.length + 1 >= depth) {
      depth = path.length + 1;
      failurePath = [...path, key].join(".");
    }
    return false;
  }
  function match(
    descriptor: ContinuationTypeDescriptor,
    value: unknown,
  ): boolean {
    return Match.value(descriptor).pipe(
      Match.when(
        { kind: "literal" },
        (descriptor) => value === descriptor.value,
      ),
      Match.when({ kind: "undefined" }, () => value === undefined),
      Match.when({ kind: "never" }, () => false),
      Match.when({ kind: "string" }, () => typeof value === "string"),
      Match.when(
        { kind: "number" },
        () => typeof value === "number" && Number.isFinite(value),
      ),
      Match.when({ kind: "bigint" }, () => typeof value === "bigint"),
      Match.when(
        { kind: "none" },
        () => Option.isOption(value) && Option.isNone(value),
      ),
      Match.when(
        { kind: "some" },
        ({ value: index }) =>
          Option.isOption(value) &&
          Option.isSome(value) &&
          at(index, value.value, "some"),
      ),
      Match.when(
        { kind: "schema" },
        ({ refinement }) =>
          continuationRefinements[refinement]?.(value) === true,
      ),
      Match.when(
        { kind: "refined" },
        ({ type, refinement }) =>
          match(type, value) &&
          continuationRefinements[refinement]?.(value) === true,
      ),
      Match.when({ kind: "union" }, ({ types }) =>
        types
          .filter((index) => matchesDiscriminator(index, value))
          .some((index) => check(index, value)),
      ),
      Match.when(
        { kind: "array" },
        ({ value: index }) =>
          Array.isArray(value) &&
          value.every((entry) => at(index, entry, "item")),
      ),
      Match.when(
        { kind: "set" },
        ({ value: index }) =>
          value instanceof Set &&
          [...value].every((entry) => at(index, entry, "item")),
      ),
      Match.when(
        { kind: "map" },
        ({ key, value: index }) =>
          value instanceof Map &&
          [...value].every(
            ([mapKey, entry]) =>
              at(key, mapKey, "mapKey") && at(index, entry, "item"),
          ),
      ),
      Match.when({ kind: "tuple" }, ({ elements, flags }) => {
        if (!Array.isArray(value)) return false;
        const rest = flags.findIndex((flag) => (flag & 12) !== 0);
        const suffixLength = rest === -1 ? 0 : elements.length - rest - 1;
        if (
          value.length < flags.filter((flag) => (flag & 1) !== 0).length ||
          (rest === -1 && value.length > elements.length)
        )
          return false;
        return value.every((entry, index) => {
          const position =
            rest === -1 || index < rest
              ? index
              : index >= value.length - suffixLength
                ? elements.length - (value.length - index)
                : rest;
          const element = elements[position];
          return element !== undefined && at(element, entry, String(index));
        });
      }),
      Match.when({ kind: "object" }, ({ fields }) => {
        if (!isRecord(value)) return false;
        const extra = Object.keys(value).find(
          (key) => !Object.hasOwn(fields, key),
        );
        if (extra !== undefined) return missing(extra);
        return Object.entries(fields).every(([key, field]) =>
          Object.hasOwn(value, key)
            ? at(field.type, value[key], key)
            : field.optional || missing(key),
        );
      }),
      Match.when(
        { kind: "template" },
        ({ texts, types }) =>
          typeof value === "string" &&
          new RegExp(
            `^${texts.map((text, index) => escape(text) + (types[index] === undefined ? "" : pattern(types[index]))).join("")}$`,
            "u",
          ).test(value),
      ),
      Match.exhaustive,
    );
  }
  // The descriptor is generated from this exact owner contract; matching brands retain their owner refinements.
  const matches = (value: unknown): value is PlaySessionContinuation =>
    check(continuationRoot, value);
  return matches(value)
    ? Result.succeed(value)
    : Result.fail(`Saved canonical state is invalid at ${failurePath}.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
