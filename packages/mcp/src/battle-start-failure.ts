import {
  battleInitializationIssueFactFields,
  battleInitializationIssueLeaves,
  type BattleInitializationIssue,
} from "@dnd/battle-runtime";
import {
  type BattleCompanionRosterIssue,
  type CharacterBattleInitIssueFact,
  type BattleRosterIssue,
} from "@dnd/character-battle-runtime";
import { Match } from "effect";

import { errorContent } from "./tool-content.ts";

type OwnerPath = readonly (string | number)[];
type InitialCombatantOwnerPath = readonly ["initialCombatants", number];
type CompanionAdmissionOwnerPath = readonly ["companionAdmissions", number];

const BATTLE_INITIALIZATION_OWNER_PATH = [
  "battleInitialization",
  "global",
] as const satisfies OwnerPath;

export function battleStartIssuesContent(
  issues: readonly Record<string, unknown>[],
) {
  return errorContent("Invalid battle start combatants.", {
    code: "INVALID_BATTLE_COMBATANTS",
    issues,
  });
}

export function battleRosterIssuePayload(
  issue: BattleRosterIssue,
  ownerPathForIndex: (index: number) => OwnerPath = initialCombatantOwnerPath,
): readonly Record<string, unknown>[] {
  const ownerPath = ownerPathForIndex(issue.index);
  return Match.value(issue).pipe(
    Match.when({ kind: "duplicateCombatantId" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        firstOwnerPath: ownerPathForIndex(matched.firstIndex),
        combatantId: matched.combatantId,
      },
    ]),
    Match.when({ kind: "duplicateCharacterId" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath,
        firstOwnerPath: ownerPathForIndex(matched.firstIndex),
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
      characterProjectionIssuePayload(matched, ownerPath),
    ]),
    Match.when({ kind: "statBlockProjection" }, (matched) => [
      statBlockProjectionIssuePayload(matched, ownerPath),
    ]),
    Match.exhaustive,
  );
}

function characterProjectionIssuePayload(
  issue: Extract<BattleRosterIssue, { kind: "characterSheetProjection" }>,
  ownerPath: OwnerPath,
): Record<string, unknown> {
  return Match.value(issue).pipe(
    Match.when({ issueTag: "battleCreatureInitIssue" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      reason: matched.reason,
      ...characterProjectionReasonPayload(matched),
      message: matched.message,
    })),
    Match.when({ cause: "invalidBuildSpellAccess" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      issueIndex: matched.issueIndex,
      cause: matched.cause,
      message: matched.message,
    })),
    Match.when({ cause: "missingSourceUnit" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      accessIndex: matched.accessIndex,
      featUnitId: matched.featUnitId,
      cause: matched.cause,
      message: matched.message,
    })),
    Match.when({ cause: "unsupportedSourceUnit" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      accessIndex: matched.accessIndex,
      featUnitId: matched.featUnitId,
      cause: matched.cause,
      message: matched.message,
    })),
    Match.when({ cause: "missingSpellListSource" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      accessIndex: matched.accessIndex,
      featUnitId: matched.featUnitId,
      cause: matched.cause,
      message: matched.message,
    })),
    Match.when({ cause: "invalidSpellSelection" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "CHARACTER_BATTLE_INIT_INVALID",
      characterId: matched.characterId,
      issueTag: matched.issueTag,
      accessIndex: matched.accessIndex,
      featUnitId: matched.featUnitId,
      cause: matched.cause,
      issueIndex: matched.issueIndex,
      message: matched.message,
    })),
    Match.exhaustive,
  );
}

function characterProjectionReasonPayload(
  reason: CharacterBattleInitIssueFact,
): Record<string, unknown> {
  return Match.value(reason).pipe(
    Match.when({ reason: "characterBuildProjection" }, (matched) => {
      const { reason: _reason, ...fields } = matched;
      return fields;
    }),
    Match.when({ reason: "characterBattleInput" }, ({ field, constraint }) => ({
      field,
      constraint,
    })),
    Match.when({ reason: "characterBattleInvariant" }, ({ invariant }) => ({
      invariant,
    })),
    Match.when(
      { reason: "characterBattleResourceProjection" },
      ({ issueIndex }) => ({
        issueIndex,
      }),
    ),
    Match.when(
      { reason: "characterBattleSupportProjection" },
      ({ issueIndex }) => ({
        issueIndex,
      }),
    ),
    Match.when(
      { reason: "characterBattleClassLevelsProjection" },
      ({ issueIndex }) => ({
        issueIndex,
      }),
    ),
    Match.when(
      { reason: "characterBattleSpellProjection" },
      ({ issueIndex }) => ({
        issueIndex,
      }),
    ),
    Match.exhaustive,
  );
}

