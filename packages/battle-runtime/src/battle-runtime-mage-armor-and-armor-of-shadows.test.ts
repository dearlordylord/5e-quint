import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import type { BattleActiveEffect } from "./index.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { parseCharacterBattleInvocationSpellAccesses } from "./character-battle-resources.ts";
import { admitPersistentArmorEffectSpell } from "./procedure-admission/persistent-armor-effect-facts.ts";
import {
  abilityModifier,
  armorOfShadowsSpellInvocationRef,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  battleStateWithAllocatedEffectForTest,
  characterSeed,
  combatantId,
  defaultArmorClassState,
  difficultyClass,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
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
} from "./battle-runtime.test-support.ts";
import {
  combatantWearingArmor,
  combatantWieldingShield,
} from "./battle-reducer/creature-state-leaves.ts";
import {
  battleExecutionScopeOrdinal,
  battleObjectId,
  battleStatBlockExecutionScopeRef,
} from "./identity.ts";

type DurationSpellBaseArmorClassEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "spellBaseArmorClass";
    readonly expiresAt: { readonly kind: "duration" };
  }
>;

describe("battle runtime: Mage Armor and Armor of Shadows", () => {
  test("Mage Armor creates and expires through the base AC lifecycle route", () => {
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
      routeEvents: [
        {
          kind: "resolveBattleSubject",
          subject: "spellBaseArmorClassEffect",
          fill: "targetChoice",
          holes: [],
          owner: "battleTargetSelection",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleArmorClass",
        },
      ],
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

    const resolvedState = requireResolved(result).state;
    const wizard = resolvedState.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Mage Armor wizard.");
    }
    const mageArmorEffect = wizard.activeEffects.find(
      (effect): effect is DurationSpellBaseArmorClassEffect =>
        effect.kind === "spellBaseArmorClass" &&
        effect.expiresAt.kind === "duration",
    );
    if (mageArmorEffect === undefined) {
      throw new Error("Expected duration-owned Mage Armor effect.");
    }
    const nearlyExpired = {
      ...resolvedState,
      combatants: new Map(resolvedState.combatants).set(wizardId, {
        ...wizard,
        activeEffects: [
          {
            ...mageArmorEffect,
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };
    const skeletonTurn = requireResolved(
      endTurn({ state: nearlyExpired, actorId: wizardId }),
    ).state;
    const expired = endTurn({ state: skeletonTurn, actorId: skeletonId });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, armorClass: 12 },
          { combatantId: skeletonId },
        ],
      },
      routeEvents: [
        {
          kind: "discoverBattleActs",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleTurnBoundary",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellBaseArmorClassEffect",
          holes: [],
          owner: "battleArmorClass",
        },
      ],
    });
    if (expired.tag !== "resolved") {
      throw new Error("Expected Mage Armor duration to expire.");
    }
    expect(expired.state.combatants.get(wizardId)?.activeEffects).toEqual([]);
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
    if (druid.origin.kind !== "character") {
      throw new Error("Expected character-origin Druid.");
    }
    const catFormScopeRef = druid.origin.druidWildShapeAvailableForms?.find(
      (form) => form.statBlock.id === "stat_block_cat",
    )?.execution.scopeRef;
    if (catFormScopeRef === undefined) {
      throw new Error("Expected cat form admission.");
    }
    const wildShapeProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      druidId,
      "druid_wild_shape",
    );
    const wildShapedState = battleStateWithAllocatedEffectForTest({
      state,
      ownerId: druidId,
      effect: {
        kind: "druidWildShapeForm" as const,
        sourceProcedureRef: wildShapeProcedureRef,
        sourceCombatantId: druidId,
        formScopeRef: catFormScopeRef,
        formLimbs: { kind: "cannotHandleObjects" } as const,
        equipmentDisposition: [],
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(600),
        },
      },
    });
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

  test("Mage Armor ignores unresolved Wild Shape effects and uses base form armor rules", () => {
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
    if (druid.origin.kind !== "character") {
      throw new Error("Expected character-origin Druid.");
    }
    const wildShapeProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      druidId,
      "druid_wild_shape",
    );
    const staleWildShapeState = battleStateWithAllocatedEffectForTest({
      state,
      ownerId: druidId,
      effect: {
        kind: "druidWildShapeForm" as const,
        sourceProcedureRef: wildShapeProcedureRef,
        sourceCombatantId: druidId,
        formScopeRef: battleStatBlockExecutionScopeRef(
          battleId("battle-mage-armor-stale-wild-shape-target"),
          druidId,
          battleExecutionScopeOrdinal(999),
        ),
        formLimbs: { kind: "cannotHandleObjects" } as const,
        // Stale effect claims armor is worn. With the fix, base form rules
        // apply instead, so the armored druid remains armored and Mage
        // Armor is illegal. Without the fix, this disposition would also
        // make the druid appear armored, masking the stale-reference bug.
        equipmentDisposition: [
          {
            item: {
              kind: "armor" as const,
              objectId: battleObjectId("synthetic-stale-armor"),
            },
            disposition: "worn" as const,
          },
        ],
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(600),
        },
      },
    });

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

    // The druid is armored in base form; the stale Wild Shape effect must not
    // change that. Mage Armor therefore excludes the armored druid from its
    // target choices entirely.
    expect(target.choices).not.toContain(druidId);
  });

  test("unresolved Wild Shape effects cannot force base-form creatures to appear armored", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const druidId = combatantId("mage-armor-stale-wild-shape-unarmored-druid");
    const session = startBattleSessionRight({
      battleId: battleId("battle-mage-armor-stale-wild-shape-unarmored"),
      combatants: [
        characterSeed({
          combatantId: druidId,
          displayName: "Stale Wild Shape Druid",
          initiative: 10,
          attack: null,
          armorClass: unarmoredDex,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
      ],
    });
    const state = session.state;
    const druid = state.combatants.get(druidId);
    if (druid === undefined) {
      throw new Error("Expected Druid target.");
    }
    if (druid.origin.kind !== "character") {
      throw new Error("Expected character-origin Druid.");
    }
    const wildShapeProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      druidId,
      "druid_wild_shape",
    );
    const allocatedState = battleStateWithAllocatedEffectForTest({
      state,
      ownerId: druidId,
      effect: {
        kind: "druidWildShapeForm" as const,
        sourceProcedureRef: wildShapeProcedureRef,
        sourceCombatantId: druidId,
        formScopeRef: battleStatBlockExecutionScopeRef(
          battleId("battle-mage-armor-stale-wild-shape-unarmored"),
          druidId,
          battleExecutionScopeOrdinal(999),
        ),
        formLimbs: { kind: "cannotHandleObjects" } as const,
        // Stale effect claims armor and shield are worn. Base form rules must
        // win, so the unarmored, shieldless druid remains unarmored.
        equipmentDisposition: [
          {
            item: {
              kind: "armor" as const,
              objectId: battleObjectId("synthetic-stale-armor"),
            },
            disposition: "worn" as const,
          },
          {
            item: {
              kind: "shield" as const,
              objectId: battleObjectId("synthetic-stale-shield"),
            },
            disposition: "worn" as const,
          },
        ],
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(600),
        },
      },
    });
    const staleDruid = allocatedState.combatants.get(druidId);
    if (staleDruid === undefined) {
      throw new Error("Expected allocated stale Wild Shape Druid.");
    }

    expect(combatantWearingArmor(allocatedState, staleDruid)).toBe(false);
    expect(combatantWieldingShield(allocatedState, staleDruid)).toBe(false);
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
      Result.fail({
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

  test("persistent armor admission ignores other spell mechanic families", () => {
    expect(
      admitPersistentArmorEffectSpell(spellRecord("fire_bolt")),
    ).toBeNull();
  });

  test("persistent armor admission rejects a different Surface-valid Armor Class formula", () => {
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
    const constitutionArmor = {
      ...mageArmor,
      mechanics: {
        ...mageArmor.mechanics,
        operations: [
          {
            ...operation,
            effect: {
              ...operation.effect,
              formula: {
                kind: "base_plus_dex_con" as const,
                base: operation.effect.formula.base,
              },
            },
          },
        ] as const,
      },
    };

    expect(admitPersistentArmorEffectSpell(constitutionArmor)).toBeNull();
  });

  test("Armor of Shadows retains the admitted persistent-armor projection", () => {
    const mageArmor = spellRecord("mage_armor");

    expect(
      parseCharacterBattleInvocationSpellAccesses([
        { tag: "armorOfShadowsMageArmor", spell: mageArmor },
      ]),
    ).toMatchObject({
      tag: "parsed",
      invocationSpellAccesses: [
        {
          tag: "armorOfShadowsMageArmor",
          admission: {
            authoredSpell: { id: mageArmor.id },
            executionFacts: {
              rangeFeet: 5,
              slotLevel: 1,
              baseArmorClass: 13,
              ability: "dex",
              durationTicks: requireElapsedHours(8),
              earlyEnds: [{ kind: "targetDonsArmor" }],
            },
          },
        },
      ],
    });
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
