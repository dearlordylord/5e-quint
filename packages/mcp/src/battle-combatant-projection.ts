import { type BattleCreatureInit } from "@dnd/battle-runtime";
import {
  composeCharacterBattleEncounter,
  type CharacterBattleEncounterCompositionIssue,
  type CharacterBattleEncounterParticipant,
  type CharacterBattleEncounterProjectionIssue,
  characterBattleRuntimeIssueMessage,
} from "@dnd/character-battle-runtime";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { Either, Match, Option } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import type {
  CharacterBattleRosterCombatant,
  StatBlockBattleRosterCombatant,
} from "./battle-roster-session-types.ts";
import {
  type BattleCombatantToolInput,
  type CharacterSessionCombatantToolInput,
} from "./start-battle-tool-input.ts";
import type { ToolError } from "./schema-codec.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import {
  battleCombatantCorrelationIssueContent,
  type BattleCombatantCorrelationPair,
  correlateBattleCombatantInitializations,
  correlateSingleBattleCombatantInitialization,
} from "./battle-combatant-correlation.ts";

export type StartableCharacterSessionCombatant = {
  readonly character: CharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

export type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
};

export type ProjectedBattleCombatant =
  | {
      readonly tag: "characterSession";
      readonly creatureInit: CharacterBattleRosterCombatant;
      readonly characterSession: StartableCharacterSessionCombatant;
    }
  | {
      readonly tag: "encounterCombatant";
      readonly creatureInit: StatBlockBattleRosterCombatant;
    };

export function startableBattleCombatants(input: {
  readonly root: McpPlaySessionRoot;
  readonly initialCombatants: readonly BattleCombatantToolInput[];
}): Either.Either<StartableBattleCombatants, ReturnType<typeof errorContent>> {
  const resolved = traverseValidation(input.initialCombatants, (combatant) =>
    resolveBattleCombatant({
      root: input.root,
      combatant,
    }),
  );
  if (Either.isLeft(resolved)) {
    return Either.left(invalidBattleCombatantsContent(resolved.left));
  }

  const [first, ...rest] = resolved.right;
  if (first === undefined) {
    return Either.left(
      invalidBattleCombatantsContent([
        errorContent("Battle start requires at least one combatant.", {
          code: "INVALID_BATTLE_COMBATANTS",
        }),
      ]),
    );
  }
  const composition = composeCharacterBattleEncounter({
    roster: [first.participant, ...rest.map(({ participant }) => participant)],
    unitLibrary: input.root.unitLibrary,
    statBlockCatalog: input.root.statBlockCatalog,
  });
  if (Either.isLeft(composition)) {
    return Either.left(
      invalidBattleCombatantsContent(compositionToolErrors(composition.left)),
    );
  }

  const correlated = correlateBattleCombatantInitializations({
    participants: resolved.right.map(({ participant }) => participant),
    creatureInits: composition.right.creatureInits,
  });
  if (Either.isLeft(correlated)) {
    return Either.left(
      invalidBattleCombatantsContent([
        battleCombatantCorrelationIssueContent(correlated.left),
      ]),
    );
  }

  return Either.right({
    creatureInits: correlated.right.map(({ initialization }) => initialization),
    characterSessions: resolved.right.flatMap((combatant) =>
      isResolvedCharacterBattleCombatant(combatant)
        ? [combatant.characterSession]
        : [],
    ),
  });
}

export function projectBattleCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
}): Either.Either<ProjectedBattleCombatant, ToolError> {
  const resolved = resolveBattleCombatant(input);
  if (Either.isLeft(resolved)) return Either.left(resolved.left);
  const composition = composeCharacterBattleEncounter({
    roster: [resolved.right.participant],
    unitLibrary: input.root.unitLibrary,
    statBlockCatalog: input.root.statBlockCatalog,
  });
  if (Either.isLeft(composition)) {
    const [firstIssue] = compositionToolErrors(composition.left);
    return Either.left(firstIssue);
  }
  const correlated = correlateSingleBattleCombatantInitialization({
    participant: resolved.right.participant,
    creatureInits: composition.right.creatureInits,
  });
  if (Either.isLeft(correlated)) {
    return Either.left(battleCombatantCorrelationIssueContent(correlated.left));
  }
  const correlatedPair = correlated.right;
  return Match.value(correlatedPair.participant.origin).pipe(
    Match.when("characterSheet", () => {
      const characterPair = correlatedPair as Extract<
        BattleCombatantCorrelationPair<BattleCreatureInit>,
        { readonly participant: { readonly origin: "characterSheet" } }
      >;
      return Either.right({
        tag: "characterSession" as const,
        creatureInit: characterPair.initialization,
        characterSession: (resolved.right as ResolvedCharacterBattleCombatant)
          .characterSession,
      });
    }),
    Match.when("statBlock", () => {
      const statBlockPair = correlatedPair as Extract<
        BattleCombatantCorrelationPair<BattleCreatureInit>,
        { readonly participant: { readonly origin: "statBlock" } }
      >;
      return Either.right({
        tag: "encounterCombatant" as const,
        creatureInit: statBlockPair.initialization,
      });
    }),
    Match.exhaustive,
  );
}

