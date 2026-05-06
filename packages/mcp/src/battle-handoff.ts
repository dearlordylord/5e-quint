import type {
  BattleState,
  BattleCreatureState,
  CharacterBattleSpellSlotState,
  CharacterId,
} from "@dnd/battle-runtime";
import { combatantKnockedOutUnconscious } from "@dnd/battle-runtime";
import type { Hp } from "@dnd/shared/types";
import { Either } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  availableCharacterSession,
  type CharacterSessionPositiveHpUnconscious,
  type CharacterSessionZeroHpLifecycleInput,
} from "./session-store.ts";
import { characterSessionPositiveHpUnconsciousFromBattle } from "./session-hit-points.ts";
import { errorContent } from "./tool-content.ts";

export function finalizeCharacterSessionsFromBattle(
  root: McpCompositionRoot,
  state: BattleState,
): ReturnType<typeof errorContent> | null {
  const updates: {
    readonly characterId: CharacterId;
    readonly currentHp: Hp;
    readonly positiveHpUnconscious?: CharacterSessionPositiveHpUnconscious;
    readonly zeroHpLifecycle?: CharacterSessionZeroHpLifecycleInput;
    readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  }[] = [];

  for (const combatant of state.combatants.values()) {
    if (combatant.origin.kind !== "character") continue;

    const characterId = combatant.origin.characterId;
    const session = root.sessionStore.characters.get(characterId);
    if (session == null) {
      return errorContent("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId,
      });
    }

    if (session?.tag !== "inBattle") {
      return errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId,
      });
    }
    const zeroHpLifecycle =
      combatant.hp === 0 ? characterZeroHpLifecycleFromBattle(combatant) : null;
    const knockedOut = combatantKnockedOutUnconscious(combatant);
    if (Either.isLeft(knockedOut)) {
      return errorContent("Battle character Knock Out lifecycle is invalid.", {
        code: "CHARACTER_KNOCK_OUT_LIFECYCLE_INVALID",
        combatantId: combatant.combatantId,
        characterId: combatant.origin.characterId,
        message: knockedOut.left.message,
      });
    }
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
      characterId,
      currentHp: combatant.hp,
      ...(knockedOut.right === null
        ? {}
        : {
            positiveHpUnconscious:
              characterSessionPositiveHpUnconsciousFromBattle(
                knockedOut.right,
              ),
          }),
      ...(combatant.hp === 0
        ? { zeroHpLifecycle: zeroHpLifecycle?.right }
        : {}),
      ...(combatant.origin.spellcasting === undefined
        ? {}
        : { spellSlots: combatant.origin.spellcasting.spellSlots }),
    });
  }

  for (const update of updates) {
    const session = root.sessionStore.characters.get(update.characterId);
    if (session?.tag !== "inBattle") continue;
    const availableSession = availableCharacterSession({
      characterId: session.characterId,
      build: session.build,
      currentHp: update.currentHp,
      positiveHpUnconscious: update.positiveHpUnconscious,
      zeroHpLifecycle: update.zeroHpLifecycle,
      spellSlots: update.spellSlots,
    });
    if (Either.isLeft(availableSession)) {
      return errorContent("Battle character session handoff failed.", {
        code: "CHARACTER_SESSION_HANDOFF_INVALID",
        characterId: update.characterId,
        message: availableSession.left.message,
      });
    }
    root.sessionStore.characters.set(availableSession.right);
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
