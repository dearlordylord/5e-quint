import {
  startBattleRight,
  requireElapsedHours,
  requireResolved,
  requireHole,
  findHole,
  findAct,
  targetFill,
  characterSeed,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  fighterId,
  skeletonId,
  wizardId,
  abilityModifier,
  armorOfShadowsSpellInvocationRef,
  battleId,
  defaultArmorClassState,
  discoverBattleActs,
  Either,
  resolveBattleSubject,
  sameBattleSubject,
  spellSlotInvocationRef,
  startBattle,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Mage Armor and Armor of Shadows", () => {
  test("Mage Armor creates a persistent base AC spell effect with typed early end", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("mage_armor"),
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toContainEqual({
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "mage_armor",
        1,
        "persistentArmorEffect",
      ),
      mode: { tag: "cast" },
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }
    expect(target.choices).toEqual([wizardId]);
    const result = resolveBattleSubject({
      state,
      subject: magicSubject("mage_armor"),
      fills: [targetFill(target, wizardId)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          {
            combatantId: wizardId,
            armorClass: 15,
          },
          { combatantId: skeletonId },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      requireResolved(result).state.combatants.get(wizardId),
    ).toMatchObject({
      activeEffects: [
        {
          kind: "spellBaseArmorClass",
          sourceSpellId: "mage_armor",
          sourceCombatantId: wizardId,
          base: 13,
          ability: "dex",
          expiresAt: {
            kind: "duration",
            durationTicks: requireElapsedHours(8),
          },
          earlyEnds: [{ kind: "targetDonsArmor" }],
        },
      ],
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(1);
  });

  test("Mage Armor rejects armored targets before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-armored-target"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Armored Fighter",
          initiative: 10,
          armorClass: armored,
          attack: null,
        }),
      ],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [targetFill(target, fighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(state.combatants.get(wizardId)?.origin.kind).toBe("character");
  });

  test("Armor of Shadows casts self-only Mage Armor without expending a Spell Slot", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const target = findHole(act.initialHoles, "targetChoice");
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(act.summary).toBe("Cast Mage Armor using Armor of Shadows.");
    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );
    const warlock = result.state.combatants.get(wizardId);

    expect(
      result.snapshot.combatants.find(
        (combatant) => combatant.combatantId === wizardId,
      ),
    ).toMatchObject({ armorClass: 15 });
    expect(result.snapshot.turn).toMatchObject({
      actionResources: [],
      spellSlotUsesThisTurn: [],
    });
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(warlock.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellBaseArmorClass",
        sourceSpellId: "mage_armor",
        sourceCombatantId: wizardId,
        earlyEnds: [{ kind: "targetDonsArmor" }],
      }),
    ]);

    const recastState = {
      ...result.state,
      currentTurnResources: state.currentTurnResources,
    };
    const recast = requireResolved(
      resolveBattleSubject({
        state: recastState,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );

    expect(
      recast.state.combatants
        .get(wizardId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellBaseArmorClass" &&
            effect.sourceSpellId === "mage_armor",
        ),
    ).toHaveLength(1);
  });

  test("Armor of Shadows Spell Access rejects non-Mage-Armor spell records", () => {
    const mageArmorWithWrongRuntimeId = {
      ...spellRecord("mage_armor"),
      id: "misidentified_mage_armor",
    };

    expect(
      startBattle({
        battleId: battleId("battle-armor-of-shadows-invalid-spell-access"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "armorOfShadowsMageArmor",
                  spell: mageArmorWithWrongRuntimeId,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Armor of Shadows Spell Access must grant Mage Armor.",
      }),
    );
  });

  test("Armor of Shadows rejects armored self before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows-armored-self"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Armored Warlock",
          initiative: 20,
          attack: null,
          armorClass: armored,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    expect(
      discoverBattleActs(state).some((candidate) =>
        sameBattleSubject(candidate.subject, subject),
      ),
    ).toBe(false);
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const warlock = state.combatants.get(wizardId);
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
  });
});