type ResolvedBattleCombatant =
  | {
      readonly participant: Extract<
        CharacterBattleEncounterParticipant,
        { readonly origin: "characterSheet" }
      >;
      readonly characterSession: StartableCharacterSessionCombatant;
    }
  | {
      readonly participant: Extract<
        CharacterBattleEncounterParticipant,
        { readonly origin: "statBlock" }
      >;
    };

type ResolvedCharacterBattleCombatant = Extract<
  ResolvedBattleCombatant,
  { readonly participant: { readonly origin: "characterSheet" } }
>;

function isResolvedCharacterBattleCombatant(
  resolved: ResolvedBattleCombatant,
): resolved is ResolvedCharacterBattleCombatant {
  return resolved.participant.origin === "characterSheet";
}

function resolveBattleCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: BattleCombatantToolInput;
}): Either.Either<ResolvedBattleCombatant, ToolError> {
  const { root, combatant } = input;
  return Match.value(combatant).pipe(
    Match.when({ kind: "characterSession" }, (character) => {
      const session = root.sessionStore.characters.get(character.characterId);
      if (session === undefined) {
        return Either.left(
          errorContent(
            `Unknown finalized character session: ${character.characterId}`,
            {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: character.characterId,
            },
          ),
        );
      }
      if (session.tag === "inBattle") {
        return Either.left(
          errorContent("Character is already assigned to a battle.", {
            code: "CHARACTER_ALREADY_IN_BATTLE",
            characterId: character.characterId,
            battleId: session.battleId,
          }),
        );
      }
      return Either.right({
        participant: {
          origin: "characterSheet" as const,
          combatantId: character.combatantId,
          displayName: characterBuildDisplayName(
            root.unitLibrary,
            session.build,
          ),
          sheet: session,
          initiative: character.initiative,
          ammunitionStocks: character.ammunitionStocks,
        },
        characterSession: { character, session },
      });
    }),
    Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
      const statBlock = root.statBlockCatalog.getStatBlock(
        statBlockCombatant.statBlockId,
      );
      if (Option.isNone(statBlock)) {
        return Either.left(
          errorContent("Unknown Stat Block combatant.", {
            code: "UNKNOWN_STAT_BLOCK_COMBATANT",
            statBlockId: statBlockCombatant.statBlockId,
          }),
        );
      }
      return Either.right({
        participant: {
          origin: "statBlock" as const,
          statBlock: statBlock.value,
          combatantId: statBlockCombatant.combatantId,
          initiative: statBlockCombatant.initiative,
          ammunitionStocks: statBlockCombatant.ammunitionStocks,
          conditions: [],
          ...(statBlockCombatant.currentHp === undefined
            ? {}
            : { currentHp: statBlockCombatant.currentHp }),
          ...(statBlockCombatant.tempHp === undefined
            ? {}
            : { tempHp: statBlockCombatant.tempHp }),
        },
      });
    }),
    Match.exhaustive,
  );
}

function compositionToolErrors(
  composition: CharacterBattleEncounterCompositionIssue,
): ReadonlyNonEmptyArray<ToolError> {
  if (composition.issue.tag === "characterBattleEncounterEmptyRoster") {
    return [
      errorContent("Battle start requires at least one combatant.", {
        code: "INVALID_BATTLE_COMBATANTS",
      }),
    ];
  }
  const [first, ...rest] = composition.issue.issues;
  return [projectionToolError(first), ...rest.map(projectionToolError)];
}

function projectionToolError(
  projection: CharacterBattleEncounterProjectionIssue,
): ToolError {
  return errorContent(characterBattleRuntimeIssueMessage(projection.issue), {
    code:
      projection.origin === "characterSheet"
        ? "CHARACTER_BATTLE_INIT_INVALID"
        : "STAT_BLOCK_BATTLE_INIT_INVALID",
    combatantId: projection.combatantId,
  });
}

function invalidBattleCombatantsContent(issues: readonly ToolError[]) {
  return errorContent("Invalid battle start combatants.", {
    code: "INVALID_BATTLE_COMBATANTS",
    issues: issues.map(jsonContentPayload),
  });
}
