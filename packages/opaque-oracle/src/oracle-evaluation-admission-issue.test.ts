import {
  combatantId,
  type BattleInitializationLeafIssue,
} from "@dnd/battle-runtime";
import { describe, expect, test } from "vitest";

import { classifyBattleInitializationIssueForOracle } from "./oracle-evaluation.ts";

describe("oracle battle admission issue projection", () => {
  test("redacts a typed admission failure without throwing", () => {
    const issue = {
      tag: "battleAdmissionInitIssue",
      kind: "characterInvocationSpellAccessInvalid",
      combatantId: combatantId("synthetic-oracle-admission"),
      accessIndex: 0,
      cause: {
        kind: "spellNotRepresented",
        message: "Synthetic invocation access is not represented.",
      },
    } as const satisfies BattleInitializationLeafIssue;

    expect(classifyBattleInitializationIssueForOracle(issue)).toEqual({
      kind: "entry",
      issue: {
        tag: "battleStateInitRejected",
        issue: { tag: "battleStateInitIssue" },
      },
    });
  });
});
