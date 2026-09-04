// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import type {
  AuthoredStatBlockBattleInitInput,
  BattleCreatureInit,
  BattleId,
} from "@dnd/battle-runtime/consumer-protocol";
import type { CharacterSheet } from "@dnd/character-sheet-runtime/battle-init-protocol";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { isReadonlyArrayNonEmpty } from "effect/Array";
import { Match, Result } from "effect";

import {
  battleCreatureInitIssueLeaves,
  type CharacterBattleInitIssueFact,
  type CharacterBattleSpellAccessProjectionIssue,
} from "./battle-character-build-projection.ts";
import type { CharacterSheetBattleInitInput } from "./battle-creature-init.ts";
import type { CharacterBattleRouteEvent } from "./character-battle-route.ts";
import {
  characterBattleInitIssueWithoutRouteEvents,
  characterSheetBattleInitWithRoute,
} from "./character-sheet-battle-init.ts";

export type BattleRosterCharacterCombatant = Extract<
  BattleCreatureInit,
  { readonly creatureInit: { readonly kind: "character" } }
>;

export type BattleRosterStatBlockCombatant = Extract<
  BattleCreatureInit,
  AuthoredStatBlockBattleInitInput
>;

export type BattleRosterCharacterSource =
  | {
      readonly kind: "available";
      readonly input: CharacterSheetBattleInitInput;
    }
  | {
      readonly kind: "missing";
      readonly characterId: CharacterSheet["characterId"];
      readonly combatantId: CharacterSheetBattleInitInput["combatantId"];
    }
  | {
      readonly kind: "inBattle";
      readonly characterId: CharacterSheet["characterId"];
      readonly combatantId: CharacterSheetBattleInitInput["combatantId"];
      readonly battleId: BattleId;
    };

export type BattleRosterStatBlockSource =
  | {
      readonly kind: "available";
      readonly input: AuthoredStatBlockBattleInitInput;
    }
  | {
      readonly kind: "missing";
      readonly statBlockId: StatBlockRecord["id"];
      readonly combatantId: AuthoredStatBlockBattleInitInput["combatantId"];
    };

export type BattleRosterEntry =
  | {
      readonly kind: "characterSheet";
      readonly source: BattleRosterCharacterSource;
    }
  | {
      readonly kind: "statBlock";
      readonly source: BattleRosterStatBlockSource;
    };

export type BattleRosterEntries = readonly [
  BattleRosterEntry,
  ...BattleRosterEntry[],
];

type BattleRosterCharacterProjectionIssue = {
  readonly kind: "characterSheetProjection";
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issueTag: "battleCreatureInitIssue";
  readonly message: string;
} & CharacterBattleInitIssueFact;

export type BattleRosterAdmission =
  | {
      readonly index: number;
      readonly kind: "characterSheet";
      readonly combatant: BattleRosterCharacterCombatant;
      readonly routeEvents: readonly CharacterBattleRouteEvent[];
    }
  | {
      readonly index: number;
      readonly kind: "statBlock";
      readonly combatant: BattleRosterStatBlockCombatant;
      readonly routeEvents: readonly [];
    };

export type BattleRosterIssue =
  | {
      readonly kind: "duplicateCombatantId";
      readonly index: number;
      readonly combatantId: BattleCreatureInit["combatantId"];
      readonly firstIndex: number;
    }
  | {
      readonly kind: "duplicateCharacterId";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly firstIndex: number;
    }
  | {
      readonly kind: "characterSheetSourceUnavailable";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly reason: "missing";
    }
  | {
      readonly kind: "characterSheetSourceUnavailable";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly reason: "inBattle";
      readonly battleId: BattleId;
    }
  | {
      readonly kind: "statBlockSourceUnavailable";
      readonly index: number;
      readonly statBlockId: StatBlockRecord["id"];
      readonly combatantId: BattleCreatureInit["combatantId"];
    }
  | BattleRosterCharacterProjectionIssue
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause:
        | "missingSourceUnit"
        | "unsupportedSourceUnit"
        | "missingSpellListSource";
      readonly message: string;
    }
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause: "invalidSpellSelection";
      readonly issueIndex: number;
      readonly message: string;
    }
  | {
      readonly kind: "characterSheetProjection";
      readonly index: number;
      readonly characterId: CharacterSheet["characterId"];
      readonly issueTag: "characterBattleSpellAccessProjectionIssue";
      readonly issueIndex: number;
      readonly cause: "invalidBuildSpellAccess";
      readonly message: string;
    };

export type BattleRosterComposition =
  | {
      readonly tag: "admitted";
      readonly admissions: ReadonlyNonEmptyArray<BattleRosterAdmission>;
    }
  | {
      readonly tag: "rejected";
      readonly admissions: readonly BattleRosterAdmission[];
      readonly issues: ReadonlyNonEmptyArray<BattleRosterIssue>;
    };

