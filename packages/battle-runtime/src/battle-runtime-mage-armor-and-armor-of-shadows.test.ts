import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { admitPersistentArmorEffectSpell } from "./procedure-admission/persistent-armor-effect-facts.ts";
import {
  abilityModifier,
  armorOfShadowsSpellInvocationRef,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSeed,
  combatantId,
  defaultArmorClassState,
  difficultyClass,
  discoverBattleActs,
  Either,
  elapsedTimeTicks,
  expendedLevelOneSlots,
  fighterId,
  findAct,
  findHole,
  magicSubject,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  requireElapsedHours,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  spellSlotInvocationRef,
  startBattle,
  startBattleSessionRight,
  statBlockCatalog,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Mage Armor and Armor of Shadows", () => {
  test("Mage Armor creates a persistent base AC spell effect with typed early end", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const session = startBattleSessionRight({
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

    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;
    expect(
      discoverBattleActs(session).map((act) => act.subject),
    ).toContainEqual({
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("mage_armor", 1, "persistentArmorEffect"),
      ),
      mode: { tag: "cast" },
    });

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
    expect(target.choices).toEqual([wizardId, skeletonId]);
    const result = resolveBattleSubject({
      state,
      subject,
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
          sourceProcedureRef: expect.any(String),
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
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
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
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;

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

    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(state.combatants.get(wizardId)?.origin.kind).toBe("character");
  });

  test("Mage Armor target holes keep a hidden caster unrevealed until the effect succeeds", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;
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
      subject,
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
    const session = startBattleSessionRight({
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
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock("stat_block_rat"),
            statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
            statBlockCatalog.requireStatBlock("stat_block_lizard"),
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;
    const druid = state.combatants.get(druidId);
    if (druid === undefined) {
      throw new Error("Expected Druid target.");
    }
    const wildShapeProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      druidId,
      "druid_wild_shape",
    );
    const wildShapedState = {
      ...state,
      combatants: new Map(state.combatants).set(druidId, {
        ...druid,
        activeEffects: [
          ...druid.activeEffects,
          {
            kind: "druidWildShapeForm" as const,
            sourceProcedureRef: wildShapeProcedureRef,
            sourceCombatantId: druidId,
            formStatBlockId: "stat_block_cat",
            formLimbs: { kind: "cannotHandleObjects" },
            equipmentDisposition: [],
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
        subject,
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
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
      },
      {
        kind: "spellTargetKnownWilling",
        casterId: wizardId,
        targetId: druidId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
      },
    ]);
    const result = requireResolved(
      resolveBattleSubject({
        state: wildShapedState,
        subject,
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
    const session = startBattleSessionRight({
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
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock("stat_block_rat"),
            statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
            statBlockCatalog.requireStatBlock("stat_block_lizard"),
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("mage_armor")).subject;
    const druid = state.combatants.get(druidId);
    if (druid === undefined) {
      throw new Error("Expected Druid target.");
    }
    const wildShapeProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      druidId,
      "druid_wild_shape",
    );
    const staleWildShapeState = {
      ...state,
      combatants: new Map(state.combatants).set(druidId, {
        ...druid,
        activeEffects: [
          ...druid.activeEffects,
          {
            kind: "druidWildShapeForm" as const,
            sourceProcedureRef: wildShapeProcedureRef,
            sourceCombatantId: druidId,
            formStatBlockId: "missing_wild_shape_form",
            formLimbs: { kind: "cannotHandleObjects" },
            equipmentDisposition: [],
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
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toContain(druidId);
    expect(
      resolveBattleSubject({
        state: staleWildShapeState,
        subject,
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
    const session = startBattleSessionRight({
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
    const state = session.state;
    const selection = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    const act = findAct(session, selection);
    const subject = act.subject;
    const target = findHole(act.initialHoles, "targetChoice");
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(act.summary).toBe("Use Mage Armor.");
    expect(target.choices).toEqual([wizardId, skeletonId]);
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
        sourceProcedureRef: expect.any(String),
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
            effect.sourceCombatantId === wizardId,
        ),
    ).toHaveLength(1);
  });

  test("Armor of Shadows Spell Access rejects spells without its persistent-armor mechanics", () => {
    const mageArmor = spellRecord("mage_armor");
    if (mageArmor.mechanics.family !== "ongoing_effect") {
      throw new Error(
        "Expected the Mage Armor fixture to be an ongoing effect.",
      );
    }
    const mageArmorWithWrongLevel = {
      ...mageArmor,
      mechanics: {
        ...mageArmor.mechanics,
        level: 2 as const,
      },
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
                  spell: mageArmorWithWrongLevel,
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

  test("persistent armor admission rejects an invalid Armor Class base", () => {
    const mageArmor = spellRecord("mage_armor");
    const operation =
      mageArmor.mechanics.family === "ongoing_effect"
        ? mageArmor.mechanics.operations[0]
        : undefined;
    if (
      operation?.effect.kind !== "modify_ac_set_base" ||
      operation.effect.formula.kind !== "base_plus_dex"
    ) {
      throw new Error("Expected the Mage Armor persistent-armor fixture.");
    }
    const invalidBaseArmorClass = {
      ...mageArmor,
      mechanics: {
        ...mageArmor.mechanics,
        operations: [
          {
            ...operation,
            effect: {
              ...operation.effect,
              formula: { ...operation.effect.formula, base: 0 },
            },
          },
        ] as const,
      },
    };

    expect(admitPersistentArmorEffectSpell(invalidBaseArmorClass)).toBeNull();
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
    const session = startBattleSessionRight({
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
    const state = session.state;
    const invocationRef = armorOfShadowsSpellInvocationRef("mage_armor");
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        invocationRef,
      ),
      mode: { tag: "cast" as const },
    };
    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            invocationRef.spellId,
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
