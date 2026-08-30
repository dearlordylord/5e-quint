import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { BattleLifecycleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import {
  McpSessionSnapshotSchema,
  McpSessionSummarySchema,
} from "./session-snapshot-output.ts";

const noneState = { tag: "none" } as const;
const setupState = {
  tag: "initialInitiativeSetup",
  battleId: "battle:focused-session-output",
  combatants: [
    { combatantId: "combatant:normal", initiative: 12, rollMode: "normal" },
    {
      combatantId: "combatant:advantage",
      initiative: 11,
      rollMode: "advantage",
    },
    {
      combatantId: "combatant:disadvantage",
      initiative: 10,
      rollMode: "disadvantage",
    },
  ],
} as const;
const activeState = {
  tag: "activeBattle",
  battleId: "battle:focused-session-output",
  currentActorId: "combatant:normal",
} as const;

type FocusedBattleState =
  | typeof noneState
  | typeof setupState
  | typeof activeState;

function sessionSummary(battleState: FocusedBattleState) {
  return {
    draftIds: [],
    characterIds: [],
    selectedStatBlockId: null,
    battleState,
  };
}

function sessionSnapshot(battleState: FocusedBattleState) {
  return {
    draftIds: [],
    characterIds: [],
    selectedStatBlockId: null,
    battleState,
  };
}

describe("isolated MCP session and battle output codecs", () => {
  test.each([
    ["none", noneState],
    ["initial initiative setup", setupState],
    ["active battle", activeState],
  ] as const)("round-trips the %s session summary branch", (_label, state) => {
    const value = sessionSummary(state);
    const decoded = Schema.decodeUnknownResult(
      Schema.toType(McpSessionSummarySchema),
    )(value);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(decoded.success).toEqual(value);

    const encoded = Schema.encodeResult(
      Schema.toCodecIso(McpSessionSummarySchema),
    )(decoded.success);
    expect(Result.isSuccess(encoded)).toBe(true);
    if (Result.isFailure(encoded)) return;
    expect(encoded.success).toEqual(value);
  });

  test.each([
    ["none", noneState],
    ["initial initiative setup", setupState],
    ["active battle", activeState],
  ] as const)("round-trips the %s session snapshot branch", (_label, state) => {
    const value = sessionSnapshot(state);
    const decoded = Schema.decodeUnknownResult(
      Schema.toType(McpSessionSnapshotSchema),
    )(value);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(decoded.success).toEqual(value);

    const encoded = Schema.encodeResult(
      Schema.toCodecIso(McpSessionSnapshotSchema),
    )(decoded.success);
    expect(Result.isSuccess(encoded)).toBe(true);
    if (Result.isFailure(encoded)) return;
    expect(encoded.success).toEqual(value);
  });

  test("accepts setup lifecycle output and rejects cross-branch values", () => {
    const setupOutput = {
      envelope: null,
      session: sessionSummary(setupState),
    };
    const accepted = Schema.decodeUnknownResult(
      Schema.toType(BattleLifecycleOutputSchema),
    )(setupOutput);
    expect(Result.isSuccess(accepted)).toBe(true);

    const crossBranch = {
      ...setupOutput,
      battleState: activeState,
      session: sessionSummary(activeState),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(BattleLifecycleOutputSchema))(
          crossBranch,
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(Schema.toType(BattleLifecycleOutputSchema))({
          ...setupOutput,
          envelope: {},
        }),
      ),
    ).toBe(true);
  });

  test("encodes a canonical session summary through MCP structured content", () => {
    const value = sessionSummary(activeState);
    const decoded = Schema.decodeUnknownResult(
      Schema.toType(McpSessionSummarySchema),
    )(value);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    expect(
      schemaJsonContent(
        Schema.toCodecIso(McpSessionSummarySchema),
        decoded.success,
      ).structuredContent,
    ).toEqual(value);
  });
});