function battleRosterIssueList(
  issue: BattleRosterIssue,
): ReadonlyNonEmptyArray<BattleRosterIssue> {
  return [issue];
}

/** Admit a mixed-origin initial roster in caller order. */
export function composeBattleRoster(
  entries: BattleRosterEntries,
): BattleRosterComposition {
  const combatantOwners = new Map<BattleCreatureInit["combatantId"], number>();
  const characterOwners = new Map<CharacterSheet["characterId"], number>();
  const recordIdentity = (
    entry: BattleRosterEntry,
    index: number,
    issues: BattleRosterIssue[],
  ) => {
    const combatantId = rosterEntryCombatantId(entry);
    const firstCombatantIndex = combatantOwners.get(combatantId);
    const duplicateCombatant = firstCombatantIndex !== undefined;
    if (duplicateCombatant) {
      issues.push({
        kind: "duplicateCombatantId",
        index,
        combatantId,
        firstIndex: firstCombatantIndex,
      });
    } else {
      combatantOwners.set(combatantId, index);
    }

    const characterId = rosterEntryCharacterId(entry);
    const firstCharacterIndex =
      characterId === undefined ? undefined : characterOwners.get(characterId);
    const duplicateCharacter = firstCharacterIndex !== undefined;
    if (duplicateCharacter && characterId !== undefined) {
      issues.push({
        kind: "duplicateCharacterId",
        index,
        characterId,
        firstIndex: firstCharacterIndex,
      });
    } else if (characterId !== undefined) {
      characterOwners.set(characterId, index);
    }
    return { duplicateCombatant, duplicateCharacter };
  };
  const processEntry = (
    entry: BattleRosterEntry,
    index: number,
    issues: BattleRosterIssue[],
    admissions: BattleRosterAdmission[],
  ): void => {
    const { duplicateCombatant, duplicateCharacter } = recordIdentity(
      entry,
      index,
      issues,
    );

    const projection = projectBattleRosterEntry(entry, index);
    if (Result.isFailure(projection)) {
      issues.push(...projection.failure);
      return;
    }
    if (duplicateCombatant || duplicateCharacter) return;
    admissions.push(projection.success);
  };

  const [firstEntry, ...restEntries] = entries;
  const firstIdentityIssues: BattleRosterIssue[] = [];
  recordIdentity(firstEntry, 0, firstIdentityIssues);
  const firstProjection = projectBattleRosterEntry(firstEntry, 0);
  if (Result.isFailure(firstProjection)) {
    const [firstIssue, ...restIssues] = firstProjection.failure;
    const issues: [BattleRosterIssue, ...BattleRosterIssue[]] = [
      firstIssue,
      ...restIssues,
    ];
    issues.unshift(...firstIdentityIssues);
    const admissions: BattleRosterAdmission[] = [];
    for (const [offset, entry] of restEntries.entries()) {
      processEntry(entry, offset + 1, issues, admissions);
    }
    return { tag: "rejected", admissions, issues };
  }

  const admissions: [BattleRosterAdmission, ...BattleRosterAdmission[]] = [
    firstProjection.success,
  ];
  const issues: BattleRosterIssue[] = [];
  for (const [offset, entry] of restEntries.entries()) {
    processEntry(entry, offset + 1, issues, admissions);
  }
  return isReadonlyArrayNonEmpty(issues)
    ? { tag: "rejected", admissions, issues }
    : { tag: "admitted", admissions };
}

function rosterEntryCombatantId(
  entry: BattleRosterEntry,
): BattleCreatureInit["combatantId"] {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, ({ source }) =>
      characterRosterSourceCombatantId(source),
    ),
    Match.when({ kind: "statBlock" }, ({ source }) =>
      statBlockRosterSourceCombatantId(source),
    ),
    Match.exhaustive,
  );
}

function characterRosterSourceCombatantId(
  source: BattleRosterCharacterSource,
): BattleCreatureInit["combatantId"] {
  return Match.value(source).pipe(
    Match.when({ kind: "available" }, ({ input }) => input.combatantId),
    Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
    Match.when({ kind: "inBattle" }, ({ combatantId }) => combatantId),
    Match.exhaustive,
  );
}

function statBlockRosterSourceCombatantId(
  source: BattleRosterStatBlockSource,
): BattleCreatureInit["combatantId"] {
  return Match.value(source).pipe(
    Match.when({ kind: "available" }, ({ input }) => input.combatantId),
    Match.when({ kind: "missing" }, ({ combatantId }) => combatantId),
    Match.exhaustive,
  );
}

