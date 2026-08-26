import {
  battleStateInitIssueLeaves,
  battleStateInitIssueMessage,
  type BattleStateInitIssue,
} from "@dnd/battle-runtime";
import type { CharacterBattleRosterIssue } from "@dnd/character-battle-runtime";
import { Match } from "effect";

import { errorContent } from "./tool-content.ts";

type InitialCombatantOwnerPath = readonly ["initialCombatants", number];

export function battleStartIssuesContent(
  issues: readonly Record<string, unknown>[],
) {
  return errorContent("Invalid battle start combatants.", {
    code: "INVALID_BATTLE_COMBATANTS",
    issues,
  });
}

export function characterBattleRosterIssuePayload(
  issue: CharacterBattleRosterIssue,
): readonly Record<string, unknown>[] {
  const ownerPath: InitialCombatantOwnerPath = [
    "initialCombatants",
    issue.index,
  ];
  return Match.value(issue).pipe(
    Match.when({ kind: "duplicateCombatantId" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        firstOwnerPath: ["initialCombatants", matched.firstIndex],
        combatantId: matched.combatantId,
      },
    ]),
    Match.when({ kind: "duplicateCharacterId" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        firstOwnerPath: ["initialCombatants", matched.firstIndex],
        characterId: matched.characterId,
      },
    ]),
    Match.when({ kind: "characterSheetSourceUnavailable" }, (matched) =>
      Match.value(matched).pipe(
        Match.when({ reason: "missing" }, () => [
          {
            kind: matched.kind,
            ownerPath,
            code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
            characterId: matched.characterId,
          },
        ]),
        Match.when({ reason: "inBattle" }, ({ battleId }) => [
          {
            kind: matched.kind,
            ownerPath,
            code: "CHARACTER_ALREADY_IN_BATTLE",
            characterId: matched.characterId,
            battleId,
          },
        ]),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "statBlockSourceUnavailable" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        code: "UNKNOWN_STAT_BLOCK_COMBATANT",
        combatantId: matched.combatantId,
        statBlockId: matched.statBlockId,
      },
    ]),
    Match.when({ kind: "characterSheetProjection" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        code: "CHARACTER_BATTLE_INIT_INVALID",
        characterId: matched.characterId,
        issueTag: matched.issue.tag,
        message: matched.issue.message,
      },
    ]),
    Match.when({ kind: "statBlockProjection" }, (matched) => [
      statBlockProjectionIssuePayload(matched, ownerPath),
    ]),
    Match.exhaustive,
  );
}

export function battleRuntimeIssuePayload(
  issue: BattleStateInitIssue,
): readonly Record<string, unknown>[] {
  return battleStateInitIssueLeaves(issue).map((leaf) =>
    Match.value(leaf).pipe(
      Match.when({ tag: "battleStateInitIssue" }, (matched) => ({
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: matched.ownerPath ?? ["initialCombatants"],
        issueTag: matched.tag,
        message: battleStateInitIssueMessage(matched),
      })),
      Match.when({ tag: "weaponLoadoutMismatch" }, (matched) => ({
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: matched.ownerPath ?? ["initialCombatants"],
        issueTag: matched.tag,
        slot: matched.slot,
      })),
      Match.exhaustive,
    ),
  );
}

function statBlockProjectionIssuePayload(
  issue: Extract<CharacterBattleRosterIssue, { kind: "statBlockProjection" }>,
  ownerPath: InitialCombatantOwnerPath,
): Record<string, unknown> {
  return Match.value(issue.issue).pipe(
    Match.when({ tag: "battleStateInitIssue" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "STAT_BLOCK_BATTLE_INIT_INVALID",
      combatantId: issue.combatantId,
      issueTag: matched.tag,
      message: matched.message,
    })),
    Match.when({ tag: "weaponLoadoutMismatch" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "STAT_BLOCK_BATTLE_INIT_INVALID",
      combatantId: issue.combatantId,
      issueTag: matched.tag,
      slot: matched.slot,
    })),
    Match.exhaustive,
  );
}
