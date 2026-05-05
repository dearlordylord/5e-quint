import {
  battleCreatureInitFromStatBlock,
  battleCombatantDistances,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type AcceptedBattleCombatantDistances,
  type BattleCombatantDistanceValidationIssue,
} from "@dnd/battle-runtime";
import { Either, Match, Option } from "effect";

import { battleCreatureInitFromCharacterBuild } from "./battle-creature-init.ts";
import { battleStateProjection } from "./battle-state-projection.ts";
import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  characterBattleSpellSlots,
  characterBattleZeroHpLifecycle,
  characterSessionCurrentHp,
  type AvailableCharacterSession,
} from "./session-store.ts";
import {
  type InitialBattleCombatantToolInput,
  type InitialCharacterSessionCombatantToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

type StartableCharacterSessionCombatant = {
  readonly character: InitialCharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
};

export function handleStartBattleToolCall(
  root: McpCompositionRoot,
  input: StartBattleToolInput,
) {
  const activeBattle = root.sessionStore.battleState;
  if (activeBattle !== null) {
    return errorContent("A battle session is already active.", {
      code: "BATTLE_SESSION_ALREADY_ACTIVE",
      battleId: activeBattle.battleId,
    });
  }

  const duplicateInput = duplicateStartBattleInputContent(
    input.initialCombatants,
  );
  if (duplicateInput !== null) return duplicateInput;

  const distanceInput = acceptedInitialCombatantDistances(input);
  if (Either.isLeft(distanceInput)) return distanceInput.left;

  const combatants = startableBattleCombatants({
    root,
    initialCombatants: input.initialCombatants,
  });
  if (Either.isLeft(combatants)) return combatants.left;

  const state = startBattle({
    tag: "acceptedDistances",
    battleId: input.battleId,
    combatants: combatants.right.creatureInits,
    combatantDistances: distanceInput.right,
  });
  if (Either.isLeft(state)) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: state.left.message,
    });
  }
  root.sessionStore.battleState = state.right;
  root.sessionStore.transientBattleFills = null;
  for (const { character, session } of combatants.right.characterSessions) {
    root.sessionStore.characters.set(character.sourceDraftId, {
      tag: "inBattle",
      build: session.build,
      battleId: input.battleId,
      characterId: session.characterId,
    });
  }

  return schemaJsonContent(StartBattleOutputSchema, {
    battleState: battleStateProjection(state.right),
    snapshot: snapshotBattle(state.right),
    session: root.sessionStore.snapshot(),
  });
}

function duplicateStartBattleInputContent(
  initialCombatants: readonly InitialBattleCombatantToolInput[],
) {
  const characters = initialCombatants.filter(isCharacterSessionCombatant);
  const duplicateSourceDraftId = firstDuplicate(
    characters.map((character) => character.sourceDraftId),
  );
  if (duplicateSourceDraftId !== null) {
    return errorContent("Duplicate source draft id in battle start.", {
      code: "DUPLICATE_BATTLE_SOURCE_DRAFT_ID",
      sourceDraftId: duplicateSourceDraftId,
    });
  }

  const duplicateCombatantId = firstDuplicate(
    initialCombatants.map((combatant) => combatant.combatantId),
  );
  if (duplicateCombatantId !== null) {
    return errorContent("Duplicate combatant id in battle start.", {
      code: "DUPLICATE_BATTLE_COMBATANT_ID",
      combatantId: duplicateCombatantId,
    });
  }

  return null;
}

function acceptedInitialCombatantDistances(
  input: StartBattleToolInput,
): Either.Either<
  AcceptedBattleCombatantDistances,
  ReturnType<typeof errorContent>
> {
  const combatantIds = new Set(
    input.initialCombatants.map((combatant) => combatant.combatantId),
  );
  const distances = battleCombatantDistances({
    combatantIds: [...combatantIds],
    ...(input.combatantDistances === undefined
      ? {}
      : { combatantDistances: input.combatantDistances }),
  });
  return Either.isLeft(distances)
    ? Either.left(distanceIssueContent(distances.left))
    : Either.right(distances.right);
}

