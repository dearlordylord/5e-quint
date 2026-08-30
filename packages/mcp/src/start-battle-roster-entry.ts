import {
  composeBattleRoster,
  type BattleRosterAdmission,
  type BattleRosterEntry,
  type BattleRosterIssue,
} from "@dnd/character-battle-runtime";
import type { CharacterBuildDisplayNameIssues } from "@dnd/character-creation-runtime";
import { Match, Option, Result } from "effect";

import {
  characterBuildDisplayName,
  characterBuildDisplayNameIssueMessage,
} from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import type {
  BattleCombatantToolInput,
  CharacterSessionCombatantToolInput,
} from "./start-battle-tool-input.ts";

export type StartableCharacterSessionCombatant = {
  readonly index: number;
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type CharacterDisplayRosterIssue = {
  readonly tag: "characterDisplayUnavailable";
  readonly code: "INVALID_CHARACTER_DISPLAY_CATALOG";
  readonly ownerPath: readonly (string | number)[];
  readonly characterId: CharacterSessionCombatantToolInput["characterId"];
  readonly message: string;
  readonly issues: CharacterBuildDisplayNameIssues;
};

type CharacterRosterEntry = Extract<
  BattleRosterEntry,
  { readonly kind: "characterSheet" }
>;
type CharacterRosterSource = CharacterRosterEntry["source"];
type CharacterRosterEntryWithSource<Source extends CharacterRosterSource> =
  Omit<CharacterRosterEntry, "source"> & { readonly source: Source };
type AvailableCharacterRosterEntry = CharacterRosterEntryWithSource<
  Extract<CharacterRosterSource, { readonly kind: "available" }>
>;
type UnavailableCharacterRosterEntry = CharacterRosterEntryWithSource<
  Exclude<CharacterRosterSource, { readonly kind: "available" }>
>;
type OtherRosterEntry =
  | Exclude<BattleRosterEntry, CharacterRosterEntry>
  | UnavailableCharacterRosterEntry;

export type ProjectedBattleRosterEntry =
  | {
      readonly tag: "availableCharacter";
      readonly rosterEntry: AvailableCharacterRosterEntry;
      readonly session: StartableCharacterSessionCombatant;
    }
  | {
      readonly tag: "other";
      readonly rosterEntry: OtherRosterEntry;
      readonly session?: never;
    };

export type ActiveRosterCombatantProjectionIssue =
  | CharacterDisplayRosterIssue
  | {
      readonly tag: "battleRosterRejected";
      readonly ownerPath: readonly (string | number)[];
      readonly issues: readonly [BattleRosterIssue, ...BattleRosterIssue[]];
    }
  | {
      readonly tag: "battleRosterProjectionInvariant";
      readonly ownerPath: readonly (string | number)[];
      readonly message: string;
    };

export type ActiveRosterCombatantProjection =
  | {
      readonly tag: "availableCharacter";
      readonly admission: Extract<
        BattleRosterAdmission,
        { readonly kind: "characterSheet" }
      >;
      readonly session: StartableCharacterSessionCombatant;
    }
  | {
      readonly tag: "other";
      readonly admission: Exclude<
        BattleRosterAdmission,
        { readonly kind: "characterSheet" }
      >;
      readonly session?: never;
    };

export function rosterEntryForToolCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
  readonly index: number;
  readonly ownerPath?: readonly (string | number)[];
}): Result.Result<ProjectedBattleRosterEntry, CharacterDisplayRosterIssue> {
  return Match.value(input.combatant).pipe(
    Match.when({ kind: "characterSession" }, (character) => {
      const session = input.root.sessionStore.characters.get(
        character.characterId,
      );
      if (session === undefined) {
        return Result.succeed({
          tag: "other" as const,
          rosterEntry: {
            kind: "characterSheet" as const,
            source: {
              kind: "missing" as const,
              characterId: character.characterId,
              combatantId: character.combatantId,
            },
          },
        });
      }
      if (session.tag === "inBattle") {
        return Result.succeed({
          tag: "other" as const,
          rosterEntry: {
            kind: "characterSheet" as const,
            source: {
              kind: "inBattle" as const,
              characterId: character.characterId,
              combatantId: character.combatantId,
              battleId: session.battleId,
            },
          },
        });
      }
      const displayName = characterBuildDisplayName(
        input.root.unitLibrary,
        session.build,
      );
      if (Result.isFailure(displayName)) {
        return Result.fail({
          tag: "characterDisplayUnavailable" as const,
          code: "INVALID_CHARACTER_DISPLAY_CATALOG" as const,
          ownerPath: input.ownerPath ?? ["initialCombatants", input.index],
          characterId: character.characterId,
          message: characterBuildDisplayNameIssueMessage(displayName.failure),
          issues: displayName.failure,
        });
      }
      return Result.succeed({
        tag: "availableCharacter" as const,
        rosterEntry: {
          kind: "characterSheet" as const,
          source: {
            kind: "available" as const,
            input: {
              combatantId: character.combatantId,
              displayName: displayName.success,
              sheet: session,
              initiative: character.initiative,
              ammunitionStocks: character.ammunitionStocks,
              unitLibrary: input.root.unitLibrary,
              statBlockCatalog: input.root.statBlockCatalog,
            },
          },
        },
        session: { index: input.index, character, session },
      });
    }),
    Match.when({ kind: "statBlock" }, (combatant) => {
      const statBlock = input.root.statBlockCatalog.getStatBlock(
        combatant.statBlockId,
      );
      return Result.succeed({
        tag: "other" as const,
        rosterEntry: {
          kind: "statBlock" as const,
          source: Option.isNone(statBlock)
            ? {
                kind: "missing" as const,
                statBlockId: combatant.statBlockId,
                combatantId: combatant.combatantId,
              }
            : {
                kind: "available" as const,
                input: {
                  combatantId: combatant.combatantId,
                  statBlock: statBlock.value,
                  initiative: combatant.initiative,
                  ammunitionStocks: combatant.ammunitionStocks,
                  conditions: [],
                  ...(combatant.currentHp === undefined
                    ? {}
                    : { currentHp: combatant.currentHp }),
                  ...(combatant.tempHp === undefined
                    ? {}
                    : { tempHp: combatant.tempHp }),
                },
              },
        },
      });
    }),
    Match.exhaustive,
  );
}

