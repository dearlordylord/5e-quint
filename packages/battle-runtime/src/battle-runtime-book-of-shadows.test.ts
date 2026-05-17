import {
  startBattleRight,
  characterSeed,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  wizardId,
  battleId,
  discoverBattleActs,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Book of Shadows", () => {
  test("Book of Shadows Spell Access derives effective Warlock cantrip and Ritual access", () => {
    const state = startBattleRight({
      battleId: battleId("battle-book-of-shadows-access"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Tome Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            bookOfShadowsSpellAccesses: [
              {
                tag: "bookOfShadows",
                bookPresence: { tag: "onPerson" },
                cantrips: [
                  spellRecord("poison_spray"),
                  spellRecord("chill_touch"),
                  spellRecord("starry_wisp"),
                ],
                ritualSpells: [
                  spellRecord("detect_magic"),
                  spellRecord("detect_poison_and_disease"),
                ],
                spellcastingFocus: "book_of_shadows",
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.cantrips).toEqual([]);
    expect(warlock.origin.spellcasting?.preparedSpells).toEqual([]);
    expect(warlock.origin.spellcasting?.bookOfShadowsSpellAccesses).toEqual([
      {
        tag: "bookOfShadows",
        bookPresence: { tag: "onPerson" },
        cantrips: [
          spellRecord("poison_spray"),
          spellRecord("chill_touch"),
          spellRecord("starry_wisp"),
        ],
        ritualSpells: [
          spellRecord("detect_magic"),
          spellRecord("detect_poison_and_disease"),
        ],
        spellcastingFocus: "book_of_shadows",
      },
    ]);
    expect(discoverBattleActs(state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });

  test("Book of Shadows Spell Access is stored but ineffective when the book is not on person", () => {
    const state = startBattleRight({
      battleId: battleId("battle-book-of-shadows-not-on-person"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Tome Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            bookOfShadowsSpellAccesses: [
              {
                tag: "bookOfShadows",
                bookPresence: { tag: "notOnPerson" },
                cantrips: [
                  spellRecord("poison_spray"),
                  spellRecord("chill_touch"),
                  spellRecord("starry_wisp"),
                ],
                ritualSpells: [
                  spellRecord("detect_magic"),
                  spellRecord("detect_poison_and_disease"),
                ],
                spellcastingFocus: "book_of_shadows",
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(
      warlock.origin.spellcasting?.bookOfShadowsSpellAccesses,
    ).toHaveLength(1);
    expect(discoverBattleActs(state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });
});
