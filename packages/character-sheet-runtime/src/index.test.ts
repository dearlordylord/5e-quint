import type { CharacterBuild } from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterSheetId,
  createFreshCharacterSheet,
  parseCharacterSheet,
} from "./index.ts";

// These tests exercise Character Sheet HP invariants; the fixture only needs
// the non-spellcasting discriminator read by createFreshCharacterSheet.
const build = { spellcasting: undefined } as unknown as CharacterBuild;

describe("Character Sheet runtime", () => {
  test("creates a fresh non-spellcasting Character Sheet at current HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(12),
    });

    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isRight(sheet)) {
      expect(sheet.right.hitPoints).toEqual({ tag: "positive", currentHp: 12 });
    }
  });

  test("rejects contradictory positive and zero-HP state", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(1),
      zeroHpLifecycle: {
        tag: "unstable",
        deathSaves: { successes: 0, failures: 0 },
      },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects current HP above sheet maximum HP", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:test"),
      build,
      maximumHp: Hp(12),
      currentHp: Hp(13),
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });

  test("rejects stored sheets with malformed Character Build shape", () => {
    const sheet = parseCharacterSheet({
      tag: "available",
      characterId: "character:test",
      build: {
        progression: {},
        background: "background_soldier",
        species: "species_orc",
        abilityScores: {},
        proficiencyChoices: [],
        features: [],
        equipment: {},
      },
      maximumHp: 12,
      hitPoints: { tag: "positive", currentHp: 12 },
    });

    expect(Either.isLeft(sheet)).toBe(true);
  });
});
