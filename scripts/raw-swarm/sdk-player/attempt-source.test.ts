import { describe, expect, test } from "vitest";

import { admitAuthoredSource } from "./authored-source-admission.ts";
import { attemptSource, authoredAttemptBody } from "./attempt-source.ts";

describe("player attempt authored-source boundary", () => {
  test("admits the generated player wrapper and recovers its exact body", () => {
    const body = `  const discovery = context.sdk.discoverBattleActs(context.session);
  return { kind: "continue", session: context.session, tacticalNote: String(discovery) };`;
    const source = attemptSource(body);
    expect(
      admitAuthoredSource({ role: "player", sourcePath: "attempt.ts", source }),
    ).toMatchObject({
      tag: "admitted",
      source,
    });
    expect(authoredAttemptBody(source)).toEqual({ tag: "valid", body });
  });

  test("rejects a forbidden edge even when the generated wrapper is intact", () => {
    const source = attemptSource('  await import("node:fs");');
    expect(authoredAttemptBody(source)).toMatchObject({ tag: "valid" });
    expect(
      admitAuthoredSource({ role: "player", sourcePath: "attempt.ts", source }),
    ).toMatchObject({
      tag: "rejected",
      issues: [{ tag: "forbiddenModuleEdge", edge: "dynamicImport" }],
    });
  });
});
