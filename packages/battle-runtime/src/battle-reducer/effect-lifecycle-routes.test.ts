import { describe, expect, test } from "vitest";
import { Round } from "@dnd/shared/types";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  battleAfterFailedSleepInitialSave,
  battleAfterGoblinFailedSleepRepeatSave,
  battleProcedureExecutionRefForTest,
  battleId,
  characterSeed,
  damageRollFill,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  goblinTurnBattle,
  magicSubject,
  requireHole as requireBattleHole,
  resolveBattleSubject,
  requireResolved,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  wizardId,
  wizardSpellcasting,
} from "../battle-runtime.test-support.ts";
import {
  rollModifierConcentrationBreakRouteForResolution,
  rollModifierRouteForDiscoveredAct,
  rollModifierRouteForResolution,
  scalarBuffRouteForDiscoveredAct,
  scalarBuffRouteForResolution,
  sleepRepeatSaveRouteForResolution,
  spellBaseArmorClassEffectTurnBoundaryRouteForResolution,
  spellDamageReductionRouteForDiscoveredAct,
  spellDamageReductionRouteForResolution,
  repeatSaveConditionEffectRouteForResolution,
  turnBoundaryEffectLifecycleRouteForResolution,
} from "./effect-lifecycle-routes.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  damageTypeChoiceFill,
  spellAct,
  spellTargetListFill,
  spellTargetFill,
} from "../unit-profile-admission-spell-fill.test-support.ts";
import { requireHole } from "../unit-profile-admission-creature-fixture.test-support.ts";
import {
  blessUnitId,
  baneUnitId,
  hideousLaughterUnitId,
  longstriderUnitId,
  resistanceUnitId,
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";

// RAW traces for focused lifecycle behavior:
// - .references/srd-5.2.1/Playing-the-Game.md#Death-Saving-Throws
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hideous-Laughter

describe("effect lifecycle route boundary", () => {
  test("leaves incomplete effect casts unclaimed", () => {
    const blessSession = spellBattle({
      casterClassLevels: [{ className: "cleric", level: 1 }],
      casterSpellcastingSourceClassName: "cleric",
      preparedSpells: [spellRecord(blessUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const blessAct = spellAct({
      session: blessSession,
      spellId: blessUnitId,
      slotLevel: 1,
    });
    const blessAwaitingTargets = resolveBattleSubject({
      state: blessSession.state,
      subject: blessAct.subject,
      fills: [],
    });
    expect(blessAwaitingTargets.tag).toBe("needsHoles");
    expect(
      rollModifierRouteForResolution(
        { state: blessSession.state, subject: blessAct.subject, fills: [] },
        blessAwaitingTargets,
      ),
    ).toBeUndefined();

    const resistanceSession = spellBattle({
      casterClassLevels: [{ className: "cleric", level: 1 }],
      casterSpellcastingSourceClassName: "cleric",
      cantrips: [spellRecord(resistanceUnitId)],
      preparedSpells: [],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const resistanceAct = spellAct({
      session: resistanceSession,
      spellId: resistanceUnitId,
    });
    const resistanceAwaitingTarget = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [],
    });
    expect(resistanceAwaitingTarget.tag).toBe("needsHoles");
    expect(
      spellDamageReductionRouteForResolution(
        {
          state: resistanceSession.state,
          subject: resistanceAct.subject,
          fills: [],
        },
        resistanceAwaitingTarget,
      ),
    ).toBeUndefined();
  });

  test("leaves an out-of-order damage reduction fill unclaimed", () => {
    const session = spellBattle({
      cantrips: [spellRecord(resistanceUnitId)],
      preparedSpells: [],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: resistanceUnitId,
    });
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
    const damageTypeFill = damageTypeChoiceFill(damageTypeHole, "fire");
    const needsTarget = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [damageTypeFill],
    });

    expect(needsTarget.tag).toBe("needsHoles");
    expect(
      spellDamageReductionRouteForResolution(
        { state: session.state, subject: act.subject, fills: [damageTypeFill] },
        needsTarget,
      ),
    ).toBeUndefined();
  });

  test("does not claim an ordinary weapon attack without a roll modifier effect", () => {
    const state = fighterVsGoblinBattle();

    expect(
      rollModifierRouteForDiscoveredAct(state, {
        subject: fighterAttackSubject(state),
        initialHoles: [],
      }),
    ).toBeUndefined();
  });

  test("routes roll-modifier casts and their Concentration teardown", () => {
    const blessSession = spellBattle({
      preparedSpells: [spellRecord(blessUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const blessAct = spellAct({
      session: blessSession,
      spellId: blessUnitId,
      slotLevel: 1,
    });
    const blessHole = requireHole(blessAct.initialHoles, "spellTargetList");
    const blessFill = spellTargetListFill(
      blessHole,
      spellCasterId,
      blessUnitId,
      [spellCasterId],
    );
    const blessResolved = resolveBattleSubject({
      state: blessSession.state,
      subject: blessAct.subject,
      fills: [blessFill],
    });
    expect(blessResolved.tag).toBe("resolved");
    expect(
      rollModifierRouteForDiscoveredAct(blessSession.state, blessAct),
    ).toMatchObject({ subject: "rollModifierEffect" });
    expect(
      rollModifierRouteForResolution(
        {
          state: blessSession.state,
          subject: blessAct.subject,
          fills: [blessFill],
        },
        blessResolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "rollModifierEffect",
        kind: "resolveBattleSubjectWithoutFill",
        owner: "battleActiveEffect",
      }),
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleConcentration",
      }),
    ]);

    if (blessResolved.tag !== "resolved") return;
    const endConcentrationSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellCasterId,
      command: "endConcentration" as const,
    };
    const endConcentration = resolveBattleSubject({
      state: blessResolved.state,
      subject: endConcentrationSubject,
      fills: [],
    });
    expect(
      rollModifierConcentrationBreakRouteForResolution(
        {
          state: blessResolved.state,
          subject: endConcentrationSubject,
          fills: [],
        },
        endConcentration,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleConcentration",
      }),
      expect.objectContaining({
        subject: "rollModifierEffect",
        owner: "battleActiveEffect",
      }),
    ]);
  });

  test("routes save-gated roll modifiers, scalar buffs, and damage reduction", () => {
    const baneSession = spellBattle({
      preparedSpells: [spellRecord(baneUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const baneAct = spellAct({
      session: baneSession,
      spellId: baneUnitId,
      slotLevel: 1,
    });
    const baneTargetHole = requireHole(baneAct.initialHoles, "spellTargetList");
    const baneTargetFill = spellTargetListFill(
      baneTargetHole,
      spellCasterId,
      baneUnitId,
      [spellTargetId],
    );
    const baneNeedsSave = resolveBattleSubject({
      state: baneSession.state,
      subject: baneAct.subject,
      fills: [baneTargetFill],
    });
    expect(
      rollModifierRouteForResolution(
        {
          state: baneSession.state,
          subject: baneAct.subject,
          fills: [baneTargetFill],
        },
        baneNeedsSave,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "rollModifierEffect",
        holes: ["savingThrowOutcome"],
      }),
    ]);

    const scalarSession = spellBattle({
      preparedSpells: [spellRecord(longstriderUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const scalarAct = spellAct({
      session: scalarSession,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const scalarHole = requireHole(scalarAct.initialHoles, "targetChoice");
    const scalarFill = spellTargetFill(
      scalarHole,
      longstriderUnitId,
      spellCasterId,
      spellTargetId,
    );
    const scalarResolved = resolveBattleSubject({
      state: scalarSession.state,
      subject: scalarAct.subject,
      fills: [scalarFill],
    });
    expect(
      scalarBuffRouteForDiscoveredAct(scalarSession.state, scalarAct),
    ).toMatchObject({ subject: "scalarBuffEffect" });
    expect(
      scalarBuffRouteForResolution(
        {
          state: scalarSession.state,
          subject: scalarAct.subject,
          fills: [scalarFill],
        },
        scalarResolved,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleMovementResource" }),
      ]),
    );

    const resistanceSession = spellBattle({
      cantrips: [spellRecord(resistanceUnitId)],
      preparedSpells: [],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const resistanceAct = spellAct({
      session: resistanceSession,
      spellId: resistanceUnitId,
    });
    const resistanceTargetHole = requireHole(
      resistanceAct.initialHoles,
      "targetChoice",
    );
    const resistanceDamageHole = requireHole(
      resistanceAct.initialHoles,
      "damageTypeChoice",
    );
    const resistanceTargetFill = spellTargetFill(
      resistanceTargetHole,
      resistanceUnitId,
      spellCasterId,
      spellCasterId,
    );
    const resistanceNeedsType = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [resistanceTargetFill],
    });
    expect(
      spellDamageReductionRouteForDiscoveredAct(
        resistanceSession.state,
        resistanceAct,
      ),
    ).toMatchObject({ subject: "spellDamageReduction" });
    expect(
      spellDamageReductionRouteForResolution(
        {
          state: resistanceSession.state,
          subject: resistanceAct.subject,
          fills: [resistanceTargetFill],
        },
        resistanceNeedsType,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "spellDamageReduction",
        fill: "targetChoice",
        owner: "battleTargetSelection",
      }),
    ]);
    const resistanceTypeFill = damageTypeChoiceFill(
      resistanceDamageHole,
      "fire",
    );
    const resistanceResolved = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [resistanceTargetFill, resistanceTypeFill],
    });
    expect(
      spellDamageReductionRouteForResolution(
        {
          state: resistanceSession.state,
          subject: resistanceAct.subject,
          fills: [resistanceTargetFill, resistanceTypeFill],
        },
        resistanceResolved,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "spellDamageReduction",
        fill: "damageTypeChoice",
        owner: "battleActiveEffect",
      }),
      expect.objectContaining({
        subject: "spellDamageReduction",
        owner: "battleConcentration",
      }),
    ]);
  });

  test("routes Sleep repeat saves and Concentration teardown at the turn boundary", () => {
    const initialSleep = battleAfterFailedSleepInitialSave({
      battle: "effect-route-sleep-repeat-save",
      helperInitiative: 15,
    });
    const sleeping = requireResolved(
      endTurn({ state: initialSleep, actorId: fighterId }),
    ).state;
    const endTurnSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const needsSave = endTurn({ state: sleeping, actorId: goblinId });
    expect(
      sleepRepeatSaveRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [] },
        needsSave,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "repeatSaveConditionEffect",
        holes: ["savingThrowOutcome"],
      }),
    ]);
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [] },
        needsSave,
      ),
    ).toBeUndefined();

    const saveHole = requireBattleHole(needsSave, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);
    const repeated = endTurn({
      state: sleeping,
      actorId: goblinId,
      fills: [saveFill],
    });
    expect(repeated.tag).toBe("resolved");
    expect(
      sleepRepeatSaveRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [saveFill] },
        repeated,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleConditionLifecycle" }),
      ]),
    );
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: sleeping, subject: endTurnSubject, fills: [saveFill] },
        repeated,
      ),
    ).toBeUndefined();

    const endConcentrationSubject = {
      tag: "runtimeCommand" as const,
      actorId: wizardId,
      command: "endConcentration" as const,
    };
    const afterGoblinSleep = battleAfterGoblinFailedSleepRepeatSave({
      battle: "effect-route-sleep-concentration-break",
      helperInitiative: 5,
    });
    const wizardTurnWithSleep = requireResolved(
      endTurn({ state: afterGoblinSleep, actorId: fighterId }),
    ).state;
    const concentrationBreak = resolveBattleSubject({
      state: wizardTurnWithSleep,
      subject: endConcentrationSubject,
      fills: [],
    });
    expect(
      sleepRepeatSaveRouteForResolution(
        {
          state: wizardTurnWithSleep,
          subject: endConcentrationSubject,
          fills: [],
        },
        concentrationBreak,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleConcentration" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
      ]),
    );
  });

  test("routes Hideous Laughter end-turn repeat-save discovery and failed-save lifecycle", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(hideousLaughterUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: hideousLaughterUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const target = spellTargetListFill(
      targetHole,
      spellCasterId,
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const initialSave = requireBattleHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [target],
      }),
      "savingThrowOutcome",
    );
    const failedInitialSave = savingThrowOutcomeFill(initialSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const affected = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [target, failedInitialSave],
      }),
    ).state;
    const targetTurn = requireResolved(
      endTurn({ state: affected, actorId: spellCasterId }),
    ).state;
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "endTurn" as const,
    };
    const awaitingRepeatSave = endTurn({
      state: targetTurn,
      actorId: spellTargetId,
    });
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: targetTurn, subject, fills: [] },
        awaitingRepeatSave,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "repeatSaveConditionEffect",
        holes: ["savingThrowOutcome"],
        owner: "battleTurnBoundary",
      }),
    ]);

    const repeatSave = requireBattleHole(
      awaitingRepeatSave,
      "savingThrowOutcome",
    );
    const failedRepeatSave = savingThrowOutcomeFill(repeatSave, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const retained = endTurn({
      state: targetTurn,
      actorId: spellTargetId,
      fills: [failedRepeatSave],
    });
    if (retained.tag !== "resolved") {
      throw new Error(
        "Expected failed Hideous Laughter repeat save to resolve.",
      );
    }
    expect(
      repeatSaveConditionEffectRouteForResolution(
        { state: targetTurn, subject, fills: [failedRepeatSave] },
        retained,
      ),
    ).toEqual([
      expect.objectContaining({
        subject: "repeatSaveConditionEffect",
        owner: "battleActiveEffect",
      }),
    ]);
    expect(
      retained.state.combatants
        .get(spellTargetId)
        ?.activeEffects.some((effect) => effect.kind === "hideousLaughter"),
    ).toBe(true);
  });

  test("routes turn-end damage and base armor expiration from resolved boundaries", () => {
    const base = goblinTurnBattle();
    const goblin = base.combatants.get(goblinId);
    if (goblin === undefined) throw new Error("Expected Goblin combatant.");
    const turnEndDamage: Extract<
      BattleActiveEffect,
      { readonly kind: "spellTurnEndDamage" }
    > = {
      kind: "spellTurnEndDamage",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "effect-route-turn-end-damage",
      ),
      sourceCombatantId: fighterId,
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
      expiresAt: {
        kind: "endOfTurn",
        combatantId: goblinId,
        round: Round(1),
      },
    };
    const withDamage = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        activeEffects: [...goblin.activeEffects, turnEndDamage],
      }),
    } satisfies BattleState;
    const endTurnSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const needsDamage = endTurn({ state: withDamage, actorId: goblinId });
    expect(
      turnBoundaryEffectLifecycleRouteForResolution(
        { state: withDamage, subject: endTurnSubject, fills: [] },
        needsDamage,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "discoverBattleActs",
        subject: "turnBoundaryEffectLifecycle",
        holes: ["rolledDice"],
      }),
    ]);
    const damageHole = requireBattleHole(needsDamage, "rolledDice");
    const damageFill = damageRollFill(damageHole, 2);
    const resolved = endTurn({
      state: withDamage,
      actorId: goblinId,
      fills: [damageFill],
    });
    expect(
      turnBoundaryEffectLifecycleRouteForResolution(
        { state: withDamage, subject: endTurnSubject, fills: [damageFill] },
        resolved,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleHitPoint" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleTurnBoundary" }),
      ]),
    );

    const armorSession = startBattleSessionRight({
      battleId: battleId("effect-route-mage-armor-expiration"),
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
    const armorAct = findAct(armorSession, magicSubject("mage_armor"));
    const armorTarget = requireHole(armorAct.initialHoles, "targetChoice");
    const armorCast = requireResolved(
      resolveBattleSubject({
        state: armorSession.state,
        subject: armorAct.subject,
        fills: [spellTargetFill(armorTarget, "mage_armor", wizardId, wizardId)],
      }),
    );
    const wizard = armorCast.state.combatants.get(wizardId);
    if (wizard === undefined) throw new Error("Expected armored Wizard.");
    const armorEffect = wizard.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellBaseArmorClass" }
      > & {
        readonly expiresAt: { readonly kind: "duration" };
      } =>
        effect.kind === "spellBaseArmorClass" &&
        effect.expiresAt.kind === "duration" &&
        effect.earlyEnds[0]?.kind === "targetDonsArmor",
    );
    if (armorEffect === undefined) {
      throw new Error("Expected duration Mage Armor effect.");
    }
    const shortenedArmorEffect = {
      ...armorEffect,
      earlyEnds: [{ kind: "targetDonsArmor" }],
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const shortened = wizard.activeEffects.map((effect) =>
      effect === armorEffect ? shortenedArmorEffect : effect,
    );
    const nearlyExpired = {
      ...armorCast.state,
      combatants: new Map(armorCast.state.combatants).set(wizardId, {
        ...wizard,
        activeEffects: shortened,
      }),
    };
    const afterWizardTurn = requireResolved(
      endTurn({ state: nearlyExpired, actorId: wizardId }),
    ).state;
    const expired = endTurn({ state: afterWizardTurn, actorId: skeletonId });
    expect(
      spellBaseArmorClassEffectTurnBoundaryRouteForResolution(
        {
          state: afterWizardTurn,
          subject: {
            tag: "runtimeCommand",
            actorId: skeletonId,
            command: "endTurn",
          },
          fills: [],
        },
        expired,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "battleTurnBoundary" }),
        expect.objectContaining({ owner: "battleActiveEffect" }),
        expect.objectContaining({ owner: "battleArmorClass" }),
      ]),
    );
  });

  test("routes a next-round start-turn save by its advanced turn anchor", () => {
    const base = goblinTurnBattle();
    const fighter = base.combatants.get(fighterId);
    if (fighter === undefined) throw new Error("Expected Fighter combatant.");
    const effect = {
      kind: "spellTurnStartDamageAndSave",
      source: "turnBoundaryEffectLifecycle",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "effect-route-round-wrap-start-damage",
      ),
      sourceCombatantId: goblinId,
      damage: { expr: { dice: 1, dieSize: 4 }, damageType: "fire" },
      save: {
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
        successEnds: "spell",
      },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    } as const satisfies BattleActiveEffect;
    const withStartDamage = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        activeEffects: [...fighter.activeEffects, effect],
      }),
    } satisfies BattleState;
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const damageFrontier = endTurn({
      state: withStartDamage,
      actorId: goblinId,
    });
    const damageFill = damageRollFill(
      requireBattleHole(damageFrontier, "rolledDice"),
      1,
    );
    const saveFrontier = endTurn({
      state: withStartDamage,
      actorId: goblinId,
      fills: [damageFill],
    });
    const saveFill = savingThrowOutcomeFill(
      requireBattleHole(saveFrontier, "savingThrowOutcome"),
      [{ targetId: fighterId, succeeded: true }],
    );
    const resolved = endTurn({
      state: withStartDamage,
      actorId: goblinId,
      fills: [damageFill, saveFill],
    });

    expect(
      turnBoundaryEffectLifecycleRouteForResolution(
        {
          state: withStartDamage,
          subject,
          fills: [damageFill, saveFill],
        },
        resolved,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "resolveBattleSubject",
        fill: "savingThrowOutcome",
        owner: "battleActiveEffect",
      }),
    ]);
  });
});