function rosterEntryCharacterId(
  entry: BattleRosterEntry,
): CharacterSheet["characterId"] | undefined {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, ({ source }) =>
      Match.value(source).pipe(
        Match.when(
          { kind: "available" },
          ({ input }) => input.sheet.characterId,
        ),
        Match.when({ kind: "missing" }, ({ characterId }) => characterId),
        Match.when({ kind: "inBattle" }, ({ characterId }) => characterId),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "statBlock" }, () => undefined),
    Match.exhaustive,
  );
}

function battleRosterCharacterProjectionIssues(input: {
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issue: Parameters<typeof battleCreatureInitIssueLeaves>[0];
}): ReadonlyNonEmptyArray<BattleRosterIssue> {
  const [firstIssue, ...restIssues] = battleCreatureInitIssueLeaves(
    input.issue,
  );
  return [
    battleRosterCharacterProjectionIssue(input, firstIssue),
    ...restIssues.map((issue) =>
      battleRosterCharacterProjectionIssue(input, issue),
    ),
  ];
}

function battleRosterCharacterProjectionIssue(
  input: {
    readonly index: number;
    readonly characterId: CharacterSheet["characterId"];
  },
  issue: ReturnType<typeof battleCreatureInitIssueLeaves>[number],
): Extract<BattleRosterIssue, { kind: "characterSheetProjection" }> {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleCreatureInitIssue" }, ({ message, ...facts }) => ({
      kind: "characterSheetProjection" as const,
      index: input.index,
      characterId: input.characterId,
      issueTag: "battleCreatureInitIssue" as const,
      ...facts,
      message,
    })),
    Match.when(
      { tag: "characterBattleSpellAccessProjectionIssue" },
      (spellAccessIssue) =>
        battleRosterCharacterSpellAccessProjectionIssue({
          index: input.index,
          characterId: input.characterId,
          issue: spellAccessIssue,
        }),
    ),
    Match.exhaustive,
  );
}

function battleRosterCharacterSpellAccessProjectionIssue(input: {
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly issue: CharacterBattleSpellAccessProjectionIssue;
}): Extract<BattleRosterIssue, { kind: "characterSheetProjection" }> {
  return Match.value(input.issue).pipe(
    Match.when(
      { cause: "invalidBuildSpellAccess" },
      ({ issueIndex, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        issueIndex,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "missingSourceUnit" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "unsupportedSourceUnit" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "missingSpellListSource" },
      ({ accessIndex, featUnitId, cause, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        message,
      }),
    ),
    Match.when(
      { cause: "invalidSpellSelection" },
      ({ accessIndex, featUnitId, cause, issueIndex, message }) => ({
        kind: "characterSheetProjection" as const,
        index: input.index,
        characterId: input.characterId,
        issueTag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex,
        featUnitId,
        cause,
        issueIndex,
        message,
      }),
    ),
    Match.exhaustive,
  );
}

function projectBattleRosterEntry(
  entry: BattleRosterEntry,
  index: number,
): Result.Result<
  BattleRosterAdmission,
  ReadonlyNonEmptyArray<BattleRosterIssue>
> {
  return Match.value(entry).pipe(
    Match.when({ kind: "characterSheet" }, (matched) =>
      Match.value(matched.source).pipe(
        Match.when({ kind: "missing" }, (source) =>
          Result.fail(
            battleRosterIssueList({
              kind: "characterSheetSourceUnavailable",
              index,
              characterId: source.characterId,
              reason: "missing",
            }),
          ),
        ),
        Match.when({ kind: "inBattle" }, (source) =>
          Result.fail(
            battleRosterIssueList({
              kind: "characterSheetSourceUnavailable",
              index,
              characterId: source.characterId,
              reason: "inBattle",
              battleId: source.battleId,
            }),
          ),
        ),
        Match.when({ kind: "available" }, (source) => {
          const projection = characterSheetBattleInitWithRoute(source.input);
          if (Result.isFailure(projection)) {
            return Result.fail(
              battleRosterCharacterProjectionIssues({
                index,
                characterId: source.input.sheet.characterId,
                issue: characterBattleInitIssueWithoutRouteEvents(
                  projection.failure,
                ),
              }),
            );
          }
          return Result.succeed({
            kind: "characterSheet" as const,
            index,
            combatant: projection.success.init,
            routeEvents: projection.success.routeEvents,
          });
        }),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "statBlock" }, (matched) =>
      Match.value(matched.source).pipe(
        Match.when({ kind: "missing" }, (source) =>
          Result.fail(
            battleRosterIssueList({
              kind: "statBlockSourceUnavailable",
              index,
              statBlockId: source.statBlockId,
              combatantId: source.combatantId,
            }),
          ),
        ),
        Match.when({ kind: "available" }, (source) =>
          Result.succeed({
            kind: "statBlock" as const,
            index,
            combatant: source.input,
            routeEvents: [] as const,
          }),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}
