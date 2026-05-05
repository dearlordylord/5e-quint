import type {
  BattleState,
  BattleCreatureState,
  CharacterBattleSpellSlotState,
  CharacterId,
} from "@dnd/battle-runtime";
import type { CharacterDraftId } from "@dnd/character-creation-runtime";
import type { Hp } from "@dnd/shared/types";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Either } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  availableCharacterSession,
  type CharacterSessionPositiveHpCondition,
  type CharacterSessionZeroHpLifecycleInput,
} from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

export function finalizeCharacterSessionsFromBattle(
  root: McpCompositionRoot,
  state: BattleState,
): ReturnType<typeof errorContent> | null {
  const updates: {
    readonly sourceDraftId: CharacterDraftId;
    readonly currentHp: Hp;
    readonly positiveHpCondition?: CharacterSessionPositiveHpCondition;
    readonly zeroHpLifecycle?: CharacterSessionZeroHpLifecycleInput;
    readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  }[] = [];

  for (const combatant of state.combatants.values()) {
    if (combatant.origin.kind !== "character") continue;

    const sourceDraftId = sourceDraftIdForInBattleCharacter(
      root,
      state,
      combatant.origin.characterId,
    );
    if (sourceDraftId === null) {
      return errorContent("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId: combatant.origin.characterId,
      });
    }

    const session = root.sessionStore.characters.get(sourceDraftId);
    if (session?.tag !== "inBattle") {
      return errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        sourceDraftId,
      });
    }
    const zeroHpLifecycle =
      combatant.hp === 0 ? characterZeroHpLifecycleFromBattle(combatant) : null;
    if (zeroHpLifecycle != null && Either.isLeft(zeroHpLifecycle)) {
      return errorContent(
        "Battle character has unsupported zero-HP lifecycle.",
        {
          code: "CHARACTER_ZERO_HP_LIFECYCLE_UNSUPPORTED",
          combatantId: combatant.combatantId,
          characterId: combatant.origin.characterId,
        },
      );
    }
    updates.push({
      sourceDraftId,
      currentHp: combatant.hp,
      ...(combatant.hp > 0 && hasCondition(combatant.conditions, "unconscious")
        ? {
            positiveHpCondition: {
              tag: "unconscious",
              recovery: { kind: "knockOutShortRest" },
            },
          }
        : {}),
      ...(combatant.hp === 0
        ? { zeroHpLifecycle: zeroHpLifecycle?.right }
        : {}),
      ...(combatant.origin.spellcasting === undefined
        ? {}
        : { spellSlots: combatant.origin.spellcasting.spellSlots }),
    });
  }

  for (const update of updates) {
    const session = root.sessionStore.characters.get(update.sourceDraftId);
    if (session?.tag !== "inBattle") continue;
    const availableSession = availableCharacterSession({
      characterId: session.characterId,
      build: session.build,
      currentHp: update.currentHp,
      positiveHpCondition: update.positiveHpCondition,
      zeroHpLifecycle: update.zeroHpLifecycle,
      spellSlots: update.spellSlots,
    });
    if (Either.isLeft(availableSession)) {
      return errorContent("Battle character session handoff failed.", {
        code: "CHARACTER_SESSION_HANDOFF_INVALID",
        sourceDraftId: update.sourceDraftId,
        message: availableSession.left.message,
      });
    }
    root.sessionStore.characters.set(
      update.sourceDraftId,
      availableSession.right,
    );
  }

  return null;
}

function characterZeroHpLifecycleFromBattle(
  combatant: BattleCreatureState,
): Either.Either<CharacterSessionZeroHpLifecycleInput, "unsupportedLifecycle"> {
  if (combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return Either.left("unsupportedLifecycle");
  }
  const lifecycle = combatant.zeroHpLifecycle.deathSaves;
  if (lifecycle.dead) {
    return Either.right({ tag: "dead", deathSaves: lifecycle.deathSaves });
  }
  if (lifecycle.stable) {
    return Either.right({
      tag: "stable",
      recovery: { kind: "regains1HpAfter1d4Hours" },
    });
  }
  return Either.right({ tag: "unstable", deathSaves: lifecycle.deathSaves });
}

function sourceDraftIdForInBattleCharacter(
  root: McpCompositionRoot,
  state: BattleState,
  characterId: CharacterId,
) {
  for (const [sourceDraftId, session] of root.sessionStore.characters) {
    if (
      session.tag === "inBattle" &&
      session.battleId === state.battleId &&
      session.characterId === characterId
    ) {
      return sourceDraftId;
    }
  }

  return null;
}
