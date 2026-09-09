import { spellMechanicsHeaderPath } from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";

import {
  battleProjectedCombatantAdmissionLeafIssueMessage,
  type BattleProjectedCombatantAdmissionLeafIssue,
} from "./battle-initialization-issue.ts";
import { combatantId } from "./identity.ts";

describe("battle admission initialization issue messages", () => {
  test.each<{
    readonly issue: BattleProjectedCombatantAdmissionLeafIssue;
    readonly message: string;
  }>([
    {
      issue: {
        tag: "battleAdmissionInitIssue",
        kind: "characterSpellProcedureInvalid",
        combatantId: combatantId("combatant:synthetic-spell-procedure"),
        issueIndex: 0,
        cause: {
          tag: "spellProcedureAdmissionIssue",
          procedure: "directHitPointRestoration",
          failedFact: "school",
          mechanicsPath: spellMechanicsHeaderPath("school"),
          message: "Synthetic spell procedure admission issue.",
        },
      },
      message: "Synthetic spell procedure admission issue.",
    },
    {
      issue: {
        tag: "battleAdmissionInitIssue",
        kind: "characterInvocationSpellAccessInvalid",
        combatantId: combatantId("combatant:synthetic-unsupported-invocation"),
        accessIndex: 1,
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
      },
      message: "Synthetic invocation mechanics admission issue.",
    },
  ])("derives the typed cause message", ({ issue, message }) => {
    expect(battleProjectedCombatantAdmissionLeafIssueMessage(issue)).toBe(
      message,
    );
  });
});