export function projectActiveRosterCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
  readonly ownerPath: readonly (string | number)[];
}): Result.Result<
  ActiveRosterCombatantProjection,
  ActiveRosterCombatantProjectionIssue
> {
  const projectedEntry = rosterEntryForToolCombatant({
    root: input.root,
    combatant: input.combatant,
    index: 0,
    ownerPath: input.ownerPath,
  });
  if (Result.isFailure(projectedEntry)) {
    return Result.fail(projectedEntry.failure);
  }
  const composition = composeBattleRoster([projectedEntry.success.rosterEntry]);
  if (composition.tag === "rejected") {
    return Result.fail({
      tag: "battleRosterRejected",
      ownerPath: input.ownerPath,
      issues: composition.issues,
    });
  }
  const admission = composition.admissions[0];
  if (
    projectedEntry.success.tag === "availableCharacter" &&
    admission.kind === "characterSheet"
  ) {
    return Result.succeed({
      tag: "availableCharacter",
      admission,
      session: projectedEntry.success.session,
    });
  }
  if (
    projectedEntry.success.tag === "other" &&
    admission.kind !== "characterSheet"
  ) {
    return Result.succeed({ tag: "other", admission });
  }
  return Result.fail({
    tag: "battleRosterProjectionInvariant",
    ownerPath: input.ownerPath,
    message:
      "Battle roster admission did not preserve its projected source kind.",
  });
}
