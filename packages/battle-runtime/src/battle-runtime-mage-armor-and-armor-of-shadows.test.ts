import {
  startBattleRight,
  requireElapsedHours,
  requireResolved,
  requireHole,
  findHole,
  findAct,
  targetFill,
  characterSeed,
  combatantId,
  elapsedTimeTicks,
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
  statBlockCatalog,
  resourceCount,
  unitLibrary,
  difficultyClass,
} from "./battle-runtime-test-support.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
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

  test("Mage Armor rejects forged Saving Throw outcome fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-forged-save"),
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
        skeletonCreatureInit({ initiative: 10 }),
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

    const result = resolveBattleSubject({
      state,
      subject: magicSubject("mage_armor"),
      fills: [
        targetFill(target, wizardId),
        {
          kind: "savingThrowOutcome",
          holeId: holeId("battle:spell:saving-throw-outcome:mage_armor"),
          value: {
            outcomes: [{ targetId: wizardId, succeeded: false }],
          },
        },
      ],
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
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

  test("Mage Armor target holes keep a hidden caster unrevealed until the effect succeeds", () => {
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-hidden-caster-target-hole"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Hidden Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
      ],
    });
    const wizard = state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard caster.");
    }
    const hiddenState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };

    const holes = resolveBattleSubject({
      state: hiddenState,
      subject: magicSubject("mage_armor"),
      fills: [],
    });

    expect(holes).toMatchObject({ tag: "needsHoles" });
    if (holes.tag !== "needsHoles") {
      throw new Error("Expected Mage Armor target hole.");
    }
    expect(holes.state.combatants.get(wizardId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });
  });

  test("Mage Armor uses Beast Dexterity for Wild Shaped targets with merged equipment", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const druidId = combatantId("mage-armor-wild-shaped-druid");
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-wild-shape-target"),
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
          combatantId: druidId,
          displayName: "Wild Shaped Druid",
          initiative: 10,
          attack: null,
          armorClass: armored,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeKnownForms: [
            statBlockCatalog.requireStatBlock("stat_block_rat"),
            statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
            statBlockCatalog.requireStatBlock("stat_block_lizard"),
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
      ],
    });
    const druid = state.combatants.get(druidId);
    if (druid === undefined) {
      throw new Error("Expected Druid target.");
    }
    const wildShapedState = {
      ...state,
      combatants: new Map(state.combatants).set(druidId, {
        ...druid,
        activeEffects: [
          ...druid.activeEffects,
          {
            kind: "druidWildShapeForm" as const,
            sourceUnitId: "druid_wild_shape",
            sourceCombatantId: druidId,
            formStatBlockId: "stat_block_cat",
            equipmentDisposition: "merged",
            resources: {
              legendaryActionUsesRemaining: resourceCount(0),
              dailyUses: [],
              unavailableRechargeParts: [],
              unavailableRestRechargeParts: [],
            },
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      }),
    };
    const target = requireHole(
      resolveBattleSubject({
        state: wildShapedState,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    const knownWillingDruidTarget = targetFill(target, druidId, [
      {
        kind: "spellTarget",
        casterId: wizardId,
        targetId: druidId,
        spellId: "mage_armor",
      },
      {
        kind: "spellTargetKnownWilling",
        casterId: wizardId,
        targetId: druidId,
        spellId: "mage_armor",
      },
    ]);
    const result = requireResolved(
      resolveBattleSubject({
        state: wildShapedState,
        subject: magicSubject("mage_armor"),
        fills: [knownWillingDruidTarget],
      }),
    );
    const druidSnapshot = result.snapshot.combatants.find(
      (combatant) => combatant.combatantId === druidId,
    );
    expect(Number(druidSnapshot?.armorClass)).toBe(15);
  });

  test("Mage Armor treats unresolved Wild Shape effects as still wearing armor", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const druidId = combatantId("mage-armor-stale-wild-shape-druid");
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-stale-wild-shape-target"),
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
          combatantId: druidId,
          displayName: "Stale Wild Shape Druid",
          initiative: 10,
          attack: null,
          armorClass: armored,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeKnownForms: [
            statBlockCatalog.requireStatBlock("stat_block_rat"),
            statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
            statBlockCatalog.requireStatBlock("stat_block_lizard"),
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
      ],
    });
    const druid = state.combatants.get(druidId);
    if (druid === undefined) {
      throw new Error("Expected Druid target.");
    }
    const staleWildShapeState = {
      ...state,
      combatants: new Map(state.combatants).set(druidId, {
        ...druid,
        activeEffects: [
          ...druid.activeEffects,
          {
            kind: "druidWildShapeForm" as const,
            sourceUnitId: "druid_wild_shape",
            sourceCombatantId: druidId,
            formStatBlockId: "missing_wild_shape_form",
            equipmentDisposition: "merged",
            resources: {
              legendaryActionUsesRemaining: resourceCount(0),
              dailyUses: [],
              unavailableRechargeParts: [],
              unavailableRestRechargeParts: [],
            },
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      }),
    };

    const target = requireHole(
      resolveBattleSubject({
        state: staleWildShapeState,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).not.toContain(druidId);
    expect(
      resolveBattleSubject({
        state: staleWildShapeState,
        subject: magicSubject("mage_armor"),
        fills: [targetFill(target, druidId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
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
      // Armor of Shadows expends no Spell Slot, but Mage Armor is still a
      // level 1+ spell; casting it counts toward the per-turn leveled-spell
      // limit that gates Quickened Spell (Sorcerer, Quickened Spell).
      levelOnePlusSpellCastsThisTurn: [wizardId],
      quickenedLevelOnePlusSpellCastsThisTurn: [],
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
