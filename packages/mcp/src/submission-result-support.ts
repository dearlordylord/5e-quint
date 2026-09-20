import { Schema } from "effect";

import type { SubmissionResultIssue } from "./submission-result-inspector.ts";

export const decodeSubmissionResult = Schema.decodeUnknownResult(
  Schema.JsonObject,
);
export const decodeJsonText = Schema.decodeUnknownResult(
  Schema.fromJsonString(Schema.Json),
);
export const matchesJsonObjectSchema = Schema.is(Schema.JsonObject);

export function canonicalJson(value: Schema.Json): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (matchesJsonObjectSchema(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function issue(
  code: SubmissionResultIssue["code"],
  tool: string,
  path: string,
): SubmissionResultIssue {
  return {
    code,
    tool,
    path: path || "/",
    message: "A representative result exposed an unreviewed high-risk value.",
  };
}
