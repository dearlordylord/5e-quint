import {
  startBattleSessionRight,
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
    const session = startBattleSessionRight({
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
    const warlock = session.state.combatants.get(wizardId);
    const spellcasting =
      session.context.characters.get(wizardId)?.spellcastingPresentationSource;

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(spellcasting?.cantrips).toEqual([]);
    expect(spellcasting?.preparedSpells).toEqual([]);
    expect(spellcasting?.bookOfShadowsSpellAccesses).toEqual([
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
    expect(discoverBattleActs(session)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });

  test("Book of Shadows Spell Access is stored but ineffective when the book is not on person", () => {
    const session = startBattleSessionRight({
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
    const warlock = session.state.combatants.get(wizardId);
    const spellcasting =
      session.context.characters.get(wizardId)?.spellcastingPresentationSource;

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(spellcasting?.bookOfShadowsSpellAccesses).toHaveLength(1);
    expect(discoverBattleActs(session)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });
});