function distanceIssueContent(issue: BattleCombatantDistanceValidationIssue) {
  return Match.value(issue).pipe(
    Match.when({ tag: "invalidFeet" }, () =>
      errorContent("Combatant distance must be a non-negative integer.", {
        code: "INVALID_BATTLE_DISTANCE_FEET",
      }),
    ),
    Match.when({ tag: "unknownCombatant" }, (unknown) =>
      errorContent("Combatant distance references an unknown combatant.", {
        code: "UNKNOWN_BATTLE_DISTANCE_COMBATANT",
        combatantA: unknown.combatantA,
        combatantB: unknown.combatantB,
      }),
    ),
    Match.when({ tag: "selfDistance" }, (self) =>
      errorContent("Combatant distance requires two combatants.", {
        code: "SELF_BATTLE_DISTANCE",
        combatantId: self.combatantId,
      }),
    ),
    Match.when({ tag: "duplicatePair" }, (duplicate) =>
      errorContent("Duplicate combatant distance pair.", {
        code: "DUPLICATE_BATTLE_DISTANCE_PAIR",
        combatantA: duplicate.combatantA,
        combatantB: duplicate.combatantB,
      }),
    ),
    Match.when({ tag: "incompletePairs" }, (incomplete) =>
      errorContent(
        "Explicit combatant distances must include every combatant pair.",
        {
          code: "INCOMPLETE_BATTLE_DISTANCE_PAIRS",
          expectedPairCount: incomplete.expectedPairCount,
          actualPairCount: incomplete.actualPairCount,
        },
      ),
    ),
    Match.exhaustive,
  );
}

function startableBattleCombatants(input: {
  readonly root: McpCompositionRoot;
  readonly initialCombatants: readonly InitialBattleCombatantToolInput[];
}): Either.Either<StartableBattleCombatants, ReturnType<typeof errorContent>> {
  const inits: BattleCreatureInit[] = [];
  const characterSessions: StartableCharacterSessionCombatant[] = [];
  for (const combatant of input.initialCombatants) {
    const init = Match.value(combatant).pipe(
      Match.when({ kind: "characterSession" }, (character) => {
        const session = input.root.sessionStore.characters.get(
          character.sourceDraftId,
        );
        if (session === undefined) {
          return Either.left(
            errorContent(
              `Unknown finalized character session: ${character.sourceDraftId}`,
              {
                code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
                sourceDraftId: character.sourceDraftId,
              },
            ),
          );
        }
        if (session.tag === "inBattle") {
          return Either.left(
            errorContent("Character is already assigned to a battle.", {
              code: "CHARACTER_ALREADY_IN_BATTLE",
              sourceDraftId: character.sourceDraftId,
              battleId: session.battleId,
            }),
          );
        }
        characterSessions.push({ character, session });
        const characterInit = battleCreatureInitFromCharacterBuild({
          combatantId: character.combatantId,
          characterId: session.characterId,
          displayName: characterBuildDisplayName(
            input.root.unitLibrary,
            session.build,
          ),
          build: session.build,
          initiative: character.initiative,
          side: character.side,
          currentHp: characterSessionCurrentHp(session),
          zeroHpLifecycle: characterBattleZeroHpLifecycle(session),
          spellSlots: characterBattleSpellSlots(session),
          unitLibrary: input.root.unitLibrary,
        });
        return Either.isLeft(characterInit)
          ? Either.left(
              errorContent(characterInit.left.message, {
                code: "CHARACTER_BATTLE_INIT_INVALID",
              }),
            )
          : Either.right({ ...characterInit.right });
      }),
      Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
        const statBlock = input.root.statBlockCatalog.getStatBlock(
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
          ...battleCreatureInitFromStatBlock({
            combatantId: statBlockCombatant.combatantId,
            statBlock: statBlock.value,
            initiative: statBlockCombatant.initiative,
            side: statBlockCombatant.side,
            ...(statBlockCombatant.currentHp === undefined
              ? {}
              : { currentHp: statBlockCombatant.currentHp }),
            ...(statBlockCombatant.tempHp === undefined
              ? {}
              : { tempHp: statBlockCombatant.tempHp }),
          }),
        });
      }),
      Match.exhaustive,
    );
    if (Either.isLeft(init)) return Either.left(init.left);
    inits.push(init.right);
  }

  return Either.right({ creatureInits: inits, characterSessions });
}

function isCharacterSessionCombatant(
  combatant: InitialBattleCombatantToolInput,
): combatant is InitialCharacterSessionCombatantToolInput {
  return combatant.kind === "characterSession";
}

function firstDuplicate<T>(values: readonly T[]): T | null {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}
