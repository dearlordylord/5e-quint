import {
  battleCreatureInitFromStatBlock,
  snapshotBattle,
  startBattle,
  validateBattleCombatantDistances,
  type BattleCreatureInit,
  type BattleCombatantDistanceValidationIssue,
} from "@dnd/battle-runtime";
import { Match } from "effect";

import { battleCreatureInitFromCharacterBuild } from "./battle-creature-init.ts";
import { battleStateProjection } from "./battle-state-projection.ts";
import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  characterBattleSpellSlots,
  characterBattleZeroHpLifecycle,
  characterSessionCurrentHp,
} from "./session-store.ts";
import {
  type InitialBattleCombatantToolInput,
  type InitialCharacterSessionCombatantToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

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

  const characterSessions = startBattleCharacterSessions(root, input);
  const missingCharacter = characterSessions.find(
    (entry) => entry.session == null,
  );
  if (missingCharacter !== undefined) {
    return errorContent(
      `Unknown finalized character session: ${missingCharacter.character.sourceDraftId}`,
      {
        code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
        sourceDraftId: missingCharacter.character.sourceDraftId,
      },
    );
  }

  const unavailableCharacter = characterSessions.find(
    (entry) => entry.session?.tag !== "available",
  );
  if (unavailableCharacter?.session?.tag === "inBattle") {
    return errorContent("Character is already assigned to a battle.", {
      code: "CHARACTER_ALREADY_IN_BATTLE",
      sourceDraftId: unavailableCharacter.character.sourceDraftId,
      battleId: unavailableCharacter.session.battleId,
    });
  }

  const distanceInput = validInitialCombatantDistances(input);
  if (distanceInput !== null) {
    return distanceInput;
  }

  try {
    const state = startBattle({
      battleId: input.battleId,
      combatants: initialBattleCreatureInits({
        root,
        initialCombatants: input.initialCombatants,
        characterSessions,
      }),
      combatantDistances: input.combatantDistances,
    });
    root.sessionStore.battleState = state;
    root.sessionStore.transientBattleFills = null;
    for (const { character, session } of characterSessions) {
      if (session?.tag !== "available") continue;
      root.sessionStore.characters.set(character.sourceDraftId, {
        tag: "inBattle",
        build: session.build,
        battleId: input.battleId,
        characterId: session.characterId,
      });
    }

    return schemaJsonContent(StartBattleOutputSchema, {
      battleState: battleStateProjection(state),
      snapshot: snapshotBattle(state),
      session: root.sessionStore.snapshot(),
    });
  } catch (error) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function startBattleCharacterSessions(
  root: McpCompositionRoot,
  decoded: StartBattleToolInput,
) {
  return decoded.initialCombatants
    .filter(isCharacterSessionCombatant)
    .map((character) => ({
      character,
      session: root.sessionStore.characters.get(character.sourceDraftId),
    }));
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

function validInitialCombatantDistances(input: StartBattleToolInput) {
  if (input.combatantDistances === undefined) return null;

  const combatantIds = new Set(
    input.initialCombatants.map((combatant) => combatant.combatantId),
  );
  const issue = validateBattleCombatantDistances({
    combatantIds: [...combatantIds],
    combatantDistances: input.combatantDistances,
    requireCompletePairs: true,
  });
  return issue === null ? null : distanceIssueContent(issue);
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

function initialBattleCreatureInits(input: {
  readonly root: McpCompositionRoot;
  readonly initialCombatants: readonly InitialBattleCombatantToolInput[];
  readonly characterSessions: ReturnType<typeof startBattleCharacterSessions>;
}): readonly BattleCreatureInit[] {
  return input.initialCombatants.map((combatant) =>
    Match.value(combatant).pipe(
      Match.when({ kind: "characterSession" }, (character) => {
        const session = input.characterSessions.find(
          (entry) => entry.character.sourceDraftId === character.sourceDraftId,
        )?.session;
        if (session?.tag !== "available") {
          throw new Error("Character session is not available.");
        }
        return battleCreatureInitFromCharacterBuild({
          combatantId: character.combatantId,
          characterId: session.characterId,
          displayName: characterBuildDisplayName(
            input.root.unitLibrary,
            session.build,
          ),
          build: session.build,
          initiative: character.initiative,
          currentHp: characterSessionCurrentHp(session),
          zeroHpLifecycle: characterBattleZeroHpLifecycle(session),
          spellSlots: characterBattleSpellSlots(session),
          unitLibrary: input.root.unitLibrary,
        });
      }),
      Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
        return battleCreatureInitFromStatBlock({
          combatantId: statBlockCombatant.combatantId,
          statBlock: input.root.statBlockCatalog.requireStatBlock(
            statBlockCombatant.statBlockId,
          ),
          initiative: statBlockCombatant.initiative,
          ...(statBlockCombatant.currentHp === undefined
            ? {}
            : { currentHp: statBlockCombatant.currentHp }),
          ...(statBlockCombatant.tempHp === undefined
            ? {}
            : { tempHp: statBlockCombatant.tempHp }),
        });
      }),
      Match.exhaustive,
    ),
  );
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
