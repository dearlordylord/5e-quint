import type { BattleCreatureState } from "@dnd/battle-runtime";
import { characterId } from "@dnd/battle-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  characterSheetTempHp,
  createFreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { applyBattleHandoffToCharacterSheet } from "./index.ts";

// The handoff test exercises identity rejection before build-derived fields are
// inspected; this fixture only needs the non-spellcasting discriminator.
const build = { spellcasting: undefined } as unknown as CharacterBuild;

describe("Character Sheet battle handoff", () => {
  test("rejects mismatched battle character identity", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: {
        origin: {
          kind: "character",
          characterId: characterId("character:battle"),
        },
        // The handoff exits on mismatched identity before reading the rest of the
        // combatant state, so this local fixture carries only the fields used on
        // that branch.
      } as unknown as BattleCreatureState,
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("rejects handoff maximum HP drift from the existing Character Sheet", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: {
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(10),
        maxHp: Hp(12),
      } as unknown as BattleCreatureState,
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("preserves remaining Temporary Hit Points from battle handoff", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      combatant: {
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(8),
        maxHp: Hp(10),
        tempHp: Hp(4),
        positiveHpUnconscious: null,
      } as unknown as BattleCreatureState,
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetTempHp(handoff.right)).toBe(4);
    }
  });
});
