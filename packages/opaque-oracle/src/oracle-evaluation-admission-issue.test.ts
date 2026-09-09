import {
  combatantId,
  type BattleInitializationLeafIssue,
} from "@dnd/battle-runtime";
import { spellMechanicsHeaderPath } from "@dnd/surface/surface/spell-mechanics-path";
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
        kind: "unsupportedMechanics",
        issue: {
          tag: "spellProcedureAdmissionIssue",
          procedure: "persistentArmorEffect",
          failedFact: "level",
          mechanicsPath: spellMechanicsHeaderPath("level"),
          message: "Synthetic invocation mechanics admission issue.",
        },
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
