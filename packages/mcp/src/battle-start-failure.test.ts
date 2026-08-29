import {
  characterId,
  combatantId,
  type BattleInitializationIssue,
} from "@dnd/battle-runtime";
import type { BattleRosterIssue } from "@dnd/character-battle-runtime";
import { unitId } from "@dnd/shared/game-facts";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleRosterIssuePayload,
  battleRuntimeIssuePayload,
} from "./battle-start-failure.ts";

const characterProjectionIdentity = {
  kind: "characterSheetProjection" as const,
  index: 1,
  characterId: characterId("character:structured-failure"),
  message: "presentation text is not the structured failure fact",
};

describe("battle start failure projection", () => {
  test("retains structured Stat Block resource graph issues", () => {
    const resourceOrdinal = Schema.decodeUnknownSync(
      StatBlockProcedureResourceOrdinalSchema,
    )(3);
    const issue = {
      tag: "statBlockResourceGraphIssue",
      issues: [
        {
          kind: "missingResourceDeclaration",
          ordinal: resourceOrdinal,
        },
      ],
      combatantId: combatantId("combatant:resource-graph-failure"),
      ownerPath: ["initialCombatants", 2],
    } as const satisfies BattleInitializationIssue;

    expect(battleRuntimeIssuePayload(issue)).toEqual([
      {
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: ["initialCombatants", 2],
        issueTag: "statBlockResourceGraphIssue",
        combatantId: issue.combatantId,
        issues: issue.issues,
      },
    ]);
  });

  test.each([
    {
      cause: "invalidBuildSpellAccess" as const,
      issueIndex: 2,
    },
    {
      cause: "missingSourceUnit" as const,
      accessIndex: 3,
      featUnitId: unitId("feat_synthetic_missing_source"),
    },
    {
      cause: "unsupportedSourceUnit" as const,
      accessIndex: 4,
      featUnitId: unitId("feat_synthetic_unsupported_source"),
    },
    {
      cause: "missingSpellListSource" as const,
      accessIndex: 5,
      featUnitId: unitId("feat_synthetic_missing_spell_list"),
    },
    {
      cause: "invalidSpellSelection" as const,
      accessIndex: 6,
      featUnitId: unitId("feat_synthetic_invalid_selection"),
      issueIndex: 7,
    },
  ])("retains the $cause Character Sheet projection fact", (fact) => {
    const issue = {
      ...characterProjectionIdentity,
      issueTag: "characterBattleSpellAccessProjectionIssue" as const,
      ...fact,
    } satisfies BattleRosterIssue;

    expect(battleRosterIssuePayload(issue)).toEqual([
      {
        kind: "characterSheetProjection",
        ownerPath: ["initialCombatants", 1],
        code: "CHARACTER_BATTLE_INIT_INVALID",
        characterId: characterProjectionIdentity.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue",
        ...fact,
        message: characterProjectionIdentity.message,
      },
    ]);
  });

  test.each([
    {
      reason: "characterBattleInput" as const,
      field: "initiative" as const,
      constraint: "integer" as const,
    },
    {
      reason: "characterBattleInvariant" as const,
      invariant: "characterOriginRequired" as const,
    },
    {
      reason: "characterBattleResourceProjection" as const,
      issueIndex: 8,
    },
    {
      reason: "characterBattleSupportProjection" as const,
      issueIndex: 9,
    },
    {
      reason: "characterBattleClassLevelsProjection" as const,
      issueIndex: 10,
    },
    {
      reason: "characterBattleSpellProjection" as const,
      issueIndex: 11,
    },
  ])("retains the $reason Character Sheet initialization fact", (fact) => {
    const issue = {
      ...characterProjectionIdentity,
      issueTag: "battleCreatureInitIssue" as const,
      ...fact,
    } satisfies BattleRosterIssue;

    expect(battleRosterIssuePayload(issue)).toEqual([
      {
        kind: "characterSheetProjection",
        ownerPath: ["initialCombatants", 1],
        code: "CHARACTER_BATTLE_INIT_INVALID",
        characterId: characterProjectionIdentity.characterId,
        issueTag: "battleCreatureInitIssue",
        ...fact,
        message: characterProjectionIdentity.message,
      },
    ]);
  });
});