function statBlockProjectionIssuePayload(
  issue: Extract<BattleRosterIssue, { kind: "statBlockProjection" }>,
  ownerPath: OwnerPath,
): Record<string, unknown> {
  return Match.value(issue).pipe(
    Match.when({ issueTag: "battleStateInitIssue" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "STAT_BLOCK_BATTLE_INIT_INVALID",
      combatantId: matched.combatantId,
      issueTag: matched.issueTag,
      ...(() => {
        const {
          kind: _kind,
          index: _index,
          issueTag: _issueTag,
          message: _message,
          combatantId: _combatantId,
          ...facts
        } = matched;
        return facts;
      })(),
      message: matched.message,
    })),
    Match.when({ issueTag: "weaponLoadoutMismatch" }, (matched) => ({
      kind: issue.kind,
      ownerPath,
      code: "STAT_BLOCK_BATTLE_INIT_INVALID",
      combatantId: matched.combatantId,
      issueTag: matched.issueTag,
      slot: matched.slot,
    })),
    Match.exhaustive,
  );
}

export function battleCompanionRosterIssuePayload(
  issue: BattleCompanionRosterIssue,
): readonly Record<string, unknown>[] {
  const firstOwnerPath = (index: number): CompanionAdmissionOwnerPath => [
    "companionAdmissions",
    index,
  ];
  return Match.value(issue).pipe(
    Match.when({ kind: "duplicateCompanionOwnerSource" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath: ["initialCombatants", matched.ownerIndex],
        firstOwnerPath: ["initialCombatants", matched.firstOwnerIndex],
        ownerCharacterId: matched.ownerCharacterId,
        reason: matched.reason,
      },
    ]),
    Match.when({ kind: "duplicateCompanionOwner" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath: ["companionAdmissions", matched.index],
        firstOwnerPath: firstOwnerPath(matched.firstIndex),
        ownerCharacterId: matched.ownerCharacterId,
        reason: matched.reason,
      },
    ]),
    Match.when({ kind: "duplicateCompanionCombatantId" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath: ["companionAdmissions", matched.index],
        firstOwnerPath: firstOwnerPath(matched.firstIndex),
        companionCombatantId: matched.companionCombatantId,
        reason: matched.reason,
      },
    ]),
    Match.when({ kind: "companionOwnerUnavailable" }, (matched) => [
      {
        kind: matched.kind,
        ownerPath: ["companionAdmissions", matched.index],
        code: "COMPANION_OWNER_NOT_IN_ROSTER",
        ownerCharacterId: matched.ownerCharacterId,
        reason: matched.reason,
        ...(matched.companionCombatantId === undefined
          ? {}
          : { companionCombatantId: matched.companionCombatantId }),
      },
    ]),
    Match.when({ kind: "companionAdmission" }, (matched) => {
      const {
        kind: _kind,
        index: _index,
        ownerCharacterId: _ownerCharacterId,
        companionCombatantId: _companionCombatantId,
        issueTag: _issueTag,
        admissionReason: _admissionReason,
        message: _message,
        ...facts
      } = matched;
      return [
        {
          kind: matched.kind,
          ownerPath: ["companionAdmissions", matched.index],
          code: "COMPANION_ADMISSION_FAILED",
          ownerCharacterId: matched.ownerCharacterId,
          ...(matched.companionCombatantId === undefined
            ? {}
            : { companionCombatantId: matched.companionCombatantId }),
          issueTag: matched.issueTag,
          admissionReason: matched.admissionReason,
          ...facts,
          message: matched.message,
        },
      ];
    }),
    Match.exhaustive,
  );
}

export function battleRuntimeIssuePayload(
  issue: BattleInitializationIssue,
): readonly Record<string, unknown>[] {
  return battleInitializationIssueLeaves(issue).map((leaf) =>
    Match.value(leaf).pipe(
      Match.when({ tag: "battleStateInitIssue" }, (matched) => ({
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: matched.ownerPath ?? BATTLE_INITIALIZATION_OWNER_PATH,
        issueTag: matched.tag,
        ...battleInitializationIssueFactFields(matched),
        message: matched.message,
      })),
      Match.when({ tag: "weaponLoadoutMismatch" }, (matched) => ({
        kind: "battleInitialization",
        code: "BATTLE_INITIALIZATION_INVALID",
        ownerPath: matched.ownerPath ?? BATTLE_INITIALIZATION_OWNER_PATH,
        issueTag: matched.tag,
        slot: matched.slot,
      })),
      Match.exhaustive,
    ),
  );
}

function initialCombatantOwnerPath(index: number): InitialCombatantOwnerPath {
  return ["initialCombatants", index];
}
